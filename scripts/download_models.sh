#!/usr/bin/env bash
# =============================================================================
# download_models.sh – Download all required ML models for automotive-ai
#
# Usage:
#   ./scripts/download_models.sh                # downloads to ./models
#   MODELS_DIR=/data/models ./scripts/download_models.sh
#   ./scripts/download_models.sh --skip-sam     # skip large SAM model
#
# Requirements:
#   - Python 3.10+ with pip
#   - transformers, open_clip, ultralytics packages installed
#   - ~25 GB free disk space
# =============================================================================

set -euo pipefail

MODELS_DIR="${MODELS_DIR:-./models}"
SKIP_SAM=false
SKIP_DINO=false
SKIP_CLIP=false
SKIP_YOLO=false

# Parse flags
for arg in "$@"; do
    case "$arg" in
        --skip-sam)  SKIP_SAM=true  ;;
        --skip-dino) SKIP_DINO=true ;;
        --skip-clip) SKIP_CLIP=true ;;
        --skip-yolo) SKIP_YOLO=true ;;
        --help|-h)
            echo "Usage: $0 [--skip-sam] [--skip-dino] [--skip-clip] [--skip-yolo]"
            echo "  MODELS_DIR env var sets the download directory (default: ./models)"
            exit 0
            ;;
        *)
            echo "Unknown flag: $arg"
            exit 1
            ;;
    esac
done

