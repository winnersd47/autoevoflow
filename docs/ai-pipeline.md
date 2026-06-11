# AI Pipeline

## Overview

The AI pipeline is the analytical core of the platform. It transforms raw images and text scraped from the web into structured, queryable knowledge about automotive design evolution. The pipeline is organized into nine sequential stages, each building on the outputs of the previous.

```mermaid
flowchart TD
  A["1. Image Ingestion\n(crawl + validate + store)"]
  B["2. Visual Embedding\n(CLIP + DINOv2 + fusion)"]
  C["3. Semantic Embedding\n(text-embedding-3-large)"]
  D["4. Design DNA Computation\n(per-brand feature aggregation)"]
  E["5. Evolution Detection\n(cosine sim + graph writing)"]
  F["6. Similarity Scoring\n(pgvector + FAISS ANN)"]
  G["7. Generative Visualization\n(Stable Diffusion + ControlNet)"]
  H["8. LLM Analysis\n(Claude + GPT-4 Vision)"]
  I["9. Performance Monitoring\n(latency + quality metrics)"]

  A --> B --> C --> D --> E --> F
  F --> G
  F --> H
  G --> I
  H --> I
```

All stages except ingestion run as Celery tasks. Most are triggered automatically by new data arriving, but each can also be invoked on-demand via the API.

---

## 1. Image Ingestion Pipeline

The ingestion pipeline is responsible for safely accepting images from crawler workers, validating them, deduplicating them, and placing them into MinIO for downstream processing.

### Validation

Each incoming image passes the following checks before storage:

```python
def validate_image(data: bytes) -> ValidationResult:
    # 1. Format check — must be JPEG or PNG
    img = Image.open(io.BytesIO(data))
    if img.format not in ("JPEG", "PNG"):
        return ValidationResult(ok=False, reason="unsupported_format")

    # 2. Minimum dimensions — discard thumbnails
    if img.width < 400 or img.height < 300:
        return ValidationResult(ok=False, reason="too_small")

    # 3. Aspect ratio check — discard panoramic banners
    ratio = img.width / img.height
    if ratio > 4.0 or ratio < 0.5:
        return ValidationResult(ok=False, reason="bad_aspect_ratio")

    # 4. Not a logo or icon (average pixel entropy)
    arr = np.array(img.convert("L"))
    entropy = skimage.measure.shannon_entropy(arr)
    if entropy < 3.5:
        return ValidationResult(ok=False, reason="low_entropy_likely_logo")

    return ValidationResult(ok=True)
```

### Deduplication

After validation, perceptual hashing (PHash) deduplication runs against all previously stored images:

```python
def is_duplicate(new_image_hash: str, threshold: int = 8) -> bool:
    """Returns True if a stored image has Hamming distance <= threshold."""
    cursor = db.execute(
        "SELECT phash FROM vehicle_images WHERE hamming(phash, %s) <= %s LIMIT 1",
        (new_image_hash, threshold)
    )
    return cursor.rowcount > 0
```

A `hamming()` function is registered as a PostgreSQL C extension for performance. At 100k images, deduplication adds approximately 8ms per image.

### Storage Layout

Images are stored in MinIO with the following key structure:

```
raw/{source}/{brand_slug}/{model_slug}/{generation_code}/{uuid}.jpg
processed/{brand_slug}/{model_slug}/{generation_code}/{uuid}_224.jpg
processed/{brand_slug}/{model_slug}/{generation_code}/{uuid}_518.jpg
```

Processed variants (resized to model input dimensions) are generated synchronously with ingestion to avoid repeated resizing during batch embedding.

---

## 2. Visual Embedding Pipeline

Visual embeddings are the foundation of all similarity search and evolution detection. Two complementary models are used and their outputs are fused.

### OpenCLIP ViT-L-14

**Architecture:** Vision Transformer Large with 307M parameters, trained with the CLIP contrastive objective on LAION-2B.

- **Input size:** 224 × 224 RGB (normalized with ImageNet mean/std)
- **Output:** 768-dimensional L2-normalized embedding vector
- **Primary use:** cross-modal (text-image) semantic similarity, broad visual search
- **Checkpoint used:** `ViT-L-14` from `laion/CLIP-ViT-L-14-laion2B-s32B-b82K`

Inference code:

```python
import open_clip
import torch

model, _, preprocess = open_clip.create_model_and_transforms(
    "ViT-L-14",
    pretrained="laion2b_s32b_b82k",
    device="cuda"
)
model.eval()

def embed_clip(image_path: str) -> np.ndarray:
    img = preprocess(Image.open(image_path)).unsqueeze(0).to("cuda")
    with torch.no_grad():
        features = model.encode_image(img)
        features = features / features.norm(dim=-1, keepdim=True)
    return features.cpu().numpy().flatten()  # shape: (768,)
```

