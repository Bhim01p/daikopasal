const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:8770";
const access = fs.readFileSync("backend/ADMIN-ACCESS.txt", "utf8");
const username = access.match(/^Username: (.+)$/m)[1].trim();
const password = access.match(/^Password: (.+)$/m)[1].trim();
async function run() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
    args: ["--no-proxy-server"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + "/admin");
  await page.getByRole("heading", { name: "Welcome back." }).waitFor();
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByText("Incorrect username or password.", { exact: true })
    .waitFor();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("heading", { name: "Keep your shop up to date." })
    .waitFor();
  assert.equal(await page.locator(".admin-product").count(), 33);
  await page.getByLabel("Product name *", { exact: true }).fill("QA USB Cable");
  await page.getByLabel("Brand *", { exact: true }).fill("QA");
  await page.getByLabel("Category", { exact: true }).selectOption("accessory");
  await page.getByLabel("Price (NPR) *", { exact: true }).fill("650");
  await page.getByLabel("Stock quantity *", { exact: true }).fill("3");
  await page
    .getByLabel("Accessory category", { exact: true })
    .selectOption("Other Accessories");
  await page
    .getByLabel("Illustration", { exact: true })
    .selectOption("/assets/charger.svg");
  await page
    .getByLabel("English description *", { exact: true })
    .fill("A temporary product used only by the isolated browser check.");
  await page.getByLabel("Product photo", { exact: true }).setInputFiles({
    name: "qa-product.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page
    .getByText("Photo uploaded. Save the product to use it in the shop.")
    .waitFor();
  await page
    .getByRole("button", { name: "Add specification", exact: true })
    .click();
  await page
    .getByLabel("Specification 2 name", { exact: true })
    .fill("Cable length");
  await page
    .getByLabel("Specification 2 value", { exact: true })
    .fill("1 metre");
  await page
    .getByRole("button", { name: "Add specification", exact: true })
    .click();
  await page
    .getByLabel("Specification 3 name", { exact: true })
    .fill("Connector");
  await page.getByLabel("Specification 3 value", { exact: true }).fill("USB-C");
  await page
    .getByLabel("Nepali description", { exact: true })
    .fill("परीक्षण केबलको नेपाली विवरण।");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page
    .getByText("Product saved. The storefront catalogue has been updated.")
    .waitFor();
  await page.getByLabel("Edit QA USB Cable", { exact: true }).click();
  await page.getByLabel("Price (NPR) *", { exact: true }).fill("950");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page
    .getByText("Product saved. The storefront catalogue has been updated.")
    .waitFor();
  await page.getByRole("link", { name: "View shop", exact: true }).click();
  await page.goto(base + "/accessories?q=QA%20USB");
  await page
    .getByRole("heading", { name: "QA USB Cable", exact: true })
    .waitFor();
  await page.getByText("Rs. 950", { exact: true }).waitFor();
  assert.equal(await page.locator(".product-card .image-caption").count(), 0);
  assert.equal(
    await page.locator(".product-card .availability").textContent(),
    "In stock",
  );
  await page.getByRole("link", { name: "View details" }).click();
  await page.getByText("USB-C", { exact: true }).waitFor();
  assert.equal(await page.locator(".sample-note").count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Increase quantity", { exact: true }).click();
  await page.getByLabel("Increase quantity", { exact: true }).click();
  assert.ok(
    await page.getByLabel("Increase quantity", { exact: true }).isDisabled(),
  );
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page.goto(base + "/cart");
  assert.equal(await page.locator(".quantity span").textContent(), "3");
  assert.ok(
    await page
      .getByLabel("Increase QA USB Cable quantity", { exact: true })
      .isDisabled(),
  );
  const stockProduct = (
    await (await page.request.get(base + "/api/products")).json()
  ).products.find((product) => product.name === "QA USB Cable");
  assert.equal(
    (
      await page.request.patch(
        base + `/api/admin/products/${stockProduct.id}`,
        { data: { ...stockProduct, stockQuantity: 1 } },
      )
    ).status(),
    200,
  );
  await page.reload();
  await page.getByRole("heading", { name: "Your shopping cart." }).waitFor();
  await page
    .getByText(
      "Stock changed. We updated your cart to the available quantities.",
    )
    .waitFor();
  assert.equal(await page.locator(".quantity span").textContent(), "1");
  assert.ok(
    await page
      .getByLabel("Increase QA USB Cable quantity", { exact: true })
      .isDisabled(),
  );
  await page.goto(base + "/checkout");
  await page.getByLabel("Full name").fill("QA Admin Customer");
  await page.getByLabel("Phone number").fill("9806600444");
  await page.getByLabel("Email address").fill(`qa-${Date.now()}@example.com`);
  await page
    .getByRole("button", { name: "Create pickup order", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Your order has been received." })
    .waitFor();
  const receiptUrl = page.url();
  const reference = receiptUrl.split("/").pop();
  const soldOut = (
    await (await page.request.get(base + "/api/products")).json()
  ).products.find((product) => product.id === stockProduct.id);
  assert.equal(soldOut.stockQuantity, 0);
  assert.equal(soldOut.available, false);
  await page.goto(base + "/admin");
  await page.getByRole("tab", { name: "Orders", exact: true }).click();
  const orderCard = page.locator(".admin-order").filter({ hasText: reference });
  await orderCard
    .getByRole("button", { name: "Confirm order", exact: true })
    .click();
  await orderCard
    .getByRole("button", { name: "Ready for pickup", exact: true })
    .click();
  await orderCard
    .getByRole("button", { name: "Complete pickup", exact: true })
    .waitFor();
  assert.equal(await orderCard.locator(".admin-email-updates li").count(), 3);
  assert.equal(await orderCard.getByText("Queued", { exact: true }).count(), 3);
  await page
    .getByText("Email sending is not configured yet.", { exact: false })
    .waitFor();
  await page.goto(receiptUrl);
  await page
    .locator(".reference")
    .getByText("Ready for pickup", { exact: true })
    .waitFor();
  await page.goto(base + "/admin");
  await page.getByRole("tab", { name: "Orders", exact: true }).click();
  await page
    .locator(".admin-order")
    .filter({ hasText: reference })
    .getByRole("button", { name: "Cancel order", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel order", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.getByText("Order status updated.", { exact: true }).waitFor();
  assert.equal(
    await page
      .locator(".admin-order")
      .filter({ hasText: reference })
      .getByRole("button", { name: "Cancel order", exact: true })
      .count(),
    0,
  );
  const restocked = (
    await (await page.request.get(base + "/api/products")).json()
  ).products.find((product) => product.id === stockProduct.id);
  assert.equal(restocked.stockQuantity, 1);
  assert.equal(restocked.available, true);
  await page.getByRole("tab", { name: "Products", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("heading", { name: "Keep your shop up to date." })
    .waitFor();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Delete QA USB Cable", { exact: true }).click();
  await page
    .getByText("Product removed from the catalogue.", { exact: true })
    .waitFor();
  assert.equal(await page.locator(".admin-product").count(), 33);
  await page.screenshot({ path: "qa-results/admin-desktop.png" });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const productWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    assert.ok(productWidth <= width, `Admin products overflow at ${width}`);
    await page.getByRole("tab", { name: "Orders", exact: true }).click();
    await page.locator('.admin-order').filter({hasText:reference}).waitFor();
    const orderWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    assert.ok(orderWidth <= width, `Admin orders overflow at ${width}`);
    await page.getByRole("tab", { name: "Products", exact: true }).click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "qa-results/admin-mobile.png" });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("heading", { name: "Welcome back." }).waitFor();
  await page.screenshot({ path: "qa-results/admin-login.png" });
  assert.equal(
    (await page.request.get(base + "/api/admin/orders")).status(),
    401,
  );
  await page.goto(receiptUrl);
  await page
    .getByRole("heading", { name: "Your order has been cancelled." })
    .waitFor();
  assert.ok(
    (await page.locator(".success-summary").textContent()).includes(
      "QA USB Cable",
    ),
  );
  assert.ok(
    (await page.locator(".success-summary").textContent()).includes("Rs. 950"),
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "qa-results/admin-checks.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "Upload a product photo and additional specifications",
          "Real listings omit sample and illustration labels",
          "Wrong password rejected",
          "Admin login",
          "Create/edit/delete product",
          "Updated catalogue price",
          "Backend pickup order",
          "Product and bag quantity controls respect stock",
          "Bag adjusts when available stock changes",
          "Last unit becomes out of stock after checkout",
          "Cancellation returns stock and closes the order",
          "Admin order status update",
          "Private receipt refresh",
          "Price snapshot after product deletion",
          "Admin layouts at 320,390,768px",
          "Sign out revokes access",
          "No browser errors",
        ],
        data: "Isolated QA backend store",
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(
    "PASS: admin login, catalogue changes, backend checkout, statuses, receipts, and phone layouts.",
  );
}
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
