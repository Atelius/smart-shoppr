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

function nameToVtexSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
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
        const nameEl      = card.querySelector("[class*='productNameContainer']");
        const priceEl     = card.querySelector("div.price-shelf");
        const imgContainer = card.querySelector("[class*='imageContainer']");
        const imgEl       = imgContainer?.querySelector("img");

        const rawPrice = priceEl?.textContent?.replace(/[^0-9.]/g, "") ?? "0";
        const name     = nameEl?.textContent?.trim() ?? "Sin nombre";

        // Try to get the real product URL from the <a> data attributes or href
        // VTEX renders links via JS — capture from window.__RUNTIME__ or data attrs
        const linkEl = card.querySelector("a[href*='/p']") ??
                       card.querySelector("a[href]");
        const href   = linkEl?.getAttribute("href") ?? "";
        const fullLink = href.startsWith("http")
          ? href
          : href
            ? `https://www.heb.com.mx${href}`
            : "";

        return {
          name,
          price:    parseFloat(rawPrice) || 0,
          imageUrl: imgEl?.getAttribute("src") ?? imgEl?.getAttribute("data-src") ?? "",
          rawLink:  fullLink,
        };
      });
    });

    // Also intercept navigation clicks to capture real VTEX URLs
    // by reading the __RUNTIME__ store data if available
    const vtexData = await page.evaluate(() => {
      try {
        const runtime = (window as any).__RUNTIME__;
        if (!runtime?.store?.products) return null;
        return Object.values(runtime.store.products).slice(0, 5).map((p: any) => ({
          name:     p.productName ?? p.name ?? "",
          price:    p.priceRange?.sellingPrice?.highPrice ?? p.items?.[0]?.sellers?.[0]?.commertialOffer?.Price ?? 0,
          imageUrl: p.items?.[0]?.images?.[0]?.imageUrl ?? "",
          link:     `https://www.heb.com.mx/${p.linkText ?? ""}/p`,
        }));
      } catch { return null; }
    });

    if (vtexData && vtexData.length > 0) {
      // Use VTEX runtime data — has real links and images
      for (const p of vtexData) {
        if (p.price > 0) {
          results.push({ store: "HEB", name: p.name, price: p.price, link: p.link, imageUrl: p.imageUrl });
        }
      }
    } else {
      // Fallback: use DOM-scraped data with slug-generated link
      for (const item of items) {
        if (item.price > 0) {
          const link = item.rawLink || `https://www.heb.com.mx/${nameToVtexSlug(item.name)}/p`;
          results.push({ store: "HEB", name: item.name, price: item.price, link, imageUrl: item.imageUrl });
        }
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
