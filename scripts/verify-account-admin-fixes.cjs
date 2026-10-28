const assert = require("node:assert/strict");
const {
  chromium,
} = require("C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const base = "http://127.0.0.1:8768";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    const started = await page.request.post(base + "/api/customer/auth/start", {
      data: { email: `reset-${Date.now()}@example.com` },
    });
    const challenge = await started.json();
    assert.match(challenge.developmentCode, /^\d{6}$/);
    assert.equal(
      (
        await page.request.post(base + "/api/customer/auth/verify", {
          data: {
            challengeId: challenge.challengeId,
            code: challenge.developmentCode,
          },
        })
      ).status(),
      200,
    );
    await page.goto(base + "/account?security=1");
    const sheet = page.locator(".password-sheet");
    await sheet.waitFor();
    const box = await sheet.boundingBox();
    assert.ok(Math.abs(box.x + box.width / 2 - 640) < 2);
    await sheet
      .locator('input[name="new-password"]')
      .fill("reset-password-123");
    await sheet
      .locator('input[name="confirm-password"]')
      .fill("reset-password-123");
    await sheet.getByRole("button", { name: "Save password" }).click();
    await page.waitForURL("**/account");
    assert.equal(await page.locator(".password-sheet").count(), 0);
    assert.notEqual(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
    );
    await page.evaluate(() => {
      const dialog = document.createElement("dialog");
      dialog.className = "order-close-dialog";
      dialog.innerHTML =
        "<h2>Complete this pickup?</h2><button>Confirm</button>";
      document.body.append(dialog);
      dialog.showModal();
    });
    const orderBox = await page.locator(".order-close-dialog").boundingBox();
    assert.ok(Math.abs(orderBox.x + orderBox.width / 2 - 640) < 2);
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
      const form = document.createElement("form");
      form.className = "quick-stock";
      form.innerHTML =
        "<input value='1'><button>Save stock</button><button>Cancel</button>";
      document.body.append(form);
      const card = document.createElement("div");
      card.className = "repair-current-status";
      card.innerHTML =
        "<small>Current status</small><strong>Repairing</strong>";
      document.body.append(card);
    });
    const stockColors = await page
      .locator(".quick-stock button")
      .first()
      .evaluate((button) => ({
        color: getComputedStyle(button).color,
        background: getComputedStyle(button).backgroundColor,
      }));
    assert.notEqual(stockColors.color, stockColors.background);
    assert.equal(
      await page.locator(".repair-current-status").isVisible(),
      true,
    );
    console.log(
      "PASS: password dialog, scroll restoration, centered pickup dialog, dark stock controls and repair status box",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
