import os

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(
        viewport={"width": 390, "height": 844}, reduced_motion="reduce"
    )
    page.goto(
        os.environ.get("BASE_URL", "http://localhost:5173"), wait_until="networkidle"
    )
    page.keyboard.press("Tab")
    assert page.locator(":focus").count() == 1
    page.get_by_role("button", name="Explore the platform", exact=True).click()
    page.wait_for_url("**/app")
    page.get_by_role("button", name="Riverbank forest", exact=False).click()
    page.get_by_role("button", name="Carbon removal", exact=True).wait_for()
    assert page.get_by_role("dialog").is_visible()
    page.screenshot(
        path="output/submission/screenshots/analytics-mobile.png", full_page=True
    )
    page.keyboard.press("Escape")
    page.get_by_role("dialog").wait_for(state="hidden")
    assert page.locator(":focus").count() == 1
    assert page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")
    print(
        "PASS mobile site sheet, keyboard focus/Escape, and reduced-motion preference"
    )
    browser.close()
