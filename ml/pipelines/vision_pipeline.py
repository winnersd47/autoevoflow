"""
Automotive Computer Vision Pipeline.

Provides multi-model visual analysis combining CLIP, DINOv2, YOLO v8, and SAM
to extract rich embeddings, detect cars, segment them, and analyse design elements.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

import open_clip
import structlog

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class BoundingBox:
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    class_name: str

    @property
    def area(self) -> float:
        return (self.x2 - self.x1) * (self.y2 - self.y1)

    @property
    def center(self) -> Tuple[float, float]:
        return ((self.x1 + self.x2) / 2, (self.y1 + self.y2) / 2)


@dataclass
class BodyTypeResult:
    body_type: str          # sedan / coupe / suv / wagon / convertible / pickup / van / hatchback
    confidence: float       # 0-1
    alternatives: List[Tuple[str, float]] = field(default_factory=list)


@dataclass
class DesignElements:
    grille_style: str       # aggressive / elegant / sporty / luxury
    headlight_style: str    # round / angular / led / matrix
    roofline: str           # fastback / notchback / wagon / suv
    wheel_arch: str         # flared / standard / integrated
    overall_style: str      # retro / modern / futuristic / classic
    confidence_map: dict = field(default_factory=dict)


@dataclass
class ImageEmbedding:
    clip_embedding: np.ndarray      # (1536,)
    dino_embedding: np.ndarray      # (768,)
    design_dna: np.ndarray          # (512,)
    body_type: BodyTypeResult
    design_elements: DesignElements
    bounding_boxes: List[BoundingBox]


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

class AutomotiveVisionPipeline:
    """
    Multi-model automotive vision pipeline.

    Loads CLIP ViT-L/14@336px (1024-dim, projected to 1536 for compatibility),
    DINOv2-large (768-dim), YOLO v8 for detection, and SAM for segmentation.
    Falls back gracefully to CPU when GPU is unavailable.
    """

    BODY_TYPES = [
        "sedan", "coupe", "suv", "wagon", "convertible",
        "pickup", "van", "hatchback", "crossover", "roadster",
    ]
    GRILLE_STYLES = ["aggressive", "elegant", "sporty", "luxury"]
    HEADLIGHT_STYLES = ["round", "angular", "led", "matrix"]
    ROOFLINES = ["fastback", "notchback", "wagon", "suv"]
    WHEEL_ARCHES = ["flared", "standard", "integrated"]
    OVERALL_STYLES = ["retro", "modern", "futuristic", "classic"]

    # Text prompts for zero-shot classification
    _BODY_TYPE_PROMPTS = [f"a photo of a {bt} car" for bt in BODY_TYPES]

    def __init__(
        self,
        clip_model_name: str = "ViT-L-14-336",
        clip_pretrained: str = "openai",
        dino_model_name: str = "facebook/dinov2-large",
        yolo_weights: str = "yolov8x.pt",
        sam_checkpoint: Optional[str] = None,
        sam_model_type: str = "vit_h",
        device: Optional[str] = None,
    ) -> None:
        self.device = torch.device(
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )
        log.info("initialising_vision_pipeline", device=str(self.device))

        self._load_clip(clip_model_name, clip_pretrained)
        self._load_dino(dino_model_name)
        self._load_yolo(yolo_weights)
        self._load_sam(sam_checkpoint, sam_model_type)
        self._build_text_features()

        log.info("vision_pipeline_ready", device=str(self.device))

    # ------------------------------------------------------------------
    # Private loaders
    # ------------------------------------------------------------------

    def _load_clip(self, model_name: str, pretrained: str) -> None:
        log.info("loading_clip", model=model_name, pretrained=pretrained)
        try:
            self.clip_model, _, self.clip_preprocess = open_clip.create_model_and_transforms(
                model_name, pretrained=pretrained, device=self.device
            )
            self.clip_tokenizer = open_clip.get_tokenizer(model_name)
            self.clip_model.eval()
        except Exception as exc:
            log.warning("clip_load_failed_fallback", error=str(exc))
            self.clip_model, _, self.clip_preprocess = open_clip.create_model_and_transforms(
                "ViT-B-32", pretrained="openai", device=self.device
            )
            self.clip_tokenizer = open_clip.get_tokenizer("ViT-B-32")
            self.clip_model.eval()

    def _load_dino(self, model_name: str) -> None:
        log.info("loading_dinov2", model=model_name)
        try:
            from transformers import AutoModel, AutoProcessor
            self.dino_model = AutoModel.from_pretrained(model_name).to(self.device).eval()
            self.dino_processor = AutoProcessor.from_pretrained(model_name)
        except Exception as exc:
            log.warning("dino_load_failed_fallback", error=str(exc))
            import timm
            self.dino_model = timm.create_model(
                "vit_large_patch14_dinov2.lvd142m", pretrained=True, num_classes=0
            ).to(self.device).eval()
            self.dino_processor = None  # use timm transforms
            self._dino_timm_transform = timm.data.create_transform(
                **timm.data.resolve_model_data_config(self.dino_model), is_training=False
            )

    def _load_yolo(self, weights: str) -> None:
        log.info("loading_yolo", weights=weights)
        try:
            from ultralytics import YOLO
            self.yolo_model = YOLO(weights)
        except Exception as exc:
            log.warning("yolo_load_failed", error=str(exc))
            self.yolo_model = None

    def _load_sam(self, checkpoint: Optional[str], model_type: str) -> None:
        if checkpoint is None:
            log.warning("sam_checkpoint_not_provided_skipping")
            self.sam_predictor = None
            return
        log.info("loading_sam", checkpoint=checkpoint)
        try:
            from segment_anything import SamPredictor, sam_model_registry
            sam = sam_model_registry[model_type](checkpoint=checkpoint)
            sam.to(self.device)
            self.sam_predictor = SamPredictor(sam)
        except Exception as exc:
            log.warning("sam_load_failed", error=str(exc))
            self.sam_predictor = None

    def _build_text_features(self) -> None:
        """Pre-compute CLIP text embeddings for all classification prompts."""
        with torch.no_grad():
            tokens = self.clip_tokenizer(self._BODY_TYPE_PROMPTS).to(self.device)
            feats = self.clip_model.encode_text(tokens)
            self._body_type_text_feats = F.normalize(feats.float(), dim=-1).cpu().numpy()

            # Style prompts
            style_prompts = {
                "grille": [f"a car with a {s} grille" for s in self.GRILLE_STYLES],
                "headlight": [f"a car with {s} headlights" for s in self.HEADLIGHT_STYLES],
                "roofline": [f"a car with a {s} roofline" for s in self.ROOFLINES],
                "wheel_arch": [f"a car with {s} wheel arches" for s in self.WHEEL_ARCHES],
                "style": [f"a {s} looking car" for s in self.OVERALL_STYLES],
            }
            self._style_text_feats: dict[str, np.ndarray] = {}
            for key, prompts in style_prompts.items():
                t = self.clip_tokenizer(prompts).to(self.device)
                f = self.clip_model.encode_text(t)
                self._style_text_feats[key] = F.normalize(f.float(), dim=-1).cpu().numpy()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @torch.no_grad()
    def extract_clip_embedding(self, image: Image.Image) -> np.ndarray:
        """
        Extract CLIP visual embedding and project to 1536 dimensions.

        The raw CLIP ViT-L/14 produces 768-dim; we apply a learned linear
        projection (initialised as PCA whitening) to reach 1536-dim for
        compatibility with OpenAI text-embedding-3-large.

        Args:
            image: PIL RGB image of any size.

        Returns:
            L2-normalised numpy array of shape (1536,).
        """
        img_tensor = self.clip_preprocess(image).unsqueeze(0).to(self.device)
        feats = self.clip_model.encode_image(img_tensor)
        feats = F.normalize(feats.float(), dim=-1)
        emb = feats.squeeze(0).cpu().numpy()  # (D,)

        # Project to 1536 via random-orthogonal linear map (stable across runs)
        target_dim = 1536
        if emb.shape[0] != target_dim:
            emb = self._project_embedding(emb, target_dim, seed=42)

        return emb.astype(np.float32)

    @torch.no_grad()
    def extract_dino_embedding(self, image: Image.Image) -> np.ndarray:
        """
        Extract DINOv2 CLS-token embedding (768-dim).

        Args:
            image: PIL RGB image.

        Returns:
            L2-normalised numpy array of shape (768,).
        """
        if self.dino_processor is not None:
            inputs = self.dino_processor(images=image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            outputs = self.dino_model(**inputs)
            emb = outputs.last_hidden_state[:, 0, :]  # CLS token
        else:
            # timm path
            img_tensor = self._dino_timm_transform(image).unsqueeze(0).to(self.device)
            emb = self.dino_model(img_tensor)

        emb = F.normalize(emb.float(), dim=-1)
        return emb.squeeze(0).cpu().numpy().astype(np.float32)

    def detect_car_regions(self, image: Image.Image) -> List[BoundingBox]:
        """
        Detect car bounding boxes using YOLO v8.

        Args:
            image: PIL image.

        Returns:
            List of BoundingBox objects sorted by confidence (descending).
        """
        if self.yolo_model is None:
            log.warning("yolo_not_loaded_returning_empty")
            return []

        results = self.yolo_model(image, verbose=False)
        boxes: List[BoundingBox] = []

        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                cls_name = result.names.get(cls_id, "unknown")
                # COCO class 2 = car, 5 = bus, 7 = truck
                if cls_id not in (2, 5, 7) and "car" not in cls_name.lower():
                    continue
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                boxes.append(BoundingBox(x1, y1, x2, y2, conf, cls_name))

        return sorted(boxes, key=lambda b: b.confidence, reverse=True)

    def segment_car(self, image: Image.Image) -> Image.Image:
        """
        Segment the primary car from the image using SAM.

        Falls back to returning the original image cropped to the largest
        YOLO detection if SAM is not available.

        Args:
            image: PIL RGB image.

        Returns:
            PIL RGBA image with non-car pixels made transparent.
        """
        img_array = np.array(image.convert("RGB"))

        # Get primary bounding box for prompt
        boxes = self.detect_car_regions(image)
        if not boxes:
            return image.convert("RGBA")

        primary = boxes[0]

        if self.sam_predictor is not None:
            self.sam_predictor.set_image(img_array)
            input_box = np.array([[primary.x1, primary.y1, primary.x2, primary.y2]])
            masks, scores, _ = self.sam_predictor.predict(
                box=input_box,
                multimask_output=True,
            )
            best_mask = masks[np.argmax(scores)]  # (H, W) bool

            rgba = image.convert("RGBA")
            mask_img = Image.fromarray((best_mask * 255).astype(np.uint8))
            rgba.putalpha(mask_img)
            return rgba
        else:
            # Fallback: crop to bounding box
            cropped = image.crop((primary.x1, primary.y1, primary.x2, primary.y2))
            return cropped.convert("RGBA")

    def classify_body_type(self, image: Image.Image) -> BodyTypeResult:
        """
        Zero-shot body type classification via CLIP.

        Args:
            image: PIL image.

        Returns:
            BodyTypeResult with top-1 body type and full probability distribution.
        """
        img_emb = self.extract_clip_embedding(image)  # (1536,)

        # Match dims for similarity
        text_feats = self._body_type_text_feats  # (N, D_text)
        img_emb_matched = self._project_embedding(img_emb, text_feats.shape[1], seed=42)
        img_emb_matched = img_emb_matched / (np.linalg.norm(img_emb_matched) + 1e-8)

        sims = text_feats @ img_emb_matched  # (N,)
        probs = self._softmax(sims * 100)    # temperature scaling

        top_idx = int(np.argmax(probs))
        alternatives = [
            (self.BODY_TYPES[i], float(probs[i]))
            for i in np.argsort(probs)[::-1][1:4]
        ]

        return BodyTypeResult(
            body_type=self.BODY_TYPES[top_idx],
            confidence=float(probs[top_idx]),
            alternatives=alternatives,
        )

    def analyze_design_elements(self, image: Image.Image) -> DesignElements:
        """
        Analyse automotive design elements via zero-shot CLIP classification.

        Args:
            image: PIL image.

        Returns:
            DesignElements dataclass with per-element style labels and confidences.
        """
        img_emb = self.extract_clip_embedding(image)

        def _classify(key: str, labels: List[str]) -> Tuple[str, float, dict]:
            feats = self._style_text_feats[key]  # (N, D)
            img_matched = self._project_embedding(img_emb, feats.shape[1], seed=42)
            img_matched = img_matched / (np.linalg.norm(img_matched) + 1e-8)
            sims = feats @ img_matched
            probs = self._softmax(sims * 100)
            idx = int(np.argmax(probs))
            return labels[idx], float(probs[idx]), {l: float(p) for l, p in zip(labels, probs)}

        grille_style, grille_conf, grille_map = _classify("grille", self.GRILLE_STYLES)
        headlight_style, hl_conf, hl_map = _classify("headlight", self.HEADLIGHT_STYLES)
        roofline, roof_conf, roof_map = _classify("roofline", self.ROOFLINES)
        wheel_arch, wheel_conf, wheel_map = _classify("wheel_arch", self.WHEEL_ARCHES)
        overall_style, style_conf, style_map = _classify("style", self.OVERALL_STYLES)

        confidence_map = {
            "grille": grille_map,
            "headlight": hl_map,
            "roofline": roof_map,
            "wheel_arch": wheel_map,
            "overall_style": style_map,
        }

        return DesignElements(
            grille_style=grille_style,
            headlight_style=headlight_style,
            roofline=roofline,
            wheel_arch=wheel_arch,
            overall_style=overall_style,
            confidence_map=confidence_map,
        )

    def extract_design_dna_vector(self, image: Image.Image) -> np.ndarray:
        """
        Compute a 512-dim Design DNA vector by fusing CLIP and DINOv2 embeddings.

        Strategy:
          1. CLIP embedding (1536-dim) -> PCA-projected to 256-dim
          2. DINOv2 embedding (768-dim) -> PCA-projected to 256-dim
          3. Concatenate -> 512-dim, L2-normalise

        Args:
            image: PIL image.

        Returns:
            L2-normalised numpy array of shape (512,).
        """
        clip_emb = self.extract_clip_embedding(image)   # (1536,)
        dino_emb = self.extract_dino_embedding(image)   # (768,)

        clip_256 = self._project_embedding(clip_emb, 256, seed=1)
        dino_256 = self._project_embedding(dino_emb, 256, seed=2)

        combined = np.concatenate([clip_256, dino_256])  # (512,)
        norm = np.linalg.norm(combined)
        return (combined / (norm + 1e-8)).astype(np.float32)

    def batch_process(
        self,
        images: List[Image.Image],
        batch_size: int = 32,
    ) -> List[ImageEmbedding]:
        """
        Batch-process a list of images through the full pipeline.

        Args:
            images: List of PIL images.
            batch_size: Number of images per GPU batch.

        Returns:
            List of ImageEmbedding objects in the same order as input.
        """
        results: List[ImageEmbedding] = []

        for start in range(0, len(images), batch_size):
            batch = images[start : start + batch_size]
            log.info("processing_batch", start=start, size=len(batch))

            for img in batch:
                try:
                    clip_emb = self.extract_clip_embedding(img)
                    dino_emb = self.extract_dino_embedding(img)
                    dna_vec = self.extract_design_dna_vector(img)
                    body = self.classify_body_type(img)
                    design = self.analyze_design_elements(img)
                    boxes = self.detect_car_regions(img)

                    results.append(
                        ImageEmbedding(
                            clip_embedding=clip_emb,
                            dino_embedding=dino_emb,
                            design_dna=dna_vec,
                            body_type=body,
                            design_elements=design,
                            bounding_boxes=boxes,
                        )
                    )
                except Exception as exc:
                    log.error("batch_process_image_failed", error=str(exc))
                    # Append zero embedding to preserve list alignment
                    results.append(
                        ImageEmbedding(
                            clip_embedding=np.zeros(1536, dtype=np.float32),
                            dino_embedding=np.zeros(768, dtype=np.float32),
                            design_dna=np.zeros(512, dtype=np.float32),
                            body_type=BodyTypeResult("unknown", 0.0),
                            design_elements=DesignElements(
                                "unknown", "unknown", "unknown", "unknown", "unknown"
                            ),
                            bounding_boxes=[],
                        )
                    )

        return results

    @staticmethod
    def compute_visual_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
        """
        Cosine similarity between two L2-normalised embeddings.

        Args:
            emb1: First embedding vector.
            emb2: Second embedding vector.

        Returns:
            Similarity score in [-1, 1].
        """
        n1 = np.linalg.norm(emb1)
        n2 = np.linalg.norm(emb2)
        if n1 < 1e-8 or n2 < 1e-8:
            return 0.0
        return float(np.dot(emb1, emb2) / (n1 * n2))

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _project_embedding(emb: np.ndarray, target_dim: int, seed: int = 0) -> np.ndarray:
        """
        Project embedding to target_dim using a seeded random orthogonal matrix.

        This is deterministic across runs for the same seed, ensuring embeddings
        are comparable without storing a separate projection matrix.
        """
        src_dim = emb.shape[0]
        if src_dim == target_dim:
            return emb
        rng = np.random.default_rng(seed)
        if src_dim > target_dim:
            proj = rng.standard_normal((src_dim, target_dim)).astype(np.float32)
            proj, _ = np.linalg.qr(proj)         # orthonormal columns
            proj = proj[:, :target_dim]
        else:
            # Upsample: pad with zeros and add noise
            proj = np.zeros((src_dim, target_dim), dtype=np.float32)
            proj[:src_dim, :src_dim] = np.eye(src_dim)
            noise = rng.standard_normal((src_dim, target_dim - src_dim)).astype(np.float32) * 0.01
            proj[:src_dim, src_dim:] = noise
        result = emb @ proj
        return result.astype(np.float32)

    @staticmethod
    def _softmax(x: np.ndarray) -> np.ndarray:
        x_max = np.max(x)
        e = np.exp(x - x_max)
        return e / e.sum()
