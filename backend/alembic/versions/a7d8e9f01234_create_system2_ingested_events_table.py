"""create_system2_ingested_events_table

Revision ID: a7d8e9f01234
Revises: f3b890123456
Create Date: 2026-11-11 13:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7d8e9f01234'
down_revision: Union[str, Sequence[str], None] = 'f3b890123456'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to add System 2 durable idempotency ledger table."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'system2_ingested_events' not in tables:
        op.create_table(
            'system2_ingested_events',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('sensor_id', sa.String(length=100), nullable=False),
            sa.Column('event_id', sa.String(length=128), nullable=False),
            sa.Column('source_ip', sa.String(length=45), nullable=False),
            sa.Column('attack_id', sa.Integer(), nullable=False),
            sa.Column('attack_event_id', sa.Integer(), nullable=False),
            sa.Column('alert_id', sa.Integer(), nullable=True),
            sa.Column('correlation_id', sa.String(length=64), nullable=True),
            sa.Column('response_json', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['attack_id'], ['attacks.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['attack_event_id'], ['attack_events.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['alert_id'], ['alerts.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_system2_ingested_events_id'), 'system2_ingested_events', ['id'], unique=False)
        op.create_index(op.f('ix_system2_ingested_events_sensor_id'), 'system2_ingested_events', ['sensor_id'], unique=False)
        op.create_index(op.f('ix_system2_ingested_events_event_id'), 'system2_ingested_events', ['event_id'], unique=True)
        op.create_index(op.f('ix_system2_ingested_events_created_at'), 'system2_ingested_events', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'system2_ingested_events' in tables:
        op.drop_index(op.f('ix_system2_ingested_events_created_at'), table_name='system2_ingested_events')
        op.drop_index(op.f('ix_system2_ingested_events_event_id'), table_name='system2_ingested_events')
        op.drop_index(op.f('ix_system2_ingested_events_sensor_id'), table_name='system2_ingested_events')
        op.drop_index(op.f('ix_system2_ingested_events_id'), table_name='system2_ingested_events')
        op.drop_table('system2_ingested_events')
