const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = "http://127.0.0.1:8773";
    await page.goto(base + "/not-admin");
    await page.getByLabel("Username", { exact: true }).fill("qaowner");
    await page
      .getByLabel("Password", { exact: true })
      .fill("qa-owner-password-only");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("heading", { name: "Dashboard", exact: true })
      .waitFor();
    await page.goto(base + "/not-admin/new-phones");
    await page
      .getByRole("button", { name: "Edit Redmi 9", exact: true })
      .click();
    await page.getByLabel("Offer an EMI estimate for this phone").check();
    await page.getByLabel("Annual interest (%)", { exact: true }).fill("12");
    await page.getByLabel("Upfront fee (NPR)", { exact: true }).fill("500");
    await page.locator("#product-stock").fill("5");
    await page
      .getByLabel("Temporary estimated price — confirm before selling")
      .uncheck();
    await page
      .getByRole("button", { name: "Save product", exact: true })
      .click();
    await page.waitForURL("**/not-admin/new-phones");
    await page.screenshot({ path: "qa-results/ruby-admin-desktop.png" });
    // Uninspected used stock must not silently appear to have a saved condition.
    await page.goto(base + "/not-admin/used-phones");
    await page
      .getByRole("button", { name: "Edit Redmi 9 (used)", exact: true })
      .click();
    assert.equal(await page.locator("#product-condition").inputValue(), "");
    await page.locator("#product-battery").fill("90");
    await page
      .getByRole("button", { name: "Save product", exact: true })
      .click();
    assert.equal(
      await page
        .locator("#product-condition")
        .evaluate((select) => select.validity.valueMissing),
      true,
    );
    await page.locator("#product-condition").selectOption("Good");
    await page
      .getByRole("button", { name: "Save product", exact: true })
      .click();
    await page.waitForURL("**/not-admin/used-phones");

    await page.goto(base + "/");
    await page.screenshot({ path: "qa-results/ruby-home-light.png" });
    const initial = await page.locator(".home-carousel h1").textContent();
    await page.mouse.move(700, 400);
    await page.waitForTimeout(3100);
    assert.notEqual(
      await page.locator(".home-carousel h1").textContent(),
      initial,
    );
    await page.goto(base + "/mobiles");
    assert.equal(await page.locator(".product-card").count(), 4);
    await page
      .getByRole("button", { name: "Save Redmi 9 to favourites", exact: true })
      .click();
    await page.goto(base + "/favourites");
    await page.reload();
    assert.equal(await page.locator(".product-card").count(), 1);
    await page
      .getByRole("button", {
        name: "Remove Redmi 9 from favourites",
        exact: true,
      })
      .click();
    assert.equal(await page.locator(".product-card").count(), 0);
    await page.goto(
      base +
        "/compare?first=reference-redmi-9-np&second=reference-redmi-10-global",
    );
    await page.getByRole("table").waitFor();
    assert.ok(
      (await page.getByRole("table").textContent()).includes("Helio G80"),
    );
    assert.ok(
      (await page.getByRole("table").textContent()).includes("Helio G88"),
    );
    const rows = await page.locator("tbody tr").count();
    await page.getByLabel("Show differences only").check();
    assert.ok((await page.locator("tbody tr").count()) < rows);
    await page.screenshot({ path: "qa-results/ruby-comparison.png" });
    await page.goto(base + "/product/redmi-9");
    await page.locator(".emi-calculator summary").click();
    await page.locator(".emi-results").waitFor();
    await page.getByLabel("Down payment (NPR)").fill("0");
    await page.getByRole("alert").waitFor();
    await page.getByLabel("Down payment (NPR)").fill("5000");
    await page.locator(".emi-results").waitFor();
    await page.screenshot({ path: "qa-results/ruby-product-light.png" });
    await page.goto(base + "/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("ruby-browser@example.com");
    await page
      .getByRole("button", { name: "Send login code", exact: true })
      .click();
    await page.getByLabel("Verification code").waitFor();
    assert.equal(await page.locator(".account-demo-code").count(), 0);
    const otp = JSON.parse(readFileSync("qa-results/ruby-otp.json", "utf8"));
    assert.equal(otp.email, "ruby-browser@example.com");
    await page.getByLabel("Verification code").fill(otp.code);
    await page.getByRole("button", { name: "Verify and log in" }).click();
    await page.waitForURL("**/account?**");
    await page.getByLabel("Full name", { exact: true }).fill("Ruby QA");
    await page
      .getByLabel("Nepal mobile number", { exact: true })
      .fill("9846692687");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.waitForURL("**/my-orders");
    await page.goto(base + "/product/redmi-9");
    await page
      .getByRole("button", { name: "Add to cart", exact: true })
      .click();
    await page.getByRole("button", { name: /Shopping cart,/ }).click();
    await page.getByRole("link", { name: /Continue to checkout/ }).click();
    await page.waitForURL("**/checkout");
    await page.getByRole("button", { name: "Create pickup order" }).click();
    await page.waitForURL("**/order/*");
    await page.getByRole("link", { name: "Track order", exact: true }).click();
    assert.ok(page.url().endsWith("#order-progress"));
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "/",
        "/mobiles",
        "/accessories",
        "/help",
        "/repair",
        "/favourites",
        "/compare?first=reference-redmi-9-np&second=reference-redmi-10-global",
        "/not-admin/orders",
      ]) {
        await page.goto(base + route);
        await page.waitForTimeout(80);
        const geometry = await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        assert.ok(
          geometry.scroll <= width + 1,
          route + " " + JSON.stringify(geometry),
        );
      }
      if (width === 390) {
        await page.goto(base + "/");
        await page.screenshot({
          path: "qa-results/ruby-home-mobile-light.png",
        });
        await page.getByRole("button", { name: "Open navigation" }).click();
        await page
          .getByRole("button", { name: "Switch to dark theme" })
          .click();
        await page.getByRole("button", { name: "Close navigation" }).click();
        await page.waitForTimeout(350);
        await page.screenshot({ path: "qa-results/ruby-home-mobile-dark.png" });
        await page.goto(base + "/mobiles");
        await page.screenshot({
          path: "qa-results/ruby-catalogue-mobile-dark.png",
        });
        await page.getByRole("button", { name: "Open navigation" }).click();
        await page
          .locator("#main-navigation")
          .getByLabel("Language", { exact: true })
          .selectOption("ne");
        await page
          .getByRole("button", { name: "नेभिगेसन बन्द गर्नुहोस्" })
          .click()
          .catch(() => page.locator(".menu-button").click());
        await page.screenshot({ path: "qa-results/ruby-catalogue-nepali.png" });
        await page.evaluate(() => localStorage.setItem("me-language", "en"));
        await page.reload();
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: redesign desktop/mobile/tablet, both themes, favourites persistence/removal, sourced comparison, admin EMI configuration, EMI validation, email OTP/profile, account checkout and tracking.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
