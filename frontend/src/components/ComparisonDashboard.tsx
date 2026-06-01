import { useState } from "react";
import { TrendingDown, ExternalLink, Trophy, AlertCircle, ChevronRight, ChevronLeft, Check, X } from "lucide-react";
import type { CompareResult, StoreTotal, OptimalItem, ProductResult } from "../services/api";

interface Props {
  data: CompareResult;
  onNewSearch: () => void;
  onSave: (name: string) => void;
}


// ── Carousel modal ────────────────────────────────────────────
interface CarouselProps {
  item: OptimalItem;
  onSelect: (product: ProductResult) => void;
  onClose: () => void;
  selectedKey: string | null;
}

// Replace the ProductCarousel component inside ComparisonDashboard.tsx
// This version handles CORS-blocked images and broken links gracefully



const CATEGORY_ICONS: Record<string, string> = {
  "Lácteos": "🥛", "Carnes": "🥩", "Frutas y Verduras": "🥦", "Panadería": "🍞",
  "Bebidas": "🧃", "Limpieza": "🧹", "Cuidado Personal": "🧴", "Abarrotes": "🫙",
  "Snacks": "🍿", "Congelados": "🧊", "Otros": "📦",
};

const STORE_STYLE: Record<string, { color: string; border: string; bg: string }> = {
  HEB:     { color: "#f87171", border: "rgba(248,113,113,0.25)", bg: "rgba(248,113,113,0.06)" },
  Soriana: { color: "#60a5fa", border: "rgba(96,165,250,0.25)",  bg: "rgba(96,165,250,0.06)" },
};

const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

interface CarouselProps {
  item: OptimalItem;
  onSelect: (product: ProductResult) => void;
  onClose: () => void;
  selectedKey: string | null;
}