### DINOv2 Large

**Architecture:** ViT-L/14 trained with the DINO self-supervised framework (no text supervision), enhanced with register tokens for sharper local features.

- **Input size:** 518 × 518 RGB (14-px patch size, 37×37 patch grid)
- **Output:** 1024-dimensional CLS token embedding (patch tokens also available for spatial analysis)
- **Primary use:** fine-grained part-level similarity (grille shape, headlight form), less affected by color/lighting than CLIP
- **Checkpoint used:** `facebook/dinov2-large`

Inference code:

```python
from transformers import AutoImageProcessor, AutoModel

processor = AutoImageProcessor.from_pretrained("facebook/dinov2-large")
dino_model = AutoModel.from_pretrained("facebook/dinov2-large").to("cuda").eval()

def embed_dino(image_path: str) -> np.ndarray:
    img = Image.open(image_path).convert("RGB")
    inputs = processor(images=img, return_tensors="pt").to("cuda")
    with torch.no_grad():
        outputs = dino_model(**inputs)
        cls_token = outputs.last_hidden_state[:, 0, :]  # CLS token
        cls_token = cls_token / cls_token.norm(dim=-1, keepdim=True)
    return cls_token.cpu().numpy().flatten()  # shape: (1024,)
```

### Combined Embedding Strategy

The final visual embedding is a weighted linear combination of the two model outputs, projected into a shared 768-dimensional space:

```python
# Projection heads (learned offline on automotive image pairs)
clip_proj = nn.Linear(768, 768)   # identity-initialized, fine-tuned
dino_proj = nn.Linear(1024, 768)  # dimensionality reduction + alignment

def compute_combined_embedding(clip_emb: np.ndarray, dino_emb: np.ndarray) -> np.ndarray:
    clip_projected = clip_proj(torch.tensor(clip_emb))
    dino_projected = dino_proj(torch.tensor(dino_emb))

    # Weighted sum
    combined = 0.6 * clip_projected + 0.4 * dino_projected

    # L2 normalize
    combined = combined / combined.norm()
    return combined.numpy()  # shape: (768,)
```

**Per-generation embedding:** individual image embeddings for a generation are aggregated using a trimmed mean (top and bottom 10% of images by entropy are excluded) to produce a single representative generation embedding.

### YOLO + SAM for Design Element Detection

After computing the combined embedding, YOLO and SAM are used to produce per-part embeddings for detailed design analysis:

1. **YOLOv8x** detects bounding boxes for predefined automotive design elements: `grille`, `headlight_left`, `headlight_right`, `taillight_left`, `taillight_right`, `door_handle`, `wheel_arch_front`, `wheel_arch_rear`, `spoiler`.
2. **SAM (ViT-H)** refines each bounding box into a pixel-level mask.
3. For each detected part, a cropped region is passed through DINOv2 to produce a part-level embedding.
4. Part embeddings are stored in the `yolo_detections` JSONB column alongside polygon coordinates.

This enables queries like "find all cars with a similar grille shape to the BMW G20" without being confounded by overall body shape.

---

## 3. Semantic Embedding Pipeline

Text associated with each generation — model names, descriptions, spec summaries, press-release excerpts crawled from Motor1 and AutoEvolution — is embedded using OpenAI's `text-embedding-3-large` model (1536-dimensional output, reduced to 768 via PCA projection trained on the automotive corpus).

```python
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def embed_text(text: str) -> np.ndarray:
    response = await client.embeddings.create(
        model="text-embedding-3-large",
        input=text,
        dimensions=768,  # native dimensionality reduction
        encoding_format="float"
    )
    return np.array(response.data[0].embedding)
```

Semantic embeddings are used for:
- Natural-language search queries (e.g., "aggressive crossover with pronounced wheel arches").
- Enriching the combined multimodal embedding for search.
- LLM context injection (top-5 semantically similar generations are included as context when generating analyses).

---

## 4. Design DNA Computation

The Design DNA system produces a compact 20-element fingerprint for each brand that encodes its persistent visual characteristics. It serves as a brand identity index and enables cross-brand comparison.

### Feature Extraction

The 20 DNA dimensions map to interpretable automotive design concepts:

