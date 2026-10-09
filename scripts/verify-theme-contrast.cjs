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
  const phone = "980" + String(Date.now()).slice(-7);
  const challenge = await (
    await page.request.post(base + "/api/customer/auth/start", {
      data: { phone },
    })
  ).json();
  assert.ok(challenge.developmentCode, "Isolated local test OTP only");
  assert.equal(
    (
      await page.request.post(base + "/api/customer/auth/verify", {
        data: {
          challengeId: challenge.challengeId,
          code: challenge.developmentCode,
        },
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await page.request.patch(base + "/api/customer/profile", {
        data: { name: "Contrast QA Customer", email: "contrast@example.com" },
      })
    ).status(),
    200,
  );
  const products = await (
    await page.request.get(base + "/api/products")
  ).json();
  const product = products.products.find((p) => p.available);
  const order = await page.request.post(base + "/api/orders", {
    data: {
      items: [{ productId: product.id, quantity: 1 }],
      expectedTotal: product.price,
      requestId: randomUUID(),
      note: "Isolated contrast check",
    },
  });
  assert.equal(order.status(), 201, await order.text());
  async function contrast(selector) {
    await page.locator(selector).first().waitFor();
    await page.waitForTimeout(300);
    const ratios = await page.locator(selector).evaluateAll((elements) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const rgb = (color) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };
      const luminance = (value) =>
        value
          .map((v) => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      return elements
        .filter((e) => e.getClientRects().length)
        .map((e) => {
          let surface = e;
          while (
            surface &&
            getComputedStyle(surface).backgroundColor === "rgba(0, 0, 0, 0)"
          )
            surface = surface.parentElement;
          const background = rgb(
            getComputedStyle(surface || document.body).backgroundColor,
          );
          const foreground = rgb(getComputedStyle(e).color);
          const a = luminance(background),
            b = luminance(foreground);
          return {
            text: e.textContent.trim().slice(0, 60),
            ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
            foreground: getComputedStyle(e).color,
            background: getComputedStyle(surface || document.body)
              .backgroundColor,
          };
        });
    });
    for (const result of ratios)
      assert.ok(
        result.ratio >= 4.5,
        `${selector}: ${result.text} contrast ${result.ratio.toFixed(2)} ${result.foreground} on ${result.background}`,
      );
  }
  for (const theme of ["dark", "light"]) {
    await page.goto(base);
    await page.locator(".theme-switch").waitFor();
    if ((await page.locator("html").getAttribute("data-theme")) !== theme)
      await page.locator(".theme-switch").click();
    for (const route of [
      "/help",
      "/repair",
      "/cart",
      "/my-orders",
      "/mobiles?q=contrast-no-match",
    ]) {
      await page.goto(base + route);
      await page.waitForTimeout(400);
      if (route === "/help") {
        await contrast(".page-intro h1");
        await contrast(
          ".contact-form h2, .contact-form > p, .contact-form label",
        );
        await contrast(".shop-map-card h3, .shop-map-card p");
        await page
          .getByLabel("Name *", { exact: true })
          .fill("Contrast Customer");
        await page.getByLabel("Phone *", { exact: true }).fill(phone);
        await page
          .getByLabel("Message *", { exact: true })
          .fill("Preview only, no message sent.");
        await page
          .getByRole("button", {
            name: "Prepare WhatsApp message",
            exact: true,
          })
          .click();
        await contrast(".prepared-message p");
      }
      if (route === "/repair") await contrast(".page-intro h1");
      if (route === "/cart")
        await contrast(".shop-empty-state h2, .shop-empty-state p");
      if (route === "/my-orders") {
        await contrast(".order-filter-bar button");
        await page.getByRole("button", { name: "Active", exact: true }).click();
        await contrast(".order-filter-bar button");
        await page
          .getByRole("button", { name: "Past orders", exact: true })
          .click();
        await contrast(".order-filter-bar button");
        await contrast(".shop-empty-state h2, .shop-empty-state p");
        await page.locator(".customer-account-link").click();
        await contrast(
          ".account-dialog .dialog-close, .account-dialog h1, .account-dialog label, .account-dialog input",
        );
        await page.screenshot({
          path: `qa-results/contrast-${theme}-account-panel.png`,
          fullPage: true,
        });
        await page.locator(".dialog-close").click();
      }
      if (route.startsWith("/mobiles"))
        await contrast(".active-filters > span, .active-filters button");
      await page.screenshot({
        path: `qa-results/contrast-${theme}-${route.split("?")[0].slice(1)}.png`,
        fullPage: true,
      });
    }
  }
  await page.goto(base + "/not-admin");
  await page.getByLabel("Username", { exact: true }).fill("qaowner");
  await page
    .getByLabel("Password", { exact: true })
    .fill("qa-owner-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  await page.getByRole("tab", { name: "Inventory", exact: true }).click();
  const categoryGroup = page.getByRole("group", {
    name: "Inventory categories",
    exact: true,
  });
  for (const [category, label] of [
    ["new", "New phones"],
    ["used", "Used phones"],
    ["accessory", "Accessories"],
  ]) {
    await categoryGroup
      .getByRole("button", { name: new RegExp("^" + label) })
      .click();
    assert.deepEqual(
      (await page.locator(".admin-product strong").allTextContents()).sort(),
      products.products
        .filter((p) => p.category === category)
        .map((p) => p.name)
        .sort(),
    );
  }
  await page.locator("#admin-product-search").fill("contrast-no-match");
  assert.equal(await page.locator(".admin-product").count(), 0);
  await page.locator("#admin-product-search").fill("");
  await page.getByRole("button", { name: "Low stock", exact: true }).click();
  assert.equal(
    await page.locator(".admin-product").count(),
    0,
    "Sample stock is excluded",
  );
  await page
    .getByRole("button", { name: "All stock levels", exact: true })
    .click();
  await categoryGroup.getByRole("button", { name: /^All categories/ }).click();
  assert.equal(
    await page.locator(".admin-product").count(),
    products.products.length,
  );
  await page.screenshot({
    path: "qa-results/admin-inventory-categories.png",
    fullPage: false,
  });
  console.log(
    "PASS: affected Help/Repair headings, contact/map/message panels, cart/order empty states, order tabs and search summary exceed 4.5:1 contrast in both themes. Desktop only; no messages sent.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
  });
