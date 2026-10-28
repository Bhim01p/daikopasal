const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:8770";
async function capture() {
  fs.mkdirSync("qa-results", { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
    args: ["--no-proxy-server"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1700 },
      deviceScaleFactor: 1,
    });
    await page.goto(base);
    await page.locator(".hero h1").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator("img").evaluateAll((images) =>
      Promise.all(
        images.map((image) => {
          image.loading = "eager";
          return image.decode().catch(() => {});
        }),
      ),
    );
    await page.screenshot({ path: "qa-results/reference-desktop-preview.png" });
    await page.close();
    const phone = await browser.newPage({
      viewport: { width: 390, height: 1400 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await phone.goto(base);
    await phone.locator(".hero h1").waitFor();
    await phone.evaluate(() => document.fonts.ready);
    await phone.locator("img").evaluateAll((images) =>
      Promise.all(
        images.map((image) => {
          image.loading = "eager";
          return image.decode().catch(() => {});
        }),
      ),
    );
    await phone.screenshot({ path: "qa-results/reference-mobile-preview.png" });
    await phone.goto(base + "/mobiles");
    await phone.locator(".product-card").first().waitFor();
    await phone.locator("img").evaluateAll((images) =>
      Promise.all(
        images.map((image) => {
          image.loading = "eager";
          return image.decode().catch(() => {});
        }),
      ),
    );
    await phone.setViewportSize({ width: 390, height: 1280 });
    await phone.screenshot({
      path: "qa-results/reference-catalogue-preview.png",
    });
    console.log(
      "Captured reference-style desktop, phone homepage, and phone catalogue screenshots.",
    );
  } finally {
    await browser.close();
  }
}
capture().catch((error) => {
  console.error(error);
  process.exit(1);
});