| Dimension | Feature Name | Extraction Method |
|---|---|---|
| 0 | Grille width-to-height ratio | SAM mask geometry on `grille` detections |
| 1 | Grille vertical prominence (% of front face) | SAM mask area ratio |
| 2 | Headlight length-to-height aspect | Bounding box geometry |
| 3 | Headlight vertical position on front | Normalized y-centroid |
| 4 | Shoulder line continuity | Edge detection gradient score |
| 5 | Roofline slope angle | Silhouette regression |
| 6 | Greenhouse-to-body ratio | Segmentation area ratio |
| 7 | Wheel arch flare prominence | SAM mask convexity score |
| 8 | Front overhang length (normalized) | Silhouette geometry |
| 9 | Rear overhang length (normalized) | Silhouette geometry |
| 10 | Hood crease count | Edge detection ridge count |
| 11 | Side character line count | Horizontal edge prominence |
| 12 | Front face aspect ratio (W/H) | Bounding box on front views |
| 13 | Rear face aspect ratio (W/H) | Bounding box on rear views |
| 14 | Trunk lid integration score | Segmentation continuity |
| 15 | Pillar thickness normalized | Mask geometry on side views |
| 16 | DLO (Day Light Opening) angle | Glass area geometry |
| 17 | Fog light presence score | YOLO detection confidence |
| 18 | Spoiler/wing presence score | YOLO detection confidence |
| 19 | Surfacing complexity index | Mean curvature from depth estimation |
```

### Aggregation

For a given brand, the DNA is computed as a recency-weighted mean across all primary generation images:

```python
def compute_brand_dna(brand_id: str) -> np.ndarray:
    generations = get_brand_generations_ordered(brand_id)
    n = len(generations)
    weights = np.array([0.5 + 0.5 * (i / (n - 1)) for i in range(n)])  # recency bias
    weights /= weights.sum()

    dna_matrix = np.array([g.design_dna_features for g in generations])  # shape (n, 20)
    brand_dna = np.average(dna_matrix, axis=0, weights=weights)
    return brand_dna  # shape (20,)
```

### Consistency Score

A brand's design consistency score measures how tightly the per-generation DNA vectors cluster around the brand mean:

```python
def dna_consistency_score(generation_dnas: list[np.ndarray], brand_dna: np.ndarray) -> float:
    similarities = [cosine_similarity(g, brand_dna) for g in generation_dnas]
    return float(np.mean(similarities))
```

BMW scores 0.84; brands with more diverse lineups (e.g., Stellantis brands) typically score 0.55–0.65.

---

## 5. Evolution Detection Algorithm

The evolution detection algorithm runs as a scheduled Celery task to populate Neo4j with evolutionary relationships.

```
INPUT: All (Brand, Generation, visual_embedding, year_start) tuples

INTRA-BRAND EVOLUTION:

for each brand B:
  generations = fetch_all_generations(B), sorted by year_start

  for each consecutive pair (G_i, G_{i+1}):
    sim = cosine_similarity(G_i.combined_embedding, G_{i+1}.combined_embedding)
    year_delta = G_{i+1}.year_start - G_i.year_start

    if sim > 0.75 and year_delta < 15:
      if year_delta < 5 and sim > 0.90:
        MERGE edge: FACELIFT_OF(confidence=sim, change_scope=classify_change_scope(G_i, G_{i+1}))
      else:
        MERGE edge: EVOLVES_INTO(similarity=sim, year_delta=year_delta, confidence=sigmoid(sim * 2 - 1))

  for each non-consecutive pair (G_i, G_j) where j > i+1:
    sim = cosine_similarity(G_i.combined_embedding, G_j.combined_embedding)
    if sim > 0.85 and not path_exists(G_i, G_j):
      # Skip-generation homage (e.g., retro revival)
      MERGE edge: INFLUENCED_BY(strength=sim, aspect="retro_revival")

CROSS-BRAND INFLUENCE:

for each pair of generations (G_a from Brand_A, G_b from Brand_B) where Brand_A != Brand_B:
  if abs(G_a.year_start - G_b.year_start) <= 10:
    sim = cosine_similarity(G_a.combined_embedding, G_b.combined_embedding)
    if sim > 0.80:
      # Determine direction: earlier car influenced later one
      if G_a.year_start < G_b.year_start:
        MERGE edge: (G_b)-[:INFLUENCED_BY {strength: sim, aspect: "design_language"}]->(G_a)
      elif G_b.year_start < G_a.year_start:
        MERGE edge: (G_a)-[:INFLUENCED_BY {strength: sim, aspect: "design_language"}]->(G_b)
      else:
        # Same year — mark as COMPETITOR_OF
        MERGE edge: (G_a)-[:COMPETITOR_OF {segment_overlap: sim}]->(G_b)

CONCEPT-TO-PRODUCTION MATCHING:

