const assert = require("node:assert/strict");
const { chromium } = require("C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await page.goto("http://127.0.0.1:8773/");
    await page.locator(".home-carousel").waitFor();
    await page.waitForTimeout(5300);
    assert.match(await page.locator(".reference-banner-main").getAttribute("aria-label"), /2 \/ 4/);
    for (let i = 0; i < 2; i++) await page.locator(".home-carousel").press("ArrowRight");
    await page.locator(".repair-slide").waitFor();
    assert.equal(await page.locator(".repair-slide a").getAttribute("href"), "/repair");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: "qa-results/operations-repair-slide.png" });

    await page.goto("http://127.0.0.1:8773/not-admin");
    await page.locator("#admin-username").fill("qaowner");
    await page.locator("#admin-password").fill("qa-owner-password-only");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("tab", { name: "Repair tickets" }).click();
    await page.locator(".repair-ticket-form input").nth(0).fill("Test Repair Buyer");
    await page.locator(".repair-ticket-form input").nth(1).fill("9806600444");
    await page.locator(".repair-ticket-form input").nth(2).fill("Pulsar NS200 meter");
    await page.locator(".repair-ticket-form textarea").fill("Display blank");
    await page.getByRole("button", { name: "Create repair ticket" }).click();
    await page.locator(".repair-ticket-list article").first().waitFor();
    const confirmed = await page.evaluate(async () => {
      const { products } = await (await fetch("/api/products")).json();
      const product = products[0];
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...product, isSample: false, priceIsEstimate: false }) });
      return response.ok;
    });
    assert.equal(confirmed, true);
    await page.reload();
    await page.getByRole("tab", { name: "Billing" }).click();
    await page.getByRole("button", { name: "Walk-in sale" }).click();
    await page.locator(".billing-panel input").nth(0).fill("Test Walk In");
    await page.locator(".billing-products input").first().fill("1");
    await page.getByRole("button", { name: "Issue and print bill" }).click();
    await page.locator(".billing-list article").first().waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: "qa-results/operations-billing-mobile.png" });
    await page.getByRole("tab", { name: "Used phones" }).click();
    await page.locator(".admin-product-actions .icon-button").first().click();
    await page.locator(".used-inspection-editor").waitFor();
    await page.screenshot({ path: "qa-results/operations-inspection-mobile.png" });
    console.log("PASS: mobile repair slide, admin repair ticket, walk-in bill and used-phone inspection editor");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
