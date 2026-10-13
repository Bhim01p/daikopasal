const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  try {
    for (const width of [320, 390, 430, 1440])
      for (const theme of ["light", "dark"]) {
        const page = await browser.newPage({
          viewport: { width, height: 844 },
          isMobile: width < 768,
          hasTouch: width < 768,
          reducedMotion: "reduce",
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.addInitScript(
          (theme) => localStorage.setItem("me-theme", theme),
          theme,
        );
        await page.goto("http://127.0.0.1:8773/");
        await page.locator(".home-carousel").waitFor();
        assert.equal(await page.locator(".home-tabs").count(), 0);
        if (width < 768) {
          assert.equal(await page.locator(".mobile-dock > *").count(), 4);
          assert.match(
            await page.locator(".mobile-dock").innerText(),
            /Favourites/,
          );
          assert.equal(
            await page.locator('.mobile-dock a[href="/cart"]').count(),
            0,
          );
          const bounds = await page.evaluate(() => ({
            footer: document.querySelector("footer").getBoundingClientRect()
              .top,
            dock: document.querySelector(".mobile-dock").getBoundingClientRect()
              .top,
          }));
          assert.ok(bounds.footer >= bounds.dock - 1);
          const cart = await page.locator(".floating-cart").boundingBox(),
            wa = await page
              .locator(".shopping-floating-actions .floating-whatsapp")
              .boundingBox();
          assert.ok(
            cart.y + cart.height < wa.y && wa.y + wa.height < bounds.dock,
          );
          await page.locator('.mobile-dock a[href="/shop"]').click();
        } else await page.goto("http://127.0.0.1:8773/shop");
        await page.locator(".shop-category-cards").waitFor();
        assert.equal(await page.locator(".shop-category-cards a").count(), 3);
        await page
          .locator('.shop-category-cards a[href="/accessories"]')
          .click();
        assert.ok(
          (
            await page
              .locator('.shop-category-switch a[href="/accessories"]')
              .getAttribute("class")
          ).includes("active"),
        );
        await page
          .locator('.shop-category-switch a[href="/second-hand"]')
          .click();
        await page
          .getByRole("heading", { name: "Shop used phones", exact: true })
          .waitFor();
        await page.locator('.shop-category-switch a[href="/mobiles"]').click();
        await page
          .getByRole("heading", { name: "Shop new phones", exact: true })
          .waitFor();
        assert.ok(
          await page
            .getByRole("button", { name: "Add Redmi 9 to cart", exact: true })
            .isEnabled(),
        );
        await page
          .getByRole("button", { name: "Add Redmi 9 to cart", exact: true })
          .click();
        if (width < 768) await page.locator(".floating-cart").click();
        else await page.locator(".bag-link").click();
        await page.getByRole("dialog").waitFor();
        assert.equal(
          await page.locator(".shopping-floating-actions").count(),
          0,
        );
        await page.keyboard.press("Escape");
        await page.goto(
          "http://127.0.0.1:8773/compare?first=catalogue-redmi-9&second=csv-apple-iphone-15-nepal-6-128",
        );
        const references = await (
          await page.request.get("http://127.0.0.1:8773/api/reference-phones")
        ).json();
        const second = references.phones.find(
          (p) => p.brand === "Apple" && p.name === "iPhone 15",
        );
        await page.goto(
          "http://127.0.0.1:8773/compare?first=catalogue-redmi-9&second=" +
            second.id,
        );
        await page.getByRole("table").waitFor();
        if (width < 768) {
          const cells = await page
            .locator(".comparison-table thead th")
            .evaluateAll((nodes) =>
              nodes.map((n) => ({
                x: n.getBoundingClientRect().x,
                right: n.getBoundingClientRect().right,
              })),
            );
          assert.ok(
            cells.every((c) => c.x >= 0 && c.right <= width + 1),
            "Both phones must fit",
          );
          assert.match(
            await page.locator('meta[name="viewport"]').getAttribute("content"),
            /user-scalable=no/,
          );
        }
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        if (width === 390)
          await page.screenshot({
            path: "qa-results/mobile-shopping-compare-" + theme + ".png",
            fullPage: true,
          });
        for (const route of ["/login", "/account", "/cart", "/checkout"]) {
          await page.goto("http://127.0.0.1:8773" + route);
          await page.waitForTimeout(100);
          assert.equal(
            await page.locator(".shopping-floating-actions").count(),
            0,
          );
          assert.doesNotMatch(
            await page.locator('meta[name="viewport"]').getAttribute("content"),
            /user-scalable=no/,
          );
        }
        assert.deepEqual(errors, []);
        await page.close();
      }
    console.log(
      "PASS: category switching, Shop chooser, 4-item dock, floating action placement/hiding, stock-enabled cart, viewport-sized home and both comparison columns across 320/390/430/1440 in both themes.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