for each Concept C:
  for each Generation G where G.year_start BETWEEN C.year_shown AND C.year_shown + 5:
    sim = cosine_similarity(C.combined_embedding, G.combined_embedding)
    if sim > 0.70:
      MERGE edge: (C)-[:CONCEPT_FOR {realization_pct: sim}]->(G)
```

### Edge Confidence Scoring

Each edge is assigned a `confidence` value using a sigmoid function that produces human-interpretable scores:

| Similarity Range | Confidence | Interpretation |
|---|---|---|
| 0.95–1.00 | 0.97–1.00 | Near-identical design (same platform, different badge) |
| 0.85–0.95 | 0.88–0.97 | Strong direct evolution or heavy influence |
| 0.75–0.85 | 0.73–0.88 | Clear lineage with meaningful design updates |
| 0.65–0.75 | 0.54–0.73 | Possible influence, flagged for human review |

---

## 6. Similarity Scoring

Two index strategies are maintained in parallel for different performance/accuracy tradeoffs:

### pgvector IVFFlat (Persistent)

Used for: persistent similarity queries with filtering by year, brand, body style.

```sql
-- Find top-10 visually similar generations to a query embedding
SELECT g.id, g.code_name, b.name as brand_name,
       1 - (g.combined_embedding <=> $1::vector) AS similarity
FROM generations g
JOIN car_models m ON g.model_id = m.id
JOIN brands b ON m.brand_id = b.id
WHERE g.year_start BETWEEN $2 AND $3
  AND b.country = $4
ORDER BY g.combined_embedding <=> $1::vector
LIMIT 10;
```

The `<=>` operator computes cosine distance. IVFFlat with `lists = 100` uses approximate nearest-neighbor retrieval, probing `nprobe = 10` lists by default (adjustable per query).

### FAISS In-Memory Index (Fast Path)

For latency-critical use cases, a FAISS `IndexFlatIP` (exact inner product, equivalent to cosine after L2 normalization) is held in RAM in the ML Inference Server:

```python
import faiss
import numpy as np

class FAISSIndex:
    def __init__(self, dim: int = 768):
        self.index = faiss.IndexFlatIP(dim)
        self.id_map: dict[int, str] = {}  # faiss_int_id -> generation_uuid

    def add(self, embeddings: np.ndarray, ids: list[str]):
        self.index.add(embeddings.astype("float32"))
        for i, uuid in enumerate(ids):
            self.id_map[self.index.ntotal - len(ids) + i] = uuid

    def search(self, query: np.ndarray, k: int = 10) -> list[tuple[str, float]]:
        scores, indices = self.index.search(query.reshape(1, -1).astype("float32"), k)
        return [(self.id_map[int(i)], float(s)) for i, s in zip(indices[0], scores[0])]
```

The FAISS index is rebuilt from PostgreSQL every night at 02:00 UTC via a Celery beat task, and incrementally updated in real time as new embeddings are added.

---

## 7. Generative AI Pipeline (Stable Diffusion + ControlNet)

The generative pipeline creates conceptual future design visualizations and interpolation images between evolutionary generations. It runs on-demand via the `/analysis/predict-future` endpoint.

### Pipeline Architecture

```mermaid
flowchart LR
  A["Source Generation\n(reference image)"] --> B["ControlNet Conditioning\n(Canny edge + depth)"]
  C["Design DNA\n+ Evolution Trend Vector"] --> D["Text Prompt\nGeneration (Claude)"]
  B --> E["Stable Diffusion XL\n+ ControlNet"]
  D --> E
  E --> F["SDXL Refiner"]
  F --> G["Post-Processing\n(ESRGAN upscale x4)"]
  G --> H["Output Image\n(2048x1024)"]
```

### Prompt Engineering

Claude is used to generate detailed Stable Diffusion prompts based on the design DNA vector and evolutionary trend:

```python
PROMPT_TEMPLATE = """
You are an automotive design AI. Given the following design DNA vector and evolution trend,
generate a detailed Stable Diffusion prompt for a future {brand} {model_name} design.

Current DNA vector: {dna_vector}
Evolution trend (last 3 generations): {trend_description}
Horizon: {horizon_years} years into the future

Generate a prompt in this format:
"automotive design, {brand} {model_name}, exterior, studio photography,
[specific design elements from DNA], [evolved elements], photorealistic,
8k, professional automotive photography"

Negative prompt: cartoon, anime, watermark, text, ugly proportions
"""
```

### ControlNet Configuration

- **Model:** `lllyasviel/controlnet-canny` for edge guidance, `lllyasviel/sd-controlnet-depth` for 3D structure.
- **Conditioning weight:** 0.7 for structural similarity to source; reduces to 0.4 for "futuristic" generations.
- **Guidance scale:** 8.5.
- **Steps:** 40 (DDIM sampler).
- **Seed:** logged with the output for reproducibility.

---

## 8. LLM Analysis Pipeline (Claude + GPT-4 Vision)

Narrative analyses — design overviews, evolution stories, competitive positioning — are generated by large language models that receive both text context and images.

### Claude (Anthropic)

Used for long-form narrative generation, design DNA interpretation, and future trend analysis. Claude receives:
1. Structured JSON context (brand metadata, DNA vector, key statistics).
2. Up to 5 reference images (passed as base64).
3. A curated system prompt establishing automotive design expert persona.

```python
import anthropic

