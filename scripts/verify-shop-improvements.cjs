const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:8771";

async function run() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
    args: ["--no-proxy-server"],
  });
  const admin = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await mobileContext.newPage();
  const errors = [];
  for (const page of [admin, mobile])
    page.on("pageerror", (error) => errors.push(error.message));
  async function json(request, route, method = "get", data) {
    const response = await request[method](
      base + route,
      data ? { data } : undefined,
    );
    assert.ok(response.ok(), `${method} ${route}: ${response.status()}`);
    return response.json();
  }
  async function layout(page, selector) {
    const bounds = await page.evaluate(
      (selector) => ({
        width: innerWidth,
        content: document.documentElement.scrollWidth,
        buttons: [...document.querySelectorAll(selector)].map((button) => {
          const rect = button.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
      }),
      selector,
    );
    assert.ok(
      bounds.content <= bounds.width + 1,
      `Page overflow: ${JSON.stringify(bounds)}`,
    );
    assert.ok(
      bounds.buttons.every(
        (button) =>
          button.height >= (bounds.width < 768 ? 44 : 36) &&
          button.width >= (bounds.width < 768 ? 44 : 36),
      ),
      `Small controls: ${JSON.stringify(bounds)}`,
    );
  }
  async function photo(index) {
    await mobile.waitForFunction((index) => {
      const rail = document.querySelector(".product-gallery-rail");
      return Math.abs(rail.scrollLeft - index * rail.clientWidth) < 2;
    }, index);
    await mobile
      .locator(
        `.product-gallery-thumbnails button:nth-child(${index + 1})[aria-pressed="true"]`,
      )
      .waitFor();
  }
  try {
    fs.mkdirSync("qa-results", { recursive: true });
    const access = fs.readFileSync("backend/ADMIN-ACCESS.txt", "utf8");
    await admin.goto(base + "/not-admin");
    await admin
      .getByLabel("Username", { exact: true })
      .fill(access.match(/^Username: (.+)$/m)[1].trim());
    await admin
      .getByLabel("Password", { exact: true })
      .fill(access.match(/^Password: (.+)$/m)[1].trim());
    await admin.getByRole("button", { name: "Sign in", exact: true }).click();
    await admin
      .getByRole("heading", { name: "Dashboard", exact: true })
      .waitFor();
    await admin
      .getByRole("button", { name: "Pending orders: 0", exact: true })
      .waitFor();
    await admin.getByRole("tab", { name: "Inventory", exact: true }).click();
    await admin
      .getByLabel("Product name *", { exact: true })
      .fill("QA Gallery Phone");
    await admin.getByLabel("Brand *", { exact: true }).fill("QA");
    await admin.getByLabel("Price (NPR) *", { exact: true }).fill("25000");
    await admin.getByLabel("Stock quantity *", { exact: true }).fill("3");
    await admin
      .getByLabel("Description *", { exact: true })
      .fill("An isolated QA fixture for gallery and mobile order checks.");
    const buffers = [
      "sample-phone-v1.png",
      "shop-banner-v1.png",
      "accessories-banner-v1.png",
    ].map((file, index) => ({
      name: `qa-photo-${index}.png`,
      mimeType: "image/png",
      buffer: fs.readFileSync("frontend/public/assets/" + file),
    }));
    await admin.getByLabel("Product photo", { exact: true }).setInputFiles(
      Array.from({ length: 7 }, (_, index) => ({
        ...buffers[0],
        name: `too-many-${index}.png`,
      })),
    );
    await admin
      .getByText(
        "Keep up to six photos. Remove an existing photo before adding more.",
        { exact: true },
      )
      .waitFor();
    await admin
      .getByLabel("Product photo", { exact: true })
      .setInputFiles(buffers);
    await admin
      .getByText(
        "3 photos uploaded. Save the product to use them in the shop.",
        { exact: true },
      )
      .waitFor();
    assert.equal(await admin.locator(".admin-photo-grid > div").count(), 3);
    await admin
      .getByRole("button", { name: "Make photo 3 cover", exact: true })
      .click();
    await admin
      .getByRole("button", { name: "Remove photo 2", exact: true })
      .click();
    await admin
      .getByRole("button", { name: "Save product", exact: true })
      .click();
    await admin
      .getByText("Product saved. The storefront catalogue has been updated.", {
        exact: true,
      })
      .waitFor();
    const catalogue = (await json(admin.request, "/api/products")).products;
    const gallery = catalogue.find(
      (product) => product.name === "QA Gallery Phone",
    );
    assert.equal(gallery.images.length, 2);
    assert.equal(gallery.image, gallery.images[0]);
    assert.equal(gallery.isSample, false);
    await mobile.goto(base + "/product/" + gallery.slug);
    await mobile
      .getByRole("heading", { name: gallery.name, exact: true })
      .waitFor();
    await mobile
      .getByRole("button", { name: "Next product photo", exact: true })
      .click();
    await photo(1);
    await mobile
      .getByRole("button", { name: "Previous product photo", exact: true })
      .click();
    await photo(0);
    await mobile
      .getByRole("button", { name: "View product photo 2", exact: true })
      .click();
    await photo(1);
    await mobile.locator(".product-gallery-rail").focus();
    await mobile.keyboard.press("ArrowLeft");
    await photo(0);
    const cdp = await mobileContext.newCDPSession(mobile);
    await mobile.locator(".product-gallery-rail").scrollIntoViewIfNeeded();
    const rect = await mobile.locator(".product-gallery-rail").boundingBox();
    const y = rect.y + rect.height / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: rect.x + rect.width * 0.85, y }],
    });
    for (let step = 1; step <= 8; step++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: rect.x + rect.width * (0.85 - step * 0.08), y }],
      });
      await mobile.waitForTimeout(25);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await photo(1);
    await cdp.detach();
    await mobile.screenshot({
      path: "qa-results/gallery-mobile.png",
      fullPage: true,
    });
    for (const width of [320, 390, 768, 1440]) {
      await mobile.setViewportSize({ width, height: 900 });
      await layout(
        mobile,
        ".product-gallery-controls button, .product-gallery-thumbnails button, .quantity button",
      );
    }
    await mobile.setViewportSize({ width: 390, height: 844 });
    const legacy = catalogue.find(
      (product) => product.isSample !== false && product.category === "new",
    );
    await mobile.goto(base + "/product/" + legacy.slug);
    await mobile
      .getByRole("heading", { name: legacy.name, exact: true })
      .waitFor();
    assert.equal(await mobile.locator(".product-gallery-controls").count(), 0);
    const fixture = {
      name: "QA Sold Out Cable",
      brand: "QA",
      category: "accessory",
      accessoryCategory: "Other Accessories",
      description: "A zero-stock QA fixture.",
      price: 100,
      stockQuantity: 0,
      image: "/assets/charger.svg",
      color: "#c1d4d1",
      isSample: false,
      specs: {},
    };
    await json(admin.request, "/api/admin/products", "post", fixture);
    await json(admin.request, `/api/admin/products/${legacy.id}`, "patch", {
      ...legacy,
      stockQuantity: 1,
    });
    const place = (request, input = {}) =>
      json(request, "/api/orders", "post", {
        name: "QA Gallery Customer",
        phone: "9806600444",
        email: "gallery-qa@example.com",
        items: [{ productId: gallery.id, quantity: 1 }],
        expectedTotal: gallery.price,
        requestId: randomUUID(),
        ...input,
      });
    const pending = (await place(mobile.request)).order;
    const ready = (await place(mobile.request)).order;
    await json(admin.request, `/api/admin/orders/${ready.id}`, "patch", {
      status: "Ready for pickup",
    });
    await admin
      .getByRole("button", { name: "Refresh overview", exact: true })
      .click();
    for (const name of [
      "Pending orders: 1",
      "Ready for pickup: 1",
      "Low stock products: 2",
    ])
      await admin.getByRole("button", { name, exact: true }).waitFor();
    await admin
      .getByRole("button", { name: "Pending orders: 1", exact: true })
      .click();
    assert.equal(await admin.locator(".admin-order").count(), 1);
    assert.ok(
      (await admin.locator(".admin-order").textContent()).includes(pending.id),
    );
    await admin
      .getByRole("button", { name: "Ready for pickup: 1", exact: true })
      .click();
    assert.equal(await admin.locator(".admin-order").count(), 1);
    await admin
      .getByLabel(`Status for ${ready.id}`, { exact: true })
      .selectOption("Completed");
    await admin
      .getByRole("button", { name: "Ready for pickup: 0", exact: true })
      .waitFor();
    await admin
      .getByRole("button", { name: "Low stock products: 2", exact: true })
      .click();
    assert.equal(await admin.locator(".admin-product").count(), 2);
    assert.ok(
      !(await admin.locator(".admin-product-list").textContent()).includes(
        legacy.name,
      ),
    );
    for (const width of [320, 390, 768, 1440]) {
      await admin.setViewportSize({ width, height: 900 });
      await layout(
        admin,
        ".overview-card, .admin-filter-bar button, .admin-photo-tile button",
      );
    }
    await admin.setViewportSize({ width: 390, height: 844 });
    await admin.screenshot({
      path: "qa-results/admin-overview-mobile.png",
      fullPage: true,
    });
    await mobile.goto(base + "/cart");
    await mobile
      .getByRole("heading", { name: "Your bag is waiting.", exact: true })
      .waitFor();
    await layout(mobile, ".shop-empty-actions .button");
    await mobile.screenshot({
      path: "qa-results/cart-empty-mobile.png",
      fullPage: true,
    });
    await mobile.goto(base + "/my-orders");
    await mobile
      .getByRole("link", { name: "Log in to see orders", exact: true })
      .click();
    await mobile
      .getByLabel("Nepal mobile number")
      .fill("98" + String(Date.now()).slice(-8));
    await mobile
      .getByRole("button", { name: "Get test code", exact: true })
      .click();
    await mobile.locator(".account-demo-code strong").waitFor();
    await mobile
      .getByLabel("Verification code")
      .fill(await mobile.locator(".account-demo-code strong").textContent());
    await mobile
      .getByRole("button", { name: "Verify and log in", exact: true })
      .click();
    await mobile.getByLabel("Full name").fill("Gallery Account Customer");
    await mobile
      .getByLabel("Email address")
      .fill("gallery-account@example.com");
    await mobile
      .getByRole("button", { name: "Save and continue", exact: true })
      .click();
    await mobile
      .getByRole("heading", { name: "No orders yet.", exact: true })
      .waitFor();
    await mobile.screenshot({
      path: "qa-results/my-orders-empty-mobile.png",
      fullPage: true,
    });
    const owned = (await place(mobile.request)).order;
    await mobile
      .getByRole("button", { name: "Refresh orders", exact: true })
      .click();
    await mobile
      .getByRole("heading", { name: owned.id, exact: true })
      .waitFor();
    assert.equal(
      await mobile.locator(".customer-order").count(),
      1,
      "Guest orders remain private",
    );
    await mobile
      .getByRole("button", { name: "Past orders", exact: true })
      .click();
    await mobile
      .getByRole("heading", { name: "No past orders yet.", exact: true })
      .waitFor();
    await mobile.getByRole("button", { name: "Active", exact: true }).click();
    await json(admin.request, `/api/admin/orders/${owned.id}`, "patch", {
      status: "Completed",
    });
    await mobile
      .getByRole("button", { name: "Refresh orders", exact: true })
      .click();
    await mobile
      .getByRole("heading", { name: "You’re all caught up.", exact: true })
      .waitFor();
    await mobile
      .getByRole("button", { name: "Past orders", exact: true })
      .click();
    await mobile.locator(".customer-order .order-status.completed").waitFor();
    await mobile
      .getByText("Pickup complete. Your receipt is saved with this order.", {
        exact: true,
      })
      .waitFor();
    for (const width of [320, 390, 768]) {
      await mobile.setViewportSize({ width, height: 900 });
      await layout(mobile, ".order-filter-bar button, .customer-order .button");
    }
    assert.deepEqual(errors, []);
    const results = {
      multiUploadCoverRemoval: true,
      galleryButtonsThumbnailsKeyboardAndTouchSwipe: true,
      legacySinglePhoto: true,
      overviewOrderFiltersAndStatusUpdates: true,
      lowStockExcludesSamples: true,
      customerEmptyAndPastActiveStates: true,
      guestPrivacy: true,
      responsiveWidths: [320, 390, 768, 1440],
      pageErrors: errors,
      liveMessagesSent: false,
    };
    fs.writeFileSync(
      "qa-results/shop-improvements-checks.json",
      JSON.stringify(results, null, 2),
    );
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
