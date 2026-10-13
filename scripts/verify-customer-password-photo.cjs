const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const assert = require("node:assert/strict"),
  { readFileSync } = require("node:fs");
const base = "http://127.0.0.1:8773";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  try {
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      }),
      page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const verifyCode = async () => {
      await page
        .getByRole("button", { name: "Send login code", exact: true })
        .click();
      await page
        .getByLabel("Verification code")
        .fill(
          JSON.parse(readFileSync("qa-results/ruby-otp.json", "utf8")).code,
        );
      await page
        .getByRole("button", { name: "Verify and log in", exact: true })
        .click();
    };
    await page.goto(base + "/login?next=/account");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("account-browser@example.com");
    await verifyCode();
    await page.waitForURL("**/account");
    await page
      .getByRole("heading", { name: "My account", exact: true })
      .waitFor();
    assert.equal(await page.locator(".account-overview input").count(), 0);
    await page
      .getByRole("link", { name: "Complete profile", exact: true })
      .click();
    await page.getByLabel("Full name", { exact: true }).fill("Account Test");
    await page
      .getByLabel("Nepal mobile number", { exact: true })
      .fill("9846692687");
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9L0AAAAASUVORK5CYII=",
      "base64",
    );
    await page
      .locator("input[type=file]")
      .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
    await page
      .getByRole("status")
      .filter({ hasText: "Profile photo saved." })
      .waitFor();
    assert.equal(
      await page.getByLabel("Full name", { exact: true }).inputValue(),
      "Account Test",
    );
    await page.screenshot({
      path: "qa-results/account-reference-profile.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Save and continue", exact: true })
      .click();
    await page.waitForURL("**/account");
    await page.screenshot({
      path: "qa-results/account-reference-menu.png",
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Change password", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Change password", exact: true })
      .waitFor();
    await page.screenshot({
      path: "qa-results/account-reference-password.png",
    });
    await page
      .getByLabel("New password", { exact: true })
      .fill("browser-test-password");
    await page
      .getByLabel("Confirm password", { exact: true })
      .fill("browser-test-password");
    await page
      .getByRole("button", { name: "Save password", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Password saved." })
      .waitFor();
    await page.keyboard.press("Escape");
    await page.waitForURL("**/account");
    assert.equal(await page.locator("input").count(), 0);
    await page.reload();
    await page.locator(".account-welcome .profile-photo-preview").waitFor();
    const cookies = await context.cookies();
    const cookie = cookies.find((c) => c.name === "me_customer");
    assert.ok(
      cookie.httpOnly && cookie.expires > Date.now() / 1000 + 29 * 86400,
    );
    const storage = await page.evaluate(() =>
      JSON.stringify({ ...localStorage }),
    );
    assert.ok(!storage.includes("browser-test-password"));
    assert.ok(storage.includes("account-browser@example.com"));
    for (const route of [
      "/favourites",
      "/help",
      "/repair",
      "/login",
      "/account",
    ]) {
      await page.goto(base + route);
      await page.waitForTimeout(100);
      assert.equal(await page.locator(".shop-header-search").count(), 0);
    }
    await page.goto(base + "/mobiles");
    assert.ok(await page.locator(".shop-header-search").isVisible());
    await page.locator(".mobile-dock button").click();
    await page.getByRole("dialog").waitFor();
    assert.equal(
      await page
        .getByRole("dialog")
        .getByLabel("Full name", { exact: true })
        .count(),
      0,
    );
    await page.keyboard.press("Escape");
    await page.goto(base + "/account");
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await page.waitForURL("**/login");
    await page
      .getByRole("button", { name: "Password login", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Email address", { exact: true }).inputValue(),
      "account-browser@example.com",
    );
    assert.ok(
      await page
        .getByRole("button", { name: "Sign in", exact: true })
        .isDisabled(),
    );
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Email or password is incorrect" })
      .waitFor();
    await page
      .getByLabel("Password", { exact: true })
      .fill("browser-test-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/my-orders");
    await page.goto(base + "/account");
    await page
      .getByRole("link", { name: "Change password", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Verify email again", exact: true })
      .click();
    await page.waitForURL("**/login?next=/account&recovery=1");
    await verifyCode();
    await page.waitForURL("**/account?security=1");
    await page
      .getByLabel("New password", { exact: true })
      .fill("reset-browser-password");
    await page
      .getByLabel("Confirm password", { exact: true })
      .fill("reset-browser-password");
    await page
      .getByRole("button", { name: "Save password", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Password saved." })
      .waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "Edit details", exact: true }).click();
    await page
      .getByRole("button", { name: "Remove photo", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Profile photo removed." })
      .waitFor();
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        localStorage.setItem("me-theme", theme);
        document.documentElement.dataset.theme = theme;
      }, theme);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.screenshot({
        path: "qa-results/customer-password-photo-" + theme + ".png",
        fullPage: true,
      });
    }
    await page.goto(base + "/account");
    await page.evaluate(() => localStorage.setItem("me-language", "ne"));
    await page.reload();
    await page
      .getByRole("heading", { name: "मेरो खाता", exact: true })
      .waitFor();
    await page.evaluate(() => localStorage.setItem("me-language", "en"));
    await page.reload();
    const persisted = await context.storageState();
    await context.close();
    const restored = await browser.newContext({ storageState: persisted });
    const returning = await restored.newPage();
    await returning.goto(base + "/account");
    await returning
      .getByRole("heading", { name: "My account", exact: true })
      .waitFor();
    await restored.close();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: read-only account/embedded login, explicit edits, photo round trip, password sheet + Escape, password error/setup/reset, remembered sessions, search visibility, both themes and Nepali.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
