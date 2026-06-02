import { hebScraper, ProductResult } from "./scrapers/hebScraper";
import { sorianaScraper } from "./scrapers/sorianaScraper";
import { getCached, setCached } from "./cacheService";

export interface SearchResults {
  query: string;
  totalFound: number;
  results: ProductResult[];
  errors: string[];
  executionTimeMs: number;
  fromCache: boolean;
}

// Returns true if the product name is relevant to the search query
function isRelevant(productName: string, query: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase()
     .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
     .replace(/[^a-z0-9\s]/g, "");

  const queryWords = normalize(query).split(/\s+/).filter((w) => w.length > 2);
  const name = normalize(productName);
  return queryWords.some((word) => name.includes(word));
}

export async function searchEngine(
  query: string,
  force = false
): Promise<SearchResults> {
  const startTime = Date.now();
  const errors: string[] = [];

  // ── Cache check ───────────────────────────────────────────
  if (!force) {
    const cached = await getCached(query);
    if (cached) {
      return {
        query,
        totalFound: cached.length,
        results: cached,
        errors: [],
        executionTimeMs: Date.now() - startTime,
        fromCache: true,
      };
    }
  } else {
    console.log(`[SearchEngine] Forzando scraping para "${query}"`);
  }

  // ── Live scraping ─────────────────────────────────────────
  console.log(`[SearchEngine] Scraping en vivo para: "${query}"`);

  const [hebResult, sorianaResult] = await Promise.allSettled([
    hebScraper(query),
    sorianaScraper(query),
  ]);

  const allResults: ProductResult[] = [];

  if (hebResult.status === "fulfilled") {
    const relevant = hebResult.value.filter((r) => isRelevant(r.name, query));
    allResults.push(...relevant);
    console.log(`[SearchEngine] HEB: ${hebResult.value.length} → ${relevant.length} relevantes`);
  } else {
    const msg = `HEB falló: ${hebResult.reason?.message ?? "Error desconocido"}`;
    errors.push(msg);
    console.error(`[SearchEngine] ${msg}`);
  }

  if (sorianaResult.status === "fulfilled") {
    const relevant = sorianaResult.value.filter((r) => isRelevant(r.name, query));
    allResults.push(...relevant);
    console.log(`[SearchEngine] Soriana: ${sorianaResult.value.length} → ${relevant.length} relevantes`);
  } else {
    const msg = `Soriana falló: ${sorianaResult.reason?.message ?? "Error desconocido"}`;
    errors.push(msg);
    console.error(`[SearchEngine] ${msg}`);
  }

  const sorted = allResults.sort((a, b) => a.price - b.price);

  // Save to cache (fire-and-forget)
  if (sorted.length > 0) {
    setCached(query, sorted);
  }

  const executionTimeMs = Date.now() - startTime;
  console.log(`[SearchEngine] Completado en ${executionTimeMs}ms. ${sorted.length} resultados.`);

  return {
    query,
    totalFound: sorted.length,
    results: sorted,
    errors,
    executionTimeMs,
    fromCache: false,
  };
}
