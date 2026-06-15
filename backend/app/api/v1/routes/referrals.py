"""Referral system — stats and share link."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, DBSession
from app.core.config import settings
from app.db.postgresql.models import Referral, ReferralStatus

router = APIRouter()


@router.get("/stats")
async def referral_stats(
    user: CurrentUser,
    db: DBSession,
) -> dict:
    """Referral statistics for the current user."""
    l1 = (await db.execute(
        select(func.count()).select_from(Referral).where(
            and_(Referral.referrer_id == user.id, Referral.level == 1)
        )
    )).scalar() or 0

    l2 = (await db.execute(
        select(func.count()).select_from(Referral).where(
            and_(Referral.referrer_id == user.id, Referral.level == 2)
        )
    )).scalar() or 0

    earned = (await db.execute(
        select(func.coalesce(func.sum(Referral.reward_days), 0)).where(
            and_(Referral.referrer_id == user.id, Referral.status == ReferralStatus.credited)
        )
    )).scalar() or 0

    base_url = getattr(settings, "APP_BASE_URL", "https://autoevoflow.app")
    return {
        "referral_code": user.referral_code,
        "share_link": f"{base_url}/register?ref={user.referral_code}",
        "level1_count": l1,
        "level2_count": l2,
        "total_referrals": l1 + l2,
        "earned_days": earned,
    }


@router.get("/code")
async def my_code(user: CurrentUser) -> dict:
    """Return current user's referral code."""
    base_url = getattr(settings, "APP_BASE_URL", "https://autoevoflow.app")
    return {
        "referral_code": user.referral_code,
        "share_link": f"{base_url}/register?ref={user.referral_code}",
    }
