import { Router, Request, Response } from "express";
import { optimizeList } from "../services/listOptimizer";
import prisma from "../prismaClient";

const router = Router();

// POST /api/lists/compare
// Body: { items: ["leche", "arroz", "jabón"] }
router.post("/compare", async (req: Request, res: Response) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: "El campo 'items' debe ser un arreglo con al menos un producto.",
      example: { items: ["leche", "arroz", "jabón"] },
    });
  }

  if (items.length > 20) {
    return res.status(400).json({ error: "Máximo 20 productos por comparación." });
  }

  const cleanItems: string[] = items
    .map((i: any) => String(i).trim().toLowerCase())
    .filter(Boolean);

  try {
    console.log(`\n[API] Comparando lista: [${cleanItems.join(", ")}]`);
    const result = await optimizeList(cleanItems);
    return res.json(result);
  } catch (err: any) {
    console.error("[API] Error en /compare:", err);
    return res.status(500).json({ error: "Error interno.", message: err?.message });
  }
});

// POST /api/lists/save
// Body: { name: "Despensa Semanal", items: ["leche", "arroz"] }
router.post("/save", async (req: Request, res: Response) => {
  const { name, items } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "El campo 'name' es requerido." });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "El campo 'items' debe ser un arreglo no vacío." });
  }

  try {
    const productRecords = await Promise.all(
      items.map((itemName: string) => {
        const clean = itemName.trim().toLowerCase();
        return prisma.product.upsert({
          where: { name: clean },
          update: {},
          create: { name: clean, category: "Otros" },
        });
      })
    );

    const shoppingList = await prisma.shoppingList.create({
      data: {
        name,
        items: {
          create: productRecords.map((p) => ({ productId: p.id, quantity: 1 })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    return res.status(201).json({ message: "Lista guardada.", shoppingList });
  } catch (err: any) {
    console.error("[API] Error en /save:", err);
    return res.status(500).json({ error: "Error interno.", message: err?.message });
  }
});

// GET /api/lists
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

export default router;