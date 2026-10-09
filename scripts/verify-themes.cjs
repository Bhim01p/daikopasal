const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  fs.mkdirSync("qa-results", { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
    args: ["--no-proxy-server"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = "http://127.0.0.1:8773";
  const theme = () => page.locator("html").getAttribute("data-theme");
  const settled = () => page.waitForTimeout(350);
  await page.goto(base);
  assert.equal(
    await theme(),
    "light",
    "White default even on devices set to dark",
  );
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  assert.equal(await theme(), "dark");
  await page.reload();
  assert.equal(await theme(), "dark", "Choice persists on reload");
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  const other = await context.newPage();
  await other.goto(base);
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await other.locator('html[data-theme="dark"]').waitFor();
  await other.close();
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  for (const appearance of ["light", "dark"]) {
    if ((await theme()) !== appearance)
      await page.locator(".theme-switch").click();
    for (const route of [
      "/",
      "/mobiles",
      "/second-hand",
      "/accessories",
      "/help",
      "/repair",
    ]) {
      await page.goto(base + route);
      await page.locator(".theme-switch").waitFor();
      await settled();
      assert.equal(await theme(), appearance, route);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        route + " desktop overflow",
      );
      if (route === "/")
        await page.screenshot({
          path: `qa-results/theme-${appearance}-storefront.png`,
          fullPage: true,
        });
      if (route === "/mobiles") {
        await page.screenshot({
          path: `qa-results/theme-${appearance}-catalogue.png`,
          fullPage: true,
        });
        await page.locator(".add-button:not(:disabled)").first().click();
      }
    }
    for (const route of ["/cart", "/checkout"]) {
      await page.goto(base + route);
      await settled();
      await page.screenshot({
        path: `qa-results/theme-${appearance}-${route.slice(1)}.png`,
        fullPage: true,
      });
    }
    await page.goto(base + "/not-admin");
    await page.locator(".admin-login, .admin-layout").first().waitFor();
    if (await page.getByLabel("Username", { exact: true }).count()) {
      await page.getByLabel("Username", { exact: true }).fill("qaowner");
      await page
        .getByLabel("Password", { exact: true })
        .fill("qa-owner-password-only");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
    }
    await page
      .getByRole("heading", { name: "Dashboard", exact: true })
      .waitFor();
    await settled();
    assert.equal(await theme(), appearance);
    await page.screenshot({
      path: `qa-results/theme-${appearance}-dashboard.png`,
      fullPage: true,
    });
    await page.getByRole("tab", { name: "Inventory", exact: true }).click();
    await page.locator(".admin-product").first().waitFor();
    await page.getByRole("tab", { name: "Staff logins", exact: true }).click();
    await page.getByLabel("Staff name", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.locator(".theme-switch").waitFor();
    assert.equal(await theme(), appearance);
  }
  await page.goto(base);
  await page.locator(".theme-switch").click();
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("ne");
  await page
    .getByRole("button", { name: "गाढा रङको थिममा बदल्नुहोस्", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 1280, height: 900 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "1280px desktop overflow",
  );
  assert.deepEqual(errors, []);
  await context.close();
  const restricted = await browser.newContext();
  await restricted.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage unavailable");
      },
    });
  });
  const fallback = await restricted.newPage();
  await fallback.goto(base);
  await fallback
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  assert.equal(
    await fallback.locator("html").getAttribute("data-theme"),
    "dark",
  );
  await browser.close();
  console.log(
    "PASS: white default, both desktop themes, persistence, cross-tab sync, admin/customer routes, Nepali switch and unavailable-storage fallback. No mobile checks.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
