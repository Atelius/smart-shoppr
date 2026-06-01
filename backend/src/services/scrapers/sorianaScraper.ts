import { chromium } from "playwright";
import { ProductResult } from "./hebScraper";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function sorianaScraper(query: string): Promise<ProductResult[]> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "es-MX",
    extraHTTPHeaders: {
      "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();
  const results: ProductResult[] = [];

  try {
    const searchUrl = `https://www.soriana.com/buscar?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    await page.waitForSelector(
      ".product-grid-item, [class*='product-card'], [class*='ProductCard'], .product-tile",
      { timeout: 15000 }
    ).catch(() => null);

    const items = await page.evaluate(() => {
      const cards = document.querySelectorAll(
        ".product-grid-item, [class*='product-card'], [class*='ProductCard'], .product-tile, [class*='product-item']"
      );

      return Array.from(cards)
        .slice(0, 5)
        .map((card) => {
          const nameEl =
            card.querySelector(".product-name, [class*='name'], [class*='title'], h2, h3") ||
            card.querySelector("a");
          const priceEl = card.querySelector(
            ".price-sales, [class*='price-sales'], [class*='price']:not([class*='old'])"
          );
          const linkEl = card.querySelector("a");
          const imgEl = card.querySelector("img");

          const rawPrice =
            priceEl?.textContent?.replace(/[^0-9.]/g, "") ??
            card.querySelector("[class*='price']")?.textContent?.replace(/[^0-9.]/g, "") ??
            "0";

          const href = linkEl?.getAttribute("href") ?? "";
          const fullLink = href.startsWith("http") ? href : `https://www.soriana.com${href}`;

          return {
            name: nameEl?.textContent?.trim() ?? "Sin nombre",
            price: parseFloat(rawPrice) || 0,
            link: fullLink,
            imageUrl: imgEl?.getAttribute("src") ?? imgEl?.getAttribute("data-src") ?? "",
          };
        });
    });

    for (const item of items) {
      if (item.price > 0) {
        results.push({ store: "Soriana", ...item });
      }
    }
  } catch (err) {
    console.error("[Soriana] Error scraping:", err);
  } finally {
    await browser.close();
  }

  return results;
}
