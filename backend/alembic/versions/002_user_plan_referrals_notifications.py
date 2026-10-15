"""Add User plan/referral fields, referrals and notifications tables

Revision ID: 002
Revises: 001
Create Date: 2026-09-04 00:00:00.000000

Fixes schema drift between migration 001 and app/db/postgresql/models.py:
the User model already declared `plan`, `plan_expires_at`, `referral_code`
plus the Referral/Notification models, but 001 never created any of them —
so any query touching `users` (including every auth endpoint) 500s until
this migration runs.
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # ── Enum types ─────────────────────────────────────────────────────────────
    # create_type=False: they're explicitly created below via checkfirst=True,
    # so the create_table calls that reference them as a column type shouldn't
    # *also* try to auto-create them (see the same fix + explanation in 001).
    referral_status_enum = postgresql.ENUM(
        "pending", "credited", "cancelled",
        name="referral_status_enum", create_type=False,
    )
    notification_type_enum = postgresql.ENUM(
        "info", "success", "warning", "error", "referral", "payment",
        name="notification_type_enum", create_type=False,
    )
    for enum_type in [referral_status_enum, notification_type_enum]:
        enum_type.create(op.get_bind(), checkfirst=True)

    # ── users: missing plan/referral columns ──────────────────────────────────
    op.add_column("users", sa.Column("plan", sa.String(20), server_default="free", nullable=False))
    op.add_column("users", sa.Column("plan_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("referral_code", sa.String(12), nullable=True))
    op.create_unique_constraint("uq_users_referral_code", "users", ["referral_code"])
    op.create_index("ix_users_referral_code", "users", ["referral_code"])

    # ── referrals ──────────────────────────────────────────────────────────────
    op.create_table(
        "referrals",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("referrer_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("referred_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("level", sa.Integer(), server_default="1", nullable=False),
        sa.Column("reward_days", sa.Integer(), server_default="7", nullable=False),
        sa.Column("status", referral_status_enum, server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_unique_constraint("uq_referrals_referred", "referrals", ["referred_id"])
    op.create_index("ix_referrals_referrer_id", "referrals", ["referrer_id"])
    op.create_index("ix_referrals_referrer", "referrals", ["referrer_id"])

    # ── notifications ──────────────────────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", notification_type_enum, server_default="info", nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("action_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_user_read", "notifications", ["user_id", "is_read"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("referrals")

    op.drop_index("ix_users_referral_code", table_name="users")
    op.drop_constraint("uq_users_referral_code", "users", type_="unique")
    op.drop_column("users", "referral_code")
    op.drop_column("users", "plan_expires_at")
    op.drop_column("users", "plan")

    op.execute("DROP TYPE IF EXISTS notification_type_enum")
    op.execute("DROP TYPE IF EXISTS referral_status_enum")
