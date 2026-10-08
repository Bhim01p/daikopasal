const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:8771";

async function run() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
    args: ["--no-proxy-server"],
  });
  const errors = [];
  const adminContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const customerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const admin = await adminContext.newPage();
  const customer = await customerContext.newPage();
  for (const page of [admin, customer])
    page.on("pageerror", (error) => errors.push(error.message));
  const catalogue = async () =>
    (await (await adminContext.request.get(base + "/api/products")).json())
      .products;
  const inventory = [
    {
      name: "QA Pickup Phone",
      brand: "QA",
      category: "new",
      price: 20000,
      stockQuantity: 3,
      ram: 8,
      storage: 128,
      description:
        "Synthetic inventory used only for the isolated complete-order check.",
    },
  ];
  const phone = "98" + String(Date.now()).slice(-8);
  try {
    fs.mkdirSync("qa-results", { recursive: true });
    assert.equal(
      (await catalogue()).length,
      33,
      "Run against a fresh isolated QA store",
    );
    const access = fs.readFileSync("backend/ADMIN-ACCESS.txt", "utf8");
    const username = access.match(/Username:\s*(.+)/)[1].trim();
    const password = access.match(/Password:\s*(.+)/)[1].trim();
    await admin.goto(base + "/admin");
    await admin.getByLabel("Username", { exact: true }).fill(username);
    await admin.getByLabel("Password", { exact: true }).fill(password);
    await admin.getByRole("button", { name: "Sign in", exact: true }).click();
    await admin
      .getByRole("heading", { name: "Keep your shop up to date." })
      .waitFor();
    const existing = await adminContext.request.post(
      base + "/api/admin/products",
      {
        data: {
          name: "Existing QA Cable",
          brand: "QA",
          category: "accessory",
          accessoryCategory: "Other Accessories",
          price: 150,
          stockQuantity: 4,
          image: "/assets/charger.svg",
          description: "Isolated preservation fixture",
          isSample: false,
        },
      },
    );
    assert.equal(existing.status(), 201);
    const preserved = (await existing.json()).product;
    await admin.reload();
    await admin.locator(".admin-import summary").click();
    await admin.getByLabel("Inventory JSON file").setInputFiles({
      name: "blank-template.json",
      mimeType: "application/json",
      buffer: fs.readFileSync("frontend/public/inventory-template.json"),
    });
    await admin.getByRole("alert").filter({ hasText: "Product 1:" }).waitFor();
    assert.equal(
      (await catalogue()).length,
      34,
      "An invalid template must not alter inventory",
    );
    await admin.getByLabel("Inventory JSON file").setInputFiles({
      name: "verified-qa-inventory.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(inventory)),
    });
    await admin.getByRole("heading", { name: "Review inventory" }).waitFor();
    assert.ok(
      (await admin.locator(".inventory-preview").textContent()).includes(
        "33 samples to remove",
      ),
    );
    for (const width of [320, 390, 1440]) {
      await admin.setViewportSize({ width, height: 900 });
      assert.ok(
        await admin.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Import preview overflows at ${width}`,
      );
    }
    await admin.setViewportSize({ width: 390, height: 844 });
    await admin
      .locator(".inventory-preview")
      .screenshot({ path: "qa-results/inventory-import-preview.png" });
    await admin
      .getByRole("button", { name: "Import real listings and remove samples" })
      .click();
    await admin
      .getByText(
        "Imported 1 real products and removed 33 samples. A private backup was saved.",
      )
      .waitFor();
    const importedCatalogue = await catalogue();
    assert.equal(importedCatalogue.length, 2);
    assert.ok(importedCatalogue.every((product) => product.isSample === false));
    assert.deepEqual(
      importedCatalogue.find((product) => product.id === preserved.id),
      preserved,
    );
    const product = importedCatalogue.find(
      (product) => product.name === "QA Pickup Phone",
    );
    await customer.goto(base + `/product/${product.slug}`);
    await customer.getByLabel("Increase quantity", { exact: true }).click();
    await customer
      .getByRole("button", { name: "Buy now", exact: true })
      .click();
    await customer
      .getByRole("link", { name: "Log in to use saved details" })
      .click();
    await customer.getByLabel("Nepal mobile number").fill(phone);
    await customer
      .getByRole("button", { name: "Get test code", exact: true })
      .click();
    await customer.locator(".account-demo-code strong").waitFor();
    await customer
      .getByLabel("Verification code")
      .fill(await customer.locator(".account-demo-code strong").textContent());
    await customer
      .getByRole("button", { name: "Verify and log in", exact: true })
      .click();
    await customer
      .getByLabel("Full name", { exact: true })
      .fill("QA Pickup Customer");
    await customer
      .getByLabel("Email address", { exact: true })
      .fill(`pickup-${Date.now()}@example.com`);
    await customer.getByRole("button", { name: "Save and continue" }).click();
    await customer.waitForURL("**/checkout");
    assert.equal(
      await customer
        .locator("#customer-name, #customer-phone, #customer-email")
        .count(),
      0,
    );
    await customer
      .getByRole("button", { name: "Create pickup order", exact: true })
      .click();
    await customer
      .getByRole("heading", { name: "Your order has been received." })
      .waitFor();
    const reference = customer.url().split("/").pop();
    const receipt = base + "/order/" + reference;
    assert.equal(
      await customer
        .locator(".success-summary .total strong")
        .first()
        .textContent(),
      "Total",
    );
    const summaryLink = await customer
      .getByRole("link", { name: "Contact shop about this order" })
      .getAttribute("href");
    assert.ok(!decodeURIComponent(summaryLink).includes("Sample total"));
    assert.ok(decodeURIComponent(summaryLink).includes("Total: Rs. 40,000"));
    const stock = async () =>
      (await catalogue()).find((item) => item.id === product.id).stockQuantity;
    assert.equal(await stock(), 1);
    await admin.getByRole("tab", { name: "Orders", exact: true }).click();
    let history = 1;
    for (const status of ["Confirmed", "Ready for pickup", "Completed"]) {
      const [response] = await Promise.all([
        admin.waitForResponse(
          (response) =>
            response.url().endsWith(`/api/admin/orders/${reference}`) &&
            response.request().method() === "PATCH",
        ),
        admin
          .getByLabel(`Status for ${reference}`, { exact: true })
          .selectOption(status),
      ]);
      assert.equal(response.status(), 200);
      await customer.goto(base + "/my-orders");
      await customer
        .getByRole("heading", { name: reference, exact: true })
        .waitFor();
      await customer
        .locator(".customer-order")
        .getByText(status, { exact: true })
        .waitFor();
      await customer.goto(receipt);
      await customer
        .locator(".reference")
        .getByText(status, { exact: true })
        .waitFor();
      assert.equal(
        await customer
          .getByRole("list", { name: "Order progress" })
          .locator("li")
          .count(),
        ++history,
      );
      assert.equal(
        await stock(),
        1,
        "Status progress must not deduct stock again",
      );
    }
    assert.ok(
      await admin
        .getByLabel(`Status for ${reference}`, { exact: true })
        .isDisabled(),
    );
    await customer
      .getByRole("heading", { name: "Your pickup is complete." })
      .waitFor();
    assert.equal(
      await customer
        .getByText(
          "Contact the shop to confirm availability and pickup timing.",
          { exact: true },
        )
        .count(),
      0,
    );
    await customer.screenshot({
      path: "qa-results/completed-order-mobile.png",
    });
    const orders = await (
      await adminContext.request.get(base + "/api/admin/orders")
    ).json();
    const completed = orders.orders.find((order) => order.id === reference);
    assert.equal(orders.emailConfigured, false);
    assert.equal(completed.emailNotifications.length, 4);
    assert.ok(
      completed.emailNotifications.every(
        (notification) => notification.state === "queued",
      ),
    );
    assert.equal(
      (
        await adminContext.request.patch(
          base + `/api/admin/orders/${reference}`,
          { data: { status: "Cancelled" } },
        )
      ).status(),
      409,
    );
    assert.equal(await stock(), 1);
    const guestContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const guest = await guestContext.newPage();
    guest.on("pageerror", (error) => errors.push(error.message));
    await guest.goto(base + `/product/${product.slug}`);
    await guest.getByRole("button", { name: "Buy now", exact: true }).click();
    await guest.getByLabel("Full name").fill("QA Guest Customer");
    await guest
      .getByLabel("Phone number")
      .fill("97" + String(Date.now()).slice(-8));
    await guest
      .getByLabel("Email address")
      .fill(`guest-${Date.now()}@example.com`);
    await guest
      .getByRole("button", { name: "Create pickup order", exact: true })
      .click();
    await guest
      .getByRole("heading", { name: "Your order has been received." })
      .waitFor();
    const guestReference = guest.url().split("/").pop();
    assert.equal(await stock(), 0);
    await adminContext.request.patch(
      base + `/api/admin/orders/${guestReference}`,
      { data: { status: "Cancelled" } },
    );
    assert.equal(await stock(), 1);
    await adminContext.request.patch(
      base + `/api/admin/orders/${guestReference}`,
      { data: { status: "Cancelled" } },
    );
    assert.equal(await stock(), 1);
    await guest.reload();
    await guest
      .getByRole("heading", { name: "Your order has been cancelled." })
      .waitFor();
    await customer.goto(base + "/my-orders");
    assert.equal(
      await customer
        .getByRole("heading", { name: guestReference, exact: true })
        .count(),
      0,
    );
    for (const width of [320, 390, 768, 1440]) {
      await customer.setViewportSize({ width, height: 900 });
      for (const route of [
        "/",
        "/mobiles",
        "/second-hand",
        "/my-orders",
        `/order/${reference}`,
      ]) {
        await customer.goto(base + route);
        await customer.locator("h1").waitFor();
        assert.ok(
          await customer.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${route} overflows at ${width}`,
        );
      }
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "qa-results/order-lifecycle-checks.json",
      JSON.stringify(
        {
          passed: true,
          checks: [
            "Import preview and invalid-file protection",
            "Replace samples with synthetic real-listing fixtures",
            "Preserve existing real listing and create private backup",
            "Phone test login and saved-profile checkout",
            "Reserve two units once",
            "Confirmed → Ready for pickup → Completed in admin and My orders",
            "Four queued order emails",
            "Completed receipt copy and accurate WhatsApp total",
            "Guest last-unit purchase and cancellation restock once",
            "Account privacy",
            "320–1440px layouts",
          ],
          limitations:
            "Separate QA store only. Local test codes; no real SMS or inbox delivery tested.",
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: isolated inventory replacement, customer login, checkout, confirmation, pickup completion, notification queue and cancellation.",
    );
  } finally {
    await browser.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
