import { useState } from "react";
import { TrendingDown, ExternalLink, Trophy, AlertCircle, ChevronRight } from "lucide-react";
import type { CompareResult, StoreTotal } from "../services/api";

interface Props {
  data: CompareResult;
  onNewSearch: () => void;
  onSave: (name: string) => void;
}

const STORE_STYLE: Record<string, { color: string; border: string; bg: string; dot: string }> = {
  HEB:      { color: "#f87171", border: "rgba(248,113,113,0.25)", bg: "rgba(248,113,113,0.06)", dot: "#f87171" },
  Soriana:  { color: "#60a5fa", border: "rgba(96,165,250,0.25)",  bg: "rgba(96,165,250,0.06)",  dot: "#60a5fa" },
  Chedraui: { color: "#fb923c", border: "rgba(251,146,60,0.25)",  bg: "rgba(251,146,60,0.06)",  dot: "#fb923c" },
};

const CATEGORY_ICONS: Record<string, string> = {
  "Lácteos": "🥛", "Carnes": "🥩", "Frutas y Verduras": "🥦", "Panadería": "🍞",
  "Bebidas": "🧃", "Limpieza": "🧹", "Cuidado Personal": "🧴", "Abarrotes": "🫙",
  "Snacks": "🍿", "Congelados": "🧊", "Otros": "📦",
};

const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export default function ComparisonDashboard({ data, onNewSearch, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<"optimal" | string>("optimal");
  const [saveName, setSaveName]   = useState("");
  const [saved, setSaved]         = useState(false);

  const { storeTotals, optimalRoute } = data;
  const cheapest = [...storeTotals].sort((a, b) => a.total - b.total)[0];

  function getStoreTotal(store: string): StoreTotal | undefined {
    return storeTotals.find((s) => s.store === store);
  }

  function handleSave() {
    if (!saveName.trim()) return;
    onSave(saveName.trim());
    setSaved(true);
  }

  const tabStyle = (active: boolean, color?: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: "6px",
    padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
    fontSize: "12px", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s",
    background: active ? (color ?? "#a3e635") : "transparent",
    color: active ? "#09090b" : "#71717a", fontWeight: active ? 700 : 400,
  });

  return (
    <div style={{ width: "100%", maxWidth: "860px", margin: "0 auto" }}>

      {/* Top bar */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "20px" }}>
        <div>
          <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "4px" }}>
            RESULTADO · {data.query.length} PRODUCTOS
          </p>
          <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", margin: 0 }}>
            Ahorras hasta <span style={{ color: "#a3e635" }}>{fmt(optimalRoute.totalSavings)}</span> comprando inteligente
          </h2>
        </div>
        <button onClick={onNewSearch} style={{
          background: "none", border: "1px solid #3f3f46", borderRadius: "10px",
          color: "#a1a1aa", padding: "8px 16px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit"
        }}>
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
        {storeTotals.map((st) => {
          const s = STORE_STYLE[st.store];
          return (
            <button key={st.store} style={tabStyle(activeTab === st.store, s?.dot)} onClick={() => setActiveTab(st.store)}>
              {st.store}
            </button>
          );
        })}
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
              {items.map((item, i) => {
                const s = item.bestOption ? (STORE_STYLE[item.bestOption.store] ?? null) : null;
                return (
                  <div key={item.query} style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", borderTop: i > 0 ? "1px solid #1f1f22" : "none" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "#e4e4e7", fontSize: "13px", margin: "0 0 2px", textTransform: "capitalize" }}>{item.query}</p>
                      {item.bestOption && <p style={{ color: "#52525b", fontSize: "11px", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.bestOption.name}</p>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      {item.bestOption ? (
                        <>
                          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "999px", border: `1px solid ${s?.border ?? "#3f3f46"}`, color: s?.color ?? "#a1a1aa", background: s?.bg ?? "transparent" }}>
                            {item.bestOption.store}
                          </span>
                          <span style={{ color: "#a3e635", fontSize: "13px", fontWeight: 700 }}>{fmt(item.bestOption.price)}</span>
                          <a href={item.bestOption.link} target="_blank" rel="noopener noreferrer" style={{ color: "#3f3f46", display: "flex" }}>
                            <ExternalLink size={12} />
                          </a>
                        </>
                      ) : (
                        <span style={{ color: "#3f3f46", fontSize: "12px" }}>No disponible</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {/* Grand total */}
          <div style={{ background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#a3e635", fontSize: "11px", letterSpacing: "0.1em" }}>TOTAL ÓPTIMO</span>
            <span className="font-display" style={{ color: "#a3e635", fontSize: "1.6rem", fontWeight: 700 }}>{fmt(optimalRoute.grandTotal)}</span>
          </div>
        </div>
      )}

      {/* Store tab */}
      {activeTab !== "optimal" && (() => {
        const st = getStoreTotal(activeTab);
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
                  const sp = item.allPrices.find((p) => p.store === activeTab);
                  const best = item.allPrices.length > 0 ? Math.min(...item.allPrices.map((p) => p.price)) : null;
                  const isBest = sp && best !== null && sp.price === best;
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
          <input
            type="text"
            placeholder="Nombre para guardar esta lista..."
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            style={{ flex: 1, background: "#18181b", border: "1px solid #27272a", borderRadius: "10px", padding: "10px 16px", color: "#e4e4e7", fontFamily: "inherit", fontSize: "13px", outline: "none" }}
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim()}
            style={{ padding: "10px 16px", background: "#27272a", border: "none", borderRadius: "10px", color: "#e4e4e7", cursor: saveName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", opacity: saveName.trim() ? 1 : 0.5 }}
          >
            Guardar <ChevronRight size={14} />
          </button>
        </div>
      ) : (
        <p style={{ color: "#a3e635", fontSize: "12px", textAlign: "center", marginTop: "8px" }}>✓ Lista guardada exitosamente</p>
      )}
    </div>
  );
}
