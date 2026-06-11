"""
Fine-tuning Pipeline for Automotive CLIP Embeddings.

Fine-tunes OpenCLIP ViT-L/14 with a contrastive objective on automotive
image pairs, learning a richer design-similarity space than the generic
CLIP pretraining provides.

Pair construction strategy:
  - Positive: same model, consecutive/same-era generations (target sim ≈ 0.90)
  - Hard negative: different models, same brand (target sim ≈ 0.55)
  - Easy negative: different brands (target sim ≈ 0.20)

Training features:
  - InfoNCE / NT-Xent contrastive loss with learnable temperature
  - Linear warm-up + cosine LR schedule
  - Gradient clipping and mixed-precision (fp16 on CUDA)
  - Weights & Biases logging
  - Best-checkpoint saving based on validation R@1
  - Early stopping with configurable patience
"""

from __future__ import annotations

import json
import math
import os
import random
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import open_clip
import structlog
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torch.cuda.amp import GradScaler, autocast
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR, LinearLR, SequentialLR
from torch.utils.data import DataLoader, Dataset

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------


@dataclass
class TrainingConfig:
    """All hyper-parameters for the fine-tuning run."""

    # Model
    model_name: str = "ViT-L-14"
    pretrained: str = "openai"

    # Training
    batch_size: int = 64
    learning_rate: float = 1e-5
    weight_decay: float = 0.01
    epochs: int = 20
    warmup_steps: int = 500
    gradient_clip_norm: float = 1.0
    mixed_precision: bool = True

    # Loss
    temperature: float = 0.07
    learnable_temperature: bool = True

    # Data
    train_val_split: float = 0.85
    num_workers: int = 4
    image_size: int = 224

    # Early stopping
    early_stopping_patience: int = 5
    min_delta: float = 1e-4

    # Checkpointing
    output_dir: str = "./checkpoints"
    save_every_n_epochs: int = 2

    # Logging
    wandb_project: str = "automotive-clip"
    wandb_entity: Optional[str] = None
    log_every_n_steps: int = 50


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------


class AutomotiveDataset(Dataset):
    """
    Dataset of automotive image pairs with continuous similarity labels.

    Args:
        pairs: List of (image1_path, image2_path, similarity_score) tuples.
               Similarity scores should be in [0, 1]:
                 - ~0.90 : same model, consecutive generation or different photos
                 - ~0.55 : different models, same brand
                 - ~0.20 : different brands
        transform: torchvision or albumentations transform applied to both images.
                   If None, a default CLIP-compatible transform is applied.
    """

    def __init__(
        self,
        pairs: List[Tuple[str, str, float]],
        transform=None,
    ) -> None:
        self.pairs = pairs
        if transform is None:
            _, self.transform = open_clip.create_model_and_transforms(
                "ViT-L-14", pretrained=None
            )
        else:
            self.transform = transform

    def __len__(self) -> int:
        return len(self.pairs)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        path1, path2, similarity = self.pairs[idx]

        img1 = self._load_image(path1)
        img2 = self._load_image(path2)

        if self.transform:
            img1 = self.transform(img1)
            img2 = self.transform(img2)

        return img1, img2, torch.tensor(similarity, dtype=torch.float32)

    @staticmethod
    def _load_image(path: str) -> Image.Image:
        """Load image with fallback to a blank placeholder on error."""
        try:
            return Image.open(path).convert("RGB")
        except Exception as exc:
            log.warning("image_load_failed", path=path, error=str(exc))
            return Image.new("RGB", (224, 224), color=(128, 128, 128))


# ---------------------------------------------------------------------------
# Loss
# ---------------------------------------------------------------------------


