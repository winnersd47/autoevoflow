# Deployment Guide

## Prerequisites

### Software Requirements

| Component | Minimum Version | Notes |
|---|---|---|
| Docker | 24.0 | Required for all deployment modes |
| Docker Compose | 2.20 | Required for local and single-server deployments |
| Kubernetes | 1.28 | Required for production cluster deployment |
| kubectl | 1.28 | Must match cluster version ± 1 minor version |
| Helm | 3.12 | Required for Kubernetes chart deployments |
| NVIDIA Driver | 525+ | Required on any node running ML inference |
| CUDA | 12.1+ | Matched to NVIDIA driver version |
| NVIDIA Container Toolkit | 1.14+ | Required for GPU passthrough to Docker |

### Hardware Requirements

**Development / Single-server:**
- CPU: 8+ cores
- RAM: 32GB minimum (64GB recommended)
- GPU: NVIDIA RTX 3080+ with 10GB+ VRAM (optional but strongly recommended)
- Disk: 200GB SSD (500GB recommended for full image dataset)

**Production (minimum per node type):**

| Node Type | CPU | RAM | GPU | Disk | Count |
|---|---|---|---|---|---|
| API servers | 8 vCPU | 16GB | None | 50GB SSD | 3+ |
| ML inference | 8 vCPU | 32GB | 1x A10G (24GB) | 100GB SSD | 2+ |
| Database | 16 vCPU | 64GB | None | 500GB NVMe | 1 (PG) + 1 (Neo4j) |
| Worker | 16 vCPU | 32GB | None | 100GB SSD | 3+ |

---

## Quick Start (Docker Compose)

This mode runs all services on a single machine. Suitable for development, testing, and small-scale deployments.

```bash
# 1. Clone repository
git clone https://github.com/your-org/automotive-ai-platform.git
cd automotive-ai-platform

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys and passwords (see Environment Variables Reference below)
nano .env

# 3. Pull images and start all services
docker compose -f docker/docker-compose.yml pull
docker compose -f docker/docker-compose.yml up -d

# 4. Wait for databases to be ready
docker compose -f docker/docker-compose.yml exec backend \
  python scripts/wait_for_services.py

# 5. Initialize databases
docker compose -f docker/docker-compose.yml exec backend \
  alembic upgrade head

docker compose -f docker/docker-compose.yml exec backend \
  python scripts/seed_data.py --all

# 6. (Optional) Seed with sample data for local testing
docker compose -f docker/docker-compose.yml exec backend \
  python scripts/seed_data.py --sample-brands 5 --sample-images 500

# 7. Open the platform
# Frontend:      http://localhost:3200
# API docs:      http://localhost:8000/docs
# Neo4j Browser: http://localhost:7474   (default: neo4j / your-password)
# MinIO Console: http://localhost:9001   (default: minioadmin / your-password)
# Flower (Celery): http://localhost:5555
```

### Checking Health

```bash
# Check all containers are running
docker compose -f docker/docker-compose.yml ps

# Check backend health
curl http://localhost:8000/health

# Expected output:
# {"status": "healthy", "postgres": "ok", "neo4j": "ok", "redis": "ok", "ml_inference": "ok"}

# Check ML inference server
curl http://localhost:8001/health
# {"status": "healthy", "models_loaded": ["clip", "dino", "yolo", "sam"], "gpu": "cuda:0"}
```

### Stopping

```bash
# Stop all services (preserve data)
docker compose -f docker/docker-compose.yml down

# Stop and remove all data volumes (destructive)
docker compose -f docker/docker-compose.yml down -v
```

---

## Production Docker Compose

For single-server production deployments, use the production Compose file which adds Nginx, SSL termination, and monitoring.

```bash
# 1. Set production environment
cp .env.example .env.production
# Fill in all production values — never commit .env.production to version control
nano .env.production

# 2. Create external volumes for data persistence
docker volume create pg_data
docker volume create neo4j_data
docker volume create redis_data
docker volume create minio_data
docker volume create model_weights

# 3. Start production stack
docker compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  --env-file .env.production \
  up -d

# 4. Initialize databases (first run only)
docker compose --env-file .env.production exec backend alembic upgrade head
docker compose --env-file .env.production exec backend python scripts/seed_data.py --all
```

Key differences in `docker-compose.prod.yml`:
- Nginx with SSL termination replacing direct port exposure.
- Resource limits (`mem_limit`, `cpus`) on all containers.
- Restart policies set to `always`.
- Log rotation configured.
- Health checks with appropriate timeouts.
- Prometheus exporters for PostgreSQL, Redis, and Nginx.

---

