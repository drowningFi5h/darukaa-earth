"""Check hero flow at short desktop, tablet, and mobile viewport sizes."""

import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

base = os.environ.get("BASE_URL", "http://localhost:5173")
with sync_playwright() as p:
    browser = p.chromium.launch(
        channel="msedge" if sys.platform == "win32" else None, headless=True
    )
    page = browser.new_page(reduced_motion="reduce")
    page.goto(base, wait_until="networkidle")
    for authenticated in [False, True]:
        if authenticated:
            assert page.request.post(
                base + "/api/auth/demo", headers={"Origin": base}
            ).ok
            page.reload(wait_until="networkidle")
            page.get_by_role(
                "button", name="Return to workspace", exact=True
            ).wait_for()
        for width, height in [
            (1440, 734),
            (1366, 768),
            (1024, 600),
            (871, 734),
            (768, 600),
            (390, 640),
            (320, 568),
        ]:
            page.set_viewport_size({"width": width, "height": height})
            page.evaluate("document.fonts.ready")
            page.wait_for_timeout(100)
            actions = page.locator(".hero-actions").bounding_box()
            footer = page.locator(".hero-bottom").bounding_box()
            hero = page.locator(".hero").bounding_box()
            assert actions and footer and hero
            assert actions["y"] + actions["height"] + 24 <= footer["y"], (
                width,
                height,
                actions,
                footer,
            )
            assert footer["y"] + footer["height"] <= hero["y"] + hero["height"] + 1, (
                width,
                height,
                footer,
                hero,
            )
            assert page.evaluate(
                "document.documentElement.scrollWidth <= innerWidth"
            ), (width, height)
            if authenticated and width in [1440, 390]:
                Path("tmp/hero-review").mkdir(parents=True, exist_ok=True)
                page.screenshot(
                    path=f"tmp/hero-review/hero-{width}.png", full_page=False
                )
    browser.close()
print(
    "PASS hero separation and overflow checks in 14 signed-in/signed-out viewport combinations"
)
