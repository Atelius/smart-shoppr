# 🛒 SmartShopper

> Comparador de precios de supermercado en tiempo real para Monterrey, México.  
> Scraping paralelo de HEB y Soriana con Playwright — encuentra la ruta de compra más barata para tu lista del súper.

---

## ¿Qué es SmartShopper?

SmartShopper es una aplicación web full-stack que automatiza la comparación de precios entre supermercados locales. En lugar de revisar cada tienda manualmente, escribes tu lista de productos y el sistema navega las tiendas en tiempo real, compara precios y te dice exactamente dónde comprar cada artículo para gastar lo menos posible.

**Problema que resuelve:** En Monterrey, los precios entre HEB y Soriana pueden variar hasta un 30% por producto. Hacer el recorrido mental de comparación es tedioso — SmartShopper lo automatiza.

---

## Características

- **Scraping en tiempo real** con Playwright (navegador headless Chromium)
- **Comparación paralela** de HEB y Soriana simultáneamente
- **Ruta óptima (Split-Buy):** selecciona el precio más bajo por producto entre todas las tiendas
- **Caché de 24 horas:** no repite scraping innecesario; muestra badge `caché` o `vivo` por producto
- **Force refresh:** actualiza el precio de un producto específico sin tocar el resto
- **Carrusel de opciones:** ve todas las variantes encontradas por tienda y selecciona la que prefieras
- **Agrupación flexible:** vista por categoría (Lácteos, Abarrotes...) o por tienda (qué comprar en cada lugar)
- **Historial de precios:** gráfica de evolución de precios por producto y tienda (Recharts)
- **Listas guardadas:** persiste tus listas en SQLite para reutilizarlas
- **Clasificación automática** de productos por categoría mediante palabras clave

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                        FRONTEND                         │
│              React 19 + Vite + Tailwind v4              │
│                                                         │
│  ListInput → ComparisonDashboard → PriceMetrics        │
│               ↕ fetch/POST                              │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP :3001
┌─────────────────────▼───────────────────────────────────┐
│                        BACKEND                          │
│                   Express + TypeScript                  │
│                                                         │
│  /api/lists/compare  →  searchEngine  →  scrapers      │
│  /api/lists/save     →  Prisma ORM                     │
│  /api/metrics/history→  PriceHistory                   │
│  /api/proxy-image    →  Image CORS proxy               │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
┌──────────▼──────────┐  ┌───────▼──────────────────────┐
│     SQLite DB        │  │        Playwright            │
│   (Prisma ORM)       │  │    (Chromium headless)       │
│                      │  │                              │
│  Product             │  │  hebScraper.ts               │
│  Store               │  │  sorianaScraper.ts           │
│  PriceHistory        │  │                              │
│  ShoppingList        │  └──────────────────────────────┘
│  ListItem            │
│  CachedSearch        │
└──────────────────────┘
```

### Flujo de una búsqueda

```
Usuario escribe lista
        │
        ▼
POST /api/lists/compare { items: ["leche", "arroz"], force: [] }
        │
        ▼
listOptimizer.ts — por cada producto:
        │
        ├─ ¿Existe en CachedSearch y tiene < 24hrs? ──YES──► devuelve caché
        │
        └─ NO ──► searchEngine.ts
                        │
                        ├─► hebScraper (Playwright → heb.com.mx)
                        └─► sorianaScraper (Playwright → soriana.com)
                                │
                                ▼
                        isRelevant() — filtra resultados irrelevantes
                                │
                                ▼
                        setCached() — guarda en CachedSearch
                                │
                                ▼
                buildStoreTotals() — total por tienda
                buildOptimalItems() — mejor precio por producto
                buildByStore() — agrupado por tienda (ruta física)
                        │
                        ▼
                JSON response → ComparisonDashboard.tsx
```

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS v4 |
| Gráficas | Recharts |
| Iconos | Lucide React |
| Backend | Node.js 24, Express 5, TypeScript |
| Scraping | Playwright (Chromium) |
| ORM | Prisma 6 |
| Base de datos | SQLite |
| Dev tooling | tsx watch, concurrently |

---

## Estructura del Proyecto

```
smart-shopper/
├── package.json              # Root: script dev con concurrently
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # Modelos de BD
│   │   └── dev.db            # SQLite (gitignored)
│   ├── src/
│   │   ├── index.ts          # Express app + endpoints
│   │   ├── prismaClient.ts   # Singleton de Prisma
│   │   ├── routes/
│   │   │   └── listsRouter.ts
│   │   └── services/
│   │       ├── searchEngine.ts      # Orquestador + caché
│   │       ├── cacheService.ts      # CachedSearch CRUD
│   │       ├── listOptimizer.ts     # Lógica de comparación
│   │       └── scrapers/
│   │           ├── hebScraper.ts
│   │           └── sorianaScraper.ts
│   ├── .env                  # DATABASE_URL (gitignored)
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── index.css
    │   ├── services/
    │   │   └── api.ts        # Fetch wrapper tipado
    │   └── components/
    │       ├── ListInput.tsx
    │       ├── ComparisonDashboard.tsx
    │       ├── PriceMetrics.tsx
    │       └── SavedLists.tsx
    └── package.json
