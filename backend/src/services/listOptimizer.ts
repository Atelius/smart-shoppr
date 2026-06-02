import { searchEngine, SearchResults } from "./searchEngine";
import { ProductResult } from "./scrapers/hebScraper";
import { flushCacheToHistory } from "./cacheService";
import prisma from "../prismaClient";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Lácteos":           ["leche", "yogurt", "queso", "crema", "mantequilla", "jocoque", "kefir"],
  "Carnes":            ["pollo", "carne", "res", "cerdo", "jamón", "salchicha", "chorizo", "atún", "sardina"],
  "Frutas y Verduras": ["manzana", "naranja", "plátano", "tomate", "cebolla", "papa", "lechuga", "zanahoria", "limón"],
  "Panadería":         ["pan", "tortilla", "galleta", "pastel", "dona"],
  "Bebidas":           ["agua", "refresco", "jugo", "café", "té", "cerveza", "vino", "bebida"],
  "Limpieza":          ["detergente", "jabón", "cloro", "ariel", "suavitel", "fabuloso", "pinol", "ajax"],
  "Cuidado Personal":  ["shampoo", "acondicionador", "desodorante", "pasta dental", "cepillo", "papel higienico", "toalla"],
  "Abarrotes":         ["arroz", "frijol", "azucar", "sal", "aceite", "harina", "pasta", "sopa", "avena"],
  "Snacks":            ["papas", "frituras", "palomitas", "chocolate", "dulce", "cacahuate"],
  "Congelados":        ["helado", "pizza", "nuggets", "congelado", "paleta"],
};

export function classifyProduct(name: string): string {
  const lower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "Otros";
}

export interface StoreTotal {
  store: string;
  total: number;
  availableCount: number;
  unavailableItems: string[];
}

export interface OptimalItem {
  query: string;
  category: string;
  bestOption: ProductResult | null;
  optionsByStore: Record<string, ProductResult[]>;
  fromCache: boolean;
  selectedKey: string | null;
}

export interface OptimizationResult {
  query: string[];
  storeTotals: StoreTotal[];
  optimalRoute: {
    items: OptimalItem[];
    grandTotal: number;
    totalSavings: number;
    byCategory: Record<string, OptimalItem[]>;
    byStore: Record<string, OptimalItem[]>;   // ← NEW: grouped by store
  };
  cacheStats: { fromCache: number; scraped: number };
  executionTimeMs: number;
}

const ACTIVE_STORES = ["HEB", "Soriana"];

function buildStoreTotals(
  itemResults: { query: string; results: ProductResult[] }[]
): StoreTotal[] {
  return ACTIVE_STORES.map((store) => {
    let total = 0;
    const unavailableItems: string[] = [];
    let availableCount = 0;

    for (const { query, results } of itemResults) {
      const match = results
        .filter((r) => r.store === store)
        .sort((a, b) => a.price - b.price)[0];
      if (match) { total += match.price; availableCount++; }
      else unavailableItems.push(query);
    }

    return { store, total: Math.round(total * 100) / 100, availableCount, unavailableItems };
  });
}

function buildOptimalItems(
  itemResults: { query: string; results: ProductResult[]; fromCache: boolean }[]
): OptimalItem[] {
  return itemResults.map(({ query, results, fromCache }) => {
    const category = classifyProduct(query);

    const optionsByStore: Record<string, ProductResult[]> = {};
    for (const r of results) {
      if (!optionsByStore[r.store]) optionsByStore[r.store] = [];
      optionsByStore[r.store].push(r);
    }

    const best = results.length > 0
      ? results.reduce((a, b) => (a.price < b.price ? a : b))
      : null;

    return { query, category, bestOption: best, optionsByStore, fromCache, selectedKey: null };
  });
}

export async function optimizeList(
  items: string[],
  forceItems: string[] = []   // specific items to force-refresh
): Promise<OptimizationResult> {
  const startTime = Date.now();
  console.log(`[Optimizer] Comparando ${items.length} productos...`);

  const itemResults = await Promise.all(
    items.map(async (item) => {
      const force = forceItems.includes(item);
      const r: SearchResults = await searchEngine(item, force);
      return { query: item, results: r.results, fromCache: r.fromCache };
    })
  );

  const cacheStats = {
    fromCache: itemResults.filter((r) => r.fromCache).length,
    scraped:   itemResults.filter((r) => !r.fromCache).length,
  };

  const storeTotals  = buildStoreTotals(itemResults);
  const optimalItems = buildOptimalItems(itemResults);

  const grandTotal = Math.round(
    optimalItems.reduce((sum, item) => sum + (item.bestOption?.price ?? 0), 0) * 100
  ) / 100;

  const maxStoreTotal = Math.max(
    ...storeTotals.filter((s) => s.availableCount > 0).map((s) => s.total), 0
  );
  const totalSavings = Math.round((maxStoreTotal - grandTotal) * 100) / 100;

  // Group by category
  const byCategory: Record<string, OptimalItem[]> = {};
  for (const item of optimalItems) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  // Group by store (optimal route: only items where this store is cheapest)
  const byStore: Record<string, OptimalItem[]> = {};
  for (const store of ACTIVE_STORES) byStore[store] = [];
  byStore["Sin disponibilidad"] = [];

  for (const item of optimalItems) {
    if (!item.bestOption) {
      byStore["Sin disponibilidad"].push(item);
    } else {
      if (!byStore[item.bestOption.store]) byStore[item.bestOption.store] = [];
      byStore[item.bestOption.store].push(item);
    }
  }
  // Remove empty store groups
  for (const store of Object.keys(byStore)) {
    if (byStore[store].length === 0) delete byStore[store];
  }

  console.log(`[Optimizer] Cache: ${cacheStats.fromCache} hits, ${cacheStats.scraped} scraped`);

  return {
    query: items,
    storeTotals,
    optimalRoute: { items: optimalItems, grandTotal, totalSavings, byCategory, byStore },
    cacheStats,
    executionTimeMs: Date.now() - startTime,
  };
}

export { flushCacheToHistory };
