# AutoEvoFlow — nextlevelbuilder Integrations

## ui-ux-pro-max-skill
Installed via `uipro init --ai claude`. Design intelligence for Next.js + Cytoscape.js frontend.

## f2u-cli Temp File Hosting
**What it does:** Gives AI agents temporary URLs for car images during ML analysis.
**Files:**
- `backend/app/services/file_hosting.py` — FileHostingService with f2u + MinIO fallback
- `backend/app/core/config.py` — F2U_API_KEY var

**Usage:**
```python
from app.services.file_hosting import file_hosting
url = await file_hosting.upload_temp("/path/to/car.jpg", ttl_hours=1)
# → https://f2u.sh/files/abc123.jpg (expires in 1h)
```

**Setup:** Get free API key at https://f2u.sh, set F2U_API_KEY env var.