function ProductImage({ src, alt, fallback }: { src: string; alt: string; fallback: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  return (
    <div style={{ background: "#fff", borderRadius: "12px", height: "200px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "16px", position: "relative" }}>
      {src && status !== "error" ? (
        <>
          {/* Proxy the image through the backend to avoid CORS */}
          <img
            src={`http://localhost:3001/api/proxy-image?url=${encodeURIComponent(src)}`}
            alt={alt}
            style={{ maxHeight: "180px", maxWidth: "100%", objectFit: "contain", display: status === "ok" ? "block" : "none" }}
            onLoad={() => setStatus("ok")}
            onError={() => setStatus("error")}
          />
          {status === "loading" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 24, height: 24, border: "2px solid #e5e5e5", borderTopColor: "#a3e635", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
          )}
        </>
      ) : (
        <span style={{ fontSize: "56px" }}>{fallback}</span>
      )}
    </div>
  );
}

export function ProductCarousel({ item, onSelect, onClose, selectedKey }: CarouselProps) {
  const [storeTab, setStoreTab] = useState<string>(
    Object.keys(item.optionsByStore ?? {})[0] ?? "HEB"
  );
  const [idx, setIdx] = useState(0);

  const options = (item.optionsByStore ?? {})[storeTab] ?? [];
  const current = options[idx];
  const total   = options.length;

  function changeStore(store: string) { setStoreTab(store); setIdx(0); }
  function prev() { setIdx((i) => (i - 1 + total) % total); }
  function next() { setIdx((i) => (i + 1) % total); }

  const isSelected = current
    ? selectedKey === `${current.store}::${current.name}`
    : false;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(9,9,11,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "20px", width: "100%", maxWidth: "460px", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: "#52525b", fontSize: "10px", letterSpacing: "0.1em", margin: "0 0 2px" }}>OPCIONES PARA</p>
            <p style={{ color: "#fff", fontSize: "14px", fontWeight: 600, margin: 0, textTransform: "capitalize" }}>{item.query}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", display: "flex", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Store tabs */}
        <div style={{ display: "flex", gap: "4px", padding: "12px 16px", borderBottom: "1px solid #27272a" }}>
          {Object.keys(item.optionsByStore ?? {}).map((store) => {
            const s = STORE_STYLE[store];
            const active = storeTab === store;
            const count  = (item.optionsByStore ?? {})[store]?.length ?? 0;
            return (
              <button key={store} onClick={() => changeStore(store)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${active ? (s?.border ?? "#3f3f46") : "#27272a"}`, background: active ? (s?.bg ?? "transparent") : "transparent", color: active ? (s?.color ?? "#fff") : "#52525b", fontSize: "12px", fontFamily: "inherit", cursor: "pointer", fontWeight: active ? 700 : 400, transition: "all 0.15s" }}>
                {store} · {count}
              </button>
            );
          })}
        </div>

        {/* Product card */}
        {current ? (
          <div style={{ padding: "20px" }}>
            <ProductImage
              src={current.imageUrl}
              alt={current.name}
              fallback={CATEGORY_ICONS[item.category] ?? "📦"}
            />

            <p style={{ color: "#e4e4e7", fontSize: "14px", margin: "0 0 8px", lineHeight: 1.4, minHeight: "40px" }}>
              {current.name}
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ color: "#a3e635", fontSize: "1.4rem", fontWeight: 700, fontFamily: "Syne, sans-serif" }}>
                {fmt(current.price)}
              </span>
              {current.link ? (
                <a
                  href={current.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#52525b", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", textDecoration: "none" }}
                  onMouseOver={(e) => (e.currentTarget.style.color = "#a1a1aa")}
                  onMouseOut={(e)  => (e.currentTarget.style.color = "#52525b")}
                >
                  Ver en tienda <ExternalLink size={11} />
                </a>
              ) : null}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <button onClick={prev} disabled={total <= 1} style={{ background: "#27272a", border: "none", borderRadius: "8px", padding: "8px 14px", cursor: total > 1 ? "pointer" : "not-allowed", color: total > 1 ? "#e4e4e7" : "#3f3f46", display: "flex", opacity: total > 1 ? 1 : 0.4 }}>
                <ChevronLeft size={16} />
              </button>
              <div style={{ textAlign: "center" }}>
                <span style={{ color: "#52525b", fontSize: "12px" }}>{idx + 1} / {total}</span>
                {/* Dot indicators */}
                <div style={{ display: "flex", gap: "4px", justifyContent: "center", marginTop: "4px" }}>
                  {options.map((_, i) => (
                    <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, background: i === idx ? "#a3e635" : "#3f3f46", border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s" }} />
                  ))}
                </div>
              </div>
              <button onClick={next} disabled={total <= 1} style={{ background: "#27272a", border: "none", borderRadius: "8px", padding: "8px 14px", cursor: total > 1 ? "pointer" : "not-allowed", color: total > 1 ? "#e4e4e7" : "#3f3f46", display: "flex", opacity: total > 1 ? 1 : 0.4 }}>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Select button */}
            <button
              onClick={() => { onSelect(current); onClose(); }}
              style={{ width: "100%", padding: "12px", borderRadius: "12px", border: `1px solid ${isSelected ? "rgba(163,230,53,0.3)" : "transparent"}`, cursor: "pointer", fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: isSelected ? "transparent" : "#a3e635", color: isSelected ? "#a3e635" : "#09090b", transition: "all 0.15s" }}
            >
              {isSelected ? <><Check size={14} /> Seleccionado</> : "Seleccionar esta opción"}
            </button>
          </div>
        ) : (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#52525b", fontSize: "13px" }}>
            No hay opciones en {storeTab}
          </div>
        )}
      </div>
    </div>
  );
}


// ── Main dashboard ────────────────────────────────────────────
export default function ComparisonDashboard({ data, onNewSearch, onSave }: Props) {
  const [activeTab,  setActiveTab]  = useState<"optimal" | string>("optimal");
  const [saveName,   setSaveName]   = useState("");
  const [saved,      setSaved]      = useState(false);
  const [carousel,   setCarousel]   = useState<OptimalItem | null>(null);
  // Overrides: query → selected ProductResult
  const [overrides,  setOverrides]  = useState<Record<string, ProductResult>>({});

  const { storeTotals, optimalRoute } = data;

  // Recompute cheapest considering overrides
  const effectiveItems = optimalRoute.items.map((item) => ({
    ...item,
    bestOption: overrides[item.query] ?? item.bestOption,
  }));
  const effectiveGrandTotal = Math.round(
    effectiveItems.reduce((s, i) => s + (i.bestOption?.price ?? 0), 0) * 100
  ) / 100;
  const cheapest = [...storeTotals].sort((a, b) => a.total - b.total)[0];

  function handleSelect(query: string, product: ProductResult) {
    setOverrides((prev) => ({ ...prev, [query]: product }));
  }

  function getEffectiveBest(item: OptimalItem): ProductResult | null {
    return overrides[item.query] ?? item.bestOption;
  }

  function handleSave() {
    if (!saveName.trim()) return;
    onSave(saveName.trim());
    setSaved(true);
  }

  const tabStyle = (active: boolean, color?: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
    borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px",
    fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s",
    background: active ? (color ?? "#a3e635") : "transparent",
    color: active ? "#09090b" : "#71717a", fontWeight: active ? 700 : 400,
  });

  function ItemRow({ item, i }: { item: OptimalItem; i: number }) {
    const best = getEffectiveBest(item);
    const s    = best ? (STORE_STYLE[best.store] ?? null) : null;
    const hasOptions = Object.values(item.optionsByStore ?? {}).some((arr) => arr.length > 0);
    const isOverridden = !!overrides[item.query];

    return (
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", borderTop: i > 0 ? "1px solid #1f1f22" : "none" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "#e4e4e7", fontSize: "13px", margin: "0 0 2px", textTransform: "capitalize" }}>{item.query}</p>
          {best && (
            <p style={{ color: "#52525b", fontSize: "11px", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {isOverridden && <span style={{ color: "#a3e635", marginRight: "4px" }}>★</span>}
              {best.name}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {best ? (
            <>
              <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "999px", border: `1px solid ${s?.border ?? "#3f3f46"}`, color: s?.color ?? "#a1a1aa", background: s?.bg ?? "transparent" }}>
                {best.store}
              </span>
              <span style={{ color: "#a3e635", fontSize: "13px", fontWeight: 700 }}>{fmt(best.price)}</span>
              <a href={best.link} target="_blank" rel="noopener noreferrer" style={{ color: "#3f3f46", display: "flex" }}>
                <ExternalLink size={12} />
              </a>
            </>
          ) : (
            <span style={{ color: "#3f3f46", fontSize: "12px" }}>No disponible</span>
          )}
          {/* Carousel trigger */}
          {hasOptions && (
            <button
              onClick={() => setCarousel(item)}
              title="Ver todas las opciones"
              style={{ background: "#27272a", border: "none", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#a1a1aa", fontSize: "10px", fontFamily: "inherit", whiteSpace: "nowrap" }}
            >
              ver más
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "860px", margin: "0 auto" }}>

      {/* Top bar */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "20px" }}>
        <div>
          <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "4px" }}>RESULTADO · {data.query.length} PRODUCTOS</p>
          <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", margin: 0 }}>
            Total óptimo <span style={{ color: "#a3e635" }}>{fmt(effectiveGrandTotal)}</span>
          </h2>
        </div>
        <button onClick={onNewSearch} style={{ background: "none", border: "1px solid #3f3f46", borderRadius: "10px", color: "#a1a1aa", padding: "8px 16px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>
          ← Nueva búsqueda
        </button>
      </div>

      {/* Store cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {storeTotals.map((st) => {
          const s = STORE_STYLE[st.store] ?? { color: "#a1a1aa", border: "#3f3f46", bg: "transparent", dot: "#a1a1aa" };
          const isCheap = st.store === cheapest.store;
          return (
            <div key={st.store} style={{ position: "relative", border: `1px solid ${s.border}`, borderRadius: "14px", padding: "16px", background: s.bg }}>
              {isCheap && (
                <div style={{ position: "absolute", top: "-10px", left: "12px", background: "#a3e635", color: "#09090b", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Trophy size={9} /> MÁS BARATO
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", marginTop: isCheap ? "4px" : "0" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot }} />
                <span style={{ color: s.color, fontSize: "11px", letterSpacing: "0.08em" }}>{st.store.toUpperCase()}</span>
              </div>
              <p className="font-display" style={{ fontSize: "1.6rem", color: "#fff", margin: "0 0 4px" }}>{fmt(st.total)}</p>
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

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "#18181b", border: "1px solid #27272a", borderRadius: "12px", padding: "4px", marginBottom: "16px", overflowX: "auto" }}>
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
          {Object.entries(optimalRoute.byCategory).map(([cat, items]) => (
            <div key={cat} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", overflow: "hidden", marginBottom: "12px" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{CATEGORY_ICONS[cat] ?? "📦"}</span>
                <span style={{ color: "#a1a1aa", fontSize: "11px", letterSpacing: "0.08em" }}>{cat.toUpperCase()}</span>
              </div>
              {items.map((item, i) => <ItemRow key={item.query} item={item} i={i} />)}
            </div>
          ))}
          <div style={{ background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#a3e635", fontSize: "11px", letterSpacing: "0.1em" }}>TOTAL ÓPTIMO</span>
            <span className="font-display" style={{ color: "#a3e635", fontSize: "1.6rem", fontWeight: 700 }}>{fmt(effectiveGrandTotal)}</span>
          </div>
        </div>
      )}

      {/* Store tab */}
      {activeTab !== "optimal" && (() => {
        const st = storeTotals.find((s) => s.store === activeTab);
        const s  = STORE_STYLE[activeTab];
        const byCategory: Record<string, typeof optimalRoute.items> = {};
        for (const item of optimalRoute.items) {
          if (!byCategory[item.category]) byCategory[item.category] = [];
          byCategory[item.category].push(item);
        }
        return (
          <div>
            {Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", overflow: "hidden", marginBottom: "12px" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{CATEGORY_ICONS[cat] ?? "📦"}</span>
                  <span style={{ color: "#a1a1aa", fontSize: "11px", letterSpacing: "0.08em" }}>{cat.toUpperCase()}</span>
                </div>
                {items.map((item, i) => {
                  const sp   = item.optionsByStore?.[activeTab]?.[0];
                  const allP = Object.values(item.optionsByStore ?? {}).flat();
                  const best = allP.length > 0 ? Math.min(...allP.map((p) => p.price)) : null;
                  const isBest = sp && best !== null && sp.price === best;
                  const hasOptions = (item.optionsByStore?.[activeTab]?.length ?? 0) > 0;
                  return (
                    <div key={item.query} style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", borderTop: i > 0 ? "1px solid #1f1f22" : "none" }}>
                      <p style={{ color: "#e4e4e7", fontSize: "13px", margin: 0, textTransform: "capitalize", flex: 1 }}>{item.query}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        {isBest && <span style={{ color: "#a3e635", fontSize: "10px", border: "1px solid rgba(163,230,53,0.3)", padding: "2px 6px", borderRadius: "999px" }}>mejor precio</span>}
                        {sp ? (
                          <span style={{ color: isBest ? "#a3e635" : "#e4e4e7", fontSize: "13px", fontWeight: 700 }}>{fmt(sp.price)}</span>
                        ) : (
                          <span style={{ color: "#3f3f46", fontSize: "12px" }}>No disponible</span>
                        )}
                        {hasOptions && (
                          <button onClick={() => setCarousel(item)} style={{ background: "#27272a", border: "none", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#a1a1aa", fontSize: "10px", fontFamily: "inherit" }}>
                            ver más
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {st && (
              <div style={{ border: `1px solid ${s?.border ?? "#3f3f46"}`, background: s?.bg ?? "transparent", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ color: s?.color ?? "#a1a1aa", fontSize: "11px", letterSpacing: "0.1em" }}>TOTAL {activeTab.toUpperCase()}</span>
                <span className="font-display" style={{ color: "#fff", fontSize: "1.6rem", fontWeight: 700 }}>{fmt(st.total)}</span>
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

      {/* Carousel modal */}
      {carousel && (
        <ProductCarousel
          item={carousel}
          selectedKey={carousel && overrides[carousel.query] ? `${overrides[carousel.query].store}::${overrides[carousel.query].name}` : null}
          onSelect={(product) => handleSelect(carousel.query, product)}
          onClose={() => setCarousel(null)}
        />
      )}
    </div>
  );
}
