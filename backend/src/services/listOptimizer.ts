import { searchEngine, SearchResults } from "./searchEngine";
import { ProductResult } from "./scrapers/hebScraper";
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

function classifyProduct(name: string): string {
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

// Now includes full product details per store — powers the carousel
export interface StoreOption {
  store: string;
  price: number;
  name: string;
  imageUrl: string;
  link: string;
}

export interface OptimalItem {
  query: string;
  category: string;
  bestOption: ProductResult | null;
  // All results grouped by store (full details for carousel)
  optionsByStore: Record<string, ProductResult[]>;
  // Selected override: user can pin a specific product
  selectedKey: string | null; // format: "store::productName"
}

export interface OptimizationResult {
  query: string[];
  storeTotals: StoreTotal[];
  optimalRoute: {
    items: OptimalItem[];
    grandTotal: number;
    totalSavings: number;
    byCategory: Record<string, OptimalItem[]>;
  };
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
      const match = results.filter((r) => r.store === store).sort((a, b) => a.price - b.price)[0];
      if (match) { total += match.price; availableCount++; }
      else unavailableItems.push(query);
    }

    return { store, total: Math.round(total * 100) / 100, availableCount, unavailableItems };
  });
}

function buildOptimalRoute(
  itemResults: { query: string; results: ProductResult[] }[]
): OptimalItem[] {
  return itemResults.map(({ query, results }) => {
    const category = classifyProduct(query);

    // Group all results by store
    const optionsByStore: Record<string, ProductResult[]> = {};
    for (const r of results) {
      if (!optionsByStore[r.store]) optionsByStore[r.store] = [];
      optionsByStore[r.store].push(r);
    }

    // Best = cheapest across all stores
    const best = results.length > 0
      ? results.reduce((a, b) => (a.price < b.price ? a : b))
      : null;

    return { query, category, bestOption: best, optionsByStore, selectedKey: null };
  });
}

async function savePriceHistory(
  itemResults: { query: string; results: ProductResult[] }[]
): Promise<void> {
  try {
    for (const { query, results } of itemResults) {
      if (results.length === 0) continue;
      const category = classifyProduct(query);
      const product = await prisma.product.upsert({
        where: { name: query }, update: {},
        create: { name: query, category },
      });
      for (const r of results) {
        const store = await prisma.store.upsert({
          where: { name: r.store }, update: {},
          create: { name: r.store },
        });
        await prisma.priceHistory.create({
          data: { productId: product.id, storeId: store.id, price: r.price, isAvailable: true },
        });
      }
    }
    console.log("[DB] Precios guardados en PriceHistory");
  } catch (err) {
    console.error("[DB] Error guardando precios:", err);
  }
}

export async function optimizeList(items: string[]): Promise<OptimizationResult> {
  const startTime = Date.now();
  console.log(`[Optimizer] Comparando ${items.length} productos...`);

  const itemResults = await Promise.all(
    items.map((item) =>
      searchEngine(item).then((r: SearchResults) => ({ query: item, results: r.results }))
    )
  );

  const storeTotals  = buildStoreTotals(itemResults);
  const optimalItems = buildOptimalRoute(itemResults);

  const grandTotal = Math.round(
    optimalItems.reduce((sum, item) => sum + (item.bestOption?.price ?? 0), 0) * 100
  ) / 100;

  const maxStoreTotal = Math.max(
    ...storeTotals.filter((s) => s.availableCount > 0).map((s) => s.total), 0
  );
  const totalSavings = Math.round((maxStoreTotal - grandTotal) * 100) / 100;

  const byCategory: Record<string, OptimalItem[]> = {};
  for (const item of optimalItems) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  savePriceHistory(itemResults);

  return {
    query: items,
    storeTotals,
    optimalRoute: { items: optimalItems, grandTotal, totalSavings, byCategory },
    executionTimeMs: Date.now() - startTime,
  };
}