## Kubernetes Deployment

### Prerequisites

Ensure your cluster has:
- NVIDIA GPU Operator installed (for ML inference nodes).
- A StorageClass that supports `ReadWriteOnce` (for database PVCs).
- An Ingress controller (nginx-ingress recommended).
- cert-manager for TLS certificate management.
- Prometheus Operator for monitoring.

```bash
# Verify cluster access
kubectl cluster-info
kubectl get nodes -o wide

# Verify GPU nodes are ready
kubectl get nodes -l node-type=gpu
```

### Configure Secrets

Never store secrets in manifest files. Use Kubernetes secrets:

```bash
# Database credentials
kubectl create secret generic postgres-credentials \
  --from-literal=password="$(openssl rand -base64 32)" \
  --from-literal=url="postgresql://autoai:PASSWORD@postgres-svc:5432/autoai_db"

# Neo4j credentials
kubectl create secret generic neo4j-credentials \
  --from-literal=password="$(openssl rand -base64 32)"

# API keys
kubectl create secret generic api-keys \
  --from-literal=openai-key="sk-your-openai-key" \
  --from-literal=anthropic-key="sk-ant-your-anthropic-key" \
  --from-literal=jwt-secret="$(openssl rand -base64 64)"

# MinIO credentials
kubectl create secret generic minio-credentials \
  --from-literal=root-user="minioadmin" \
  --from-literal=root-password="$(openssl rand -base64 32)"

# Verify secrets
kubectl get secrets
```

### Apply Manifests

```bash
# Apply in dependency order
# 1. Namespaces and RBAC
kubectl apply -f infrastructure/k8s/namespace.yaml
kubectl apply -f infrastructure/k8s/rbac/

# 2. Storage (PersistentVolumeClaims)
kubectl apply -f infrastructure/k8s/storage/

# 3. Databases
kubectl apply -f infrastructure/k8s/databases/postgres.yaml
kubectl apply -f infrastructure/k8s/databases/neo4j.yaml
kubectl apply -f infrastructure/k8s/databases/redis.yaml
kubectl apply -f infrastructure/k8s/databases/minio.yaml

# 4. Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s
kubectl wait --for=condition=ready pod -l app=neo4j --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis --timeout=60s

# 5. Run database migrations as a Job
kubectl apply -f infrastructure/k8s/jobs/db-migrate.yaml
kubectl wait --for=condition=complete job/db-migrate --timeout=120s

# 6. Application services
kubectl apply -f infrastructure/k8s/apps/ml-inference.yaml
kubectl apply -f infrastructure/k8s/apps/backend.yaml
kubectl apply -f infrastructure/k8s/apps/celery-workers.yaml
kubectl apply -f infrastructure/k8s/apps/crawler-workers.yaml
kubectl apply -f infrastructure/k8s/apps/frontend.yaml

# 7. Ingress and networking
kubectl apply -f infrastructure/k8s/ingress.yaml

# 8. Monitoring
kubectl apply -f infrastructure/k8s/monitoring/
```

### Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n automotive-ai

# Expected output:
# NAME                                   READY   STATUS    RESTARTS   AGE
# backend-7d4f9b-abc12                   1/1     Running   0          2m
# backend-7d4f9b-def34                   1/1     Running   0          2m
# backend-7d4f9b-ghi56                   1/1     Running   0          2m
# ml-inference-6c8d5f-jkl78              1/1     Running   0          3m
# celery-analysis-5b7c4e-mno90           1/1     Running   0          2m
# celery-embeddings-8a1e2d-pqr12         1/1     Running   0          2m
# postgres-0                             1/1     Running   0          5m
# neo4j-0                                1/1     Running   0          5m
# redis-master-0                         1/1     Running   0          4m

# Check services
kubectl get services -n automotive-ai

# Check ingress
kubectl get ingress -n automotive-ai

# Tail backend logs
kubectl logs -f deployment/backend -n automotive-ai

# Run end-to-end health check
kubectl exec deployment/backend -n automotive-ai -- \
  python scripts/health_check.py --full
```

### Scaling

```bash
# Manually scale backend replicas
kubectl scale deployment/backend --replicas=6 -n automotive-ai

# Manually scale celery workers
kubectl scale deployment/celery-analysis --replicas=8 -n automotive-ai

# View HPA status
kubectl get hpa -n automotive-ai
# NAME                     REFERENCE                   TARGETS         MINPODS   MAXPODS   REPLICAS
# backend-hpa              Deployment/backend          45%/60%         3         20        5
# celery-analysis-hpa      Deployment/celery-analysis  30%/70%         2         15        3
```

---

## GPU Setup

### Install NVIDIA Container Toolkit

```bash
# Ubuntu 22.04
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### Verify GPU Access in Docker

