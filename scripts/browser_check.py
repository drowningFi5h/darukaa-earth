import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

out = Path("output/submission/screenshots")
out.mkdir(parents=True, exist_ok=True)
base = os.environ.get("BASE_URL", "http://localhost:5173")
with sync_playwright() as p:
    browser = p.chromium.launch(
        channel=os.environ.get("BROWSER_CHANNEL")
        or ("msedge" if sys.platform == "win32" else None),
        headless=True,
    )
    page = browser.new_page(
        viewport={"width": 1440, "height": 1000}, device_scale_factor=1
    )
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(base, wait_until="networkidle")
    page.screenshot(path=str(out / "landing-desktop.png"), full_page=True)
    page.get_by_role("button", name="Explore the platform", exact=True).click()
    page.wait_for_url("**/app")
    page.get_by_role("heading", name="Your living landscapes.").wait_for()
    page.get_by_role("button", name="Riverbank forest", exact=False).wait_for(
        timeout=30000
    )
    page.wait_for_timeout(6000)
    page.screenshot(path=str(out / "workspace-desktop.png"), full_page=True)
    assert not page.locator(".map-error").count(), "Map failed to load"
    page.get_by_role("button", name="Riverbank forest", exact=False).click()
    page.get_by_role("button", name="Carbon removal", exact=True).wait_for(
        timeout=15000
    )
    page.screenshot(path=str(out / "site-analytics.png"), full_page=True)
    page.get_by_role("button", name="Biodiversity", exact=True).click()
    page.get_by_text("View measurement table", exact=True).click()
    assert page.get_by_role("table").is_visible()
    page.get_by_role("button", name="Close panel").click()
    for width in [390, 768]:
        page.set_viewport_size({"width": width, "height": 900})
        page.screenshot(path=str(out / f"workspace-{width}.png"), full_page=True)
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (
            f"overflow at {width}"
        )
    page.goto(base, wait_until="networkidle")
    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path=str(out / "landing-mobile.png"), full_page=True)
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    assert not errors, errors
    print("PASS live demo, charts, map, and responsive layouts")
    browser.close()
