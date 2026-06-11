"""
Embedding Generation Pipeline.

Handles visual, semantic, and combined embedding generation plus FAISS indexing
and similarity search for automotive generation fingerprints.
"""

from __future__ import annotations

import os
import pickle
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

import faiss
import numpy as np
import structlog
from openai import OpenAI
from PIL import Image

from ml.pipelines.vision_pipeline import AutomotiveVisionPipeline

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class CombinedEmbedding:
    visual_embedding: np.ndarray        # Average-pooled visual (1536,)
    semantic_embedding: np.ndarray      # OpenAI text embedding (3072,)
    design_dna: np.ndarray              # Design DNA (512,)
    combined: np.ndarray                # Fused & projected (2048,)
    image_count: int = 0
    text_length: int = 0


@dataclass
class GenerationFingerprint:
    generation_id: int
    visual_embedding: np.ndarray        # (1536,)
    semantic_embedding: np.ndarray      # (3072,)
    design_dna: np.ndarray              # (512,)
    combined_embedding: np.ndarray      # (2048,)
    metadata: dict = field(default_factory=dict)


@dataclass
class SimilarityResult:
    generation_id: int
    similarity: float
    distance: float
    metadata: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

class EmbeddingPipeline:
    """
    Unified embedding pipeline that orchestrates visual (CLIP/DINOv2),
    semantic (OpenAI), and combined embeddings for automotive generations.
    Integrates a FAISS flat-IP index for approximate nearest-neighbour search.
    """

    COMBINED_DIM = 2048
    VISUAL_DIM = 1536
    SEMANTIC_DIM = 3072
    DNA_DIM = 512

    def __init__(
        self,
        vision_pipeline: Optional[AutomotiveVisionPipeline] = None,
        openai_api_key: Optional[str] = None,
        openai_model: str = "text-embedding-3-large",
        faiss_index_path: Optional[str] = None,
        device: Optional[str] = None,
    ) -> None:
        self.vision = vision_pipeline or AutomotiveVisionPipeline(device=device)
        self.openai_client = OpenAI(api_key=openai_api_key or os.environ["OPENAI_API_KEY"])
        self.openai_model = openai_model

        self._faiss_index: Optional[faiss.IndexFlatIP] = None
        self._id_map: List[int] = []  # Maps FAISS position -> generation_id
        self._metadata_store: Dict[int, dict] = {}

        if faiss_index_path and Path(faiss_index_path).exists():
            self._load_faiss_index(faiss_index_path)

        log.info("embedding_pipeline_ready", openai_model=openai_model)

    # ------------------------------------------------------------------
    # Visual embedding
    # ------------------------------------------------------------------

    def generate_visual_embedding(self, image_paths: List[str]) -> np.ndarray:
        """
        Generate an average-pooled visual embedding across multiple images.

        Each image is processed through the vision pipeline and its CLIP
        embedding is extracted. The resulting embeddings are mean-pooled
        and L2-normalised.

        Args:
            image_paths: List of file system paths or URLs to car images.

        Returns:
            L2-normalised numpy array of shape (1536,).
        """
        if not image_paths:
            return np.zeros(self.VISUAL_DIM, dtype=np.float32)

        embeddings: List[np.ndarray] = []
        for path in image_paths:
            try:
                img = self._load_image(path)
                emb = self.vision.extract_clip_embedding(img)
                embeddings.append(emb)
            except Exception as exc:
                log.warning("visual_embed_failed", path=path, error=str(exc))

        if not embeddings:
            return np.zeros(self.VISUAL_DIM, dtype=np.float32)

        pooled = np.mean(np.stack(embeddings, axis=0), axis=0)
        norm = np.linalg.norm(pooled)
        return (pooled / (norm + 1e-8)).astype(np.float32)

    # ------------------------------------------------------------------
    # Semantic embedding
    # ------------------------------------------------------------------

    def generate_semantic_embedding(self, text: str) -> np.ndarray:
        """
        Generate a semantic embedding using OpenAI text-embedding-3-large.

        Args:
            text: Any textual description of an automotive generation.

        Returns:
            L2-normalised numpy array of shape (3072,).
        """
        if not text or not text.strip():
            return np.zeros(self.SEMANTIC_DIM, dtype=np.float32)

        try:
            response = self.openai_client.embeddings.create(
                model=self.openai_model,
                input=text.strip(),
            )
            emb = np.array(response.data[0].embedding, dtype=np.float32)
            norm = np.linalg.norm(emb)
            return (emb / (norm + 1e-8)).astype(np.float32)
        except Exception as exc:
            log.error("semantic_embed_failed", error=str(exc))
            return np.zeros(self.SEMANTIC_DIM, dtype=np.float32)

    # ------------------------------------------------------------------
    # Combined embedding
    # ------------------------------------------------------------------

    def generate_combined_embedding(
        self,
        images: List[str],
        text: str,
        description: str = "",
    ) -> CombinedEmbedding:
        """
        Generate a fused embedding from visual and semantic modalities.

        Fusion strategy:
          - Visual:   average-pooled CLIP over all images (1536-dim)
          - Semantic: OpenAI embedding of concatenated text + description (3072-dim)
          - DNA:      average design DNA over all images (512-dim)
          - Combined: PCA-projected concat of visual + semantic + dna -> 2048-dim

        Args:
            images: Paths or URLs to car images.
            text: Primary text (e.g. model name + specs).
            description: Optional extended description.

        Returns:
            CombinedEmbedding with all sub-vectors.
        """
        visual_emb = self.generate_visual_embedding(images)

        full_text = f"{text} {description}".strip()
        semantic_emb = self.generate_semantic_embedding(full_text)

        # Design DNA
        dna_embeddings: List[np.ndarray] = []
        for path in images:
            try:
                img = self._load_image(path)
                dna_embeddings.append(self.vision.extract_design_dna_vector(img))
            except Exception:
                pass
        if dna_embeddings:
            dna = np.mean(np.stack(dna_embeddings), axis=0)
            dna /= np.linalg.norm(dna) + 1e-8
        else:
            dna = np.zeros(self.DNA_DIM, dtype=np.float32)

        # Fuse: project each modality to equal part then concat
        v256 = self._project(visual_emb, 768)
        s256 = self._project(semantic_emb, 1024)
        d256 = self._project(dna, 256)
        raw = np.concatenate([v256, s256, d256])  # (2048,)
        norm = np.linalg.norm(raw)
        combined = (raw / (norm + 1e-8)).astype(np.float32)

        return CombinedEmbedding(
            visual_embedding=visual_emb,
            semantic_embedding=semantic_emb,
            design_dna=dna,
            combined=combined,
            image_count=len(images),
            text_length=len(full_text),
        )

    # ------------------------------------------------------------------
    # Brand DNA
    # ------------------------------------------------------------------

    def generate_brand_dna_embedding(self, brand_images: List[str]) -> np.ndarray:
        """
        Compute a brand-level Design DNA embedding by averaging over all models.

        Args:
            brand_images: List of paths to all available brand images.

        Returns:
            L2-normalised numpy array of shape (512,).
        """
        dna_vecs: List[np.ndarray] = []
        for path in brand_images:
            try:
                img = self._load_image(path)
                dna_vecs.append(self.vision.extract_design_dna_vector(img))
            except Exception as exc:
                log.warning("brand_dna_image_failed", path=path, error=str(exc))

        if not dna_vecs:
            return np.zeros(self.DNA_DIM, dtype=np.float32)

        brand_dna = np.mean(np.stack(dna_vecs), axis=0)
        norm = np.linalg.norm(brand_dna)
        return (brand_dna / (norm + 1e-8)).astype(np.float32)

    # ------------------------------------------------------------------
    # Generation fingerprint
    # ------------------------------------------------------------------

    def compute_generation_fingerprint(self, generation_data: dict) -> GenerationFingerprint:
        """
        Compute a complete GenerationFingerprint from a generation data dict.

        Expected dict keys:
          - id (int): Database generation ID.
          - images (List[str]): Image paths or URLs.
          - name (str): Generation code name (e.g. "BMW F30").
          - description (str): Textual description.
          - year_start (int): Production start year.
          - year_end (int): Production end year.
          - brand (str): Brand name.
          - model (str): Model name.

        Args:
            generation_data: Dict with generation metadata.

        Returns:
            GenerationFingerprint.
        """
        gen_id = generation_data.get("id", 0)
        images = generation_data.get("images", [])
        text = (
            f"{generation_data.get('brand', '')} {generation_data.get('model', '')} "
            f"{generation_data.get('name', '')} "
            f"{generation_data.get('year_start', '')}–{generation_data.get('year_end', '')}"
        )
        description = generation_data.get("description", "")

        combined = self.generate_combined_embedding(images, text, description)

        return GenerationFingerprint(
            generation_id=gen_id,
            visual_embedding=combined.visual_embedding,
            semantic_embedding=combined.semantic_embedding,
            design_dna=combined.design_dna,
            combined_embedding=combined.combined,
            metadata={
                "brand": generation_data.get("brand"),
                "model": generation_data.get("model"),
                "name": generation_data.get("name"),
                "year_start": generation_data.get("year_start"),
                "year_end": generation_data.get("year_end"),
            },
        )

    def batch_embed_generations(
        self, generation_ids: List[int], db_fetch_fn=None
    ) -> Dict[int, GenerationFingerprint]:
        """
        Batch-compute fingerprints for a list of generation IDs.

        Args:
            generation_ids: List of database generation IDs.
            db_fetch_fn: Callable(id) -> dict that fetches generation data.
                         If None, returns empty fingerprints for all IDs.

        Returns:
            Dict mapping generation_id -> GenerationFingerprint.
        """
        results: Dict[int, GenerationFingerprint] = {}
        for gid in generation_ids:
            try:
                if db_fetch_fn is not None:
                    data = db_fetch_fn(gid)
                else:
                    data = {"id": gid}
                results[gid] = self.compute_generation_fingerprint(data)
                log.info("generation_fingerprint_computed", generation_id=gid)
            except Exception as exc:
                log.error("generation_fingerprint_failed", generation_id=gid, error=str(exc))
        return results

    # ------------------------------------------------------------------
    # FAISS index
    # ------------------------------------------------------------------

    def update_faiss_index(
        self, embeddings: Dict[int, np.ndarray], index_path: str
    ) -> None:
        """
        Upsert generation embeddings into the FAISS flat inner-product index.

        Inner-product on L2-normalised vectors equals cosine similarity.
        The index is rebuilt from scratch on each call to ensure consistency.

        Args:
            embeddings: Dict mapping generation_id -> combined embedding (2048,).
            index_path: File path to persist the FAISS index + metadata.
        """
        if not embeddings:
            log.warning("update_faiss_index_called_with_empty_embeddings")
            return

        dim = next(iter(embeddings.values())).shape[0]
        index = faiss.IndexFlatIP(dim)

        id_map: List[int] = []
        vectors = []
        for gen_id, emb in embeddings.items():
            vec = emb.astype(np.float32).reshape(1, -1)
            faiss.normalize_L2(vec)
            vectors.append(vec)
            id_map.append(gen_id)

        all_vectors = np.vstack(vectors)
        index.add(all_vectors)

        self._faiss_index = index
        self._id_map = id_map

        # Persist
        faiss.write_index(index, f"{index_path}.faiss")
        with open(f"{index_path}.meta", "wb") as fh:
            pickle.dump({"id_map": id_map, "metadata": self._metadata_store}, fh)

        log.info("faiss_index_updated", n_vectors=len(id_map), path=index_path)

    def search_similar(
        self,
        query_embedding: np.ndarray,
        k: int = 20,
        min_similarity: float = 0.7,
    ) -> List[SimilarityResult]:
        """
        Find the top-k most similar generations to a query embedding.

        Args:
            query_embedding: Query vector (must match index dimension).
            k: Maximum number of results to return.
            min_similarity: Minimum cosine similarity threshold.

        Returns:
            List of SimilarityResult ordered by similarity (descending).
        """
        if self._faiss_index is None:
            log.error("faiss_index_not_loaded")
            return []

        query = query_embedding.astype(np.float32).reshape(1, -1)
        faiss.normalize_L2(query)

        k_actual = min(k, self._faiss_index.ntotal)
        if k_actual == 0:
            return []

        distances, indices = self._faiss_index.search(query, k_actual)

        results: List[SimilarityResult] = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(self._id_map):
                continue
            similarity = float(dist)  # inner product of L2-normed == cosine
            if similarity < min_similarity:
                continue
            gen_id = self._id_map[idx]
            results.append(
                SimilarityResult(
                    generation_id=gen_id,
                    similarity=similarity,
                    distance=1.0 - similarity,
                    metadata=self._metadata_store.get(gen_id, {}),
                )
            )

        return sorted(results, key=lambda r: r.similarity, reverse=True)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_faiss_index(self, index_path: str) -> None:
        try:
            self._faiss_index = faiss.read_index(f"{index_path}.faiss")
            meta_path = f"{index_path}.meta"
            if Path(meta_path).exists():
                with open(meta_path, "rb") as fh:
                    meta = pickle.load(fh)
                    self._id_map = meta.get("id_map", [])
                    self._metadata_store = meta.get("metadata", {})
            log.info("faiss_index_loaded", n_vectors=self._faiss_index.ntotal)
        except Exception as exc:
            log.warning("faiss_index_load_failed", error=str(exc))

    @staticmethod
    def _load_image(path_or_url: str) -> Image.Image:
        if path_or_url.startswith(("http://", "https://")):
            import urllib.request
            import io
            with urllib.request.urlopen(path_or_url, timeout=10) as resp:
                data = resp.read()
            return Image.open(io.BytesIO(data)).convert("RGB")
        return Image.open(path_or_url).convert("RGB")

    @staticmethod
    def _project(emb: np.ndarray, target_dim: int) -> np.ndarray:
        """Deterministic linear projection to target_dim."""
        src = emb.shape[0]
        if src == target_dim:
            return emb.astype(np.float32)
        rng = np.random.default_rng(seed=src * 1000 + target_dim)
        mat = rng.standard_normal((src, target_dim)).astype(np.float32)
        # QR for orthonormality
        if src >= target_dim:
            q, _ = np.linalg.qr(mat)
            mat = q[:, :target_dim]
        result = emb @ mat
        return result.astype(np.float32)