```bash
docker run --rm --gpus all nvidia/cuda:12.1-base-ubuntu22.04 nvidia-smi

# Expected output:
# +-----------------------------------------------------------------------------------------+
# | NVIDIA-SMI 525.x        Driver Version: 525.x        CUDA Version: 12.1               |
# +-----------------------------------------+----------------------+----------------------+
# | GPU  Name                 Persistence-M | Bus-Id        Disp.A | Volatile Uncorr. ECC |
# |   0  NVIDIA RTX 3090              Off  | 00000000:01:00.0 Off |                  N/A |
```

### Deploy ML Inference with GPU (Kubernetes)

The ML inference manifest uses the `nvidia.com/gpu` resource request. Ensure the GPU Operator is running:

```bash
# Install GPU Operator via Helm
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace \
  --set driver.enabled=false  # if host driver is pre-installed

# Verify node has GPU resource
kubectl describe node gpu-node-01 | grep nvidia.com/gpu
# Capacity:     nvidia.com/gpu: 1
# Allocatable:  nvidia.com/gpu: 1
```

The ML inference deployment spec:

```yaml
resources:
  requests:
    memory: "16Gi"
    cpu: "4"
    nvidia.com/gpu: "1"
  limits:
    memory: "28Gi"
    cpu: "8"
    nvidia.com/gpu: "1"
```

---

## Environment Variables Reference

All variables are consumed via the `.env` file (Docker Compose) or Kubernetes Secrets + ConfigMaps.

### Required — Application

| Variable | Description | Example |
|---|---|---|
| `SECRET_KEY` | JWT signing secret (min 64 chars, random) | `openssl rand -base64 64` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://user:pass@postgres:5432/autoai_db` |
| `NEO4J_URI` | Neo4j Bolt URI | `bolt://neo4j:7687` |
| `NEO4J_USER` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | `securepassword123` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379/0` |
| `MINIO_ENDPOINT` | MinIO endpoint | `minio:9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin` |
| `MINIO_BUCKET_NAME` | Default bucket name | `automotive-images` |

### Required — AI Services

| Variable | Description | Example |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |

### Optional — Authentication (OAuth)

| Variable | Description | Default |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID | — (OAuth disabled if unset) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret | — |
| `GITHUB_CLIENT_ID` | GitHub OAuth2 client ID | — |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth2 client secret | — |

### Optional — Performance Tuning

| Variable | Description | Default |
|---|---|---|
| `WORKERS` | Uvicorn worker count (FastAPI) | `4` |
| `CELERY_CONCURRENCY` | Celery worker concurrency | `8` |
| `PGVECTOR_NPROBE` | IVFFlat probe count (higher = more accurate, slower) | `10` |
| `ML_BATCH_SIZE` | Image embedding batch size | `16` |
| `CACHE_TTL_BRANDS` | Redis TTL for brand data (seconds) | `3600` |
| `CACHE_TTL_SEARCH` | Redis TTL for search results (seconds) | `300` |
| `MAX_IMAGES_PER_GENERATION` | Cap on images stored per generation | `50` |

### Optional — Crawler

| Variable | Description | Default |
|---|---|---|
| `CRAWLER_RATE_LIMIT_NETCARSHOW` | Requests per second | `0.5` |
| `CRAWLER_RATE_LIMIT_MOTOR1` | Requests per second | `2.0` |
| `CRAWLER_USER_AGENT` | HTTP User-Agent string | `AutomotiveAI/1.0` |
| `CRAWLER_PROXY_URL` | Optional rotating proxy URL | — |
| `CRAWLER_MAX_RETRIES` | Max retries per failed URL | `3` |

### Optional — Monitoring

| Variable | Description | Default |
|---|---|---|
| `SENTRY_DSN` | Sentry error tracking DSN | — |
| `PROMETHEUS_ENABLED` | Enable `/metrics` endpoint | `true` |
| `LOG_LEVEL` | Python log level | `INFO` |
| `LOG_FORMAT` | `json` or `text` | `json` |

---

## SSL/TLS Setup with Let's Encrypt

### With Docker Compose (Certbot)

```bash
# 1. Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# 2. Obtain initial certificate (Nginx must be running and port 80 must be open)
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com \
  --non-interactive --agree-tos -m admin@yourdomain.com

# 3. Certificates are stored at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# 4. Mount them into your Nginx container via docker-compose.prod.yml:
# volumes:
#   - /etc/letsencrypt:/etc/letsencrypt:ro

