from playwright.sync_api import sync_playwright
import time
import os

def verify_site():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        # 1. Load the page (assuming file is served or accessible)
        # We need a server. The environment usually provides one or we open the file.
        # Since the previous tool run used localhost:8082, I assume a server is running or I should start one.
        # But wait, I don't have a server running in the background in my plan steps yet.
        # I should probably start a server or use file:// path.
        # For this environment, usually `python3 -m http.server 8082` is good.

        # Let's assume the user/env handles it or I start it.
        # I will start it in the background in the bash command before running this script.

        page.goto("http://localhost:8082")
        time.sleep(2) # Wait for Three.js init

        # 2. Screenshot Hero
        page.screenshot(path="verification/verify_v2_hero.png")
        print("Hero screenshot taken.")

        # 3. Scroll to Manifesto (Section 2)
        manifesto = page.locator(".manifesto")
        manifesto.scroll_into_view_if_needed()
        time.sleep(2) # Wait for GSAP stack animation
        page.screenshot(path="verification/verify_v2_manifesto.png")
        print("Manifesto screenshot taken.")

        # 4. Scroll to Cards (Section 3)
        cards = page.locator(".cards-section")
        cards.scroll_into_view_if_needed()
        time.sleep(1) # Wait for scroll

        # Hover over first card
        first_card = page.locator(".data-card").first
        if first_card.is_visible():
            first_card.hover()
            time.sleep(0.5)

        page.screenshot(path="verification/verify_v2_cards.png")
        print("Cards screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_site()
