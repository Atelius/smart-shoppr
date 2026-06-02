import { useState } from "react";
import {
  TrendingDown, ExternalLink, Trophy, AlertCircle,
  ChevronRight, ChevronLeft, Check, X, RefreshCw, Store, Tag
} from "lucide-react";
import type { CompareResult, StoreTotal, OptimalItem, ProductResult } from "../services/api";

interface Props {
  data: CompareResult;
  onNewSearch: () => void;
  onSave: (name: string) => void;
  onForceRefresh: (items: string[]) => void;
}

const STORE_STYLE: Record<string, { color: string; border: string; bg: string; dot: string }> = {
  HEB:     { color: "#f87171", border: "rgba(248,113,113,0.25)", bg: "rgba(248,113,113,0.06)", dot: "#f87171" },
  Soriana: { color: "#60a5fa", border: "rgba(96,165,250,0.25)",  bg: "rgba(96,165,250,0.06)",  dot: "#60a5fa" },
};

const CATEGORY_ICONS: Record<string, string> = {
  "Lácteos": "🥛", "Carnes": "🥩", "Frutas y Verduras": "🥦", "Panadería": "🍞",
  "Bebidas": "🧃", "Limpieza": "🧹", "Cuidado Personal": "🧴", "Abarrotes": "🫙",
  "Snacks": "🍿", "Congelados": "🧊", "Otros": "📦",
};

const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

// ── Product Image with proxy ──────────────────────────────────
function ProductImage({ src, fallback }: { src: string; fallback: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const proxied = src ? `http://localhost:3001/api/proxy-image?url=${encodeURIComponent(src)}` : "";

  return (
    <div style={{ background: "#fff", borderRadius: "12px", height: "180px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "14px", position: "relative" }}>
      {proxied && status !== "error" ? (
        <>
          <img
            src={proxied}
            style={{ maxHeight: "160px", maxWidth: "100%", objectFit: "contain", display: status === "ok" ? "block" : "none" }}
            onLoad={() => setStatus("ok")}
            onError={() => setStatus("error")}
          />
          {status === "loading" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 20, height: 20, border: "2px solid #e5e5e5", borderTopColor: "#a3e635", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
          )}
        </>
      ) : (
        <span style={{ fontSize: "52px" }}>{fallback}</span>
      )}
    </div>
  );
}

// ── Carousel Modal ────────────────────────────────────────────
interface CarouselProps {
  item: OptimalItem;
  onSelect: (product: ProductResult) => void;
  onClose: () => void;
  selectedKey: string | null;
}

function ProductCarousel({ item, onSelect, onClose, selectedKey }: CarouselProps) {
  const stores = Object.keys(item.optionsByStore ?? {});
  const [storeTab, setStoreTab] = useState(stores[0] ?? "HEB");
  const [idx, setIdx] = useState(0);

  const options = (item.optionsByStore ?? {})[storeTab] ?? [];
  const current = options[idx];
  const total   = options.length;

  function changeStore(s: string) { setStoreTab(s); setIdx(0); }

  const isSelected = current
    ? selectedKey === `${current.store}::${current.name}`
    : false;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(9,9,11,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "20px", width: "100%", maxWidth: "440px" }}>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: "#52525b", fontSize: "10px", letterSpacing: "0.1em", margin: "0 0 2px" }}>OPCIONES PARA</p>
            <p style={{ color: "#fff", fontSize: "14px", fontWeight: 600, margin: 0, textTransform: "capitalize" }}>{item.query}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", display: "flex", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Store tabs */}
        <div style={{ display: "flex", gap: "4px", padding: "10px 14px", borderBottom: "1px solid #27272a" }}>
          {stores.map((store) => {
            const s = STORE_STYLE[store];
            const active = storeTab === store;
            return (
              <button key={store} onClick={() => changeStore(store)} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: `1px solid ${active ? (s?.border ?? "#3f3f46") : "#27272a"}`, background: active ? (s?.bg ?? "transparent") : "transparent", color: active ? (s?.color ?? "#fff") : "#52525b", fontSize: "12px", fontFamily: "inherit", cursor: "pointer", fontWeight: active ? 700 : 400, transition: "all 0.15s" }}>
                {store} · {(item.optionsByStore ?? {})[store]?.length ?? 0}
              </button>
            );
          })}
        </div>

        {current ? (
          <div style={{ padding: "16px" }}>
            <ProductImage src={current.imageUrl} fallback={CATEGORY_ICONS[item.category] ?? "📦"} />

            <p style={{ color: "#e4e4e7", fontSize: "13px", margin: "0 0 8px", lineHeight: 1.4, minHeight: "36px" }}>{current.name}</p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <span style={{ color: "#a3e635", fontSize: "1.3rem", fontWeight: 700, fontFamily: "Syne, sans-serif" }}>{fmt(current.price)}</span>
              {current.link && (
                <a href={current.link} target="_blank" rel="noopener noreferrer" style={{ color: "#52525b", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", textDecoration: "none" }}>
                  Ver en tienda <ExternalLink size={11} />
                </a>
              )}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <button onClick={() => setIdx((i) => (i - 1 + total) % total)} disabled={total <= 1} style={{ background: "#27272a", border: "none", borderRadius: "8px", padding: "7px 12px", cursor: total > 1 ? "pointer" : "not-allowed", color: total > 1 ? "#e4e4e7" : "#3f3f46", display: "flex", opacity: total > 1 ? 1 : 0.4 }}>
                <ChevronLeft size={15} />
              </button>
              <div style={{ textAlign: "center" }}>
                <span style={{ color: "#52525b", fontSize: "12px" }}>{idx + 1} / {total}</span>
                <div style={{ display: "flex", gap: "4px", justifyContent: "center", marginTop: "4px" }}>
                  {options.map((_, i) => (
                    <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 14 : 5, height: 5, borderRadius: 3, background: i === idx ? "#a3e635" : "#3f3f46", border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s" }} />
                  ))}
                </div>
              </div>
              <button onClick={() => setIdx((i) => (i + 1) % total)} disabled={total <= 1} style={{ background: "#27272a", border: "none", borderRadius: "8px", padding: "7px 12px", cursor: total > 1 ? "pointer" : "not-allowed", color: total > 1 ? "#e4e4e7" : "#3f3f46", display: "flex", opacity: total > 1 ? 1 : 0.4 }}>
                <ChevronRight size={15} />
              </button>
            </div>

            <button
              onClick={() => { onSelect(current); onClose(); }}
              style={{ width: "100%", padding: "11px", borderRadius: "12px", border: `1px solid ${isSelected ? "rgba(163,230,53,0.3)" : "transparent"}`, cursor: "pointer", fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: isSelected ? "transparent" : "#a3e635", color: isSelected ? "#a3e635" : "#09090b", transition: "all 0.15s" }}
            >
              {isSelected ? <><Check size={14} /> Seleccionado</> : "Seleccionar esta opción"}
            </button>
          </div>
        ) : (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#52525b", fontSize: "13px" }}>No hay opciones en {storeTab}</div>
        )}
      </div>
    </div>
  );
}

