import express, { Request, Response } from "express";
import cors from "cors";
import { searchEngine } from "./services/searchEngine";
import { hebScraper } from "./services/scrapers/hebScraper";
import { sorianaScraper } from "./services/scrapers/sorianaScraper";
//import { chedrauiScraper } from "./services/scrapers/chedrauiScraper";
import listsRouter from "./routes/listsRouter";
import prisma from "./prismaClient";

import https from "https";
import http from "http";

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

// Debug
app.get("/api/debug/heb-graphql2", async (_req: Request, res: Response) => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  await context.addInitScript(() => { Object.defineProperty(navigator, "webdriver", { get: () => undefined }); });
  const page = await context.newPage();

  const responses: any[] = [];

  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("graphql/v1") && responses.length < 6) {
      try {
        const json = await response.json();
        // Capture raw structure — first 600 chars of each response
        responses.push({
          url: url.slice(0, 100),
          raw: JSON.stringify(json).slice(0, 600),
        });
      } catch {}
    }
  });

  await page.goto("https://www.heb.com.mx/leche?_q=leche&map=ft", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  await browser.close();
  res.json({ responses });
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

app.get("/api/proxy-image", (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).send("Missing url");

  // Only allow known supermarket image domains
  const allowed = ["hebmx.vtexassets.com", "soriana.com", "walmart.com.mx", "chedraui.com.mx", "sams.com.mx"];
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return res.status(400).send("Invalid url");
  }

  if (!allowed.some((d) => hostname.endsWith(d))) {
    return res.status(403).send("Domain not allowed");
  }

  const client = url.startsWith("https") ? https : http;
  const proxyReq = client.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://www.heb.com.mx/",
    },
  }, (proxyRes) => {
    res.setHeader("Content-Type", proxyRes.headers["content-type"] ?? "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    proxyRes.pipe(res);
  });

  proxyReq.on("error", () => res.status(502).send("Proxy error"));
});



// --------------
app.listen(PORT, () => {
  console.log(`🛒  Smart Shopper API en http://localhost:${PORT}`);
  console.log(`🔍  GET  /api/search?q=leche`);
  console.log(`📋  POST /api/lists/compare   { items: ["leche","arroz"] }`);
  console.log(`💾  POST /api/lists/save      { name: "Mi lista", items: [...] }`);
  console.log(`📂  GET  /api/lists`);
});

export default app;