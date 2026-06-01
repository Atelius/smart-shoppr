import express, { Request, Response } from "express";
import cors from "cors";
import { searchEngine } from "./services/searchEngine";
import { hebScraper } from "./services/scrapers/hebScraper";
import { sorianaScraper } from "./services/scrapers/sorianaScraper";
//import { chedrauiScraper } from "./services/scrapers/chedrauiScraper";
import listsRouter from "./routes/listsRouter";
import prisma from "./prismaClient";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Single product search
app.get("/api/search", async (req: Request, res: Response) => {
  const query = (req.query.q as string)?.trim();
  if (!query) return res.status(400).json({ error: "El parámetro 'q' es requerido." });
  if (query.length < 2) return res.status(400).json({ error: "Mínimo 2 caracteres." });
  try {
    console.log(`\n[API] Búsqueda: "${query}"`);
    return res.json(await searchEngine(query));
  } catch (err: any) {
    return res.status(500).json({ error: "Error interno.", message: err?.message });
  }
});

// Lists: compare + save
app.use("/api/lists", listsRouter);

// Debug endpoints
app.get("/api/debug/:store", async (req: Request, res: Response) => {
  const { store } = req.params;
  const query = (req.query.q as string) ?? "leche";
  try {
    let result;
    if (store === "heb")      result = await hebScraper(query);
    else if (store === "soriana")  result = await sorianaScraper(query);
    //else if (store === "chedraui") result = await chedrauiScraper(query);
    else return res.status(400).json({ error: "store inválido" });
    res.json({ store, query, count: result.length, result });
  } catch (err: any) {
    res.json({ store, error: err.message });
  }
});

// GET /api/metrics/history?product=leche
app.get("/api/metrics/history", async (req: Request, res: Response) => {
  const product = (req.query.product as string)?.trim().toLowerCase();
  if (!product) return res.status(400).json({ error: "Parámetro 'product' requerido." });
  try {
    const history = await prisma.priceHistory.findMany({
      where: { product: { name: { contains: product } } },
      include: { store: { select: { name: true } }, product: { select: { name: true } } },
      orderBy: { scrapedAt: "asc" },
      take: 200,
    });
    return res.json(history);
  } catch (err: any) {
    return res.status(500).json({ error: "Error interno.", message: err?.message });
  }
});

app.listen(PORT, () => {
  console.log(`🛒  Smart Shopper API en http://localhost:${PORT}`);
  console.log(`🔍  GET  /api/search?q=leche`);
  console.log(`📋  POST /api/lists/compare   { items: ["leche","arroz"] }`);
  console.log(`💾  POST /api/lists/save      { name: "Mi lista", items: [...] }`);
  console.log(`📂  GET  /api/lists`);
});

export default app;