import { Router, Request, Response } from "express";
import { optimizeList, flushCacheToHistory } from "../services/listOptimizer";
import prisma from "../prismaClient";

const router = Router();

// ── POST /api/lists/compare ───────────────────────────────────
// Body: { items: ["leche", "arroz"], force: ["leche"] }
// force: optional array of items to bypass cache and re-scrape
router.post("/compare", async (req: Request, res: Response) => {
  const { items, force } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: "El campo 'items' debe ser un arreglo con al menos un producto.",
      example: { items: ["leche", "arroz"], force: ["leche"] },
    });
  }
  if (items.length > 20) {
    return res.status(400).json({ error: "Máximo 20 productos por comparación." });
  }

  const cleanItems: string[] = items
    .map((i: any) => String(i).trim().toLowerCase())
    .filter(Boolean);

  const forceItems: string[] = Array.isArray(force)
    ? force.map((i: any) => String(i).trim().toLowerCase()).filter(Boolean)
    : [];

  try {
    console.log(`\n[API] Comparando: [${cleanItems.join(", ")}]${forceItems.length ? ` | Force: [${forceItems.join(", ")}]` : ""}`);
    const result = await optimizeList(cleanItems, forceItems);
    return res.json(result);
  } catch (err: any) {
    console.error("[API] Error en /compare:", err);
    return res.status(500).json({ error: "Error interno.", message: err?.message });
  }
});

// ── POST /api/lists/save ──────────────────────────────────────
router.post("/save", async (req: Request, res: Response) => {
  const { name, items } = req.body;
  if (!name || typeof name !== "string")
    return res.status(400).json({ error: "El campo 'name' es requerido." });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "El campo 'items' debe ser un arreglo no vacío." });

  try {
    const productRecords = await Promise.all(
      items.map((itemName: string) => {
        const clean = itemName.trim().toLowerCase();
        return prisma.product.upsert({
          where:  { name: clean },
          update: {},
          create: { name: clean, category: "Otros" },
        });
      })
    );
    const shoppingList = await prisma.shoppingList.create({
      data: {
        name,
        items: { create: productRecords.map((p) => ({ productId: p.id, quantity: 1 })) },
      },
      include: { items: { include: { product: true } } },
    });
    return res.status(201).json({ message: "Lista guardada.", shoppingList });
  } catch (err: any) {
    return res.status(500).json({ error: "Error interno.", message: err?.message });
  }
});

// ── GET /api/lists ────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  try {
    const lists = await prisma.shoppingList.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(lists);
  } catch (err: any) {
    return res.status(500).json({ error: "Error interno.", message: err?.message });
  }
});

// ── POST /api/lists/flush-cache ───────────────────────────────
// Moves all unprocessed cache entries to PriceHistory
router.post("/flush-cache", async (_req: Request, res: Response) => {
  try {
    const result = await flushCacheToHistory();
    return res.json({ message: "Flush completado.", ...result });
  } catch (err: any) {
    return res.status(500).json({ error: "Error interno.", message: err?.message });
  }
});

// ── GET /api/lists/cache-status ───────────────────────────────
// Shows what's currently cached and how old it is
router.get("/cache-status", async (_req: Request, res: Response) => {
  try {
    const entries = await prisma.cachedSearch.findMany({
      orderBy: { cachedAt: "desc" },
      select: { query: true, cachedAt: true, flushed: true, results: true },
    });
    const now = Date.now();
    return res.json(
      entries.map((e) => ({
        query:    e.query,
        cachedAt: e.cachedAt,
        ageMinutes: Math.round((now - new Date(e.cachedAt).getTime()) / 60000),
        flushed:  e.flushed,
        resultCount: JSON.parse(e.results).length,
      }))
    );
  } catch (err: any) {
    return res.status(500).json({ error: "Error interno.", message: err?.message });
  }
});

export default router;
