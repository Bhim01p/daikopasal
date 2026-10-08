const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:8770";

async function run() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
    args: ["--no-proxy-server"],
  });
  const errors = [];
  const phone = "98" + String(Date.now()).slice(-8);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  async function login(target, number, next = "/my-orders") {
    await target.goto(base + "/login?next=" + encodeURIComponent(next));
    await target.getByLabel("Nepal mobile number").fill(number);
    const startResponse = target.waitForResponse(
      (response) =>
        response.url().endsWith("/api/customer/auth/start") &&
        response.request().method() === "POST",
    );
    await target
      .getByRole("button", { name: "Get test code", exact: true })
      .click();
    const started = await startResponse;
    const startResult = await started.json();
    assert.equal(
      started.status(),
      200,
      startResult.error || "Could not request a test code",
    );
    await target.locator(".account-demo-code strong").waitFor();
    const code = await target
      .locator(".account-demo-code strong")
      .textContent();
    await target.getByLabel("Verification code").fill("000000");
    await target
      .getByRole("button", { name: "Verify and log in", exact: true })
      .click();
    await target
      .getByText("That code is incorrect. Please try again.")
      .waitFor();
    await target.getByLabel("Verification code").fill(code);
    await target
      .getByRole("button", { name: "Verify and log in", exact: true })
      .click();
  }
  try {
    fs.mkdirSync("qa-results", { recursive: true });
    await page.goto(base + "/mobiles");
    await page.getByLabel("Add Galaxy A55 5G to bag", { exact: true }).click();
    await page.goto(base + "/checkout");
    await page
      .getByRole("link", { name: "Log in to use saved details" })
      .click();
    await page.getByLabel("Nepal mobile number").fill(phone);
    await page
      .getByRole("button", { name: "Get test code", exact: true })
      .click();
    await page.locator(".account-demo-code strong").waitFor();
    await page.screenshot({
      path: "qa-results/customer-login-mobile.png",
      fullPage: true,
    });
    await page
      .getByLabel("Verification code")
      .fill(await page.locator(".account-demo-code strong").textContent());
    await page.getByRole("button", { name: "Verify and log in" }).click();
    await page.getByLabel("Full name").fill("Account Preview Customer");
    await page
      .getByLabel("Email address")
      .fill(`account-${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.waitForURL("**/checkout");
    await page
      .getByRole("heading", { name: "Review your pickup order." })
      .waitFor();
    assert.equal(
      await page
        .locator("#customer-name, #customer-phone, #customer-email")
        .count(),
      0,
    );
    assert.ok(
      (await page.locator(".saved-customer").textContent()).includes(
        "Account Preview Customer",
      ),
    );
    await page.getByRole("button", { name: "Create pickup order" }).click();
    await page
      .getByRole("heading", { name: "Your order has been received." })
      .waitFor();
    const receiptUrl = page.url();
    const reference = receiptUrl.split("/").pop();
    assert.ok(
      !(
        await page.evaluate(() => localStorage.getItem("me-orders") || "")
      ).includes(reference),
      "Account receipt must not be cached in local storage",
    );
    await page.getByRole("link", { name: "Back to My orders" }).click();
    await page.getByRole("heading", { name: reference, exact: true }).waitFor();
    await page.reload();
    await page.getByRole("heading", { name: reference, exact: true }).waitFor();
    const secondContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const second = await secondContext.newPage();
    await login(second, "+977" + phone);
    await second
      .getByRole("heading", { name: reference, exact: true })
      .waitFor();
    await second.goto(receiptUrl);
    await second
      .getByRole("heading", { name: "Your order has been received." })
      .waitFor();
    assert.equal(
      await second
        .getByRole("list", { name: "Order progress" })
        .locator("li")
        .count(),
      1,
    );
    const access = fs.readFileSync("backend/ADMIN-ACCESS.txt", "utf8");
    const username = access.match(/Username:\s*(.+)/)[1].trim();
    const password = access.match(/Password:\s*(.+)/)[1].trim();
    const admin = await secondContext.request.post(base + "/api/admin/login", {
      data: { username, password },
    });
    assert.equal(admin.status(), 200);
    assert.equal(
      (
        await secondContext.request.patch(
          base + "/api/admin/orders/" + reference,
          { data: { status: "Ready for pickup" } },
        )
      ).status(),
      200,
    );
    await page
      .getByRole("button", { name: "Refresh orders", exact: true })
      .click();
    await page
      .locator(".customer-order")
      .getByText("Ready for pickup", { exact: true })
      .waitFor();
    await page.screenshot({
      path: "qa-results/customer-orders-mobile.png",
      fullPage: true,
    });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/account", "/my-orders", `/order/${reference}`]) {
        await page.goto(base + route);
        await page.locator("h1").waitFor();
        await page.evaluate(() => document.fonts.ready);
        const scroll = await page.evaluate(
          () => document.documentElement.scrollWidth,
        );
        assert.ok(scroll <= width, `${route} overflows at ${width}: ${scroll}`);
      }
    }
    await second.reload();
    await second
      .locator(".reference")
      .getByText("Ready for pickup", { exact: true })
      .waitFor();
    assert.equal(
      await second
        .getByRole("list", { name: "Order progress" })
        .locator("li")
        .count(),
      2,
    );
    const strangerContext = await browser.newContext();
    const stranger = await strangerContext.newPage();
    await login(stranger, "97" + String(Date.now()).slice(-8));
    await stranger.getByLabel("Full name").fill("Another Customer");
    await stranger
      .getByLabel("Email address")
      .fill("other-account@example.com");
    await stranger.getByRole("button", { name: "Save and continue" }).click();
    await stranger.getByRole("heading", { name: "No orders yet." }).waitFor();
    assert.equal(
      (
        await strangerContext.request.get(base + "/api/orders/" + reference)
      ).status(),
      404,
    );
    await page.goto(base + "/account");
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await page.getByLabel("Nepal mobile number").waitFor();
    assert.equal(
      (await context.request.get(base + "/api/customer/orders")).status(),
      401,
    );
    await page.goto(receiptUrl);
    await page
      .getByRole("heading", { name: "Let’s find your order." })
      .waitFor();
    await second.goto(base + "/my-orders");
    await second
      .getByRole("heading", { name: reference, exact: true })
      .waitFor();
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "qa-results/customer-checks.json",
      JSON.stringify(
        {
          passed: true,
          checks: [
            "Local phone-code login",
            "One-time profile completion",
            "Saved checkout details",
            "My orders and refreshed pickup status",
            "Cross-device account receipt",
            "Order progress history",
            "Other customer cannot access receipt",
            "No account receipt in local storage",
            "Sign out revokes current device",
            "320–1440px layouts",
          ],
          messages: "No real SMS or emails sent",
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: customer login, saved details, private My orders, cross-device receipts and mobile layouts.",
    );
  } finally {
    await browser.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