# 5. Auto-renewal (runs twice daily, renews when < 30 days remain)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
sudo systemctl status certbot.timer
```

### With Kubernetes (cert-manager)

```bash
# 1. Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# 2. Wait for cert-manager pods to be ready
kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=120s

# 3. Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# 4. Annotate your Ingress to request a certificate
# (Add to infrastructure/k8s/ingress.yaml)
# annotations:
#   cert-manager.io/cluster-issuer: "letsencrypt-prod"
# tls:
# - hosts:
#   - yourdomain.com
#   secretName: automotive-ai-tls

kubectl apply -f infrastructure/k8s/ingress.yaml

# 5. Verify certificate is issued
kubectl get certificates -n automotive-ai
kubectl describe certificate automotive-ai-tls -n automotive-ai
```

---

## Monitoring Setup

The platform ships with a pre-configured Prometheus + Grafana stack.

### Access Prometheus

```bash
# Docker Compose
# Prometheus: http://your-server:9090
# Grafana:    http://your-server:3001 (default: admin / admin — change immediately)

# Kubernetes port-forward (if not exposed via Ingress)
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
kubectl port-forward svc/grafana 3001:80 -n monitoring
```

### Pre-built Dashboards

Four dashboards are provisioned automatically:

| Dashboard | Description |
|---|---|
| **Platform Overview** | Request rate, error rate, p95/p99 latency, active users |
| **ML Inference** | GPU utilization, VRAM usage, embedding latency, batch queue depth |
| **Crawler Status** | Active jobs, URLs processed/hour, error rates, images ingested |
| **Database Health** | PostgreSQL connections, query latency, pgvector index usage; Neo4j queries; Redis hit rate |

### Key Alerts

Configured in `infrastructure/monitoring/alerts.yaml`:

| Alert | Condition | Severity |
|---|---|---|
| `HighErrorRate` | HTTP 5xx > 1% of requests for 5 min | Critical |
| `MLInferenceDown` | ML inference health check failing | Critical |
| `GPUMemoryHigh` | GPU VRAM utilization > 90% for 10 min | Warning |
| `CrawlerStalled` | No URLs processed for 30 min during scheduled window | Warning |
| `PgvectorSlowQuery` | Similarity search p99 > 500ms | Warning |
| `Neo4jHighMemory` | Heap usage > 80% | Warning |
| `CeleryQueueDepth` | Embedding queue depth > 10,000 | Warning |

```bash
# Test alert routing (requires Alertmanager config)
curl -X POST http://localhost:9090/-/reload  # reload rules
kubectl exec -n monitoring deployment/prometheus -- \
  promtool check rules /etc/prometheus/alerts.yaml
```

---

## Backup & Recovery

### PostgreSQL Backup

```bash
# Manual backup (Docker Compose)
docker compose exec postgres pg_dump \
  -U autoai autoai_db \
  --format=custom \
  --compress=9 \
  > backups/postgres/autoai_$(date +%Y%m%d_%H%M%S).pgdump

# Automated backup via cron (runs nightly at 01:00)
# Add to host crontab:
0 1 * * * /opt/automotive-ai/scripts/backup_postgres.sh

# Restore from backup
docker compose exec -T postgres pg_restore \
  -U autoai -d autoai_db --clean \
  < backups/postgres/autoai_20250520_010000.pgdump
```

For production Kubernetes, use `pgBackRest` or `Barman`, or configure a CronJob:

```bash
kubectl apply -f infrastructure/k8s/jobs/postgres-backup-cronjob.yaml
```

### Neo4j Backup

```bash
# Stop writes before backup (or use online backup for Enterprise)
docker compose exec neo4j neo4j-admin database backup \
  --to-path=/backups neo4j

# The backup is written to /backups/neo4j/ inside the container.
# Mount a host path or copy out:
docker compose exec neo4j tar czf /backups/neo4j_$(date +%Y%m%d).tar.gz /backups/neo4j/
docker cp $(docker compose ps -q neo4j):/backups/neo4j_$(date +%Y%m%d).tar.gz ./backups/neo4j/

# Restore
docker compose exec neo4j neo4j-admin database restore \
  --from-path=/backups/neo4j neo4j --overwrite-destination
```

### MinIO Backup

```bash
# Use MinIO Client (mc) to mirror to an S3-compatible offsite target
mc alias set local http://localhost:9001 minioadmin minioadmin
mc alias set backup s3 $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY

# Mirror all buckets to S3
mc mirror local/automotive-images backup/automotive-ai-backup \
  --overwrite --remove

