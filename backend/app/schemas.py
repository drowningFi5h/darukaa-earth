from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator
from shapely.geometry import shape
from shapely.validation import explain_validity


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class Registration(Credentials):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Enter a name")
        return value.strip()


class ProjectInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=2000)
    category: Literal["carbon", "biodiversity"]

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Enter a project name")
        return value.strip()


class SiteInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    geometry: dict

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Enter a site name")
        return value.strip()

    @field_validator("geometry")
    @classmethod
    def polygon(cls, value: dict) -> dict:
        try:
            if value.get("type") != "Polygon":
                raise ValueError("Draw a Polygon")
            rings = value["coordinates"]
            if not rings or sum(len(r) for r in rings) > 5000:
                raise ValueError("Use a polygon with 4 to 5000 vertices")
            for ring in rings:
                if len(ring) < 4 or ring[0] != ring[-1]:
                    raise ValueError("Close the polygon with at least three distinct corners")
                for point in ring:
                    if len(point) != 2 or not (-180 <= point[0] <= 180 and -85 <= point[1] <= 85):
                        raise ValueError("Coordinates must be longitude/latitude within map bounds")
                if any(abs(a[0] - b[0]) > 180 for a, b in zip(ring, ring[1:])):
                    raise ValueError("Sites crossing the antimeridian are not supported")
            polygon = shape(value)
            if polygon.is_empty or not polygon.is_valid or polygon.area == 0:
                raise ValueError(f"Invalid polygon: {explain_validity(polygon)}")
        except (KeyError, TypeError, IndexError) as exc:
            raise ValueError("Provide valid GeoJSON polygon coordinates") from exc
        return value