// ── Item Row ──────────────────────────────────────────────────
function ItemRow({
  item, i, overrides, onOpenCarousel, onForceRefresh,
}: {
  item: OptimalItem;
  i: number;
  overrides: Record<string, ProductResult>;
  onOpenCarousel: (item: OptimalItem) => void;
  onForceRefresh: (query: string) => void;
}) {
  const best = overrides[item.query] ?? item.bestOption;
  const s    = best ? (STORE_STYLE[best.store] ?? null) : null;
  const hasOptions = Object.values(item.optionsByStore ?? {}).some((arr) => arr.length > 0);
  const isOverridden = !!overrides[item.query];

  return (
    <div style={{ padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", borderTop: i > 0 ? "1px solid #1f1f22" : "none" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: best ? "2px" : 0 }}>
          <p style={{ color: "#e4e4e7", fontSize: "13px", margin: 0, textTransform: "capitalize" }}>{item.query}</p>
          {/* Cache indicator */}
          {item.fromCache ? (
            <span title="Desde caché" style={{ fontSize: "9px", color: "#52525b", border: "1px solid #3f3f46", borderRadius: "4px", padding: "1px 4px" }}>caché</span>
          ) : (
            <span title="Scraped en vivo" style={{ fontSize: "9px", color: "#a3e635", border: "1px solid rgba(163,230,53,0.3)", borderRadius: "4px", padding: "1px 4px" }}>vivo</span>
          )}
        </div>
        {best && (
          <p style={{ color: "#52525b", fontSize: "11px", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {isOverridden && <span style={{ color: "#a3e635", marginRight: "4px" }}>★</span>}
            {best.name}
          </p>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        {best ? (
          <>
            <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "999px", border: `1px solid ${s?.border ?? "#3f3f46"}`, color: s?.color ?? "#a1a1aa", background: s?.bg ?? "transparent" }}>
              {best.store}
            </span>
            <span style={{ color: "#a3e635", fontSize: "13px", fontWeight: 700 }}>{fmt(best.price)}</span>
            {best.link && (
              <a href={best.link} target="_blank" rel="noopener noreferrer" style={{ color: "#3f3f46", display: "flex" }}>
                <ExternalLink size={11} />
              </a>
            )}
          </>
        ) : (
          <span style={{ color: "#3f3f46", fontSize: "12px" }}>No disponible</span>
        )}

        {hasOptions && (
          <button onClick={() => onOpenCarousel(item)} style={{ background: "#27272a", border: "none", borderRadius: "6px", padding: "3px 7px", cursor: "pointer", color: "#a1a1aa", fontSize: "10px", fontFamily: "inherit" }}>
            ver más
          </button>
        )}

        {/* Force refresh button */}
        <button
          onClick={() => onForceRefresh(item.query)}
          title="Actualizar precio ahora"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#3f3f46", display: "flex", padding: 2 }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#a3e635")}
          onMouseOut={(e)  => (e.currentTarget.style.color = "#3f3f46")}
        >
          <RefreshCw size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
type GroupMode = "category" | "store";

export default function ComparisonDashboard({ data, onNewSearch, onSave, onForceRefresh }: Props) {
  const [activeTab,  setActiveTab]  = useState<"optimal" | string>("optimal");
  const [groupMode,  setGroupMode]  = useState<GroupMode>("category");
  const [saveName,   setSaveName]   = useState("");
  const [saved,      setSaved]      = useState(false);
  const [carousel,   setCarousel]   = useState<OptimalItem | null>(null);
  const [overrides,  setOverrides]  = useState<Record<string, ProductResult>>({});

  const { storeTotals, optimalRoute, cacheStats } = data;

  const effectiveGrandTotal = Math.round(
    optimalRoute.items.reduce((s, item) => s + ((overrides[item.query] ?? item.bestOption)?.price ?? 0), 0) * 100
  ) / 100;

  const cheapest = [...storeTotals].sort((a, b) => a.total - b.total)[0];

  function handleSelect(query: string, product: ProductResult) {
    setOverrides((prev) => ({ ...prev, [query]: product }));
  }

  function handleSave() {
    if (!saveName.trim()) return;
    onSave(saveName.trim());
    setSaved(true);
  }

  const tabStyle = (active: boolean, color?: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px",
    borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px",
    fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s",
    background: active ? (color ?? "#a3e635") : "transparent",
    color: active ? "#09090b" : "#71717a", fontWeight: active ? 700 : 400,
  });

  // Render a group of items (used for both byCategory and byStore views)
  function renderItemGroup(groupLabel: string, groupIcon: string, items: OptimalItem[]) {
    return (
      <div key={groupLabel} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", overflow: "hidden", marginBottom: "10px" }}>
        <div style={{ padding: "9px 16px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>{groupIcon}</span>
          <span style={{ color: "#a1a1aa", fontSize: "11px", letterSpacing: "0.08em" }}>{groupLabel.toUpperCase()}</span>
          <span style={{ color: "#3f3f46", fontSize: "11px" }}>({items.length})</span>
        </div>
        {items.map((item, i) => (
          <ItemRow
            key={item.query}
            item={item}
            i={i}
            overrides={overrides}
            onOpenCarousel={setCarousel}
            onForceRefresh={(q) => onForceRefresh([q])}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "860px", margin: "0 auto" }}>

      {/* Top bar */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "18px" }}>
        <div>
          <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "4px" }}>
            {data.query.length} PRODUCTOS ·{" "}
            <span style={{ color: "#a3e635" }}>{cacheStats.fromCache} desde caché</span>
            {" · "}
            <span style={{ color: "#60a5fa" }}>{cacheStats.scraped} en vivo</span>
          </p>
          <h2 className="font-display" style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", margin: 0 }}>
            Total óptimo <span style={{ color: "#a3e635" }}>{fmt(effectiveGrandTotal)}</span>
          </h2>
        </div>
        <button onClick={onNewSearch} style={{ background: "none", border: "1px solid #3f3f46", borderRadius: "10px", color: "#a1a1aa", padding: "7px 14px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>
          ← Nueva búsqueda
        </button>
      </div>

      {/* Store cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "18px" }}>
        {storeTotals.map((st) => {
          const s = STORE_STYLE[st.store] ?? { color: "#a1a1aa", border: "#3f3f46", bg: "transparent", dot: "#a1a1aa" };
          const isCheap = st.store === cheapest.store;
          return (
            <div key={st.store} style={{ position: "relative", border: `1px solid ${s.border}`, borderRadius: "14px", padding: "14px", background: s.bg }}>
              {isCheap && (
                <div style={{ position: "absolute", top: "-10px", left: "12px", background: "#a3e635", color: "#09090b", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Trophy size={9} /> MÁS BARATO
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", marginTop: isCheap ? "4px" : "0" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot }} />
                <span style={{ color: s.color, fontSize: "11px", letterSpacing: "0.08em" }}>{st.store.toUpperCase()}</span>
              </div>
              <p className="font-display" style={{ fontSize: "1.5rem", color: "#fff", margin: "0 0 4px" }}>{fmt(st.total)}</p>
              <p style={{ color: "#52525b", fontSize: "11px", margin: 0 }}>{st.availableCount}/{data.query.length} disponibles</p>
              {st.unavailableItems.length > 0 && (
                <p style={{ color: "#52525b", fontSize: "10px", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <AlertCircle size={9} /> Sin: {st.unavailableItems.join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* View tabs */}
      <div style={{ display: "flex", gap: "4px", background: "#18181b", border: "1px solid #27272a", borderRadius: "12px", padding: "4px", marginBottom: "14px", overflowX: "auto" }}>
        <button style={tabStyle(activeTab === "optimal")} onClick={() => setActiveTab("optimal")}>
          <TrendingDown size={12} /> Ruta Óptima
        </button>
        {storeTotals.map((st) => (
          <button key={st.store} style={tabStyle(activeTab === st.store, STORE_STYLE[st.store]?.dot)} onClick={() => setActiveTab(st.store)}>
            {st.store}
          </button>
        ))}
      </div>

      {/* Optimal tab */}
      {activeTab === "optimal" && (
        <div>
          {/* Group mode toggle */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
            <button
              onClick={() => setGroupMode("category")}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "8px", border: `1px solid ${groupMode === "category" ? "rgba(163,230,53,0.3)" : "#27272a"}`, background: groupMode === "category" ? "rgba(163,230,53,0.08)" : "transparent", color: groupMode === "category" ? "#a3e635" : "#52525b", fontSize: "11px", fontFamily: "inherit", cursor: "pointer" }}
            >
              <Tag size={11} /> Por categoría
            </button>
            <button
              onClick={() => setGroupMode("store")}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "8px", border: `1px solid ${groupMode === "store" ? "rgba(163,230,53,0.3)" : "#27272a"}`, background: groupMode === "store" ? "rgba(163,230,53,0.08)" : "transparent", color: groupMode === "store" ? "#a3e635" : "#52525b", fontSize: "11px", fontFamily: "inherit", cursor: "pointer" }}
            >
              <Store size={11} /> Por tienda
            </button>
          </div>

          {/* By category */}
          {groupMode === "category" && Object.entries(optimalRoute.byCategory).map(([cat, items]) =>
            renderItemGroup(cat, CATEGORY_ICONS[cat] ?? "📦", items)
          )}

          {/* By store */}
          {groupMode === "store" && Object.entries(optimalRoute.byStore).map(([store, items]) => {
            const s = STORE_STYLE[store];
            const icon = store === "Sin disponibilidad" ? "❌" : "🏪";
            return renderItemGroup(store, icon, items);
          })}

          {/* Grand total */}
          <div style={{ background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)", borderRadius: "12px", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ color: "#a3e635", fontSize: "11px", letterSpacing: "0.1em" }}>TOTAL ÓPTIMO</span>
            <span className="font-display" style={{ color: "#a3e635", fontSize: "1.5rem", fontWeight: 700 }}>{fmt(effectiveGrandTotal)}</span>
          </div>
        </div>
      )}

      {/* Per-store tab */}
      {activeTab !== "optimal" && (() => {
        const st = storeTotals.find((s) => s.store === activeTab);
        const s  = STORE_STYLE[activeTab];
        // Group this store's items by category
        const byCategory: Record<string, OptimalItem[]> = {};
        for (const item of optimalRoute.items) {
          const storeHasItem = (item.optionsByStore ?? {})[activeTab]?.length > 0;
          if (!storeHasItem) continue;
          if (!byCategory[item.category]) byCategory[item.category] = [];
          byCategory[item.category].push(item);
        }
        return (
          <div>
            {Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", overflow: "hidden", marginBottom: "10px" }}>
                <div style={{ padding: "9px 16px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{CATEGORY_ICONS[cat] ?? "📦"}</span>
                  <span style={{ color: "#a1a1aa", fontSize: "11px", letterSpacing: "0.08em" }}>{cat.toUpperCase()}</span>
                </div>
                {items.map((item, i) => {
                  const storeOptions = (item.optionsByStore ?? {})[activeTab] ?? [];
                  const sp   = storeOptions[0];
                  const allP = Object.values(item.optionsByStore ?? {}).flat();
                  const best = allP.length > 0 ? Math.min(...allP.map((p) => p.price)) : null;
                  const isBest = sp && best !== null && sp.price === best;
                  return (
                    <div key={item.query} style={{ padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", borderTop: i > 0 ? "1px solid #1f1f22" : "none" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <p style={{ color: "#e4e4e7", fontSize: "13px", margin: 0, textTransform: "capitalize" }}>{item.query}</p>
                          {item.fromCache
                            ? <span style={{ fontSize: "9px", color: "#52525b", border: "1px solid #3f3f46", borderRadius: "4px", padding: "1px 4px" }}>caché</span>
                            : <span style={{ fontSize: "9px", color: "#a3e635", border: "1px solid rgba(163,230,53,0.3)", borderRadius: "4px", padding: "1px 4px" }}>vivo</span>
                          }
                        </div>
                        {sp && <p style={{ color: "#52525b", fontSize: "11px", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sp.name}</p>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        {isBest && <span style={{ color: "#a3e635", fontSize: "10px", border: "1px solid rgba(163,230,53,0.3)", padding: "2px 6px", borderRadius: "999px" }}>mejor precio</span>}
                        {sp
                          ? <span style={{ color: isBest ? "#a3e635" : "#e4e4e7", fontSize: "13px", fontWeight: 700 }}>{fmt(sp.price)}</span>
                          : <span style={{ color: "#3f3f46", fontSize: "12px" }}>No disponible</span>
                        }
                        {storeOptions.length > 1 && (
                          <button onClick={() => setCarousel(item)} style={{ background: "#27272a", border: "none", borderRadius: "6px", padding: "3px 7px", cursor: "pointer", color: "#a1a1aa", fontSize: "10px", fontFamily: "inherit" }}>
                            ver más
                          </button>
                        )}
                        <button onClick={() => onForceRefresh([item.query])} title="Actualizar" style={{ background: "none", border: "none", cursor: "pointer", color: "#3f3f46", display: "flex", padding: 2 }}
                          onMouseOver={(e) => (e.currentTarget.style.color = "#a3e635")}
                          onMouseOut={(e)  => (e.currentTarget.style.color = "#3f3f46")}
                        >
                          <RefreshCw size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {st && (
              <div style={{ border: `1px solid ${s?.border ?? "#3f3f46"}`, background: s?.bg ?? "transparent", borderRadius: "12px", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ color: s?.color ?? "#a1a1aa", fontSize: "11px", letterSpacing: "0.1em" }}>TOTAL {activeTab.toUpperCase()}</span>
                <span className="font-display" style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700 }}>{fmt(st.total)}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Save */}
      {!saved ? (
        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <input type="text" placeholder="Nombre para guardar esta lista..." value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            style={{ flex: 1, background: "#18181b", border: "1px solid #27272a", borderRadius: "10px", padding: "10px 16px", color: "#e4e4e7", fontFamily: "inherit", fontSize: "13px", outline: "none" }}
          />
          <button onClick={handleSave} disabled={!saveName.trim()}
            style={{ padding: "10px 16px", background: "#27272a", border: "none", borderRadius: "10px", color: "#e4e4e7", cursor: saveName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", opacity: saveName.trim() ? 1 : 0.5 }}>
            Guardar <ChevronRight size={14} />
          </button>
        </div>
      ) : (
        <p style={{ color: "#a3e635", fontSize: "12px", textAlign: "center", marginTop: "8px" }}>✓ Lista guardada exitosamente</p>
      )}

      {/* Carousel */}
      {carousel && (
        <ProductCarousel
          item={carousel}
          selectedKey={overrides[carousel.query] ? `${overrides[carousel.query].store}::${overrides[carousel.query].name}` : null}
          onSelect={(product) => handleSelect(carousel.query, product)}
          onClose={() => setCarousel(null)}
        />
      )}
    </div>
  );
}
