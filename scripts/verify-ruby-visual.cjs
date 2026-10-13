const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
  });
  try {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const base = "http://127.0.0.1:8773";
    await p.goto(base);
    await p.waitForTimeout(600);
    const color = await p
      .locator(".hero-copy .button")
      .evaluate((e) => getComputedStyle(e).backgroundColor);
    assert.equal(color, "rgb(190, 18, 50)");
    await p.screenshot({ path: "qa-results/ruby-final-desktop.png" });
    await p.goto(base + "/mobiles");
    await p.screenshot({ path: "qa-results/ruby-final-catalogue-desktop.png" });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(base);
    await p.waitForTimeout(500);
    await p.screenshot({ path: "qa-results/ruby-final-mobile-light.png" });
    await p.getByRole("button", { name: "Open navigation" }).click();
    await p.getByRole("button", { name: "Switch to dark theme" }).click();
    await p.getByRole("button", { name: "Close navigation" }).click();
    await p.waitForTimeout(350);
    assert.equal(
      await p
        .locator(".hero-copy .button")
        .evaluate((e) => getComputedStyle(e).backgroundColor),
      "rgb(189, 18, 51)",
    );
    await p.screenshot({ path: "qa-results/ruby-final-mobile-dark.png" });
    await p.goto(
      base +
        "/compare?first=reference-redmi-9-np&second=reference-redmi-10-global",
    );
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await p.screenshot({ path: "qa-results/ruby-final-compare-dark.png" });
    console.log(
      "PASS final burgundy buttons in light/dark, mobile reference table scroll contained; screenshot set refreshed.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
