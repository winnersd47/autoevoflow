# =============================================================================
# ML Inference – GPU-enabled Dockerfile
# Base: nvidia/cuda 12.1 + cuDNN 8 runtime on Ubuntu 22.04
# Installs Python 3.11, PyTorch (CUDA 12.1), and all ML libraries.
# The entrypoint first downloads model weights if missing, then starts the server.
# =============================================================================

FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# Avoid interactive prompts during apt-get
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=UTC

# ---------------------------------------------------------------------------
# System dependencies
# ---------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Python 3.11
    software-properties-common \
    && add-apt-repository ppa:deadsnakes/ppa -y \
    && apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-dev \
    python3.11-venv \
    python3-pip \
    # OpenCV / image processing deps
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    # HuggingFace git-lfs for large model downloads
    git \
    git-lfs \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Make python3.11 the default python
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1 && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 && \
    python -m pip install --upgrade pip

# ---------------------------------------------------------------------------
# Python environment variables
# ---------------------------------------------------------------------------
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    # Model cache directories
    TRANSFORMERS_CACHE=/models/huggingface \
    HF_HOME=/models/huggingface \
    TORCH_HOME=/models/torch \
    # Force CUDA usage; fallback to cpu if no GPU
    DEVICE=cuda

# ---------------------------------------------------------------------------
# Install PyTorch (CUDA 12.1 wheel) and ML stack
# ---------------------------------------------------------------------------
WORKDIR /app

COPY ml/requirements.txt ./requirements.txt

# PyTorch must be installed before other packages to resolve CUDA dependencies.
RUN pip install --no-cache-dir \
    torch==2.2.0+cu121 \
    torchvision==0.17.0+cu121 \
    torchaudio==2.2.0+cu121 \
    --index-url https://download.pytorch.org/whl/cu121

# Install remaining ML requirements (CLIP, DINOv2, YOLO, SAM, etc.)
RUN pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# Non-root user
# ---------------------------------------------------------------------------
RUN groupadd --gid 1001 mluser && \
    useradd --uid 1001 --gid mluser --shell /bin/bash --create-home mluser && \
    mkdir -p /models && chown -R mluser:mluser /models

# ---------------------------------------------------------------------------
# Copy application source
# ---------------------------------------------------------------------------
COPY --chown=mluser:mluser ml/ ./

# Copy model download helper script
COPY --chown=mluser:mluser scripts/download_models.sh /usr/local/bin/download_models.sh
RUN chmod +x /usr/local/bin/download_models.sh

USER mluser

EXPOSE 8001

# The entrypoint downloads missing model weights then starts uvicorn.
# Model weights are cached to /models which should be a persistent volume.
COPY --chown=mluser:mluser docker/ml_entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh || true

CMD ["uvicorn", "app.ml.server:app", \
     "--host", "0.0.0.0", \
     "--port", "8001", \
     "--workers", "1", \
     "--timeout-keep-alive", "60"]
