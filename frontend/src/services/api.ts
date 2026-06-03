const BASE_URL = "http://localhost:3001";

export interface ProductResult {
  store: string;
  name: string;
  price: number;
  link: string;
  imageUrl: string;
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

export interface ManualItem {
  name: string;
  store: string;
  price: number;
}

export interface CompareResult {
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

export interface PriceHistoryPoint {
  scrapedAt: string;
  price: number;
  store: { name: string };
  product: { name: string };
}

export async function compareList(
  items: string[],
  force: string[] = [],
  manualItems: ManualItem[] = []
): Promise<CompareResult> {
  const res = await fetch(`${BASE_URL}/api/lists/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, force, manualItems }),
  });
  if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function saveList(name: string, items: string[]): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/lists/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, items }),
  });
  if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
}

export async function getPriceHistory(productName: string): Promise<PriceHistoryPoint[]> {
  const res = await fetch(
    `${BASE_URL}/api/metrics/history?product=${encodeURIComponent(productName)}`
  );
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function flushCache(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/lists/flush-cache`, { method: "POST" });
  if (!res.ok) throw new Error(`Error ${res.status}`);
}
