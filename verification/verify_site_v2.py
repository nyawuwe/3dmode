from playwright.sync_api import sync_playwright
import time

def verify_site():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        # 1. Load the page
        page.goto("http://localhost:8080")
        time.sleep(2) # Wait for Three.js init

        # 2. Screenshot Hero
        page.screenshot(path="verification/verify_v2_hero.png")
        print("Hero screenshot taken.")

        # 3. Scroll to Manifesto (Section 2)
        # It's at '.manifesto'.
        manifesto = page.locator(".manifesto")
        manifesto.scroll_into_view_if_needed()
        time.sleep(1) # Wait for animation
        page.screenshot(path="verification/verify_v2_manifesto.png")
        print("Manifesto screenshot taken.")

        # 4. Scroll to Cards (Mechanisms)
        cards = page.locator(".mechanisms")
        cards.scroll_into_view_if_needed()
        time.sleep(1) # Wait for scroll
        # Hover over a card to test interaction (though static screenshot might not show it well,
        # unless we capture during hover)
        page.hover(".card-0")
        time.sleep(0.5)
        page.screenshot(path="verification/verify_v2_cards.png")
        print("Cards screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_site()