# Color output helpers
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
section() { echo -e "\n${GREEN}==> $*${NC}"; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
section "Pre-flight checks"

if ! command -v python3 &>/dev/null; then
    error "python3 not found. Install Python 3.10+ and retry."
    exit 1
fi

PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
info "Python version: $PYTHON_VERSION"

mkdir -p "$MODELS_DIR"
info "Models directory: $(realpath "$MODELS_DIR")"

# Check available disk space (require at least 30 GB)
AVAILABLE_KB=$(df -k "$MODELS_DIR" | awk 'NR==2 {print $4}')
REQUIRED_KB=$((30 * 1024 * 1024))
if (( AVAILABLE_KB < REQUIRED_KB )); then
    warn "Low disk space: ${AVAILABLE_KB}KB available, ${REQUIRED_KB}KB recommended."
    warn "Some downloads may fail. Proceeding anyway."
fi

# ---------------------------------------------------------------------------
# Helper: check if a model is already downloaded
# ---------------------------------------------------------------------------
is_cached() {
    local marker="$1"
    if [[ -e "$marker" ]]; then
        info "Already cached: $marker – skipping download."
        return 0
    fi
    return 1
}

# ---------------------------------------------------------------------------
# 1. DINOv2 Large (Vision Transformer – self-supervised features)
#    Size: ~1.3 GB
# ---------------------------------------------------------------------------
if [[ "$SKIP_DINO" == "false" ]]; then
    section "1/4  DINOv2 Large (facebook/dinov2-large)"
    DINO_MARKER="$MODELS_DIR/models--facebook--dinov2-large"
    if ! is_cached "$DINO_MARKER"; then
        python3 - <<PYEOF
import os, sys
sys.stdout.reconfigure(line_buffering=True)
print("Downloading DINOv2 Large from Hugging Face Hub...")
from transformers import AutoModel, AutoFeatureExtractor
model_name = "facebook/dinov2-large"
cache_dir  = "$MODELS_DIR"
AutoFeatureExtractor.from_pretrained(model_name, cache_dir=cache_dir)
AutoModel.from_pretrained(model_name, cache_dir=cache_dir)
print("DINOv2 Large downloaded successfully.")
PYEOF
        info "DINOv2 Large complete."
    fi
else
    warn "Skipping DINOv2 (--skip-dino)"
fi

# ---------------------------------------------------------------------------
# 2. OpenCLIP ViT-L-14 (OpenAI weights)
#    Size: ~890 MB
# ---------------------------------------------------------------------------
if [[ "$SKIP_CLIP" == "false" ]]; then
    section "2/4  OpenCLIP ViT-L-14 (OpenAI pretrained)"
    CLIP_MARKER="$MODELS_DIR/open_clip_pytorch_model.bin"
    if ! is_cached "$CLIP_MARKER"; then
        python3 - <<PYEOF
import os, sys
sys.stdout.reconfigure(line_buffering=True)
print("Downloading OpenCLIP ViT-L-14 (openai) weights...")
import open_clip
model, preprocess_train, preprocess_val = open_clip.create_model_and_transforms(
    "ViT-L-14",
    pretrained="openai",
    cache_dir="$MODELS_DIR",
)
tokenizer = open_clip.get_tokenizer("ViT-L-14")
print("OpenCLIP ViT-L-14 downloaded successfully.")

# Save model state dict for faster loading in inference service
import torch
state_dict_path = os.path.join("$MODELS_DIR", "open_clip_pytorch_model.bin")
torch.save(model.state_dict(), state_dict_path)
print(f"State dict saved to {state_dict_path}")
PYEOF
        info "OpenCLIP ViT-L-14 complete."
    fi
else
    warn "Skipping OpenCLIP (--skip-clip)"
fi

# ---------------------------------------------------------------------------
# 3. YOLOv8x (vehicle detection – Ultralytics)
#    Size: ~136 MB
# ---------------------------------------------------------------------------
if [[ "$SKIP_YOLO" == "false" ]]; then
    section "3/4  YOLOv8x (vehicle detection)"
    YOLO_PATH="$MODELS_DIR/yolov8x.pt"
    if ! is_cached "$YOLO_PATH"; then
        python3 - <<PYEOF
import sys, shutil
sys.stdout.reconfigure(line_buffering=True)
print("Downloading YOLOv8x weights...")
from ultralytics import YOLO
model = YOLO("yolov8x.pt")   # auto-downloads to ultralytics default dir

# Move to our models dir
import os
default_path = os.path.expanduser("~/.config/Ultralytics/yolov8x.pt")
if not os.path.exists(default_path):
    # Try the CWD
    default_path = "yolov8x.pt"
if os.path.exists(default_path):
    dest = "$YOLO_PATH"
    shutil.copy2(default_path, dest)
    print(f"Copied YOLOv8x to {dest}")
else:
    print("YOLOv8x already at expected location or path unknown; check ultralytics cache.")
PYEOF
        info "YOLOv8x complete."
    fi
else
    warn "Skipping YOLOv8x (--skip-yolo)"
fi

# ---------------------------------------------------------------------------
# 4. SAM (Segment Anything Model) – ViT-H checkpoint
#    Size: ~2.4 GB
# ---------------------------------------------------------------------------
if [[ "$SKIP_SAM" == "false" ]]; then
    section "4/4  Segment Anything Model (SAM ViT-H)"
    SAM_PATH="$MODELS_DIR/sam_vit_h_4b8939.pth"
    if ! is_cached "$SAM_PATH"; then
        SAM_URL="https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth"
        info "Downloading SAM ViT-H from $SAM_URL"

        if command -v wget &>/dev/null; then
            wget -q --show-progress \
                --retry-connrefused --tries=3 \
                -O "$SAM_PATH" "$SAM_URL"
        elif command -v curl &>/dev/null; then
            curl -L --retry 3 --progress-bar \
                -o "$SAM_PATH" "$SAM_URL"
        else
            error "Neither wget nor curl found. Install one and retry."
            exit 1
        fi

        # Verify checksum
        EXPECTED_SIZE=2564550879
        ACTUAL_SIZE=$(wc -c < "$SAM_PATH")
        if (( ACTUAL_SIZE < EXPECTED_SIZE - 1000000 )); then
            error "SAM download looks incomplete (${ACTUAL_SIZE} bytes, expected ~${EXPECTED_SIZE})."
            rm -f "$SAM_PATH"
            exit 1
        fi

        info "SAM ViT-H downloaded: $SAM_PATH"
    fi
else
    warn "Skipping SAM (--skip-sam)"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
section "Download summary"
echo ""
echo "Models directory: $(realpath "$MODELS_DIR")"
echo ""
echo "Contents:"
ls -lh "$MODELS_DIR" 2>/dev/null || echo "(empty)"
echo ""

TOTAL_SIZE=$(du -sh "$MODELS_DIR" 2>/dev/null | cut -f1)
info "Total size on disk: $TOTAL_SIZE"
info "All requested models downloaded successfully."
echo ""
echo "Next step: set MODELS_DIR=$MODELS_DIR in your .env and start the ml-inference service."
