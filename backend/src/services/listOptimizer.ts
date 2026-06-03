import { searchEngine, SearchResults } from "./searchEngine";
import { ProductResult } from "./scrapers/hebScraper";
import { flushCacheToHistory } from "./cacheService";
import prisma from "../prismaClient";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Lácteos":           ["leche", "yogurt", "queso", "crema", "mantequilla", "jocoque", "kefir", "dairy", "milk", "cheese", "乳", "牛乳"],
  "Carnes":            ["pollo", "carne", "res", "cerdo", "jamón", "salchicha", "chorizo", "atún", "sardina", "chicken", "meat", "肉"],
  "Frutas y Verduras": ["manzana", "naranja", "plátano", "tomate", "cebolla", "papa", "lechuga", "zanahoria", "limón", "apple", "vegetable", "野菜"],
  "Panadería":         ["pan", "tortilla", "galleta", "pastel", "dona", "bread", "cookie", "パン"],
  "Bebidas":           ["agua", "refresco", "jugo", "café", "té", "cerveza", "vino", "bebida", "water", "juice", "飲料"],
  "Limpieza":          ["detergente", "jabón", "cloro", "ariel", "suavitel", "fabuloso", "pinol", "ajax", "soap", "bleach", "洗剤"],
  "Cuidado Personal":  ["shampoo", "acondicionador", "desodorante", "pasta dental", "cepillo", "papel higienico", "toalla", "シャンプー"],
  "Abarrotes":         ["arroz", "frijol", "azucar", "sal", "aceite", "harina", "pasta", "sopa", "avena", "rice", "oil", "米"],
  "Snacks":            ["papas", "frituras", "palomitas", "chocolate", "dulce", "cacahuate", "chips", "スナック"],
  "Congelados":        ["helado", "pizza", "nuggets", "congelado", "paleta", "frozen", "冷凍"],
};

export function classifyProduct(name: string): string {
  const lower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "Otros";
}

export interface ManualItemInput {
  name: string;
  store: string;
  price: number;
}

export interface StoreTotal {
  store: string;
  total: number;
  availableCount: number;
  unavailableItems: string[];
  isManualStore?: boolean;
}

export interface OptimalItem {
  query: string;
  category: string;
  bestOption: ProductResult | null;
  optionsByStore: Record<string, ProductResult[]>;
  fromCache: boolean;
  isManual: boolean;
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
    byStore: Record<string, OptimalItem[]>;
  };
  cacheStats: { fromCache: number; scraped: number; manual: number };
  executionTimeMs: number;
}

const ACTIVE_STORES = ["HEB", "Soriana"];
const OTHERS_GROUP  = "Otros";

function buildStoreTotals(
  itemResults: { query: string; results: ProductResult[]; isManual: boolean }[]
): StoreTotal[] {
  // Scraped stores
  const scraped = ACTIVE_STORES.map((store) => {
    let total = 0;
    const unavailableItems: string[] = [];
    let availableCount = 0;
    for (const { query, results, isManual } of itemResults) {
      if (isManual) continue;
      const match = results.filter((r) => r.store === store).sort((a, b) => a.price - b.price)[0];
      if (match) { total += match.price; availableCount++; }
      else unavailableItems.push(query);
    }
    return { store, total: Math.round(total * 100) / 100, availableCount, unavailableItems, isManualStore: false };
  });

  // Manual stores grouped as "Otros"
  const manualItems = itemResults.filter((r) => r.isManual);
  if (manualItems.length > 0) {
    const total = manualItems.reduce((s, r) => s + (r.results[0]?.price ?? 0), 0);
    scraped.push({
      store: OTHERS_GROUP,
      total: Math.round(total * 100) / 100,
      availableCount: manualItems.length,
      unavailableItems: [],
      isManualStore: true,
    });
  }

  return scraped;
}

function buildOptimalItems(
  itemResults: { query: string; results: ProductResult[]; fromCache: boolean; isManual: boolean }[]
): OptimalItem[] {
  return itemResults.map(({ query, results, fromCache, isManual }) => {
    const category = classifyProduct(query);

    const optionsByStore: Record<string, ProductResult[]> = {};
    for (const r of results) {
      if (!optionsByStore[r.store]) optionsByStore[r.store] = [];
      optionsByStore[r.store].push(r);
    }

    const best = results.length > 0
      ? results.reduce((a, b) => (a.price < b.price ? a : b))
      : null;

    return { query, category, bestOption: best, optionsByStore, fromCache, isManual, selectedKey: null };
  });
}

export async function optimizeList(
  items: string[],
  forceItems: string[] = [],
  manualItems: ManualItemInput[] = []
): Promise<OptimizationResult> {
  const startTime = Date.now();
  console.log(`[Optimizer] ${items.length} scrapeados + ${manualItems.length} manuales`);

  // Scrape items in parallel
  const scrapedResults = await Promise.all(
    items.map(async (item) => {
      const force = forceItems.includes(item);
      const r: SearchResults = await searchEngine(item, force);
      return { query: item, results: r.results, fromCache: r.fromCache, isManual: false };
    })
  );

  // Convert manual items to same shape as scraped results
  const manualResults = manualItems.map((m) => ({
    query: m.name.trim().toLowerCase(),
    results: [{
      store:    m.store.trim(),
      name:     m.name.trim(),
      price:    m.price,
      link:     "",
      imageUrl: "",
    }] as ProductResult[],
    fromCache: false,
    isManual:  true,
  }));

  const allResults = [...scrapedResults, ...manualResults];

  const cacheStats = {
    fromCache: scrapedResults.filter((r) => r.fromCache).length,
    scraped:   scrapedResults.filter((r) => !r.fromCache).length,
    manual:    manualResults.length,
  };

  const storeTotals  = buildStoreTotals(allResults);
  const optimalItems = buildOptimalItems(allResults);

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

  // Group by store (optimal route)
  const byStore: Record<string, OptimalItem[]> = {};
  for (const item of optimalItems) {
    const storeName = item.isManual
      ? OTHERS_GROUP
      : (item.bestOption?.store ?? "Sin disponibilidad");
    if (!byStore[storeName]) byStore[storeName] = [];
    byStore[storeName].push(item);
  }
  // Remove empty groups
  for (const s of Object.keys(byStore)) {
    if (byStore[s].length === 0) delete byStore[s];
  }

  console.log(`[Optimizer] Cache: ${cacheStats.fromCache} hits, ${cacheStats.scraped} scraped, ${cacheStats.manual} manual`);

  return {
    query: [...items, ...manualItems.map((m) => m.name)],
    storeTotals,
    optimalRoute: { items: optimalItems, grandTotal, totalSavings, byCategory, byStore },
    cacheStats,
    executionTimeMs: Date.now() - startTime,
  };
}

export { flushCacheToHistory };
