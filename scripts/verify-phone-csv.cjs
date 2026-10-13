const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const assert = require("node:assert/strict");
const base = process.env.QA_BASE || "http://127.0.0.1:8773";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  try {
    for (const width of [320, 390, 1440])
      for (const theme of ["light", "dark"]) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.addInitScript(
          (theme) => localStorage.setItem("me-theme", theme),
          theme,
        );
        await page.goto(base + "/compare?first=catalogue-redmi-9");
        await page
          .getByText("Reference catalogue:", { exact: false })
          .waitFor();
        const first = page.getByLabel("First phone", { exact: true });
        const second = page.getByLabel("Second phone", { exact: true });
        assert.equal(await first.inputValue(), "catalogue-redmi-9");
        assert.equal(await first.locator('option[value^="csv-"]').count(), 0);
        await page
          .getByLabel("Find your second phone")
          .fill("samsung s26 ultra");
        assert.equal(await second.locator('option[value^="csv-"]').count(), 3);
        await second.selectOption("csv-samsung-galaxy-s26-ultra-nepal-12-256");
        await page.getByRole("table").waitFor();
        assert.match(
          await page.getByRole("table").innerText(),
          /Not available/,
        );
        assert.equal(
          await page
            .getByRole("table")
            .getByRole("link", { name: /Specification source/ })
            .count(),
          3,
        );
        assert.match(page.url(), /second=csv-samsung/);
        await page.getByLabel("Show differences only").check();
        await page.reload();
        await page.getByRole("table").waitFor();
        assert.equal(
          await second.inputValue(),
          "csv-samsung-galaxy-s26-ultra-nepal-12-256",
        );
        await page.getByLabel("Brand", { exact: true }).selectOption("Apple");
        await page.getByLabel("Find your second phone").fill("iphone 15");
        assert.ok(
          (await second
            .locator('option[value^="csv-apple-iphone-15-"]')
            .count()) > 0,
        );
        assert.equal(await first.inputValue(), "catalogue-redmi-9");
        await page
          .getByLabel("Find your second phone")
          .fill("this-model-does-not-exist");
        await page
          .getByRole("status")
          .filter({ hasText: "No saved model matches" })
          .waitFor();
        const geometry = await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        assert.ok(
          geometry.scroll <= geometry.width + 1,
          "Page overflow at " + width,
        );
        if (width === 390)
          await page.screenshot({
            path: "qa-results/phone-csv-comparison-" + theme + ".png",
            fullPage: true,
          });
        await page.goto(
          base +
            "/compare?first=reference-redmi-9-np&second=reference-redmi-10-global",
        );
        await page.getByRole("table").waitFor();
        assert.deepEqual(errors, []);
        await page.close();
      }
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await page.addInitScript(() => localStorage.setItem("me-language", "ne"));
    await page.goto(
      base +
        "/compare?first=catalogue-redmi-9&second=csv-samsung-galaxy-s26-ultra-nepal-12-256",
    );
    await page.getByRole("table").waitFor();
    assert.match(await page.locator("main").innerText(), /उपलब्ध छैन/);
    await page.close();
    const failure = await browser.newPage();
    await failure.route("**/api/reference-phones", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: "{}",
      }),
    );
    await failure.goto(base + "/compare?first=catalogue-redmi-9");
    await failure.getByRole("alert").waitFor();
    await failure.unroute("**/api/reference-phones");
    await failure
      .getByRole("button", { name: "Try again", exact: true })
      .click();
    await failure.getByText("Reference catalogue:", { exact: false }).waitFor();
    await failure.close();
    console.log(
      "PASS: CSV comparison search/variants, first-shop isolation, source links, missing data, refresh/legacy URLs, error/retry, Nepali, light/dark at 320/390/1440 without page overflow.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
