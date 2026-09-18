"""Regression: home navigation and entry actions retain the signed-in account."""

import os
import sys
import uuid
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

base = os.environ.get("BASE_URL", "http://localhost:5173")
with sync_playwright() as p:
    browser = p.chromium.launch(
        channel=os.environ.get("BROWSER_CHANNEL")
        or ("msedge" if sys.platform == "win32" else None),
        headless=True,
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    credentials = {
        "name": "Interface verification",
        "email": f"ui-{uuid.uuid4()}@example.com",
        "password": "Browser-test-12345",
    }
    created = page.request.post(
        base + "/api/auth/register", data=credentials, headers={"Origin": base}
    )
    assert created.status == 201
    user_id = created.json()["id"]
    page.request.post(base + "/api/auth/logout", headers={"Origin": base})
    page.goto(base + "/login")
    page.get_by_label("Email address", exact=True).fill(credentials["email"])
    page.get_by_label("Password", exact=True).fill(credentials["password"])
    page.get_by_role("button", name="Log in", exact=True).click()
    page.wait_for_url("**/app")
    page.get_by_role("link", name="Visit our home").click()
    expect(page.get_by_role("link", name="My workspace", exact=True)).to_be_visible()
    assert page.request.get(base + "/api/auth/me").json()["id"] == user_id
    page.reload(wait_until="networkidle")
    expect(page.get_by_role("link", name="My workspace", exact=True)).to_be_visible()
    demo_requests = []
    page.on(
        "request",
        lambda req: (
            demo_requests.append(req.url)
            if req.url.endswith("/api/auth/demo")
            else None
        ),
    )
    page.get_by_role("button", name="Return to workspace", exact=True).click()
    page.wait_for_url("**/app")
    assert page.request.get(base + "/api/auth/me").json()["id"] == user_id
    page.get_by_role("link", name="Darukaa Earth home").click()
    page.get_by_role(
        "button", name="Forest restoration Western Ghats", exact=False
    ).click()
    page.wait_for_url("**/app")
    assert page.request.get(base + "/api/auth/me").json()["id"] == user_id
    assert not demo_requests, "A homepage action replaced the account with demo"
    page.goto(base + "/login")
    page.wait_for_url("**/app")
    page.get_by_role("link", name="Visit our home").click()
    for width in [1440, 390]:
        page.set_viewport_size({"width": width, "height": 900})
        nav = page.get_by_role("navigation", name="Main navigation")
        for name, fragment in [
            ("Our approach", "approach"),
            ("Landscapes", "landscapes"),
            ("Our impact", "impact"),
        ]:
            nav.get_by_role("link", name=name, exact=True).click()
            expect(page).to_have_url(base + "/#" + fragment)
            page.evaluate("window.scrollTo(0,0)")
        brand = page.locator(".landing-nav .brand")
        brand.hover()
        assert brand.evaluate("el => getComputedStyle(el).cursor") == "pointer"
        brand.focus()
        page.keyboard.press("Tab")
        page.keyboard.press("Shift+Tab")
        assert brand.evaluate("el => getComputedStyle(el).outlineStyle") != "none"
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        Path("tmp/navigation-review").mkdir(parents=True, exist_ok=True)
        page.screenshot(path=f"tmp/navigation-review/home-{width}.png")
    page.get_by_role("link", name="My workspace", exact=True).click()
    page.wait_for_url("**/app")
    page.get_by_role("button", name="Log out", exact=True).click()
    page.wait_for_url("**/login")
    page.goto(base)
    page.get_by_role("button", name="Explore the platform", exact=True).click()
    page.wait_for_url("**/app")
    assert page.request.get(base + "/api/auth/me").json()["is_demo"]
    print(
        "PASS login to home to reload to workspace, logo, project cards, auth redirect, hero links, mobile focus, and anonymous demo"
    )
    browser.close()
