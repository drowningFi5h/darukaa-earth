"""Integration tests require a migrated PostGIS database; no SQLite substitute."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, get_db
from app.main import app
from app.seed import seed

POLYGON = {
    "type": "Polygon",
    "coordinates": [[[75, 13], [75.01, 13], [75.01, 13.01], [75, 13.01], [75, 13]]],
}


@pytest.fixture
def client():
    with engine.connect() as connection:
        transaction = connection.begin()
        session = Session(bind=connection, join_transaction_mode="create_savepoint")
        app.dependency_overrides[get_db] = lambda: session
        try:
            with TestClient(app, headers={"Origin": settings.app_origin}) as c:
                yield c
        finally:
            app.dependency_overrides.clear()
            session.close()
            transaction.rollback()


def register(c):
    credentials = {
        "name": "Test explorer",
        "email": f"{uuid.uuid4()}@example.com",
        "password": "Test-password-123",
    }
    result = c.post("/api/auth/register", json=credentials)
    assert result.status_code == 201, result.text
    assert "HttpOnly" in result.headers["set-cookie"]
    return credentials


def test_lifecycle_and_ownership(client):
    credentials = register(client)
    assert client.get("/api/auth/me").status_code == 200
    project = client.post("/api/projects", json={"name": "Forest", "category": "carbon"}).json()
    result = client.post(
        f"/api/projects/{project['id']}/sites", json={"name": "North", "geometry": POLYGON}
    )
    assert result.status_code == 201, result.text
    site = result.json()
    assert 100 < site["area_ha"] < 140
    assert client.get(f"/api/sites/{site['id']}/analytics").json()["measurements"] == []
    assert (
        client.patch(
            f"/api/sites/{site['id']}", json={"name": "South", "geometry": POLYGON}
        ).status_code
        == 200
    )
    client.post("/api/auth/logout")
    assert client.get("/api/projects").status_code == 401
    assert client.post("/api/auth/login", json=credentials).status_code == 200
    assert client.get(f"/api/sites/{site['id']}").json()["name"] == "South"
    client.post("/api/auth/logout")
    register(client)
    assert client.get(f"/api/projects/{project['id']}").status_code == 404
    assert client.get(f"/api/sites/{site['id']}").status_code == 404
    assert (
        client.patch(
            f"/api/sites/{site['id']}", json={"name": "Stolen", "geometry": POLYGON}
        ).status_code
        == 404
    )


def test_demo_and_analytics(client):
    seed()
    assert client.post("/api/auth/demo").status_code == 200
    projects = client.get("/api/projects").json()
    assert len(projects) == 3
    assert (
        client.post("/api/projects", json={"name": "Forbidden", "category": "carbon"}).status_code
        == 403
    )
    sites = client.get(f"/api/projects/{projects[0]['id']}/sites").json()
    assert len(sites) == 2
    series = client.get(f"/api/sites/{sites[0]['id']}/analytics").json()
    assert series["is_sample"] and len(series["measurements"]) == 12
    assert (
        client.patch(
            f"/api/sites/{sites[0]['id']}", json={"name": "No", "geometry": POLYGON}
        ).status_code
        == 403
    )


@pytest.mark.parametrize(
    "geometry",
    [
        {"type": "Point", "coordinates": [75, 13]},
        {"type": "Polygon", "coordinates": []},
        {"type": "Polygon", "coordinates": [[[75, 13], [76, 14], [75, 14], [76, 13], [75, 13]]]},
        {"type": "Polygon", "coordinates": [[[200, 13], [201, 13], [201, 14], [200, 13]]]},
    ],
)
def test_invalid_geometry(client, geometry):
    register(client)
    p = client.post("/api/projects", json={"name": "Validation", "category": "biodiversity"}).json()
    assert (
        client.post(
            f"/api/projects/{p['id']}/sites", json={"name": "Bad", "geometry": geometry}
        ).status_code
        == 422
    )


def test_auth_and_csrf(client):
    credentials = register(client)
    assert client.post("/api/auth/register", json=credentials).status_code == 409
    assert (
        client.post(
            "/api/auth/login", json={**credentials, "password": "wrong-password"}
        ).status_code
        == 401
    )
    assert (
        client.post("/api/auth/logout", headers={"Origin": "https://evil.example"}).status_code
        == 403
    )
    assert client.get("/api/health").status_code == 200
