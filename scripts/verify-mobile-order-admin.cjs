const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
  });
  try {
    const p = await b.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const base = "http://127.0.0.1:8773";
    await p.goto(base + "/mobiles");
    await p
      .getByRole("button", { name: /^Add .+ to cart$/ })
      .first()
      .click();
    await p.locator(".mobile-dock .dock-bag").click();
    await p.getByRole("link", { name: /Continue to checkout/ }).click();
    await p.locator("#customer-name").fill("Mobile QA");
    await p.locator("#customer-phone").fill("9846692687");
    await p.locator("#customer-email").fill("mobile-qa@example.com");
    await p.getByRole("button", { name: "Create pickup order" }).click();
    await p.waitForURL("**/order/*");
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await p.goto(base + "/my-orders");
    await p.locator(".guest-receipt").first().waitFor();
    await p.locator(".mobile-dock button").click();
    await p
      .getByLabel("Nepal mobile number", { exact: true })
      .fill("9846692687");
    assert.equal(
      await p
        .getByRole("button", { name: "Get test code", exact: true })
        .isEnabled(),
      true,
    );
    await p.keyboard.press("Escape");
    await p.goto(base + "/not-admin");
    await p.getByLabel("Username", { exact: true }).fill("qaowner");
    await p
      .getByLabel("Password", { exact: true })
      .fill("qa-owner-password-only");
    await p.getByRole("button", { name: "Sign in", exact: true }).click();
    await p.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
    for (const route of [
      "/not-admin/orders",
      "/not-admin/new-phones",
      "/not-admin/used-phones",
      "/not-admin/accessories",
      "/not-admin/staff",
      "/not-admin/new-phones/create",
    ]) {
      await p.goto(base + route);
      await p.waitForTimeout(200);
      const v = await p.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      assert.ok(v.scroll <= v.width + 1, route + " " + JSON.stringify(v));
    }
    await p.screenshot({ path: "qa-results/mobile-admin-editor.png" });
    console.log(
      "PASS mobile pickup order, guest tracking, phone login entry and authenticated admin orders/category/staff/editor layouts.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
