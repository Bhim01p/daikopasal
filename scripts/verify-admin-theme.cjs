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
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = "http://127.0.0.1:8773";
  const staffUsername = "desktophelper" + Date.now();
  await page.goto(base + "/admin");
  assert.equal(await page.getByLabel("Username", { exact: true }).count(), 0);
  await page.goto(base + "/not-admin");
  await page.getByLabel("Username", { exact: true }).fill("qaowner");
  await page
    .getByLabel("Password", { exact: true })
    .fill("qa-owner-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  await page.screenshot({
    path: "qa-results/admin-dashboard-desktop.png",
    fullPage: true,
  });
  assert.equal(
    await page
      .locator(".brand-logo")
      .first()
      .evaluate((img) => img.complete && img.naturalWidth > 0),
    true,
  );
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('ne');
  await page.getByRole('heading', { name: 'ड्यासबोर्ड', exact: true }).waitFor();
  await page.getByRole('tab', { name: 'कर्मचारी लगइन', exact: true }).click();
  await page.getByLabel('कर्मचारीको नाम', { exact: true }).waitFor();
  await page.locator('.language-switch select').selectOption('en');
  await page.getByRole("tab", { name: "Staff logins", exact: true }).click();
  await page
    .getByLabel("Staff name", { exact: true })
    .fill("Desktop QA Helper");
  await page.getByLabel("Staff username", { exact: true }).fill(staffUsername);
  await page
    .getByLabel("Staff password", { exact: true })
    .fill("qa-staff-password-only");
  await page
    .getByLabel("Repeat password", { exact: true })
    .fill("qa-staff-password-only");
  await page
    .getByRole("button", { name: "Save staff login", exact: true })
    .click();
  await page
    .getByText(
      "Staff login saved. Share the username and password privately.",
      { exact: true },
    )
    .waitFor();
  await page.screenshot({
    path: "qa-results/admin-staff-desktop.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Inventory", exact: true }).click();
  await page.getByRole("heading", { name: "Inventory", exact: true }).waitFor();
  await page.getByRole("tab", { name: "Orders", exact: true }).click();
  await page.getByRole("heading", { name: "Orders", exact: true }).waitFor();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Username", { exact: true }).fill(staffUsername);
  await page
    .getByLabel("Password", { exact: true })
    .fill("qa-staff-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("tab", { name: "Staff logins", exact: true }).count(),
    0,
  );
  for (const route of [
    "/",
    "/mobiles",
    "/second-hand",
    "/accessories",
    "/help",
    "/repair",
    "/cart",
  ]) {
    await page.goto(base + route);
    await page.locator(".brand-logo").first().waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      route + " overflow",
    );
    if (route === "/")
      await page.screenshot({
        path: "qa-results/storefront-sky-desktop.png",
        fullPage: true,
      });
    if (route === "/mobiles")
      await page.screenshot({
        path: "qa-results/catalogue-sky-desktop.png",
        fullPage: true,
      });
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: desktop dashboard, staff creation/login, owner-only menu, logo, routes and layout. Mobile checks skipped.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
