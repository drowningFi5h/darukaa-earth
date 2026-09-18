"""Create the project and spatial data schema."""

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry

revision = "001"
down_revision = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False),
    )
    op.create_table(
        "projects",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(2000), nullable=False),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_projects_owner_id", "projects", ["owner_id"])
    op.create_table(
        "sites",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("geometry", Geometry("POLYGON", srid=4326), nullable=False),
        sa.Column("area_ha", sa.Float(), nullable=False),
    )
    op.create_index("ix_sites_project_id", "sites", ["project_id"])
    op.create_table(
        "measurements",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("site_id", sa.String(36), sa.ForeignKey("sites.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("carbon_tco2e", sa.Float(), nullable=False),
        sa.Column("species_count", sa.Integer(), nullable=False),
        sa.UniqueConstraint("site_id", "date"),
    )
    op.create_index("ix_measurements_site_id", "measurements", ["site_id"])


def downgrade():
    for table in ["measurements", "sites", "projects", "users"]:
        op.drop_table(table)
