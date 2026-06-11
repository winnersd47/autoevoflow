from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import auth, brands, models, evolution, search, analysis

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(brands.router, prefix="/brands", tags=["Brands"])
api_router.include_router(models.router, prefix="/models", tags=["Models"])
api_router.include_router(evolution.router, prefix="/evolution", tags=["Evolution"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
