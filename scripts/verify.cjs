const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:8767";
async function run() {
  fs.mkdirSync("qa-results", { recursive: true });
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
  const failures = [];
  const go = async (url) => {
    await page.goto(url);
    await page.locator(".site-header").waitFor();
  };
  page.on("pageerror", (e) => failures.push(e.message));
  await go(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator(".hero h1").waitFor();
  await page.screenshot({
    path: "qa-results/home-desktop.png",
    fullPage: true,
  });
  assert.equal(await page.locator(".product-card").count(), 0);
  assert.ok(await page.getByRole("link", { name: "Under Rs. 35,000" }).count());
  await page.getByLabel("Search all products", { exact: true }).fill("charger");
  await page
    .getByRole("button", { name: "Search the shop", exact: true })
    .click();
  await page.waitForURL("**/search?q=charger");
  await page.locator(".product-card").first().waitFor();
  assert.ok(await page.locator(".product-card").count());
  await go(base + "/mobiles");
  assert.equal(await page.locator(".product-card").count(), 10);
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByLabel("Brand", { exact: true }).selectOption("Samsung");
  assert.equal(await page.locator(".product-card").count(), 2);
  await page.getByLabel("Maximum price").selectOption("50000");
  assert.equal(await page.locator(".product-card").count(), 1);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByLabel("In stock only", { exact: true }).check();
  const productData = await (
    await page.request.get(base + "/api/products")
  ).json();
  assert.equal(
    await page.locator(".product-card").count(),
    productData.products.filter((p) => p.category === "new" && p.available)
      .length,
  );
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search products", exact: true })
    .fill("does-not-exist");
  await page.getByRole("heading", { name: "No matches this time." }).waitFor();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Add Galaxy A55 5G to bag", { exact: true }).click();
  await go(base + "/cart");
  await page.getByRole("heading", { name: "Galaxy A55 5G" }).waitFor();
  await page.getByLabel("Increase Galaxy A55 5G quantity").click();
  await page.reload();
  assert.equal(await page.locator(".quantity span").textContent(), "2");
  await page.getByLabel("Decrease Galaxy A55 5G quantity").click();
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await page.getByRole("button", { name: "Create pickup order" }).click();
  await page.getByText("Please enter your full name.").waitFor();
  await page
    .getByText("Enter a valid email address for order updates.")
    .waitFor();
  await page.getByLabel("Full name").fill("Preview Customer");
  await page.getByLabel("Phone number").fill("123");
  await page.getByRole("button", { name: "Create pickup order" }).click();
  await page
    .getByText("Enter a valid Nepal mobile number, such as 9806600444.")
    .waitFor();
  await page.getByLabel("Phone number").fill("9806600444");
  await page.getByLabel("Email address").fill(`qa-${Date.now()}@example.com`);
  await page.getByLabel("Order note").fill("Pickup after 3 PM");
  await page.getByRole("button", { name: "Create pickup order" }).click();
  await page
    .getByRole("heading", { name: "Your order has been received." })
    .waitFor();
  const orderUrl = page.url();
  const orderLink = await page
    .getByRole("link", { name: "Contact shop about this order" })
    .getAttribute("href");
  const orderText = decodeURIComponent(
    new URL(orderLink).searchParams.get("text"),
  );
  assert.ok(orderLink.startsWith("https://wa.me/9779806600444"));
  assert.ok(
    orderText.includes("Preview Customer") &&
      orderText.includes("47,999") &&
      orderText.includes("Shop pickup"),
  );
  await page.reload();
  await page
    .getByRole("heading", { name: "Your order has been received." })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("me-cart")).length,
    ),
    0,
  );
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("me-orders"))[0].items[0].quantity,
    ),
    1,
  );
  await page.screenshot({
    path: "qa-results/order-success.png",
    fullPage: true,
  });
  await go(base + "/contact");
  await page.getByLabel("Name *", { exact: true }).fill("Preview Customer");
  await page.getByLabel("Phone *", { exact: true }).fill("9806600444");
  await page
    .getByLabel("Message *", { exact: true })
    .fill("Can I visit for a repair?");
  await page.getByRole("button", { name: "Prepare WhatsApp message" }).click();
  const contactLink = await page
    .getByRole("link", { name: "Open WhatsApp", exact: true })
    .getAttribute("href");
  assert.ok(
    decodeURIComponent(contactLink).includes("Can I visit for a repair?"),
  );
  const routes = [
    "/",
    "/mobiles",
    "/second-hand",
    "/accessories",
    "/product/samsung-galaxy-a55-5g",
    "/product/used-apple-iphone-13",
    "/product/usb-c-wall-charger",
    "/digital-meter-repair",
    "/mobile-repair",
    "/contact",
    "/cart",
    "/checkout",
    "/search?q=apple",
    "/not-a-page",
  ];
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await go(base + route);
      await page.locator("h1").waitFor();
      await page.locator("img").evaluateAll((images) =>
        Promise.all(
          images.map((image) => {
            image.loading = "eager";
            return image.decode().catch(() => {});
          }),
        ),
      );
      const metrics = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        broken: [...document.images].filter(
          (i) => !i.complete || i.naturalWidth === 0,
        ).length,
      }));
      assert.ok(
        metrics.scroll <= metrics.width,
        `${route} overflows at ${width}: ${metrics.scroll}`,
      );
      assert.equal(metrics.broken, 0, `${route} has broken images at ${width}`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await go(base);
  await page.getByLabel("Open navigation").click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Used phones", exact: true })
    .click();
  await page.waitForURL("**/second-hand");
  await page.locator("h1").waitFor();
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByLabel("Condition", { exact: true }).selectOption("Like New");
  assert.equal(await page.locator(".product-card").count(), 1);
  await go(base);
  await page.screenshot({ path: "qa-results/home-mobile.png", fullPage: true });
  await go(base + "/product/used-apple-iphone-13");
  await page.screenshot({
    path: "qa-results/product-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await go(base + "/cart");
  await page.getByLabel("Remove iPhone 13", { exact: true }).click();
  await page.getByRole("heading", { name: "Your bag is waiting." }).waitFor();
  assert.deepEqual(failures, [], "Browser JavaScript errors");
  await page.evaluate(() => localStorage.clear());
  fs.writeFileSync(
    "qa-results/checks.json",
    JSON.stringify(
      {
        passed: true,
        routesChecked: routes.length,
        widths: [1440, 768, 390, 320],
        checks: [
          "Header category search and homepage price/category controls",
          "Brand and price filters",
          "Search no-results and reset",
          "Persistent cart quantities",
          "Checkout required fields and phone validation",
          "Local order persistence and snapshot",
          "WhatsApp order and contact summaries",
          "Empty cart and removal",
          "Mobile navigation and condition filter",
          "Direct routes",
          "No horizontal overflow",
          "No broken images",
          "No browser errors",
        ],
        sampleOrderRoute: orderUrl,
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(
    "PASS: customer flows, 14 routes at 4 widths, local assets, and browser errors.",
  );
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
