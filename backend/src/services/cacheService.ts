import prisma from "../prismaClient";
import { ProductResult } from "./scrapers/hebScraper";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Read ──────────────────────────────────────────────────────
export async function getCached(query: string): Promise<ProductResult[] | null> {
  try {
    const entry = await prisma.cachedSearch.findUnique({ where: { query } });
    if (!entry) return null;

    const age = Date.now() - new Date(entry.cachedAt).getTime();
    if (age > CACHE_TTL_MS) {
      console.log(`[Cache] Expirado para "${query}" (${Math.round(age / 3600000)}h)`);
      return null;
    }

    console.log(`[Cache] HIT para "${query}" — ${Math.round(age / 60000)}min de antigüedad`);
    return JSON.parse(entry.results) as ProductResult[];
  } catch (err) {
    console.error("[Cache] Error leyendo caché:", err);
    return null;
  }
}

// ── Write ─────────────────────────────────────────────────────
export async function setCached(query: string, results: ProductResult[]): Promise<void> {
  try {
    await prisma.cachedSearch.upsert({
      where:  { query },
      update: { results: JSON.stringify(results), cachedAt: new Date(), flushed: false },
      create: { query, results: JSON.stringify(results) },
    });
    console.log(`[Cache] Guardado "${query}" — ${results.length} resultados`);
  } catch (err) {
    console.error("[Cache] Error escribiendo caché:", err);
  }
}

// ── Flush: move today's cache to PriceHistory ─────────────────
// Call this at end of day or on demand
export async function flushCacheToHistory(): Promise<{ flushed: number; errors: number }> {
  let flushed = 0;
  let errors  = 0;

  try {
    const pending = await prisma.cachedSearch.findMany({
      where: { flushed: false },
    });

    console.log(`[Cache] Flushing ${pending.length} entradas a PriceHistory...`);

    for (const entry of pending) {
      try {
        const results: ProductResult[] = JSON.parse(entry.results);
        if (results.length === 0) continue;

        // Upsert product
        const product = await prisma.product.upsert({
          where:  { name: entry.query },
          update: {},
          create: { name: entry.query, category: "Otros" },
        });

        for (const r of results) {
          // Upsert store
          const store = await prisma.store.upsert({
            where:  { name: r.store },
            update: {},
            create: { name: r.store },
          });

          await prisma.priceHistory.create({
            data: {
              productId:   product.id,
              storeId:     store.id,
              price:       r.price,
              isAvailable: true,
              scrapedAt:   entry.cachedAt,
            },
          });
        }

        // Mark as flushed
        await prisma.cachedSearch.update({
          where:  { id: entry.id },
          data:   { flushed: true },
        });

        flushed++;
      } catch (err) {
        console.error(`[Cache] Error flushing "${entry.query}":`, err);
        errors++;
      }
    }

    console.log(`[Cache] Flush completo: ${flushed} ok, ${errors} errores`);
  } catch (err) {
    console.error("[Cache] Error en flushCacheToHistory:", err);
  }

  return { flushed, errors };
}
