const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:8770";
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
  const go = async (route) => {
    await page.goto(base + route);
    await page.locator(".site-header").waitFor();
    await page.evaluate(() => document.fonts.ready);
  };
  async function fits() {
    const width = await page.evaluate(() => ({
      viewport: innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(width.content <= width.viewport + 1, JSON.stringify(width));
  }
  try {
    fs.mkdirSync("qa-results", { recursive: true });
    await go("/");
    assert.equal(
      await page
        .locator(
          ".product-card,.home-shop-sidebar,.reference-services,.prototype-banner",
        )
        .count(),
      0,
    );
    assert.equal(
      await page.getByText("Shop by budget", { exact: true }).count(),
      0,
    );
    assert.equal(await page.locator(".reference-main-nav a").count(), 6);
    assert.equal(await page.locator(".floating-whatsapp").textContent(), "");
    for (const width of [1200, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      await fits();
      const positions = await page
        .locator(
          ".site-header .brand,.reference-main-nav,.shop-header-search,.nav-tools",
        )
        .evaluateAll((elements) =>
          elements.map((element) => {
            const r = element.getBoundingClientRect();
            return { x: r.x, right: r.right, center: r.y + r.height / 2 };
          }),
        );
      assert.ok(
        Math.max(...positions.map((p) => p.center)) -
          Math.min(...positions.map((p) => p.center)) <
          3,
        "Desktop header is not one row",
      );
      for (let index = 1; index < positions.length; index++)
        assert.ok(
          positions[index].x >= positions[index - 1].right - 1,
          "Desktop header overlaps",
        );
      const size = await page.locator(".hero-copy .button").boundingBox();
      assert.ok(
        size.height >= 36 && size.height <= 44,
        "Desktop hero button is too big",
      );
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: "qa-results/refined-home-desktop.png" });
    await page
      .getByLabel("Search all products", { exact: true })
      .fill("charger");
    await page
      .getByRole("button", { name: "Search the shop", exact: true })
      .click();
    await page.waitForURL("**/search?q=charger");
    assert.ok(await page.locator(".product-card").count());
    for (const [route, label, value] of [
      ["/mobiles", "Brand", "Samsung"],
      ["/second-hand", "Condition", "Like New"],
      ["/accessories", "Accessory category", "Chargers"],
    ]) {
      await go(route);
      const total = await page.locator(".product-card").count();
      const addButton = await page.locator(".add-button").first().boundingBox();
      assert.ok(
        addButton.height >= 36 && addButton.height <= 44,
        "Desktop catalogue button is too tall",
      );
      assert.equal(await page.locator(".page-intro").count(), 0);
      assert.ok(await page.locator(".catalogue-photo-banner img").isVisible());
      assert.ok(await page.locator("#product-filters").isHidden());
      const search = await page
        .locator(".catalogue-controls .search-input")
        .boundingBox();
      const button = await page
        .getByRole("button", { name: "Filter", exact: true })
        .boundingBox();
      assert.ok(
        Math.abs(search.y - button.y) < 3 && button.x > search.x,
        "Filter must be beside search",
      );
      await page.getByRole("button", { name: "Filter", exact: true }).click();
      await page.getByLabel(label, { exact: true }).selectOption(value);
      const filtered = await page.locator(".product-card").count();
      assert.ok(
        filtered > 0 && filtered < total,
        "Category filter did not narrow results",
      );
      await page
        .getByRole("button", {
          name: `Show ${filtered} ${filtered === 1 ? "product" : "products"}`,
          exact: true,
        })
        .click();
      assert.ok(await page.locator("#product-filters").isHidden());
      assert.equal(await page.locator(".product-card").count(), filtered);
      await page.getByRole("button", { name: "Filter", exact: true }).click();
      await page.keyboard.press("Escape");
      assert.ok(
        await page
          .getByRole("button", { name: "Filter", exact: true })
          .evaluate((element) => element === document.activeElement),
      );
      await page
        .getByRole("button", { name: "Clear all", exact: true })
        .click();
      assert.equal(await page.locator(".product-card").count(), total);
    }
    await go("/mobiles?q=Samsung");
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page
      .getByLabel("Maximum price", { exact: true })
      .selectOption("50000");
    await page
      .getByRole("button", { name: "Close filters", exact: true })
      .click();
    const beforeUrl = page.url();
    const beforeCount = await page.locator(".product-card").count();
    await page
      .getByRole("button", { name: "Customer login", exact: true })
      .click();
    let dialog = page.getByRole("dialog", {
      name: "Customer login",
      exact: true,
    });
    await dialog.waitFor();
    assert.equal(page.url(), beforeUrl);
    assert.ok(
      await page
        .locator(".account-dialog")
        .evaluate((element) => element.matches(":modal")),
    );
    for (let index = 0; index < 12; index++) {
      await page.keyboard.press("Tab");
      assert.ok(
        await page.evaluate(() => !!document.activeElement.closest("dialog")),
        "Focus escaped modal",
      );
    }
    await page.screenshot({ path: "qa-results/login-overlay-desktop.png" });
    await page.keyboard.press("Escape");
    assert.ok(await page.locator(".account-dialog").isHidden());
    assert.ok(
      await page
        .getByRole("button", { name: "Customer login", exact: true })
        .evaluate((element) => element === document.activeElement),
    );
    assert.equal(await page.locator(".product-card").count(), beforeCount);
    await page
      .getByRole("button", { name: "Customer login", exact: true })
      .click();
    await page.mouse.click(5, 5);
    assert.ok(await page.locator(".account-dialog").isHidden());
    await page
      .getByRole("button", { name: "Customer login", exact: true })
      .click();
    const phone = "98" + String(Date.now()).slice(-8);
    async function codeLogin() {
      const overlay = page.locator(".account-dialog");
      await overlay.getByLabel("Nepal mobile number").fill(phone);
      await overlay
        .getByRole("button", { name: "Get test code", exact: true })
        .click();
      await overlay.locator(".account-demo-code strong").waitFor();
      await overlay
        .getByLabel("Verification code")
        .fill(await overlay.locator(".account-demo-code strong").textContent());
      await overlay
        .getByRole("button", { name: "Verify and log in", exact: true })
        .click();
    }
    await codeLogin();
    dialog = page.locator(".account-dialog");
    await dialog.getByLabel("Full name").fill("Overlay Test Customer");
    await dialog.getByLabel("Email address").fill("overlay-test@example.com");
    await dialog
      .getByRole("button", { name: "Save and continue", exact: true })
      .click();
    await page.locator(".account-dialog").waitFor({ state: "detached" });
    assert.equal(page.url(), beforeUrl);
    assert.equal(await page.locator(".product-card").count(), beforeCount);
    await page.getByRole("button", { name: "My account", exact: true }).click();
    await page
      .getByRole("dialog", { name: "My account", exact: true })
      .getByRole("button", { name: "Log out", exact: true })
      .click();
    assert.ok(
      await page
        .locator(".account-dialog")
        .getByLabel("Nepal mobile number")
        .isVisible(),
      "Logout should reset login challenge",
    );
    await codeLogin();
    await page.locator(".account-dialog").waitFor({ state: "detached" });
    assert.equal(page.url(), beforeUrl);
    await go("/contact");
    for (const name of [
      "Contact & Help",
      "Phone repair",
      "Digital meter repair",
    ])
      await page.getByRole("heading", { name, exact: true }).waitFor();
    assert.ok(
      (await page.locator(".contact-layout").textContent()).includes(
        "8 AM–6 PM",
      ),
    );
    await go("/mobile-repair");
    await page.waitForURL("**/contact#phone-repairs");
    await go("/digital-meter-repair");
    await page.waitForURL("**/contact#digital-meter-repairs");
    for (const width of [320, 360, 390, 650, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "/",
        "/mobiles",
        "/second-hand",
        "/accessories",
        "/contact",
      ]) {
        await go(route);
        await fits();
      }
      await go("/mobiles");
      await page.getByRole("button", { name: "Filter", exact: true }).click();
      await fits();
      if (width < 768) {
        const controls = await page
          .locator(
            ".catalogue-filter-panel select,.catalogue-filter-button,.menu-button",
          )
          .evaluateAll((elements) =>
            elements.map((element) => element.getBoundingClientRect().height),
          );
        assert.ok(
          controls.every((height) => height >= 44),
          "Mobile filter controls are too small",
        );
        await page
          .getByRole("button", { name: "Close filters", exact: true })
          .click();
        await page
          .getByRole("navigation", { name: "Quick navigation" })
          .getByRole("button", { name: "Account", exact: true })
          .click();
      } else
        await page
          .getByRole("button", { name: "My account", exact: true })
          .click();
      await page.locator(".account-dialog").waitFor();
      const modal = await page
        .locator(".account-dialog")
        .evaluate((element) => {
          const r = element.getBoundingClientRect();
          return {
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
            width: innerWidth,
            height: innerHeight,
            scroll: element.scrollWidth,
            client: element.clientWidth,
          };
        });
      assert.ok(
        modal.left >= 0 &&
          modal.right <= modal.width &&
          modal.top >= 0 &&
          modal.bottom <= modal.height &&
          modal.scroll <= modal.client + 1,
        `Modal overflow: ${JSON.stringify(modal)}`,
      );
      await page
        .getByRole("button", { name: "Close account window", exact: true })
        .click();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await go("/");
    await page.screenshot({
      path: "qa-results/refined-home-mobile.png",
      fullPage: true,
    });
    await page
      .getByRole("navigation", { name: "Quick navigation" })
      .getByRole("button", { name: "Account", exact: true })
      .click();
    await page.screenshot({ path: "qa-results/account-overlay-mobile.png" });
    await page
      .getByRole("button", { name: "Close account window", exact: true })
      .click();
    await go("/mobiles");
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.screenshot({ path: "qa-results/refined-filters-mobile.png" });
    assert.deepEqual(errors, []);
    const result = {
      passed: true,
      desktopSingleRow: true,
      compactDesktopControls: true,
      homepageBannersOnly: true,
      categoryFilterPanels: true,
      combinedContactHelp: true,
      loginOverlayPreservesRouteAndFilters: true,
      modalFocusEscapeBackdropAndProfileFlow: true,
      responsiveWidths: [320, 360, 390, 650, 768, 1024, 1280, 1440, 1920],
      pageErrors: errors,
      messagingDisabled: true,
    };
    fs.writeFileSync(
      "qa-results/ui-refinement-checks.json",
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
