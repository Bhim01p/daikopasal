const assert = require("node:assert/strict");
const { chromium } = require("C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const base = "http://127.0.0.1:8773";
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  try {
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await phone.goto(base + "/help");
    assert.equal(await phone.locator(".shop-header-search").count(), 0);
    await phone.goto(base + "/repair");
    assert.equal(await phone.locator(".shop-header-search").count(), 0);
    assert.equal(await phone.locator(".repair-section-photo").count(), 2);
    assert.equal(await phone.locator(".repair-section-photo").evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)), true);
    await phone.screenshot({ path: "qa-results/bugfix-repair-mobile.png" });

    const products = (await (await phone.request.get(base + "/api/products")).json()).products;
    const references = (await (await phone.request.get(base + "/api/reference-phones")).json()).phones;
    await phone.goto(base + `/compare?first=${products[0].id}&second=${references[0].id}`);
    await phone.locator(".comparison-table").waitFor();
    assert.equal(await phone.locator(".shop-header-search").count(), 0);
    const overflow = await phone.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll("body *")].filter((element) => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map((element) => ({ tag: element.tagName, className: element.className?.baseVal || element.className, right: Math.round(element.getBoundingClientRect().right) })) }));
    assert.equal(overflow.scrollWidth <= overflow.width, true, JSON.stringify(overflow));
    assert.equal(await phone.locator(".comparison-scroll").evaluate((element) => element.scrollWidth > element.clientWidth), true);
    await phone.screenshot({ path: "qa-results/bugfix-compare-mobile.png" });

    await phone.goto(base + `/product/${products[0].slug}`);
    await phone.getByRole("button", { name: "Add to cart", exact: true }).click();
    await phone.evaluate(() => localStorage.setItem("me-theme", "dark"));
    await phone.goto(base + "/cart");
    await phone.locator(".cart-item .quantity button").first().waitFor();
    const colors = await phone.locator(".cart-item .quantity button").last().evaluate((button) => ({ fg: getComputedStyle(button).color, bg: getComputedStyle(button).backgroundColor }));
    assert.notEqual(colors.fg, colors.bg);
    await phone.screenshot({ path: "qa-results/bugfix-cart-dark.png" });
    await phone.getByRole("link", { name: /Continue to checkout/i }).click();
    await phone.waitForURL("**/checkout");
    assert.equal(await phone.getByRole("heading", { name: /Customer details/i }).count(), 1);

    await phone.goto(base + "/login");
    const language = phone.locator(".login-language select");
    await language.waitFor();
    assert.equal(await language.isVisible(), true);
    const bounds = await language.boundingBox();
    const heading = await phone.locator(".account-heading h1").boundingBox();
    assert.ok(bounds.y + bounds.height <= heading.y);

    const delayed = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await delayed.route("**/api/products", async (route) => { await new Promise((resolve) => setTimeout(resolve, 2500)); await route.continue(); });
    await delayed.goto(base + "/help");
    await delayed.getByRole("heading", { name: "How can we help?" }).waitFor({ timeout: 1200 });
    await delayed.close();
    console.log("PASS: mobile compare width/table swipe, non-shop search, repair photos, dark cart buttons, checkout navigation, login language, and nonblocking Help load");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
