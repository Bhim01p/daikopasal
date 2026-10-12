const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
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
  page.setDefaultTimeout(12000);
  const base = "http://127.0.0.1:8773";
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await page.locator(".home-carousel h1").waitFor();
  assert.equal(
    await page
      .locator("main .product-card, main .reference-budget-row")
      .count(),
    0,
  );
  const first = await page.locator(".home-carousel h1").textContent();
  await page.waitForTimeout(3200);
  assert.notEqual(await page.locator(".home-carousel h1").textContent(), first);
  await page.mouse.move(700, 400);
  const hovered = await page.locator(".home-carousel h1").textContent();
  await page.waitForTimeout(3200);
  assert.notEqual(
    await page.locator(".home-carousel h1").textContent(),
    hovered,
  );
  assert.equal(await page.locator(".carousel-controls").count(), 0);
  await page.goto(base + "/accessories");
  const searchGeometry = await page
    .locator("#header-query")
    .evaluate((input) => ({
      width: input.clientWidth,
      font: getComputedStyle(input).font,
      text: input.placeholder,
    }));
  const textWidth = await page.evaluate(({ font, text }) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = font;
    return context.measureText(text).width;
  }, searchGeometry);
  assert.ok(
    searchGeometry.width >= textWidth + 20,
    JSON.stringify({ searchGeometry, textWidth }),
  );
  await page.goto(base + "/help");
  await page
    .getByRole("heading", { name: "How can we help?", exact: true })
    .waitFor();
  assert.equal(
    await page.locator(".help-quick-actions .help-action").count(),
    3,
  );
  assert.equal(await page.locator("#contact-name").isVisible(), false);
  await page.getByText("Ask a question", { exact: true }).click();
  await page.locator("#contact-name").fill("Workflow QA");
  await page.locator("#contact-phone").fill("9846692687");
  await page.locator("#contact-message").fill("Help page test only");
  await page.getByRole("button", { name: "Prepare WhatsApp message" }).click();
  await page
    .getByRole("link", { name: "Open WhatsApp", exact: true })
    .waitFor();
  const directions = await page
    .getByRole("link", { name: "Get directions", exact: true })
    .getAttribute("href");
  assert.ok(decodeURIComponent(directions).includes("43MM+778"));
  await page.locator(".help-enquiry > summary").click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "qa-results/workflow-help-light.png",
    fullPage: true,
  });
  await page.goto(base + "/repair");
  await page.locator("#phone-repairs").waitFor();
  const phone = await page.locator("#phone-repairs").boundingBox();
  const meter = await page.locator("#digital-meter-repairs").boundingBox();
  assert.ok(Math.abs(phone.y - meter.y) < 2 && meter.x > phone.x);
  assert.ok(phone.y + phone.height < 1000 && meter.y + meter.height < 1000);
  await page.screenshot({
    path: "qa-results/workflow-repairs-light.png",
    fullPage: true,
  });
  await page.goto(base + "/mobiles");
  await page.locator(".product-card").first().waitFor();
  await page
    .locator(".product-card")
    .first()
    .getByRole("button", { name: /Add .* to cart/ })
    .click();
  await page.getByRole("button", { name: /Shopping cart,/ }).click();
  await page.getByRole("dialog", { name: "Your shopping cart." }).waitFor();
  await page
    .getByRole("button", { name: /Increase .* quantity/ })
    .first()
    .click();
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await page.waitForURL("**/checkout");
  await page.locator("dialog").waitFor({ state: "detached" });
  await page
    .getByRole("heading", { name: "Cancellation requests", exact: true })
    .waitFor();
  await page.locator("#customer-name").fill("Workflow Order");
  await page.locator("#customer-phone").fill("9846692687");
  await page.locator("#customer-email").fill("workflow@example.com");
  await page.getByRole("button", { name: "Create pickup order" }).click();
  await page.waitForURL("**/order/*");
  await page.getByRole("link", { name: "Track order", exact: true }).click();
  assert.ok(page.url().endsWith("#order-progress"));
  await page.locator(".success-summary .summary-line.total").waitFor();
  await page.goto(base + "/my-orders");
  await page.locator(".guest-receipt").first().waitFor();
  assert.ok((await page.locator(".guest-receipt").count()) > 0);
  await page.goto(base + "/login");
  await page
    .getByLabel("Nepal mobile number", { exact: true })
    .fill("9846692687");
  assert.ok(
    await page
      .getByRole("button", { name: "Get test code", exact: true })
      .isEnabled(),
  );
  await page
    .getByRole("button", { name: "Get test code", exact: true })
    .click();
  await page.locator(".account-demo-code strong").waitFor();
  // Broken images must show a deliberate fallback, rather than a browser error icon.
  await page.route("**/assets/sample-phone-v1.png", (route) => route.abort());
  await page.goto(base + "/mobiles");
  await page.locator(".product-card .image-fallback").first().waitFor();
  await page.unroute("**/assets/sample-phone-v1.png");
  await page.goto(base + "/not-admin");
  await page.getByLabel("Username", { exact: true }).fill("qaowner");
  await page
    .getByLabel("Password", { exact: true })
    .fill("qa-owner-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  for (const [label, category, path] of [
    ["New phones", "new", "new-phones"],
    ["Used phones", "used", "used-phones"],
    ["Accessories", "accessory", "accessories"],
  ]) {
    await page.getByRole("tab", { name: label, exact: true }).click();
    assert.ok(page.url().endsWith("/not-admin/" + path));
    await page
      .getByRole("button", { name: "New product", exact: true })
      .click();
    await page.waitForURL("**/" + path + "/create");
    assert.equal(
      await page.locator("#product-category").inputValue(),
      category,
    );
    assert.equal(await page.locator(".admin-product-list").count(), 0);
    await page.reload();
    await page.locator("#product-category").waitFor();
    assert.equal(
      await page.locator("#product-category").inputValue(),
      category,
    );
    const name = "Workflow " + category + " " + Date.now();
    await page.locator("#product-name").fill(name);
    await page.locator("#product-brand").fill("QA Brand");
    await page
      .locator("#product-description")
      .fill("An isolated workflow test product.");
    await page.locator("#product-price").fill("1000");
    await page.locator("#product-stock").fill("3");
    await page
      .getByRole("button", { name: "Save product", exact: true })
      .click();
    await page.waitForURL("**/not-admin/" + path);
    await page
      .getByRole("button", { name: "Edit " + name, exact: true })
      .waitFor();
  }
  await page.getByRole("tab", { name: "New phones", exact: true }).click();
  await page
    .getByRole("button", { name: /^Edit / })
    .first()
    .click();
  await page.locator("#product-name").waitFor();
  const oldName = await page.locator("#product-name").inputValue();
  await page.locator("#product-name").fill("Unsaved QA");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.goBack();
  await page.locator("#product-name").waitFor();
  assert.equal(await page.locator("#product-name").inputValue(), "Unsaved QA");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Back to inventory", exact: true })
    .click();
  assert.equal(await page.locator("#product-name").inputValue(), "Unsaved QA");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Back to inventory", exact: true })
    .click();
  await page
    .getByRole("button", { name: "New product", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: "Staff logins", exact: true }).click();
  assert.equal(await page.locator("#staff-name").count(), 0);
  await page
    .getByRole("button", { name: "New staff login", exact: true })
    .click();
  await page.waitForURL("**/not-admin/staff/create");
  const staffName = "helper" + Date.now();
  await page.locator("#staff-name").fill("Workflow Staff");
  await page.locator("#staff-username").fill(staffName);
  await page.locator("#staff-password").fill("qa-staff-password-only");
  await page.locator("#staff-confirmation").fill("qa-staff-password-only");
  await page
    .getByRole("button", { name: "Save staff login", exact: true })
    .click();
  await page.waitForURL("**/not-admin/staff");
  await page.getByText(staffName, { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Edit staff Workflow Staff", exact: true })
    .last()
    .click();
  await page.reload();
  await page.locator("#staff-username").waitFor();
  assert.equal(await page.locator("#staff-username").inputValue(), staffName);
  await page.locator("#staff-name").fill("Unsaved staff QA");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.goBack();
  await page.locator("#staff-name").waitFor();
  assert.equal(
    await page.locator("#staff-name").inputValue(),
    "Unsaved staff QA",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Back to staff logins", exact: true })
    .click();
  await page.screenshot({
    path: "qa-results/workflow-staff-list.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Username", { exact: true }).fill(staffName);
  await page
    .getByLabel("Password", { exact: true })
    .fill("qa-staff-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("tab", { name: "New phones", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("tab", { name: "Staff logins", exact: true }).count(),
    0,
  );
  await page.goto(base + "/not-admin/staff");
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  assert.equal(await page.locator("#staff-name").count(), 0);
  await page.goto(base + "/help");
  await page
    .getByRole("heading", { name: "How can we help?", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: "qa-results/workflow-help-dark.png",
    fullPage: true,
  });
  await page.goto(base + "/repair");
  await page.locator("#phone-repairs").waitFor();
  await page.screenshot({
    path: "qa-results/workflow-repairs-dark.png",
    fullPage: true,
  });
  await page.getByLabel("Language", { exact: true }).selectOption("ne");
  await page.goto(base + "/help");
  await page
    .getByRole("heading", { name: "हामी कसरी सहयोग गर्न सक्छौँ?", exact: true })
    .waitFor();
  await page.getByLabel("भाषा", { exact: true }).selectOption("en");
  assert.deepEqual(errors, []);
  console.log(
    "PASS desktop carousel, Help, map links, repairs, search fit, cart, checkout/guest tracking, 10-digit login, photo fallback, dedicated admin pages, category defaults, unsaved edits and staff access.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
  });
