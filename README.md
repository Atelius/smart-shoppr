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
- **Lista manual:** agrega productos de cualquier tienda (Sam's, Costco, etc.) con su precio manualmente; se mezclan en la comparación
- **Carrusel de opciones:** ve todas las variantes encontradas por tienda y selecciona la que prefieras
- **Agrupación flexible:** vista por categoría (Lácteos, Abarrotes...) o por tienda (qué comprar en cada lugar)
- **Tiendas manuales agrupadas como "Otros"** en la vista por tienda
- **Historial de precios:** gráfica de evolución de precios por producto y tienda (Recharts)
- **Listas guardadas:** persiste tus listas en SQLite para reutilizarlas
- **Clasificación automática** de productos por categoría mediante palabras clave
- **Multiidioma:** interfaz en Español, English y 日本語 con preferencia guardada en localStorage

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                          FRONTEND                           │
│               React 19 + Vite + Tailwind v4                 │
│                                                             │
│  ListInput        → búsqueda scrapeada                      │
│  ManualList       → productos manuales (cualquier tienda)   │
│  ComparisonDashboard → resultados + carrusel                │
│  PriceMetrics     → gráfica histórica (Recharts)            │
│  SavedLists       → listas persistidas                      │
│  LangSelector     → ES / EN / 日本語                         │
│                ↕ fetch/POST                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP :3001
┌─────────────────────▼───────────────────────────────────────┐
│                          BACKEND                            │
│                    Express + TypeScript                     │
│                                                             │
│  /api/lists/compare  →  listOptimizer  →  searchEngine     │
│  /api/lists/save     →  Prisma ORM                         │
│  /api/metrics/history→  PriceHistory                       │
│  /api/proxy-image    →  Image CORS proxy                   │
│  /api/lists/flush-cache → CachedSearch → PriceHistory      │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
┌──────────▼──────────┐  ┌───────▼──────────────────────────┐
│      SQLite DB       │  │           Playwright             │
│    (Prisma ORM)      │  │       (Chromium headless)        │
│                      │  │                                  │
│  Product             │  │  hebScraper.ts                   │
│  Store               │  │  sorianaScraper.ts               │
│  PriceHistory        │  │                                  │
│  ShoppingList        │  └──────────────────────────────────┘
│  ListItem            │
│  CachedSearch        │
└──────────────────────┘
```

### Flujo de una búsqueda

```
Usuario escribe lista (o agrega items manuales)
        │
        ▼
POST /api/lists/compare
  { items: ["leche", "arroz"], force: [], manualItems: [{ name, store, price }] }
        │
        ▼
listOptimizer.ts
        │
        ├─ Items manuales → se convierten a ProductResult directamente
        │                   (tienda libre, sin scraping)
        │
        └─ Items scrapeados → por cada uno:
                │
                ├─ ¿CachedSearch < 24hrs? ──YES──► devuelve caché (badge: caché)
                │
                └─ NO ──► searchEngine.ts
                                │
                                ├─► hebScraper   (Playwright → heb.com.mx)
                                └─► sorianaScraper (Playwright → soriana.com)
                                        │
                                        ▼
                                isRelevant() — filtra resultados irrelevantes
                                        │
                                        ▼
                                setCached() — guarda en CachedSearch
                                        │
                                        ▼
                        buildStoreTotals()  — total por tienda
                        buildOptimalItems() — mejor precio por producto
                        byCategory{}        — agrupado por categoría
                        byStore{}           — agrupado por tienda
                          (tiendas manuales → grupo "Otros")
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
| i18n | Contexto propio (ES / EN / JA), localStorage |
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
│   │       ├── cacheService.ts      # CachedSearch CRUD + flush
│   │       ├── listOptimizer.ts     # Lógica de comparación + items manuales
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
    │   ├── i18n/
    │   │   ├── i18n.ts           # Traducciones ES / EN / JA
    │   │   ├── LangContext.tsx   # Contexto + hook useLang()
    │   │   └── LangSelector.tsx  # Dropdown de idioma en header
    │   ├── services/
    │   │   └── api.ts            # Fetch wrapper tipado
    │   └── components/
    │       ├── ListInput.tsx
    │       ├── ManualList.tsx        # Lista manual (cualquier tienda)
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

Levanta backend (`:3001`) y frontend (`:5173`) en paralelo en la misma terminal.

---

## API Reference

### `POST /api/lists/compare`

Compara precios de una lista. Acepta items scrapeados, items con force refresh e items manuales mezclados.

**Body:**
```json
{
  "items": ["leche", "arroz"],
  "force": ["leche"],
  "manualItems": [
    { "name": "leche", "store": "Sam's Club", "price": 20.00 }
  ]
}
```

- `items`: productos a scrapear (máx. 30 en total)
- `force`: *(opcional)* productos que ignoran el caché y se scraping en vivo
- `manualItems`: *(opcional)* productos con tienda y precio manual; se mezclan en la comparación sin scraping

**Response:**
```json
{
  "query": ["leche", "arroz", "leche"],
  "storeTotals": [
    { "store": "HEB",        "total": 87.50, "availableCount": 2, "isManualStore": false },
    { "store": "Soriana",    "total": 94.00, "availableCount": 2, "isManualStore": false },
    { "store": "Otros",      "total": 20.00, "availableCount": 1, "isManualStore": true  }
  ],
  "optimalRoute": {
    "grandTotal": 40.00,
    "totalSavings": 54.00,
    "byCategory": { "Lácteos": [...], "Abarrotes": [...] },
    "byStore":    { "HEB": [...], "Soriana": [...], "Otros": [...] },
    "items": [...]
  },
  "cacheStats": { "fromCache": 1, "scraped": 1, "manual": 1 },
  "executionTimeMs": 8200
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

Muestra el estado actual del caché: qué productos están cacheados, su antigüedad en minutos y si ya fueron flusheados.

---

### `GET /api/metrics/history?product=leche`

Devuelve el historial de precios de un producto para graficar evolución por tienda.

---

### `GET /api/search?q=leche`

Búsqueda directa de un solo producto (sin optimización de lista).

---

### `GET /api/proxy-image?url=...`

Proxy de imágenes para evitar bloqueos CORS de los CDN de las tiendas. Solo permite dominios de tiendas conocidas (`hebmx.vtexassets.com`, `soriana.com`, etc.).

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
  TTL: 24 horas — después se mueve a PriceHistory via flush-cache
```

---

## i18n

La interfaz soporta 3 idiomas seleccionables desde el header. La preferencia se guarda en `localStorage`.

| Código | Idioma   | Cobertura |
|--------|----------|-----------|
| `es`   | Español  | Completo  |
| `en`   | English  | Completo  |
| `ja`   | 日本語    | Completo  |

Para agregar un idioma nuevo, basta con agregar una entrada al objeto `T` en `frontend/src/i18n/i18n.ts` con las mismas keys.

---

## Lista Manual

La vista **Lista Manual** permite agregar productos de tiendas no scrapeables (Sam's Club, Costco, Walmart, mercados locales, etc.) con su precio real. Estos items:

- Se mezclan con los productos scrapeados en la comparación
- Compiten en la ruta óptima: si un producto manual es más barato, la ruta lo selecciona
- Aparecen agrupados como **"Otros"** en la vista por tienda del dashboard
- Muestran un badge `manual` para distinguirlos de los scrapeados

---

## Limitaciones Conocidas

### Bot Protection
Sam's Club y Walmart México usan **PerimeterX** (Kasada) — protección anti-bot de nivel enterprise que detecta Playwright incluso con User-Agent real. Alternativa: [ZenRows](https://www.zenrows.com) (~$49 USD/mes) o [Brightdata](https://brightdata.com). Por ahora, estos productos se pueden agregar vía Lista Manual.

### Links de HEB
HEB corre sobre **VTEX** y genera URLs con un ID numérico (`/hcf-leche-entera-1-l-561471/p`) que no está disponible en el DOM al momento del scraping. El link generado por slug puede dar 404 ocasionalmente.

### Relevancia de resultados
Soriana a veces devuelve resultados no relacionados. Se filtra con `isRelevant()` que verifica que al menos una palabra del query aparezca en el nombre del producto, pero no es perfecto.

---

## Roadmap

- [ ] **APK móvil** con Capacitor (envuelve el frontend en WebView nativo)
- [ ] **Cron automático** para flush diario de caché a historial
- [ ] **Links correctos ** — interceptar GraphQL de VTEX para obtener `productId`
- [ ] **Notificaciones de precio** — alertar cuando un producto baja de cierto precio
- [ ] **Modo offline** — usar caché local en el móvil sin conexión

---

## Contribuir

Pull requests bienvenidos. Para cambios grandes, abre un issue primero para discutir qué te gustaría cambiar.

---

## Licencia

MIT
