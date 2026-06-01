import { chromium } from "playwright";

export interface ProductResult {
  store: string;
  name: string;
  price: number;
  link: string;
  imageUrl: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// VTEX generates product URLs from the product name: "HCF Leche Entera 1 L" → "/hcf-leche-entera-1-l/p"
function nameToVtexSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export async function hebScraper(query: string): Promise<ProductResult[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "es-MX",
    extraHTTPHeaders: { "Accept-Language": "es-MX,es;q=0.9,en;q=0.8" },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();
  const results: ProductResult[] = [];

  try {
    const slug = query.toLowerCase().replace(/\s+/g, "-");
    const searchUrl = `https://www.heb.com.mx/${encodeURIComponent(slug)}?_q=${encodeURIComponent(query)}&map=ft`;

    console.log(`[HEB] Navegando a: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const items = await page.evaluate(() => {
      const cards = document.querySelectorAll("article.vtex-product-summary-2-x-element");

      return Array.from(cards).slice(0, 5).map((card) => {
        const nameEl = card.querySelector("[class*='productNameContainer']");
        const priceEl = card.querySelector("div.price-shelf");
        const imgContainer = card.querySelector("[class*='imageContainer']");
        const imgEl = imgContainer?.querySelector("img");

        const rawPrice = priceEl?.textContent?.replace(/[^0-9.]/g, "") ?? "0";
        const name = nameEl?.textContent?.trim() ?? "Sin nombre";

        return {
          name,
          price: parseFloat(rawPrice) || 0,
          imageUrl: imgEl?.getAttribute("src") ?? imgEl?.getAttribute("data-src") ?? "",
        };
      });
    });

    for (const item of items) {
      if (item.price > 0) {
        const slug = nameToVtexSlug(item.name);
        results.push({
          store: "HEB",
          ...item,
          link: `https://www.heb.com.mx/${slug}/p`,
        });
      }
    }

    console.log(`[HEB] Encontrados: ${results.length} productos`);
  } catch (err) {
    console.error("[HEB] Error scraping:", err);
  } finally {
    await browser.close();
  }

  return results;
}