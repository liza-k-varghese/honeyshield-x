"""create_security_outbox_and_pairing_tables

Revision ID: f3b890123456
Revises: e2665b9d1a2f
Create Date: 2026-11-03 10:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3b890123456'
down_revision: Union[str, Sequence[str], None] = 'e2665b9d1a2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to add transactional security event outbox and QR device pairing tables."""
    op.create_table(
        'security_event_outbox',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('event_id', sa.String(length=64), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('resource_id', sa.String(length=100), nullable=False),
        sa.Column('severity', sa.String(length=20), server_default='info', nullable=False),
        sa.Column('schema_version', sa.String(length=10), server_default='1.0', nullable=False),
        sa.Column('payload_json', sa.Text(), nullable=False),
        sa.Column('correlation_id', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_security_event_outbox_id'), 'security_event_outbox', ['id'], unique=False)
    op.create_index(op.f('ix_security_event_outbox_event_id'), 'security_event_outbox', ['event_id'], unique=True)
    op.create_index(op.f('ix_security_event_outbox_event_type'), 'security_event_outbox', ['event_type'], unique=False)
    op.create_index(op.f('ix_security_event_outbox_resource_id'), 'security_event_outbox', ['resource_id'], unique=False)
    op.create_index(op.f('ix_security_event_outbox_created_at'), 'security_event_outbox', ['created_at'], unique=False)

    op.create_table(
        'device_pairing_challenges',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('challenge_id', sa.String(length=64), nullable=False),
        sa.Column('operator_username', sa.String(length=100), nullable=False),
        sa.Column('device_fingerprint', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=30), server_default='pending', nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('claimed_at', sa.DateTime(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by', sa.String(length=100), nullable=True),
        sa.Column('device_metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_device_pairing_challenges_id'), 'device_pairing_challenges', ['id'], unique=False)
    op.create_index(op.f('ix_device_pairing_challenges_challenge_id'), 'device_pairing_challenges', ['challenge_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_device_pairing_challenges_challenge_id'), table_name='device_pairing_challenges')
    op.drop_index(op.f('ix_device_pairing_challenges_id'), table_name='device_pairing_challenges')
    op.drop_table('device_pairing_challenges')

    op.drop_index(op.f('ix_security_event_outbox_created_at'), table_name='security_event_outbox')
    op.drop_index(op.f('ix_security_event_outbox_resource_id'), table_name='security_event_outbox')
    op.drop_index(op.f('ix_security_event_outbox_event_type'), table_name='security_event_outbox')
    op.drop_index(op.f('ix_security_event_outbox_event_id'), table_name='security_event_outbox')
    op.drop_index(op.f('ix_security_event_outbox_id'), table_name='security_event_outbox')
    op.drop_table('security_event_outbox')

