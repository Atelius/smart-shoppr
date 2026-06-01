import { ProductResult } from "./hebScraper";

// Sam's Club MX is owned by Walmart and shares their API infrastructure.
// We query the Walmart MX search API which is publicly accessible without bot protection.
export async function samsScraper(query: string): Promise<ProductResult[]> {
  const results: ProductResult[] = [];

  try {
    // Walmart MX API — same backend as Sam's Club MX
    const url = `https://www.walmart.com.mx/api/2.0/page/category/search/${encodeURIComponent(query)}?currentPage=0&pageSize=5&selectedCategory=Todos%20los%20departamentos`;

    console.log(`[Sam's] Llamando Walmart API: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "es-MX,es;q=0.9",
        "Referer": "https://www.walmart.com.mx/",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();

    // Log raw structure to help debug shape
    console.log(`[Sam's] API keys:`, Object.keys(json).join(", "));

    const products: any[] =
      json?.products ??
      json?.searchData?.products ??
      json?.data?.products ??
      json?.items ??
      [];

    console.log(`[Sam's] Productos en respuesta: ${products.length}`);

    for (const p of products.slice(0, 5)) {
      const price =
        parseFloat(p?.priceInfo?.currentPrice) ||
        parseFloat(p?.price?.current) ||
        parseFloat(p?.finalPrice) ||
        parseFloat(p?.salePrice) ||
        0;

      if (price === 0) continue;

      const name: string = p?.name ?? p?.displayName ?? p?.title ?? "Sin nombre";
      const slug: string = p?.canonicalUrl ?? p?.seoUrl ?? p?.slug ?? p?.productUrl ?? "";
      const link = slug.startsWith("http")
        ? slug
        : `https://www.walmart.com.mx${slug.startsWith("/") ? "" : "/"}${slug}`;
      const imageUrl: string =
        p?.imageInfo?.thumbnailUrl ??
        p?.images?.[0]?.url ??
        p?.primaryImage ??
        p?.imageUrl ??
        "";

      results.push({ store: "Walmart", name, price, link, imageUrl });
    }

    console.log(`[Sam's→Walmart] Encontrados: ${results.length} productos`);
  } catch (err) {
    console.error("[Sam's→Walmart] Error:", err);
  }

  return results;
}