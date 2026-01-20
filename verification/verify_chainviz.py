
from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Get absolute path to the file
        cwd = os.getcwd()
        file_path = f"file://{cwd}/chainviz.html"

        print(f"Navigating to {file_path}")
        page.goto(file_path)

        # Wait a bit for Three.js to initialize and render a frame
        page.wait_for_timeout(2000)

        # Take a screenshot
        screenshot_path = "verification/chainviz_screenshot.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    run()