class ContrastiveLoss(nn.Module):
    """
    InfoNCE / NT-Xent contrastive loss for embedding training.

    When labels are provided, pairs with similarity > pos_threshold are
    treated as positives. Otherwise, the diagonal (i==j) is the positive.

    Args:
        temperature: Softmax temperature (learnable if learnable=True).
        learnable: If True, temperature is an nn.Parameter.
        pos_threshold: Minimum similarity to treat a pair as positive.
    """

    def __init__(
        self,
        temperature: float = 0.07,
        learnable: bool = True,
        pos_threshold: float = 0.70,
    ) -> None:
        super().__init__()
        self.pos_threshold = pos_threshold

        if learnable:
            # Clamp log_temp to [log(0.01), log(1.0)] following CLIP paper
            self.log_temp = nn.Parameter(torch.tensor(math.log(temperature)))
        else:
            self.register_buffer("log_temp", torch.tensor(math.log(temperature)))

    @property
    def temperature(self) -> torch.Tensor:
        return self.log_temp.exp().clamp(0.01, 1.0)

    def forward(
        self,
        embeddings1: torch.Tensor,
        embeddings2: torch.Tensor,
        labels: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """
        Compute symmetric InfoNCE loss.

        Args:
            embeddings1: L2-normalised (B, D) tensor.
            embeddings2: L2-normalised (B, D) tensor.
            labels: Optional (B,) float tensor of pair similarities.

        Returns:
            Scalar loss.
        """
        # Ensure L2 normalised
        e1 = F.normalize(embeddings1, dim=-1)
        e2 = F.normalize(embeddings2, dim=-1)

        # Cosine similarity matrix (B x B)
        logits = torch.matmul(e1, e2.T) / self.temperature  # (B, B)

        B = logits.size(0)

        if labels is not None and labels.ndim == 1:
            # Build soft label matrix: pairs (i, j) share same positive group
            # when their similarity exceeds pos_threshold.
            # Default positive = diagonal.
            label_matrix = torch.eye(B, device=logits.device)
            if labels.numel() == B:
                high_sim_mask = (labels.unsqueeze(1) >= self.pos_threshold) & \
                                (labels.unsqueeze(0) >= self.pos_threshold)
                label_matrix = label_matrix + high_sim_mask.float()
                label_matrix = label_matrix.clamp(0, 1)
                # Normalise rows to sum to 1
                row_sums = label_matrix.sum(dim=1, keepdim=True).clamp(min=1)
                label_matrix = label_matrix / row_sums
        else:
            label_matrix = torch.eye(B, device=logits.device)

        # Symmetric cross-entropy
        loss_i2t = self._cross_entropy(logits, label_matrix)
        loss_t2i = self._cross_entropy(logits.T, label_matrix.T)
        return (loss_i2t + loss_t2i) / 2

    @staticmethod
    def _cross_entropy(logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """KL-divergence style cross-entropy with soft targets."""
        log_probs = F.log_softmax(logits, dim=-1)
        return -(targets * log_probs).sum(dim=-1).mean()


# ---------------------------------------------------------------------------
# Trainer
# ---------------------------------------------------------------------------


class AutomotiveCLIPTrainer:
    """
    Orchestrates the full fine-tuning lifecycle for an automotive CLIP model.

    Usage:
        config = TrainingConfig(batch_size=32, epochs=10)
        trainer = AutomotiveCLIPTrainer(config)
        trainer.load_model()
        pairs = trainer.build_training_pairs(generations_db)
        trainer.train(pairs[:split], pairs[split:])
        trainer.export_model("./my_automotive_clip.pt")
    """

    def __init__(self, config: TrainingConfig) -> None:
        self.config = config
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.logger = structlog.get_logger(__name__)
        self.model: Optional[nn.Module] = None
        self.preprocess = None
        self._scaler = GradScaler(enabled=config.mixed_precision and self.device == "cuda")
        self._best_val_metric = -float("inf")
        self._patience_counter = 0
        self._global_step = 0

        Path(config.output_dir).mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def load_model(self) -> None:
        """
        Load the CLIP model specified in config for fine-tuning.

        Only the visual encoder and final projection are unfrozen by default;
        the text encoder is frozen to prevent catastrophic forgetting.
        """
        self.logger.info(
            "loading_clip_model",
            model_name=self.config.model_name,
            pretrained=self.config.pretrained,
        )
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            self.config.model_name,
            pretrained=self.config.pretrained,
        )
        self.model = self.model.to(self.device)

        # Freeze text encoder
        for name, param in self.model.named_parameters():
            if "transformer" in name and "visual" not in name:
                param.requires_grad = False

        trainable = sum(p.numel() for p in self.model.parameters() if p.requires_grad)
        total = sum(p.numel() for p in self.model.parameters())
        self.logger.info(
            "model_loaded",
            trainable_params=trainable,
            total_params=total,
            pct_trainable=f"{trainable/total*100:.1f}%",
        )

    # ------------------------------------------------------------------
    # Pair construction
    # ------------------------------------------------------------------

    def build_training_pairs(
        self, generations_db: List[dict]
    ) -> List[Tuple[str, str, float]]:
        """
        Build contrastive training pairs from the automotive database.

        Pair types and similarity targets:
          - Positive (sim=0.90-0.95): Same model, consecutive generations;
            same model, different photo angles.
          - Hard negative (sim=0.45-0.65): Different models, same brand;
            same model, non-consecutive generations (>2 gens apart).
          - Easy negative (sim=0.05-0.25): Different brands entirely.

        Args:
            generations_db: List of generation dicts, each with:
                - id, brand, model, year_start, image_paths (List[str])

        Returns:
            List of (path1, path2, similarity) tuples, balanced across pair types.
        """
        pairs: List[Tuple[str, str, float]] = []

        # Group by brand/model
        by_model: Dict[str, List[dict]] = {}
        by_brand: Dict[str, List[dict]] = {}

        for gen in generations_db:
            key = f"{gen['brand']}::{gen['model']}"
            by_model.setdefault(key, []).append(gen)
            by_brand.setdefault(gen["brand"], []).append(gen)

        # --- Positives: consecutive generations of the same model ---
        for model_key, gens in by_model.items():
            sorted_gens = sorted(gens, key=lambda g: g.get("year_start", 0))
            for i in range(len(sorted_gens) - 1):
                g1, g2 = sorted_gens[i], sorted_gens[i + 1]
                imgs1 = g1.get("image_paths", [])
                imgs2 = g2.get("image_paths", [])
                if imgs1 and imgs2:
                    # Use up to 3 pairs per consecutive generation pair
                    for _ in range(min(3, len(imgs1), len(imgs2))):
                        p1 = random.choice(imgs1)
                        p2 = random.choice(imgs2)
                        pairs.append((p1, p2, random.uniform(0.85, 0.95)))

            # Same generation, different photos (strongest positive)
            for gen in sorted_gens:
                imgs = gen.get("image_paths", [])
                if len(imgs) >= 2:
                    sampled = random.sample(imgs, min(4, len(imgs)))
                    for j in range(len(sampled) - 1):
                        pairs.append((sampled[j], sampled[j + 1], random.uniform(0.92, 0.98)))

        # --- Hard negatives: same brand, different models ---
        for brand, gens in by_brand.items():
            # Group by model within brand
            model_groups: Dict[str, List[str]] = {}
            for gen in gens:
                model_groups.setdefault(gen["model"], []).extend(
                    gen.get("image_paths", [])
                )
            model_names = list(model_groups.keys())
            if len(model_names) < 2:
                continue
            for _ in range(min(20, len(model_names) ** 2)):
                m1, m2 = random.sample(model_names, 2)
                imgs1 = model_groups[m1]
                imgs2 = model_groups[m2]
                if imgs1 and imgs2:
                    pairs.append(
                        (random.choice(imgs1), random.choice(imgs2), random.uniform(0.40, 0.65))
                    )

        # --- Easy negatives: different brands ---
        brand_names = list(by_brand.keys())
        all_images: Dict[str, List[str]] = {
            b: [p for g in gens for p in g.get("image_paths", [])]
            for b, gens in by_brand.items()
        }
        n_easy = min(len(pairs), 500)  # balance with positives
        for _ in range(n_easy):
            if len(brand_names) < 2:
                break
            b1, b2 = random.sample(brand_names, 2)
            imgs1 = all_images.get(b1, [])
            imgs2 = all_images.get(b2, [])
            if imgs1 and imgs2:
                pairs.append(
                    (random.choice(imgs1), random.choice(imgs2), random.uniform(0.05, 0.25))
                )

        random.shuffle(pairs)
        self.logger.info(
            "training_pairs_built",
            total_pairs=len(pairs),
            n_positives=sum(1 for _, _, s in pairs if s >= 0.75),
            n_hard_neg=sum(1 for _, _, s in pairs if 0.35 <= s < 0.75),
            n_easy_neg=sum(1 for _, _, s in pairs if s < 0.35),
        )
        return pairs

    # ------------------------------------------------------------------
    # Training epoch
    # ------------------------------------------------------------------

    def train_epoch(
        self,
        dataloader: DataLoader,
        optimizer: torch.optim.Optimizer,
        loss_fn: ContrastiveLoss,
    ) -> float:
        """
        Run a single training epoch.

        Args:
            dataloader: Training DataLoader.
            optimizer: Configured optimizer (AdamW recommended).
            loss_fn: ContrastiveLoss module.

        Returns:
            Average loss for the epoch.
        """
        self.model.train()
        loss_fn.train()

        total_loss = 0.0
        num_batches = 0

        for batch_idx, (img1, img2, labels) in enumerate(dataloader):
            img1 = img1.to(self.device, non_blocking=True)
            img2 = img2.to(self.device, non_blocking=True)
            labels = labels.to(self.device, non_blocking=True)

            optimizer.zero_grad(set_to_none=True)

            with autocast(enabled=self.config.mixed_precision and self.device == "cuda"):
                emb1 = self.model.encode_image(img1)
                emb2 = self.model.encode_image(img2)
                emb1 = F.normalize(emb1, dim=-1)
                emb2 = F.normalize(emb2, dim=-1)
                loss = loss_fn(emb1, emb2, labels)

            self._scaler.scale(loss).backward()
            self._scaler.unscale_(optimizer)
            nn.utils.clip_grad_norm_(
                self.model.parameters(), self.config.gradient_clip_norm
            )
            self._scaler.step(optimizer)
            self._scaler.update()

            total_loss += loss.item()
            num_batches += 1
            self._global_step += 1

            if self._global_step % self.config.log_every_n_steps == 0:
                self.logger.info(
                    "train_step",
                    step=self._global_step,
                    batch=batch_idx,
                    loss=f"{loss.item():.4f}",
                    temperature=f"{loss_fn.temperature.item():.4f}",
                )
                self._wandb_log(
                    {
                        "train/loss": loss.item(),
                        "train/temperature": loss_fn.temperature.item(),
                        "train/step": self._global_step,
                    }
                )

        return total_loss / max(num_batches, 1)

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    @torch.no_grad()
    def validate(self, val_dataloader: DataLoader) -> dict:
        """
        Validate the model using retrieval accuracy metrics.

        Computes:
          - R@1 : proportion of queries where the true positive is rank 1
          - R@5 : true positive within top 5
          - R@10: true positive within top 10
          - mAP : mean average precision
          - avg_val_loss: average InfoNCE loss on validation set

        Args:
            val_dataloader: Validation DataLoader.

        Returns:
            Dict with metric names as keys.
        """
        self.model.eval()
        loss_fn = ContrastiveLoss(
            temperature=self.config.temperature,
            learnable=False,
        ).to(self.device)

        all_emb1: List[torch.Tensor] = []
        all_emb2: List[torch.Tensor] = []
        all_labels: List[torch.Tensor] = []
        total_loss = 0.0
        num_batches = 0

        for img1, img2, labels in val_dataloader:
            img1 = img1.to(self.device, non_blocking=True)
            img2 = img2.to(self.device, non_blocking=True)
            labels = labels.to(self.device, non_blocking=True)

            with autocast(enabled=self.config.mixed_precision and self.device == "cuda"):
                emb1 = F.normalize(self.model.encode_image(img1), dim=-1)
                emb2 = F.normalize(self.model.encode_image(img2), dim=-1)
                loss = loss_fn(emb1, emb2, labels)

            all_emb1.append(emb1.cpu())
            all_emb2.append(emb2.cpu())
            all_labels.append(labels.cpu())
            total_loss += loss.item()
            num_batches += 1

        avg_loss = total_loss / max(num_batches, 1)

        emb1_all = torch.cat(all_emb1)   # (N, D)
        emb2_all = torch.cat(all_emb2)   # (N, D)
        labels_all = torch.cat(all_labels)  # (N,)

        # Build query -> gallery retrieval: use emb1 as queries, emb2 as gallery
        sim_matrix = torch.matmul(emb1_all, emb2_all.T)  # (N, N)
        N = sim_matrix.size(0)

        # Ground truth: diagonal (same pair index = positive) + other positives above threshold
        positive_mask = (labels_all.unsqueeze(1) >= 0.75) & (labels_all.unsqueeze(0) >= 0.75)
        positive_mask.fill_diagonal_(True)

        # Rank-based metrics
        sorted_indices = torch.argsort(sim_matrix, dim=1, descending=True)

        r1 = r5 = r10 = 0
        ap_sum = 0.0
        for i in range(N):
            positives = positive_mask[i].nonzero(as_tuple=True)[0]
            if len(positives) == 0:
                continue
            ranks = []
            for pos_idx in positives:
                rank = (sorted_indices[i] == pos_idx).nonzero(as_tuple=True)[0]
                if len(rank) > 0:
                    ranks.append(rank[0].item() + 1)  # 1-indexed
            if not ranks:
                continue
            min_rank = min(ranks)
            r1 += int(min_rank <= 1)
            r5 += int(min_rank <= 5)
            r10 += int(min_rank <= 10)

            # Average precision for this query
            ap = sum(1.0 / r for r in sorted(ranks)) / len(ranks)
            ap_sum += ap

        metrics = {
            "val/loss": avg_loss,
            "val/R@1": r1 / N,
            "val/R@5": r5 / N,
            "val/R@10": r10 / N,
            "val/mAP": ap_sum / N,
        }
        self.logger.info("validation_metrics", **{k: f"{v:.4f}" for k, v in metrics.items()})
        return metrics

    # ------------------------------------------------------------------
    # Full training loop
    # ------------------------------------------------------------------

    def train(
        self,
        train_data: List[Tuple[str, str, float]],
        val_data: List[Tuple[str, str, float]],
    ) -> None:
        """
        Run the full fine-tuning loop.

        Features: warmup + cosine LR schedule, mixed precision, gradient
        clipping, periodic validation, early stopping, and checkpointing.

        Args:
            train_data: Training pairs (path1, path2, similarity).
            val_data:   Validation pairs.
        """
        if self.model is None:
            raise RuntimeError("Call load_model() before train().")

        self._try_init_wandb()

        train_dataset = AutomotiveDataset(train_data, transform=self.preprocess)
        val_dataset = AutomotiveDataset(val_data, transform=self.preprocess)

        train_loader = DataLoader(
            train_dataset,
            batch_size=self.config.batch_size,
            shuffle=True,
            num_workers=self.config.num_workers,
            pin_memory=(self.device == "cuda"),
            drop_last=True,
        )
        val_loader = DataLoader(
            val_dataset,
            batch_size=self.config.batch_size,
            shuffle=False,
            num_workers=self.config.num_workers,
            pin_memory=(self.device == "cuda"),
        )

        loss_fn = ContrastiveLoss(
            temperature=self.config.temperature,
            learnable=self.config.learnable_temperature,
        ).to(self.device)

        # Optimizer: separate LR for loss temperature
        params = [
            {"params": [p for p in self.model.parameters() if p.requires_grad]},
            {"params": loss_fn.parameters(), "lr": self.config.learning_rate * 10},
        ]
        optimizer = AdamW(
            params,
            lr=self.config.learning_rate,
            weight_decay=self.config.weight_decay,
        )

        # LR schedule: linear warmup + cosine annealing
        total_steps = len(train_loader) * self.config.epochs
        warmup_scheduler = LinearLR(
            optimizer, start_factor=0.01, total_iters=self.config.warmup_steps
        )
        cosine_scheduler = CosineAnnealingLR(
            optimizer, T_max=total_steps - self.config.warmup_steps, eta_min=1e-7
        )
        scheduler = SequentialLR(
            optimizer,
            schedulers=[warmup_scheduler, cosine_scheduler],
            milestones=[self.config.warmup_steps],
        )

        self.logger.info(
            "training_start",
            epochs=self.config.epochs,
            train_pairs=len(train_data),
            val_pairs=len(val_data),
            device=self.device,
        )

        for epoch in range(1, self.config.epochs + 1):
            epoch_start = time.time()

            train_loss = self.train_epoch(train_loader, optimizer, loss_fn)
            scheduler.step()

            elapsed = time.time() - epoch_start
            self.logger.info(
                "epoch_complete",
                epoch=epoch,
                train_loss=f"{train_loss:.4f}",
                elapsed_s=f"{elapsed:.1f}",
                lr=f"{scheduler.get_last_lr()[0]:.2e}",
            )

            # Validate every epoch
            val_metrics = self.validate(val_loader)
            val_r1 = val_metrics.get("val/R@1", 0.0)

            self._wandb_log(
                {
                    "epoch": epoch,
                    "train/epoch_loss": train_loss,
                    "lr": scheduler.get_last_lr()[0],
                    **val_metrics,
                }
            )

            # Checkpoint
            if epoch % self.config.save_every_n_epochs == 0:
                self.save_checkpoint(epoch, train_loss)

            # Best model checkpoint
            if val_r1 > self._best_val_metric + self.config.min_delta:
                self._best_val_metric = val_r1
                self._patience_counter = 0
                self.save_checkpoint(epoch, train_loss, suffix="best")
                self.logger.info("new_best_model", epoch=epoch, val_R1=f"{val_r1:.4f}")
            else:
                self._patience_counter += 1
                self.logger.info(
                    "no_improvement",
                    patience=self._patience_counter,
                    max_patience=self.config.early_stopping_patience,
                )

            # Early stopping
            if self._patience_counter >= self.config.early_stopping_patience:
                self.logger.info(
                    "early_stopping_triggered",
                    epoch=epoch,
                    best_val_R1=f"{self._best_val_metric:.4f}",
                )
                break

        self.logger.info(
            "training_complete",
            best_val_R1=f"{self._best_val_metric:.4f}",
            output_dir=self.config.output_dir,
        )

    # ------------------------------------------------------------------
    # Checkpointing
    # ------------------------------------------------------------------

    def save_checkpoint(
        self, epoch: int, loss: float, suffix: str = ""
    ) -> str:
        """
        Save a training checkpoint to disk.

        Saves the model state dict, optimizer state, epoch number, loss,
        and full training config for resumable training.

        Args:
            epoch: Current epoch number (1-indexed).
            loss: Current training loss.
            suffix: Optional filename suffix (e.g. "best").

        Returns:
            Path to the saved checkpoint file.
        """
        name = f"clip_automotive_e{epoch:03d}"
        if suffix:
            name += f"_{suffix}"
        name += ".pt"
        ckpt_path = Path(self.config.output_dir) / name

        checkpoint = {
            "epoch": epoch,
            "model_state_dict": self.model.state_dict(),
            "loss": loss,
            "best_val_metric": self._best_val_metric,
            "global_step": self._global_step,
            "config": asdict(self.config),
        }
        torch.save(checkpoint, str(ckpt_path))
        self.logger.info("checkpoint_saved", path=str(ckpt_path), epoch=epoch)
        return str(ckpt_path)

    def load_checkpoint(self, checkpoint_path: str) -> int:
        """
        Resume training from a saved checkpoint.

        Args:
            checkpoint_path: Path to the .pt checkpoint file.

        Returns:
            The epoch number stored in the checkpoint.
        """
        if self.model is None:
            raise RuntimeError("Call load_model() before load_checkpoint().")

        checkpoint = torch.load(checkpoint_path, map_location=self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self._best_val_metric = checkpoint.get("best_val_metric", -float("inf"))
        self._global_step = checkpoint.get("global_step", 0)

        self.logger.info(
            "checkpoint_loaded",
            path=checkpoint_path,
            epoch=checkpoint["epoch"],
            loss=f"{checkpoint['loss']:.4f}",
        )
        return checkpoint["epoch"]

    def export_model(self, output_path: str) -> None:
        """
        Export the fine-tuned model weights in a portable format.

        Saves both the full checkpoint (for resuming) and a lightweight
        inference-only state dict suitable for the EmbeddingPipeline.

        Args:
            output_path: File path for the exported weights (e.g. "automotive_clip.pt").
        """
        if self.model is None:
            raise RuntimeError("No model to export. Call load_model() first.")

        export_data = {
            "model_state_dict": self.model.state_dict(),
            "model_name": self.config.model_name,
            "pretrained": self.config.pretrained,
            "image_size": self.config.image_size,
            "config": asdict(self.config),
        }
        torch.save(export_data, output_path)

        # Also save a JSON metadata sidecar
        meta_path = Path(output_path).with_suffix(".json")
        with open(meta_path, "w") as f:
            json.dump(
                {
                    "model_name": self.config.model_name,
                    "pretrained": self.config.pretrained,
                    "image_size": self.config.image_size,
                    "best_val_R1": self._best_val_metric,
                    "global_step": self._global_step,
                },
                f,
                indent=2,
            )

        self.logger.info("model_exported", path=output_path, metadata=str(meta_path))

    # ------------------------------------------------------------------
    # W&B helpers
    # ------------------------------------------------------------------

    def _try_init_wandb(self) -> None:
        try:
            import wandb

            wandb.init(
                project=self.config.wandb_project,
                entity=self.config.wandb_entity,
                config=asdict(self.config),
                name=f"automotive-clip-{self.config.model_name}",
            )
            self._wandb_enabled = True
            self.logger.info("wandb_initialized", project=self.config.wandb_project)
        except Exception as exc:
            self._wandb_enabled = False
            self.logger.warning("wandb_init_skipped", error=str(exc))

    def _wandb_log(self, data: dict) -> None:
        if getattr(self, "_wandb_enabled", False):
            try:
                import wandb
                wandb.log(data)
            except Exception:
                pass
