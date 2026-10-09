const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs"),
  assert = require("node:assert/strict");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:8771";
const access = fs.readFileSync("backend/ADMIN-ACCESS.txt", "utf8");
const username = access.match(/^Username: (.+)$/m)[1].trim(),
  password = access.match(/^Password: (.+)$/m)[1].trim();
async function run() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
    args: ["--no-proxy-server"],
  });
  const customer = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    admin = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
  const page = await customer.newPage(),
    owner = await admin.newPage(),
    errors = [];
  for (const p of [page, owner])
    p.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(base + "/mobiles");
    await page.locator(".product-card").first().waitFor();
    await page.locator("#catalogue-search").fill("Galaxy");
    await page.locator(".catalogue-filter-button").click();
    await page.getByLabel("In stock only").check();
    await page
      .locator(".site-header .language-switch select")
      .selectOption("ne");
    assert.equal(await page.locator("html").getAttribute("lang"), "ne");
    assert.equal(
      await page.locator("#catalogue-search").inputValue(),
      "Galaxy",
    );
    assert.equal(
      await page.locator("input[type=checkbox]").first().isChecked(),
      true,
    );
    await page
      .locator(".site-header .language-switch select")
      .selectOption("en");
    await page.goto(base + "/login");
    await page
      .getByLabel("Nepal mobile number")
      .fill(
        ("980" + String(Date.now()).slice(-7)).replace(
          /\d/g,
          (d) => "०१२३४५६७८९"[Number(d)],
        ),
      );
    const codeResponse = page.waitForResponse((r) =>
      r.url().endsWith("/customer/auth/start"),
    );
    await page
      .getByRole("button", { name: "Get test code", exact: true })
      .click();
    const challenge = await (await codeResponse).json();
    await page
      .getByLabel("Verification code")
      .fill(
        challenge.developmentCode.replace(
          /\d/g,
          (d) => "०१२३४५६७८९"[Number(d)],
        ),
      );
    await page
      .locator(".site-header .language-switch select")
      .selectOption("ne");
    assert.equal(
      await page.getByLabel("पुष्टि कोड").inputValue(),
      challenge.developmentCode,
    );
    assert.equal(
      await page.getByRole("button", { name: /सेकेन्डपछि फेरि/ }).isDisabled(),
      true,
    );
    await page
      .getByRole("button", { name: "पुष्टि गरेर लगइन गर्नुहोस्", exact: true })
      .click();
    await page.getByLabel("पूरा नाम", { exact: true }).fill("निशान परीक्षण");
    await page
      .getByLabel("इमेल ठेगाना", { exact: true })
      .fill("ux@example.com");
    await page
      .locator(".site-header .language-switch select")
      .selectOption("en");
    assert.equal(
      await page.getByLabel("Full name", { exact: true }).inputValue(),
      "निशान परीक्षण",
    );
    await page
      .getByRole("button", { name: "Save and continue", exact: true })
      .click();
    await page.waitForURL("**/my-orders");
    await page.goto(base + "/mobiles");
    await page.locator(".product-card").first().waitFor();
    await page.locator(".product-card .add-button").first().click();
    await page.goto(base + "/checkout");
    await page.locator("textarea").fill("म दिउँसो आउँछु।");
    await page
      .locator(".site-header .language-switch select")
      .selectOption("ne");
    assert.equal(
      await page.locator("textarea").inputValue(),
      "म दिउँसो आउँछु।",
    );
    await page
      .getByRole("button", { name: "अर्डर पठाउनुहोस्", exact: true })
      .click();
    await page.waitForURL("**/order/**");
    await page.locator(".reference").waitFor();
    const orderId = (await page.locator(".reference").innerText()).match(
      /ME-[A-Z0-9-]+/,
    )[0];
    assert.equal(
      await page.getByRole("link", { name: "पसलसम्म पुग्ने बाटो" }).count(),
      1,
    );
    const receiptUrl = page.url();
    await owner.goto(base + "/not-admin");
    await owner.getByLabel("Username", { exact: true }).fill(username);
    await owner.getByLabel("Password", { exact: true }).fill(password);
    await owner.getByRole("button", { name: "Sign in", exact: true }).click();
    await owner.locator(".admin-overview").waitFor();
    await owner
      .getByLabel("Product name *", { exact: true })
      .fill("Unsaved QA");
    await owner
      .locator(".admin-header .language-switch select")
      .selectOption("ne");
    assert.equal(
      await owner.locator("#product-name").inputValue(),
      "Unsaved QA",
    );
    await owner
      .locator(".admin-header .language-switch select")
      .selectOption("en");
    let discardAsked = false;
    owner.once("dialog", async (dialog) => {
      discardAsked = true;
      await dialog.dismiss();
    });
    await owner
      .getByRole("button", { name: "New product", exact: true })
      .click();
    assert.equal(discardAsked, true);
    assert.equal(
      await owner.locator("#product-name").inputValue(),
      "Unsaved QA",
    );
    owner.once("dialog", (dialog) => dialog.accept());
    await owner
      .getByRole("button", { name: "Cancel editing", exact: true })
      .click();
    await owner.locator(".quick-stock-button").first().click();
    const stock = owner.locator(".quick-stock").first();
    await stock.locator("input").fill("8");
    await stock
      .getByRole("button", { name: "Save stock", exact: true })
      .click();
    await stock.waitFor({ state: "detached" });
    await owner.getByRole("tab", { name: "Orders", exact: true }).click();
    await owner
      .getByPlaceholder("Reference, customer name or phone")
      .fill(orderId);
    const order = owner.locator(".admin-order").filter({ hasText: orderId });
    await order.waitFor();
    await order
      .getByRole("button", { name: "Confirm order", exact: true })
      .click();
    await order
      .getByRole("button", { name: "Ready for pickup", exact: true })
      .waitFor();
    await order
      .getByRole("button", { name: "Ready for pickup", exact: true })
      .click();
    await order
      .getByRole("button", { name: "Complete pickup", exact: true })
      .waitFor();
    await order
      .getByRole("button", { name: "Complete pickup", exact: true })
      .click();
    await owner.getByRole("dialog").waitFor();
    await owner.getByRole("button", { name: "Go back", exact: true }).click();
    assert.equal(
      await order
        .getByRole("button", { name: "Complete pickup", exact: true })
        .count(),
      1,
    );
    await order
      .getByRole("button", { name: "Complete pickup", exact: true })
      .click();
    await owner
      .getByRole("dialog")
      .getByRole("button", { name: "Complete pickup", exact: true })
      .click();
    await owner.getByRole("dialog").waitFor({ state: "detached" });
    assert.match(await order.innerText(), /Completed/);
    await owner
      .getByPlaceholder("Reference, customer name or phone")
      .fill("no such customer");
    assert.equal(await owner.locator(".admin-order").count(), 0);
    await owner
      .getByPlaceholder("Reference, customer name or phone")
      .fill("निशान");
    assert.ok((await owner.locator(".admin-order").count()) >= 1);
    await page.goto(receiptUrl);
    await page
      .getByRole("heading", { name: "सामान लिनुभएको छ।", exact: true })
      .waitFor();
    await page.goto(base + "/my-orders");
    await page.locator(".customer-order").waitFor();
    assert.match(
      await page.locator(".customer-order").innerText(),
      /पूरा भएको/,
    );
    // Independent saved language choices and layout coverage.
    await owner
      .locator(".admin-header .language-switch select")
      .selectOption("ne");
    for (const language of ["en", "ne"]) {
      await page
        .locator(".site-header .language-switch select")
        .selectOption(language);
      await owner
        .locator(".admin-header .language-switch select")
        .selectOption(language);
      for (const width of [
        320, 360, 390, 480, 768, 1024, 1200, 1280, 1440, 1920,
      ]) {
        await page.setViewportSize({ width, height: 1000 });
        await owner.setViewportSize({ width, height: 1000 });
        for (const route of [
          "/",
          "/mobiles",
          "/second-hand",
          "/accessories",
          "/help",
          "/repair",
          "/cart",
          "/my-orders",
        ]) {
          await page.goto(base + route);
          await page.locator(".site-header").waitFor();
          await page.waitForTimeout(70);
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          );
          assert.equal(
            overflow,
            false,
            `${language} ${width} ${route} overflow`,
          );
          if (
            width < 1200 &&
            ["/mobiles", "/second-hand", "/accessories"].includes(route)
          )
            assert.equal(
              await page
                .locator('input[type="search"],#header-query,#catalogue-search')
                .filter({ visible: true })
                .count(),
              1,
            );
        }
        assert.equal(
          await owner.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
          `admin ${width} overflow`,
        );
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/mobiles");
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".product-card img")]
        .slice(0, 1)
        .every((img) => img.complete && img.naturalWidth > 0),
    );
    await page.screenshot({
      path: "qa-results/nepali-catalogue-mobile.png",
      fullPage: false,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: "qa-results/nepali-catalogue-desktop.png",
      fullPage: false,
    });
    await owner.setViewportSize({ width: 1440, height: 1000 });
    await owner.evaluate(() => window.scrollTo(0, 0));
    await owner.screenshot({
      path: "qa-results/nepali-admin-desktop.png",
      fullPage: false,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: bilingual forms, Nepali digits, order lifecycle, intentional close actions, dirty drafts, quick stock, order search and 160 customer layout cases.",
    );
  } finally {
    await browser.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
