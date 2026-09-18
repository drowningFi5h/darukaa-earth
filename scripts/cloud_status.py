"""Inspect only provider metadata; never print credentials or connection strings."""

import json
from pathlib import Path

import httpx
from dotenv import dotenv_values

env = dotenv_values(Path(__file__).resolve().parents[1] / ".env")
headers = {"Authorization": f"Bearer {env['RENDER_API_KEY']}"}
for endpoint in ["owners", "services?limit=20"]:
    response = httpx.get(
        f"https://api.render.com/v1/{endpoint}", headers=headers, timeout=30
    )
    print(endpoint, response.status_code)
    if response.is_success:
        data = response.json()
        safe = []
        for entry in data:
            obj = entry.get("owner", entry.get("service", {}))
            safe.append({k: obj.get(k) for k in ["id", "name", "type"]})
        print(json.dumps(safe))
