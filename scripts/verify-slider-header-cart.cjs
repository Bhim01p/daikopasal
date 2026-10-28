const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:8773");
    const hero = page.locator(".home-carousel");
    await hero.waitFor();
    const box = await hero.boundingBox();
    assert.equal(box.x, 0);
    assert.equal(box.width, 1440);
    assert.ok(Math.abs(box.y + box.height - 900) < 2);
    assert.equal(await hero.locator("button").count(), 0);
    await page.mouse.move(700, 400);
    const seen = new Set();
    const images = new Set();
    for (let i = 0; i < 4; i++) {
      seen.add(await hero.locator("h1").textContent());
      images.add(await hero.locator("img").getAttribute("src"));
      await page.waitForTimeout(3100);
    }
    assert.equal(seen.size, 3);
    assert.equal(images.size, 3);
    const before = await hero.locator("h1").textContent();
    await page.mouse.move(800, 400);
    await page.mouse.down();
    await page.mouse.move(600, 400, { steps: 10 });
    await page.mouse.up();
    assert.notEqual(await hero.locator("h1").textContent(), before);
    await page.getByRole("button", { name: "Shop", exact: true }).click();
    assert.equal(await page.locator(".header-dropdown-panel a").count(), 3);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".header-dropdown-panel").count(), 0);
    await page.getByRole("button", { name: "Account", exact: true }).click();
    await page
      .getByRole("button", { name: "Customer login", exact: true })
      .click();
    await page.locator(".account-dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /Shopping cart,/ }).click();
    const cart = page.locator(".cart-dialog");
    await cart.waitFor();
    assert.ok((await cart.boundingBox()).width <= 800);
    await page.keyboard.press("Escape");
    await page.goto("http://127.0.0.1:8773/mobiles");
    await page
      .getByRole("button", { name: /^Add .+ to cart$/ })
      .first()
      .click();
    await page.getByRole("button", { name: /Shopping cart,/ }).click();
    await cart.waitFor();
    assert.ok((await cart.boundingBox()).width <= 800);
    await page.getByRole("link", { name: /Continue to checkout/ }).click();
    await page.waitForURL("**/checkout");
    await page.setViewportSize({ width: 1280, height: 800 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: desktop full-screen slider, autoplay on hover, distinct images, drag, menus, cart size and checkout; no runtime errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