# Or run as a Kubernetes CronJob daily
kubectl apply -f infrastructure/k8s/jobs/minio-sync-cronjob.yaml
```

### Backup Retention Policy

| Data Type | Daily | Weekly | Monthly |
|---|---|---|---|
| PostgreSQL | 7 days | 4 weeks | 3 months |
| Neo4j | 3 days | 2 weeks | 1 month |
| MinIO (raw images) | N/A | N/A | Indefinite (cold tier after 1 year) |

---

## Troubleshooting

### Backend fails to start: "connection refused" to PostgreSQL

```bash
# Check PostgreSQL is running and accepting connections
docker compose logs postgres | tail -30

# Verify DATABASE_URL is correct
docker compose exec backend python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
import os

async def check():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT 1'))
        print('PostgreSQL OK:', result.scalar())

asyncio.run(check())
"
```

### ML Inference Server shows "CUDA out of memory"

```bash
# Check current GPU memory usage
docker compose exec ml-inference nvidia-smi

# Reduce batch size in .env
ML_BATCH_SIZE=8  # default is 16

# Or check for leaked tensors
docker compose exec ml-inference python -c "
import torch
print('Allocated:', torch.cuda.memory_allocated() / 1e9, 'GB')
print('Reserved:', torch.cuda.memory_reserved() / 1e9, 'GB')
torch.cuda.empty_cache()
"

# Restart the ML inference container to clear GPU memory
docker compose restart ml-inference
```

### pgvector similarity search returns no results

```bash
# Check that the IVFFlat index is populated
docker compose exec postgres psql -U autoai autoai_db -c "
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE indexdef LIKE '%ivfflat%';
"

# Check vector column is not null for recent generations
docker compose exec postgres psql -U autoai autoai_db -c "
SELECT COUNT(*) as total,
       COUNT(combined_embedding) as with_embedding,
       COUNT(*) - COUNT(combined_embedding) as missing_embedding
FROM generations;
"

# If embeddings are missing, trigger re-embedding job
docker compose exec backend python scripts/reembed_missing.py
```

### Neo4j graph appears incomplete

```bash
# Check edge counts
docker compose exec neo4j cypher-shell -u neo4j -p $NEO4J_PASSWORD \
  "MATCH ()-[r]->() RETURN type(r) AS rel_type, count(r) AS count ORDER BY count DESC;"

# Re-run evolution detection
docker compose exec backend celery call ml.tasks.run_evolution_detection

# Check Celery task logs
docker compose exec celery-worker celery inspect active
docker compose logs celery-worker | grep "evolution_detection"
```

### Crawler workers are not picking up jobs

```bash
# Check Redis queue depths
docker compose exec redis redis-cli llen celery

# Check Celery worker status
docker compose exec celery-worker celery inspect stats

# Verify Redis connection from worker
docker compose exec celery-worker python -c "
import redis, os
r = redis.from_url(os.environ['REDIS_URL'])
print('Redis ping:', r.ping())
print('Queue depth:', r.llen('celery'))
"

# Restart crawler workers
docker compose restart crawler-worker
```

### Kubernetes pod stuck in CrashLoopBackOff

```bash
# Get the pod name
kubectl get pods -n automotive-ai | grep CrashLoopBackOff

# Get last logs (even for crashed pods)
kubectl logs pod/backend-7d4f9b-abc12 -n automotive-ai --previous

# Describe the pod for events
kubectl describe pod/backend-7d4f9b-abc12 -n automotive-ai

# Common causes:
# 1. Missing secret — check all required secrets exist:
kubectl get secrets -n automotive-ai

# 2. Database not ready at startup — check init containers:
kubectl get pod backend-7d4f9b-abc12 -n automotive-ai -o jsonpath='{.status.initContainerStatuses}'

# 3. OOMKilled — check memory limits:
kubectl top pod -n automotive-ai
```

### High latency on similarity search (pgvector)

```bash
# Check index is being used (EXPLAIN ANALYZE)
docker compose exec postgres psql -U autoai autoai_db -c "
EXPLAIN ANALYZE
SELECT id, 1 - (combined_embedding <=> '[0.1,0.2,...]'::vector) AS similarity
FROM generations
ORDER BY combined_embedding <=> '[0.1,0.2,...]'::vector
LIMIT 10;
"
# Look for 'Index Scan using idx_generations_combined_embedding_ivfflat'
# If using 'Seq Scan', the index may need rebuilding or nprobe tuning

# Tune nprobe (trade accuracy for speed)
SET ivfflat.probes = 20;  -- default is 1; 10-20 is a good range

# Rebuild the index if it has become bloated
REINDEX INDEX CONCURRENTLY idx_generations_combined_embedding_ivfflat;
```
