import json
from pathlib import Path

import httpx
from dotenv import dotenv_values

root = Path(__file__).resolve().parents[1]
env = dotenv_values(root / ".env")
headers = {"Authorization": f"Bearer {env['RENDER_API_KEY']}"}
url = "https://api.render.com/v1/services"
payload = {
    "type": "web_service",
    "name": "darukaa-earth",
    "ownerId": "tea-csp663rtq21c73eb2510",
    "repo": "https://github.com/drowningFi5h/darukaa-earth",
    "branch": "main",
    "autoDeploy": "no",
    "envVars": [
        {"key": k, "value": env[k]}
        for k in ["DATABASE_URL", "JWT_SECRET", "DEMO_PASSWORD", "VITE_MAPBOX_TOKEN"]
    ]
    + [
        {"key": "COOKIE_SECURE", "value": "true"},
        {"key": "APP_ORIGIN", "value": "https://darukaa-earth.onrender.com"},
    ],
    "serviceDetails": {
        "env": "docker",
        "plan": "free",
        "region": "singapore",
        "healthCheckPath": "/api/health",
        "envSpecificDetails": {"dockerfilePath": "./Dockerfile", "dockerContext": "."},
    },
}
r = httpx.post(url, headers=headers, json=payload, timeout=60)
print("create service:", r.status_code)
if r.is_success:
    data = r.json()
    service = data.get("service", data)
    safe = {
        "id": service["id"],
        "url": service.get("serviceDetails", {}).get("url"),
        "name": service["name"],
    }
    (root / "tmp/render-service.json").write_text(json.dumps(safe))
    print(json.dumps(safe))
else:
    print(r.text[:1500])
