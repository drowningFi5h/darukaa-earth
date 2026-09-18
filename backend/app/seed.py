"""Idempotent illustrative dataset. Never modifies registered users' projects."""

from datetime import date

from sqlalchemy import select

from .config import settings
from .database import SessionLocal
from .main import assign_geometry
from .models import Measurement, Project, Site, User
from .security import passwords

PROJECTS = [
    (
        "Western Ghats restoration",
        "carbon",
        "Restoring a connected forest landscape in Karnataka.",
        75.65,
        13.45,
        ["Riverbank forest", "Highland canopy"],
    ),
    (
        "Sundarbans mangrove reserve",
        "carbon",
        "Protecting coastal habitat through mangrove restoration.",
        88.8,
        21.95,
        ["Estuary refuge", "Tidal restoration"],
    ),
    (
        "Kaziranga habitat corridor",
        "biodiversity",
        "Connecting grassland and wetland habitats in Assam.",
        93.35,
        26.6,
        ["Eastern grassland", "Wetland corridor"],
    ),
]


def seed():
    with SessionLocal() as db:
        demo = db.scalar(select(User).where(User.email == "demo@darukaa.earth"))
        if not demo:
            demo = User(
                email="demo@darukaa.earth",
                name="Demo explorer",
                is_demo=True,
                password_hash=passwords.hash(settings.demo_password),
            )
            db.add(demo)
            db.flush()
        else:
            demo.password_hash = passwords.hash(settings.demo_password)
        if db.scalar(select(Project.id).where(Project.owner_id == demo.id)):
            db.commit()
            print("Demo dataset already exists")
            return
        for index, (name, category, description, lon, lat, names) in enumerate(PROJECTS):
            project = Project(
                owner_id=demo.id, name=name, category=category, description=description
            )
            db.add(project)
            db.flush()
            for offset, site_name in enumerate(names):
                x, y = lon + offset * 0.035, lat + offset * 0.02
                geometry = {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [x, y],
                            [x + 0.014, y + 0.002],
                            [x + 0.019, y + 0.013],
                            [x + 0.007, y + 0.02],
                            [x - 0.004, y + 0.01],
                            [x, y],
                        ]
                    ],
                }
                site = Site(project_id=project.id, name=site_name)
                assign_geometry(site, geometry, db)
                db.add(site)
                db.flush()
                for month in range(1, 13):
                    db.add(
                        Measurement(
                            site_id=site.id,
                            date=date(2025, month, 1),
                            carbon_tco2e=round(22 + index * 9 + offset * 5 + month * 2.4, 1),
                            species_count=24 + index * 13 + offset * 4 + month * 2,
                        )
                    )
        db.commit()
        print("Created 3 sample projects, 6 sites, and 72 monthly measurements")


if __name__ == "__main__":
    seed()
