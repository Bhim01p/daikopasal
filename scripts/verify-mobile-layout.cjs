const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
  });
  try {
    const errors = [];
    for (const width of [320, 390, 430, 768]) {
      const page = await browser.newPage({
        viewport: { width, height: 844 },
        isMobile: width < 768,
        hasTouch: true,
      });
      page.on("pageerror", (e) => errors.push(e.message));
      for (const route of [
        "/",
        "/mobiles",
        "/second-hand",
        "/accessories",
        "/help",
        "/repair",
        "/my-orders",
        "/checkout",
        "/not-admin",
      ]) {
        await page.goto("http://127.0.0.1:8773" + route);
        await page.waitForTimeout(180);
        const overflow = await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          offenders: [...document.querySelectorAll("main *,header *")]
            .filter(
              (e) =>
                e.getBoundingClientRect().right > innerWidth + 2 &&
                getComputedStyle(e).position !== "absolute",
            )
            .map((e) => e.className)
            .slice(0, 8),
        }));
        assert.ok(
          overflow.scroll <= width + 1,
          route + " " + JSON.stringify(overflow),
        );
      }
      if (width < 768) {
        await page.goto("http://127.0.0.1:8773");
        await page.getByRole("button", { name: "Open navigation" }).click();
        await page.getByRole("button", { name: "Shop", exact: true }).click();
        await page
          .locator("#main-navigation")
          .getByRole("link", { name: "New phones", exact: true })
          .click();
        await page.waitForURL("**/mobiles");
        await page
          .getByRole("button", { name: /^Add .+ to cart$/ })
          .first()
          .click();
        await page.locator(".mobile-dock .dock-bag").click();
        const cart = page.locator(".cart-dialog");
        await cart.waitFor();
        assert.ok((await cart.boundingBox()).width < width);
        assert.equal(
          await cart.evaluate((e) => e.scrollWidth <= e.clientWidth),
          true,
        );
        await page.screenshot({
          path: "qa-results/mobile-cart-" + width + ".png",
        });
        await page.getByRole("link", { name: /Continue to checkout/ }).click();
        await page.waitForURL("**/checkout");
        await page.goto("http://127.0.0.1:8773");
        await page.screenshot({
          path: "qa-results/mobile-home-" + width + ".png",
        });
        await page.getByRole("button", { name: "Open navigation" }).click();
        await page
          .getByRole("button", { name: "Switch to dark theme" })
          .click();
        await page.getByRole("button", { name: "Close navigation" }).click();
        await page.screenshot({
          path: "qa-results/mobile-dark-" + width + ".png",
        });
      }
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS mobile widths 320/390/430 and tablet 768: page overflow, mobile navigation, Shop categories, cart and checkout; no runtime errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
