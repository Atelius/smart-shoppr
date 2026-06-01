import { hebScraper, ProductResult } from "./scrapers/hebScraper";
import { sorianaScraper } from "./scrapers/sorianaScraper";

export interface SearchResults {
  query: string;
  totalFound: number;
  results: ProductResult[];
  errors: string[];
  executionTimeMs: number;
}

// Returns true if the product name is relevant to the search query.
// Requires at least one word from the query to appear in the product name.
function isRelevant(productName: string, query: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase()
     .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
     .replace(/[^a-z0-9\s]/g, "");

  const queryWords = normalize(query).split(/\s+/).filter((w) => w.length > 2);
  const name = normalize(productName);

  // At least one meaningful query word must appear in the product name
  return queryWords.some((word) => name.includes(word));
}

export async function searchEngine(query: string): Promise<SearchResults> {
  const startTime = Date.now();
  const errors: string[] = [];

  console.log(`[SearchEngine] Buscando: "${query}"`);

  // Only HEB and Soriana — Sam's/Chedraui blocked by PerimeterX
  const [hebResult, sorianaResult] = await Promise.allSettled([
    hebScraper(query),
    sorianaScraper(query),
  ]);

  const allResults: ProductResult[] = [];

  if (hebResult.status === "fulfilled") {
    const relevant = hebResult.value.filter((r) => isRelevant(r.name, query));
    allResults.push(...relevant);
    console.log(`[SearchEngine] HEB: ${hebResult.value.length} resultados, ${relevant.length} relevantes`);
  } else {
    const msg = `HEB falló: ${hebResult.reason?.message ?? "Error desconocido"}`;
    errors.push(msg);
    console.error(`[SearchEngine] ${msg}`);
  }

  if (sorianaResult.status === "fulfilled") {
    const relevant = sorianaResult.value.filter((r) => isRelevant(r.name, query));
    allResults.push(...relevant);
    console.log(`[SearchEngine] Soriana: ${sorianaResult.value.length} resultados, ${relevant.length} relevantes`);
  } else {
    const msg = `Soriana falló: ${sorianaResult.reason?.message ?? "Error desconocido"}`;
    errors.push(msg);
    console.error(`[SearchEngine] ${msg}`);
  }

  const sorted = allResults.sort((a, b) => a.price - b.price);
  const executionTimeMs = Date.now() - startTime;

  console.log(`[SearchEngine] Completado en ${executionTimeMs}ms. ${sorted.length} productos relevantes.`);

  return {
    query,
    totalFound: sorted.length,
    results: sorted,
    errors,
    executionTimeMs,
  };
}
