import json
from pathlib import Path

import httpx
from dotenv import dotenv_values

root = Path.cwd()
env = dotenv_values(root / ".env")
s = json.loads((root / "tmp/render-service.json").read_text())
headers = {"Authorization": f"Bearer {env['RENDER_API_KEY']}"}
r = httpx.get(
    f"https://api.render.com/v1/services/{s['id']}/deploys?limit=3",
    headers=headers,
    timeout=30,
)
for entry in r.json():
    d = entry.get("deploy", entry)
    print({k: d.get(k) for k in ["id", "status", "createdAt", "finishedAt"]})
try:
    health = httpx.get(s["url"] + "/api/health", timeout=15)
    print(
        "Public health:",
        health.status_code,
        health.text[:150] if health.status_code == 200 else "",
    )
except httpx.HTTPError:
    print("Public health: still starting")
