const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:8767";

async function run() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
    args: ["--no-proxy-server"],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const results = [];
  const errors = [];
  const go = async (url) => {
    await page.goto(url);
    await page.locator(".site-header").waitFor();
  };
  page.on("pageerror", (error) => errors.push(error.message));
  fs.mkdirSync("qa-results", { recursive: true });
  await go(base);
  await page.evaluate(() => localStorage.clear());
  for (const width of [320, 360, 375, 390, 430, 650, 767]) {
    await page.setViewportSize({ width, height: 844 });
    await go(base + "/mobiles");
    await page.locator(".product-card").first().waitFor();
    const measurements = await page.evaluate(() => {
      const rect = (selector) =>
        document.querySelector(selector).getBoundingClientRect();
      const font = (selector) =>
        parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
      return {
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        title: font(".product-body h3"),
        specification: font(".product-spec"),
        price: font(".price-row strong"),
        input: font(".search-input input"),
        addWidth: rect(".add-button").width,
        addHeight: rect(".add-button").height,
        menuHeight: rect(".menu-button").height,
        dockHeight: rect(".mobile-dock a").height,
        detailsHeight: rect(".card-links a").height,
      };
    });
    assert.ok(measurements.scrollWidth <= width, `Page overflow at ${width}`);
    assert.ok(
      measurements.title >= 20 &&
        measurements.specification >= 16 &&
        measurements.price >= 24 &&
        measurements.input >= 16,
      `Unreadable product type at ${width}`,
    );
    for (const key of [
      "addWidth",
      "addHeight",
      "menuHeight",
      "dockHeight",
      "detailsHeight",
    ])
      assert.ok(
        measurements[key] >= 44,
        `${key} touch target too small at ${width}`,
      );
    results.push(measurements);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await go(base);
  await page.screenshot({ path: "qa-results/mobile-preview.png" });
  await page.getByRole("link", { name: "Under Rs. 35,000" }).click();
  await page.locator(".product-card").first().waitFor();
  const budgets = await page
    .locator(".product-card .price-row strong")
    .allTextContents();
  assert.ok(
    budgets.length &&
      budgets.every((value) => Number(value.replace(/[^0-9]/g, "")) <= 35000),
    "Budget shortcut did not filter prices",
  );
  await go(base);
  assert.equal(
    await page.locator(".product-card").count(),
    0,
    "Homepage should only show banners and budget links",
  );
  await page.getByLabel("Open navigation").click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Home", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Open navigation").getAttribute("aria-expanded"),
    "false",
    "Same-page menu link did not close the menu",
  );
  await page.getByLabel("Open navigation").click();
  await page.keyboard.press("Escape");
  assert.equal(
    await page.getByLabel("Open navigation").getAttribute("aria-expanded"),
    "false",
    "Escape did not close menu",
  );
  await page
    .getByRole("navigation", { name: "Quick navigation" })
    .getByRole("link", { name: "Shop", exact: true })
    .click();
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByLabel("Brand", { exact: true }).selectOption("Apple");
  assert.equal(await page.locator(".product-card").count(), 1);
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByLabel("Sort products").selectOption("low");
  await page.screenshot({
    path: "qa-results/catalogue-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Add iPhone 15 to bag", { exact: true }).click();
  await page
    .getByRole("navigation", { name: "Quick navigation" })
    .getByRole("link", { name: "Bag (1)", exact: true })
    .click();
  await page.getByLabel("Increase iPhone 15 quantity").click();
  await page.reload();
  assert.equal(await page.locator(".quantity span").textContent(), "2");
  await page.screenshot({ path: "qa-results/cart-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await page.getByLabel("Full name").fill("Mobile Preview");
  await page.getByLabel("Phone number").fill("9806600444");
  await page.getByLabel("Email address").fill(`qa-${Date.now()}@example.com`);
  for (const selector of [
    "#customer-name",
    "#customer-phone",
    "#customer-email",
    "#order-note",
  ]) {
    assert.ok(
      await page
        .locator(selector)
        .evaluate(
          (element) => parseFloat(getComputedStyle(element).fontSize) >= 16,
        ),
      `${selector} can trigger phone input zoom`,
    );
  }
  await page.screenshot({
    path: "qa-results/checkout-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Create pickup order" }).click();
  await page
    .getByRole("heading", { name: "Your order has been received." })
    .waitFor();
  await page.screenshot({
    path: "qa-results/order-mobile.png",
    fullPage: true,
  });
  const orderHref = await page
    .getByRole("link", { name: "Contact shop about this order" })
    .getAttribute("href");
  assert.ok(
    new URL(orderHref).searchParams.get("text").includes("iPhone 15 × 2"),
  );
  assert.deepEqual(errors, []);
  await page.evaluate(() => localStorage.clear());
  fs.writeFileSync(
    "qa-results/mobile-checks.json",
    JSON.stringify(
      {
        passed: true,
        measurements: results,
        checks: [
          "Readable phone text",
          "44px shopping controls",
          "16px form fields",
          "Banner-only homepage and category navigation",
          "Same-page and Escape menu closure",
          "Bottom navigation",
          "Filters and sorting",
          "Cart quantities survive reload",
          "Pickup checkout and WhatsApp summary",
        ],
        limits:
          "Chrome touch emulation; no physical iPhone or Android device tested.",
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(
    "PASS: phone typography, touch controls, navigation, and checkout at seven widths.",
  );
}
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
