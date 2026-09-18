import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.database import SessionLocal
from app.models import Measurement, Project, Site, User
from sqlalchemy import delete, select

with SessionLocal() as db:
    users = list(
        db.scalars(
            select(User).where(
                User.name == "Interface verification",
                User.email.like("ui-%@example.com"),
                User.is_demo.is_(False),
            )
        )
    )
    removed = 0
    for user in users:
        projects = list(db.scalars(select(Project).where(Project.owner_id == user.id)))
        if any(p.name != "Browser verification landscape" for p in projects):
            continue
        project_ids = [p.id for p in projects]
        site_ids = list(
            db.scalars(select(Site.id).where(Site.project_id.in_(project_ids)))
        )
        db.execute(delete(Measurement).where(Measurement.site_id.in_(site_ids)))
        db.execute(delete(Site).where(Site.id.in_(site_ids)))
        db.execute(delete(Project).where(Project.id.in_(project_ids)))
        db.delete(user)
        removed += 1
    db.commit()
    print(
        f"Removed {removed} temporary browser-test accounts and their test-only records"
    )
