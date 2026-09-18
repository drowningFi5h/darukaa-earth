import os
import sys
import uuid
from pathlib import Path

from playwright.sync_api import sync_playwright

email = f"ui-{uuid.uuid4()}@example.com"
Path("tmp/browser-test-user.txt").write_text(email)
base = os.environ.get("BASE_URL", "http://localhost:5173")
with sync_playwright() as p:
    browser = p.chromium.launch(
        channel=os.environ.get("BROWSER_CHANNEL")
        or ("msedge" if sys.platform == "win32" else None),
        headless=True,
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.goto(base + "/register", wait_until="networkidle")
    page.get_by_label("Your name", exact=True).fill("Interface verification")
    page.get_by_label("Email address", exact=True).fill(email)
    page.get_by_label("Password", exact=True).fill("Browser-test-12345")
    page.get_by_role("button", name="Create account", exact=True).click()
    page.wait_for_url("**/app")
    page.get_by_role("button", name="New project", exact=True).click()
    page.get_by_label("Project name", exact=True).fill("Browser verification landscape")
    page.get_by_label("Description", exact=True).fill(
        "Temporary end-to-end verification project."
    )
    page.get_by_role("button", name="Create project", exact=True).click()
    page.get_by_role("button", name="Add site", exact=True).wait_for(timeout=20000)
    page.get_by_role("button", name="Add site", exact=True).click()
    page.get_by_label("Site name", exact=True).fill("Drawn boundary")
    canvas = page.locator(".draw-map canvas.mapboxgl-canvas")
    canvas.wait_for()
    page.wait_for_timeout(5000)
    box = canvas.bounding_box()
    assert box
    for x, y in [(0.4, 0.4), (0.6, 0.4), (0.6, 0.65), (0.4, 0.65), (0.4, 0.4)]:
        page.mouse.click(box["x"] + box["width"] * x, box["y"] + box["height"] * y)
        page.wait_for_timeout(220)
    page.get_by_role("button", name="Save site", exact=True).click()
    page.get_by_role("button", name="Drawn boundary", exact=False).wait_for(
        timeout=20000
    )
    page.reload(wait_until="domcontentloaded")
    page.get_by_role("button", name="Drawn boundary", exact=False).click()
    page.get_by_text("A new story starts here.", exact=True).wait_for()
    page.get_by_role("button", name="Edit site", exact=True).click()
    page.get_by_label("Site name", exact=True).fill("Verified boundary")
    page.get_by_role("button", name="Save changes", exact=True).click()
    page.get_by_role("button", name="Verified boundary", exact=False).wait_for(
        timeout=20000
    )
    print(
        "PASS registration, project creation, map polygon drawing, save/reload, empty analytics, and site edit"
    )
    page.get_by_role("button", name="Log out", exact=True).click()
    page.wait_for_url("**/login")
    browser.close()
Path("tmp/browser-test-user.txt").write_text(email)
