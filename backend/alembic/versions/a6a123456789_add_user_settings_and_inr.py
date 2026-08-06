"""add user settings and inr default

Revision ID: a6a123456789
Revises: ee4641b64cdb
Create Date: 2026-08-04 21:42:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a6a123456789'
down_revision: Union[str, None] = 'ee4641b64cdb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create user_settings table
    op.create_table(
        'user_settings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('theme', sa.String(length=20), server_default='light', nullable=False),
        sa.Column('language', sa.String(length=20), server_default='en', nullable=False),
        sa.Column('notification_email', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('notification_sms', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('notification_push', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('map_provider', sa.String(length=20), server_default='maplibre', nullable=False),
        sa.Column('default_payment_method', sa.String(length=20), server_default='CASH', nullable=False),
        sa.Column('emergency_contact_name', sa.String(length=100), nullable=True),
        sa.Column('emergency_contact_phone', sa.String(length=20), nullable=True),
        sa.Column('preferred_ride_type', sa.String(length=20), server_default='ECONOMY', nullable=False),
        sa.Column('privacy_share_location', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('driver_vehicle_model', sa.String(length=100), nullable=True),
        sa.Column('driver_vehicle_plate', sa.String(length=20), nullable=True),
        sa.Column('driver_ride_pref_auto_accept', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('driver_wallet_payout_bank', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Update default of wallets.currency to 'INR'
    op.alter_column('wallets', 'currency', server_default='INR', existing_type=sa.String(3))
    # Update existing wallets to 'INR'
    op.execute("UPDATE wallets SET currency = 'INR'")


def downgrade() -> None:
    op.drop_table('user_settings')
    op.alter_column('wallets', 'currency', server_default='USD', existing_type=sa.String(3))