```

---

## Instalación y Setup

### Requisitos

- Node.js 20+
- npm 10+
- Git

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/smart-shopper.git
cd smart-shopper
```

### 2. Instalar dependencias

```bash
# Dependencias raíz (concurrently)
npm install

# Backend
cd backend
npm install

# Instalar navegador de Playwright
npx playwright install chromium --with-deps

# Frontend
cd ../frontend
npm install
```

### 3. Configurar variables de entorno

Crea el archivo `backend/.env`:

```env
DATABASE_URL="file:./prisma/dev.db"
```

### 4. Inicializar la base de datos

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Levantar el proyecto

Desde la raíz del proyecto:

```bash
npm run dev
```

Esto levanta backend (`:3001`) y frontend (`:5173`) en paralelo en la misma terminal.

---

## API Reference

### `POST /api/lists/compare`

Compara precios de una lista de productos.

**Body:**
```json
{
  "items": ["leche", "arroz", "papel higiénico"],
  "force": ["leche"]
}
```

- `items`: Lista de productos a comparar (máx. 20)
- `force`: *(opcional)* Productos que deben re-scrapearse ignorando el caché

**Response:**
```json
{
  "query": ["leche", "arroz"],
  "storeTotals": [
    { "store": "HEB", "total": 87.50, "availableCount": 2, "unavailableItems": [] },
    { "store": "Soriana", "total": 94.00, "availableCount": 2, "unavailableItems": [] }
  ],
  "optimalRoute": {
    "grandTotal": 82.00,
    "totalSavings": 12.00,
    "byCategory": { "Lácteos": [...], "Abarrotes": [...] },
    "byStore": { "HEB": [...], "Soriana": [...] },
    "items": [...]
  },
  "cacheStats": { "fromCache": 1, "scraped": 1 },
  "executionTimeMs": 12400
}
```

---

### `POST /api/lists/save`

Guarda una lista en la base de datos.

```json
{ "name": "Despensa Semanal", "items": ["leche", "arroz"] }
```

---

### `GET /api/lists`

Devuelve todas las listas guardadas con sus productos.

---

### `POST /api/lists/flush-cache`

Mueve todas las entradas de `CachedSearch` no procesadas a `PriceHistory`. Usar al final del día para alimentar las gráficas de métricas.

---

### `GET /api/lists/cache-status`

Muestra el estado actual del caché (qué está guardado, antigüedad, si ya fue flusheado).

---

### `GET /api/metrics/history?product=leche`

Devuelve el historial de precios de un producto para graficar evolución por tienda.

---

### `GET /api/search?q=leche`

Búsqueda directa de un solo producto (sin optimización de lista).

---

### `GET /api/proxy-image?url=...`

Proxy de imágenes para evitar bloqueos CORS de los CDN de las tiendas. Solo permite dominios de tiendas conocidas.

---

## Modelo de Datos

```
Product ──────────────── PriceHistory ──── Store
   │                          │
   │                     (scrapedAt,
   └── ListItem               price,
          │               isAvailable)
          │
     ShoppingList

CachedSearch
  (query, results JSON, cachedAt, flushed)
```

---

## Limitaciones Conocidas

### Bot Protection
Sam's Club y Walmart México usan **PerimeterX** (Kasada) — una protección anti-bot de nivel enterprise que detecta Playwright incluso con User-Agent real. No se pueden scrapear sin soluciones de pago como [ZenRows](https://www.zenrows.com) (~$49 USD/mes) o [Brightdata](https://brightdata.com).

### Links de HEB
HEB corre sobre **VTEX** y genera los URLs de producto con un ID numérico (`/hcf-leche-entera-1-l-561471/p`) que no está disponible en el DOM en el momento del scraping. El link generado por slug puede dar 404 ocasionalmente.

### Relevancia de resultados
Soriana a veces devuelve resultados no relacionados (ej. buscar "huevo" puede traer electrodomésticos). Se filtra con `isRelevant()` que verifica que al menos una palabra clave del query aparezca en el nombre del producto, pero no es perfecto.

---

## Roadmap

- [ ] **APK móvil** con Capacitor (envuelve el frontend en WebView nativo)
- [ ] **Cron automático** para flush diario de caché a historial
- [ ] **Links correctos de algunas tiendas** — interceptar GraphQL de VTEX para obtener `productId`
- [ ] **Notificaciones de precio** — alertar cuando un producto baja de cierto precio
- [ ] **Modo offline** — usar caché local en el móvil sin conexión


---

## Contribuir

Pull requests bienvenidos. Para cambios grandes, abre un issue primero para discutir qué te gustaría cambiar.

---

## Licencia

MIT