client = anthropic.Anthropic()

async def generate_design_overview(brand_slug: str, context: dict, images: list[str]) -> str:
    image_content = [
        {
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": img_b64}
        }
        for img_b64 in images[:5]
    ]

    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=2048,
        system=(
            "You are a senior automotive design historian and analyst with 30 years of experience. "
            "You write precise, insightful design analyses that balance technical accuracy with "
            "accessibility. Avoid clichés. Ground observations in specific visual evidence."
        ),
        messages=[
            {
                "role": "user",
                "content": image_content + [
                    {
                        "type": "text",
                        "text": f"Analyze the design evolution of {context['brand_name']}. "
                                f"Brand DNA: {json.dumps(context['dna'])}. "
                                f"Key metrics: {json.dumps(context['stats'])}."
                    }
                ]
            }
        ]
    )
    return response.content[0].text
```

### GPT-4 Vision

Used for competitive positioning analyses (where GPT-4V's training data provides strong automotive market knowledge) and per-generation design breakdowns.

### Task Routing

| Analysis Type | Model | Reason |
|---|---|---|
| `design_overview` | Claude | Superior long-form reasoning and narrative quality |
| `evolution_narrative` | Claude | Ability to synthesize across many images and data points |
| `competitive_positioning` | GPT-4V | Strong automotive market knowledge |
| `future_prediction` | Claude | Better at speculative/creative analysis |
| `per_part_description` | GPT-4V | Strong spatial visual grounding |

---

## 9. Performance Benchmarks

All benchmarks measured on a server with 1x NVIDIA RTX 3090 (24GB VRAM), AMD EPYC 7402 (24-core), 128GB RAM, NVMe SSD.

### Inference Latency (Single Image)

| Step | Latency (p50) | Latency (p99) | Notes |
|---|---|---|---|
| Image download + validate | 180ms | 450ms | Network-bound |
| CLIP embedding (224×224) | 12ms | 18ms | Single-image |
| DINOv2 embedding (518×518) | 18ms | 27ms | Single-image |
| Combined embedding + projection | 2ms | 4ms | CPU |
| YOLO detection | 22ms | 35ms | YOLOv8x |
| SAM segmentation (per box) | 65ms | 110ms | ViT-H, 4 boxes avg |
| pgvector similarity search (100k) | 45ms | 82ms | IVFFlat, nprobe=10 |
| FAISS similarity search (100k) | 2ms | 5ms | IndexFlatIP |
| Full embedding pipeline (single image) | ~320ms | ~650ms | End-to-end |

### Batch Throughput

| Batch Size | CLIP Images/sec | DINOv2 Images/sec |
|---|---|---|
| 1 | 83 | 56 |
| 8 | 310 | 190 |
| 16 | 520 | 300 |
| 32 | 680 | 390 |

Batch size 16 is the production default, balancing throughput with memory headroom on 24GB VRAM.

### LLM Analysis

| Model | Analysis Type | Avg Tokens | Avg Latency | Cost per Request |
|---|---|---|---|---|
| claude-opus-4-5 | design_overview | ~1800 out | 8.2s | ~$0.054 |
| claude-opus-4-5 | evolution_narrative | ~2400 out | 11.4s | ~$0.072 |
| gpt-4-vision-preview | competitive_positioning | ~1200 out | 6.8s | ~$0.048 |

### Crawler Throughput

| Source | Requests/hour | Images/hour | Notes |
|---|---|---|---|
| NetCarShow | 1800 | 900 | 1 req/2s, ~50% yield |
| Caricos | 1200 | 600 | 1 req/3s |
| Motor1 | 7200 | 0 | Text only, fast |
| AutoEvolution | 1800 | 400 | Spec-heavy pages |
| Supercars.net | 1200 | 700 | High-res, slower |
| ConceptCarz | 720 | 350 | 1 req/5s |
