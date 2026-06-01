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
}

export interface OptimalItem {
  query: string;
  category: string;
  bestOption: ProductResult | null;
  // Full results per store — powers the carousel
  optionsByStore: Record<string, ProductResult[]>;
  selectedKey: string | null;
}

export interface CompareResult {
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

export interface PriceHistoryPoint {
  scrapedAt: string;
  price: number;
  store: { name: string };
  product: { name: string };
}

export async function compareList(items: string[]): Promise<CompareResult> {
  const res = await fetch(`${BASE_URL}/api/lists/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
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
