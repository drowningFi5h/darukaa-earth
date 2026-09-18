import json
import logging
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import Measurement, Project, Site, User
from .schemas import Credentials, ProjectInput, Registration, SiteInput
from .security import current_user, passwords, set_session, writable

app = FastAPI(title="Darukaa Earth API", version="1.0.0", docs_url="/api/docs")


@app.middleware("http")
async def security_headers(request: Request, call_next):
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        if request.headers.get("origin") != settings.app_origin.rstrip("/"):
            return JSONResponse({"detail": "Request origin is not allowed"}, status_code=403)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError):
    logging.getLogger(__name__).error("Database request failed: %s", type(exc).__name__)
    return JSONResponse(
        {"detail": "Database unavailable. Please try again shortly."}, status_code=503
    )


def user_json(user):
    return {"id": user.id, "name": user.name, "email": user.email, "is_demo": user.is_demo}


@app.post("/api/auth/register", status_code=201)
def register(data: Registration, response: Response, db: Session = Depends(get_db)):
    user = User(
        email=str(data.email).lower(), name=data.name, password_hash=passwords.hash(data.password)
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "An account already exists with this email") from exc
    set_session(response, user)
    return user_json(user)


@app.post("/api/auth/login")
def login(data: Credentials, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(data.email).lower()))
    if not user or not passwords.verify(data.password, user.password_hash):
        raise HTTPException(401, "Email or password is incorrect")
    set_session(response, user)
    return user_json(user)


@app.post("/api/auth/demo")
def demo(response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.is_demo.is_(True)))
    if not user:
        raise HTTPException(503, "The demo is being prepared. Please try again shortly.")
    set_session(response, user)
    return user_json(user)


@app.post("/api/auth/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie("session", secure=settings.cookie_secure, httponly=True, samesite="lax")


@app.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return user_json(user)


def owned_project(id: str, user: User, db: Session):
    project = db.scalar(select(Project).where(Project.id == id, Project.owner_id == user.id))
    if not project:
        raise HTTPException(404, "Project not found")
    return project


def owned_site(id: str, user: User, db: Session):
    site = db.scalar(select(Site).join(Project).where(Site.id == id, Project.owner_id == user.id))
    if not site:
        raise HTTPException(404, "Site not found")
    return site


def project_json(project, db):
    count, area = db.execute(
        select(func.count(Site.id), func.coalesce(func.sum(Site.area_ha), 0)).where(
            Site.project_id == project.id
        )
    ).one()
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "category": project.category,
        "site_count": count,
        "area_ha": area,
    }


def site_json(site):
    return {
        "id": site.id,
        "project_id": site.project_id,
        "name": site.name,
        "geometry": mapping(to_shape(site.geometry)),
        "area_ha": site.area_ha,
    }


@app.get("/api/projects")
def projects(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Project).where(Project.owner_id == user.id).order_by(Project.created_at)
    )
    return [project_json(row, db) for row in rows]


@app.post("/api/projects", status_code=201)
def create_project(
    data: ProjectInput, user: User = Depends(writable), db: Session = Depends(get_db)
):
    project = Project(owner_id=user.id, **data.model_dump())
    db.add(project)
    db.commit()
    return project_json(project, db)


@app.get("/api/projects/{id}")
def project(id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return project_json(owned_project(id, user, db), db)


@app.get("/api/projects/{id}/sites")
def sites(id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned_project(id, user, db)
    return [
        site_json(s)
        for s in db.scalars(select(Site).where(Site.project_id == id).order_by(Site.name))
    ]


def assign_geometry(site, geometry, db):
    geojson = json.dumps(geometry)
    area = db.scalar(
        text("SELECT ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(:g),4326)::geography)/10000"),
        {"g": geojson},
    )
    if not area or area <= 0:
        raise HTTPException(422, "Draw a polygon with a positive area")
    site.geometry = func.ST_SetSRID(func.ST_GeomFromGeoJSON(geojson), 4326)
    site.area_ha = area


@app.post("/api/projects/{id}/sites", status_code=201)
def create_site(
    id: str, data: SiteInput, user: User = Depends(writable), db: Session = Depends(get_db)
):
    owned_project(id, user, db)
    site = Site(project_id=id, name=data.name)
    assign_geometry(site, data.geometry, db)
    db.add(site)
    db.commit()
    db.refresh(site)
    return site_json(site)


@app.get("/api/sites/{id}")
def site(id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return site_json(owned_site(id, user, db))


@app.patch("/api/sites/{id}")
def update_site(
    id: str, data: SiteInput, user: User = Depends(writable), db: Session = Depends(get_db)
):
    site = owned_site(id, user, db)
    site.name = data.name
    assign_geometry(site, data.geometry, db)
    db.commit()
    db.refresh(site)
    return site_json(site)


@app.get("/api/sites/{id}/analytics")
def analytics(id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned_site(id, user, db)
    rows = db.scalars(
        select(Measurement).where(Measurement.site_id == id).order_by(Measurement.date)
    )
    return {
        "is_sample": user.is_demo,
        "measurements": [
            {"date": str(m.date), "carbon_tco2e": m.carbon_tco2e, "species_count": m.species_count}
            for m in rows
        ],
    }


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT PostGIS_Version()"))
    return {"status": "ok", "database": "PostgreSQL/PostGIS"}


static = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if static.exists():
    app.mount("/assets", StaticFiles(directory=static / "assets"), name="assets")

    @app.get("/{path:path}")
    def frontend(path: str):
        if path.startswith("api/"):
            raise HTTPException(404, "API endpoint not found")
        candidate = (static / path).resolve()
        if candidate.is_relative_to(static) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(static / "index.html")
