# Automotive AI — Training Dataset Documentation

## Overview

This directory holds the training data used to fine-tune the automotive CLIP
embedding model and to benchmark the evolution-detection pipeline.

---

## Expected Directory Layout

```
ml/datasets/
├── README.md                   ← This file
├── raw/                        ← Unprocessed images, organised by brand/model
│   ├── BMW/
│   │   ├── 3_Series/
│   │   │   ├── E30/            ← One folder per generation (code name)
│   │   │   │   ├── 001.jpg
│   │   │   │   └── ...
│   │   │   ├── E36/
│   │   │   └── ...
│   │   └── 5_Series/
│   └── Toyota/
│       └── Camry/
├── processed/                  ← Resized, colour-normalised images (512×512 px)
├── embeddings/                 ← Pre-computed .npy embedding arrays per generation
│   └── {generation_id}.npy
├── manifests/
│   ├── train_pairs.json        ← Training contrastive pairs
│   ├── val_pairs.json          ← Validation contrastive pairs
│   ├── eval_samples.json       ← Evaluation manifest (path, generation_id, brand_id, year)
│   └── influence_pairs.json    ← Known cross-brand influence pairs for AUC evaluation
└── metadata/
    └── generations.json        ← Full generation registry (see schema below)
```

---

## Image Requirements

| Property       | Requirement                                      |
|----------------|--------------------------------------------------|
| Format         | JPEG or PNG                                      |
| Resolution     | Minimum 512 × 512 px (1024 × 768 preferred)      |
| View           | Exterior — 3/4 front, side, 3/4 rear preferred   |
| Background     | Studio/neutral preferred; outdoor accepted       |
| Watermarks     | None; images with watermarks degrade embedding quality |
| Min images/gen | 5 (recommend 15–30 for robust average pooling)   |

---

## Generation Registry Schema (`metadata/generations.json`)

Each entry in the JSON array represents one vehicle generation:

```json
[
  {
    "id": 1,
    "brand": "BMW",
    "model": "3 Series",
    "code_name": "E30",
    "year_start": 1982,
    "year_end": 1994,
    "platform": "E30",
    "body_types": ["sedan", "coupe", "convertible", "touring"],
    "description": "First generation 3 Series with angular design and driver-focused interior.",
    "design_elements": ["kidney grille", "round headlights", "hofmeister kink", "short overhangs"],
    "image_paths": ["raw/BMW/3_Series/E30/001.jpg", "..."],
    "generation_id_predecessor": null,
    "generation_id_successor": 2
  }
]
```

---

## Training Pair Manifests

### `train_pairs.json` / `val_pairs.json`

```json
[
  {
    "path1": "processed/BMW/3_Series/E30/001.jpg",
    "path2": "processed/BMW/3_Series/E36/001.jpg",
    "similarity": 0.88,
    "pair_type": "consecutive_generation"
  },
  {
    "path1": "processed/BMW/3_Series/E30/001.jpg",
    "path2": "processed/BMW/5_Series/E34/001.jpg",
    "similarity": 0.52,
    "pair_type": "same_brand_different_model"
  },
  {
    "path1": "processed/BMW/3_Series/E30/001.jpg",
    "path2": "processed/Toyota/Camry/XV10/001.jpg",
    "similarity": 0.12,
    "pair_type": "different_brand"
  }
]
```

**Similarity score guidelines:**

| Pair type                              | Target similarity |
|----------------------------------------|-------------------|
| Same generation, different photo       | 0.92 – 0.98       |
| Consecutive generations (same model)   | 0.82 – 0.95       |
| Non-consecutive generations (2+ apart) | 0.55 – 0.75       |
| Same brand, different model            | 0.40 – 0.65       |
| Different brands                       | 0.05 – 0.30       |

---

## Generating Training Pairs from the Automotive DB

Use the `AutomotiveCLIPTrainer.build_training_pairs()` method to generate pairs
automatically from the PostgreSQL generations database:

```python
from ml.training.train_embeddings import AutomotiveCLIPTrainer, TrainingConfig

trainer = AutomotiveCLIPTrainer(TrainingConfig())
trainer.load_model()

# Fetch all generations from your DB (list of dicts with image_paths, brand, model, year_start)
from backend.db import get_all_generations_with_images
generations = get_all_generations_with_images()

pairs = trainer.build_training_pairs(generations)
split = int(len(pairs) * 0.85)
train_pairs, val_pairs = pairs[:split], pairs[split:]

trainer.train(train_pairs, val_pairs)
trainer.export_model("checkpoints/automotive_clip_v1.pt")
```

---

## Data Augmentation Strategy

During training, the following augmentations are applied to each image on-the-fly:

| Augmentation              | Parameters                                | Notes                                    |
|---------------------------|-------------------------------------------|------------------------------------------|
| Random horizontal flip    | p=0.5                                     | Preserve left/right mirroring invariance |
| Random crop               | scale=(0.8, 1.0), ratio=(0.9, 1.1)        | Simulate different zoom levels           |
| Colour jitter             | brightness=0.2, contrast=0.2, sat=0.1    | Lighting and colour variation            |
| Gaussian blur             | kernel=(3,3), p=0.2                       | Simulate focus and compression artefacts |
| Random grayscale          | p=0.05                                    | Force colour-agnostic features           |
| Normalise                 | mean=(0.48145, 0.4578, 0.40821)           | OpenCLIP ViT-L/14 normalisation          |
|                           | std=(0.26862, 0.26130, 0.27577)           |                                          |

Augmentations are **not** applied at inference time (only normalisation and resize).

---

## Evaluation Manifest (`manifests/eval_samples.json`)

```json
[
  {
    "path": "processed/BMW/3_Series/E30/001.jpg",
    "generation_id": 1,
    "brand_id": 10,
    "brand_name": "BMW",
    "model": "3 Series",
    "code_name": "E30",
    "year": 1985
  }
]
```

---

## Influence Pairs (`manifests/influence_pairs.json`)

```json
[
  {
    "source_idx": 42,
    "target_idx": 107,
    "is_influence": true,
    "source_label": "Audi A6 C5 (1997)",
    "target_label": "Hyundai Sonata EF (1998)",
    "notes": "Shared design DNA likely from ex-Audi designers at Hyundai"
  },
  {
    "source_idx": 15,
    "target_idx": 200,
    "is_influence": false,
    "source_label": "Ford Taurus (1996)",
    "target_label": "Toyota Corolla E110 (1997)"
  }
]
```

---

## Dataset Statistics (target for v1 training)

| Metric                             | Target       |
|------------------------------------|--------------|
| Total brands                       | ≥ 30         |
| Total models                       | ≥ 150        |
| Total generations                  | ≥ 600        |
| Images per generation (average)    | 15 – 30      |
| Total images                       | ≥ 12,000     |
| Training pairs                     | ≥ 50,000     |
| Validation pairs                   | ≥ 5,000      |
| Known influence pairs (for eval)   | ≥ 200        |
| Year range                         | 1950 – 2024  |

---

## Licensing

All images must be cleared for commercial AI training use.
Preferred sources:
- Manufacturer press releases (typically CC licensed or press-use permitted)
- Wikimedia Commons (CC BY-SA)
- Licensed automotive photography datasets

**Do not commit raw images to this repository.**
Store them on shared object storage (S3 / GCS) and reference paths in the manifests.
