const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
let browser;
(async () => {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
    args: ["--no-proxy-server"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const base = "http://127.0.0.1:8773";
  const { products } = await (
    await page.request.get(base + "/api/products")
  ).json();
  const product = products.find((p) => p.category === "new" && p.available);
  const response = await page.request.post(base + "/api/orders", {
    data: {
      name: "Detail Flow QA",
      phone: "9806600111",
      email: "detail@example.com",
      note: "Detail-only order note",
      items: [{ productId: product.id, quantity: 1 }],
      expectedTotal: product.price,
      requestId: randomUUID(),
    },
  });
  assert.equal(response.status(), 201, await response.text());
  const { order } = await response.json();
  await page.goto(base + "/not-admin");
  await page.getByLabel("Username", { exact: true }).fill("qaowner");
  await page
    .getByLabel("Password", { exact: true })
    .fill("qa-owner-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  await page.getByRole("tab", { name: "Orders", exact: true }).click();
  await page
    .getByPlaceholder("Reference, customer name or phone")
    .fill(order.id);
  await page.getByRole("button", { name: "New orders", exact: true }).click();
  const row = page
    .locator(".admin-order-summary")
    .filter({ hasText: order.id });
  await row.waitFor();
  assert.equal(
    await row
      .locator('a[href^="tel:"], a[href^="mailto:"], .admin-email-updates, ul')
      .count(),
    0,
  );
  assert.equal(
    await row
      .getByRole("button", { name: "Confirm order", exact: true })
      .count(),
    0,
  );
  await page.screenshot({ path: "qa-results/admin-orders-compact-light.png" });
  await row
    .getByRole("button", { name: "Open order " + order.id, exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Order details", exact: true })
    .waitFor();
  await page.getByText("detail@example.com", { exact: true }).waitFor();
  await page
    .getByText("Note: Detail-only order note", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Confirm order", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ready for pickup", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("heading", { name: "Order details", exact: true })
      .count(),
    1,
    "Detail stays open after moving outside the current status filter",
  );
  await page
    .getByRole("button", { name: "Ready for pickup", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete pickup", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Go back", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete pickup", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Complete pickup", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page
    .getByText("Order closed. Pickup is complete.", { exact: true })
    .waitFor();
  await page.screenshot({ path: "qa-results/admin-order-details-light.png" });
  await page
    .getByRole("button", { name: "Back to orders", exact: true })
    .click();
  await page.getByRole("button", { name: "All orders", exact: true }).click();
  await row.getByText("Completed", { exact: true }).waitFor();
  await page.locator(".theme-switch").click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: "qa-results/admin-orders-compact-dark.png" });
  await page.getByRole("tab", { name: "Inventory", exact: true }).click();
  assert.equal(
    await page.locator("#product-editor").count(),
    0,
    "No side editor in the inventory list",
  );
  const category = page.getByRole("group", {
    name: "Inventory categories",
    exact: true,
  });
  await category.getByRole("button", { name: /^New phones/ }).click();
  await page
    .getByRole("button", { name: "Edit " + product.name, exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Edit product", exact: true })
    .waitFor();
  assert.equal(
    await page.locator(".admin-product-list").count(),
    0,
    "Editing replaces list",
  );
  await page
    .getByLabel("Price (NPR) *", { exact: true })
    .fill(String(product.price + 1));
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Back to inventory", exact: true })
    .click();
  assert.equal(
    await page.locator("#product-editor").count(),
    1,
    "Unsaved changes retained when discard declined",
  );
  await page.screenshot({ path: "qa-results/admin-inventory-editor-dark.png" });
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page.locator(".admin-product-list").waitFor();
  assert.equal(
    await category
      .getByRole("button", { name: /^New phones/ })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    (
      await (await page.request.get(base + "/api/products")).json()
    ).products.find((p) => p.id === product.id).price,
    product.price + 1,
  );
  await page.getByRole("button", { name: "New product", exact: true }).click();
  await page
    .getByRole("heading", { name: "Add a product", exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Product name *", { exact: true }).inputValue(),
    "",
  );
  await page
    .getByRole("button", { name: "Back to inventory", exact: true })
    .click();
  await page.locator(".admin-product-list").waitFor();
  await page.screenshot({ path: "qa-results/admin-inventory-list-dark.png" });
  await page.locator(".theme-switch").click();
  await page.goto(base + "/mobiles");
  await page.waitForTimeout(350);
  await page.screenshot({ path: "qa-results/storefront-white-accents.png" });
  console.log(
    "PASS: compact order summaries, separate details, status progression/confirmation, filter retention, separate inventory editor, unsaved-change guard, save and new-product/back flow. Desktop only.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
  });
