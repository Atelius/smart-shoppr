import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Search } from "lucide-react";
import { getPriceHistory, type PriceHistoryPoint } from "../services/api";

const STORE_COLORS: Record<string, string> = {
  HEB:      "#f87171",
  Soriana:  "#60a5fa",
  Chedraui: "#fb923c",
};

const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

function buildChartData(history: PriceHistoryPoint[]) {
  const byDate: Record<string, Record<string, number | string>> = {};
  for (const p of history) {
    const date = new Date(p.scrapedAt).toLocaleDateString("es-MX", { month: "short", day: "numeric" });
    if (!byDate[date]) byDate[date] = { date };
    byDate[date][p.store.name] = p.price;
  }
  return Object.values(byDate);
}

function uniqueStores(history: PriceHistoryPoint[]) {
  return [...new Set(history.map((h) => h.store.name))];
}

export default function PriceMetrics() {
  const [input,   setInput]   = useState("");
  const [query,   setQuery]   = useState("");
  const [history, setHistory] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSearch() {
    const q = input.trim().toLowerCase();
    if (!q) return;
    setLoading(true); setError(""); setQuery(q);
    try {
      const data = await getPriceHistory(q);
      if (data.length === 0) setError("Sin historial para ese producto. Compáralo primero.");
      setHistory(data);
    } catch (e: any) {
      setError("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const chartData = buildChartData(history);
  const stores    = uniqueStores(history);

  return (
    <div style={{ width: "100%", maxWidth: "860px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "999px", border: "1px solid #3f3f46", background: "#18181b", color: "#71717a", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>
          <TrendingUp size={11} /> HISTORIAL DE PRECIOS
        </div>
        <h2 className="font-display" style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Evolución de precios por tienda</h2>
        <p style={{ color: "#52525b", fontSize: "13px", margin: 0 }}>Cada comparación guarda los precios automáticamente.</p>
      </div>

      {/* Search bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", background: "#18181b", border: "1px solid #27272a", borderRadius: "12px", padding: "0 16px" }}>
          <Search size={14} style={{ color: "#52525b", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="ej. leche, arroz, aceite..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e4e4e7", fontFamily: "inherit", fontSize: "13px", padding: "12px 0" }}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !input.trim()}
          style={{ padding: "12px 20px", background: !input.trim() || loading ? "rgba(163,230,53,0.4)" : "#a3e635", border: "none", borderRadius: "12px", color: "#09090b", fontFamily: "'Syne', sans-serif", fontSize: "13px", fontWeight: 700, cursor: input.trim() && !loading ? "pointer" : "not-allowed" }}
        >
          {loading ? "..." : "Ver"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "12px", padding: "24px", textAlign: "center", color: "#71717a", fontSize: "13px", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* Chart */}
      {history.length > 0 && !loading && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 className="font-display" style={{ color: "#fff", fontSize: "1.1rem", margin: 0, textTransform: "capitalize" }}>{query}</h3>
            <div style={{ display: "flex", gap: "16px" }}>
              {stores.map((store) => (
                <div key={store} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: 12, height: 2, borderRadius: 2, display: "inline-block", background: STORE_COLORS[store] ?? "#888" }} />
                  <span style={{ color: "#71717a", fontSize: "11px" }}>{store}</span>
                </div>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 11, fontFamily: "DM Mono, monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#52525b", fontSize: 11, fontFamily: "DM Mono, monospace" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={50} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontFamily: "DM Mono, monospace", fontSize: "12px" }}
                labelStyle={{ color: "#71717a", marginBottom: "4px" }}
                formatter={(value: number, name: string) => [fmt(value), name]}
              />
              {stores.map((store) => (
                <Line key={store} type="monotone" dataKey={store}
                  stroke={STORE_COLORS[store] ?? "#888"} strokeWidth={2} connectNulls
                  dot={{ r: 4, fill: STORE_COLORS[store] ?? "#888", strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Last price cards */}
          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #27272a" }}>
            <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.1em", margin: "0 0 12px" }}>ÚLTIMO PRECIO REGISTRADO</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
              {stores.map((store) => {
                const last = [...history].filter((h) => h.store.name === store).sort((a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime())[0];
                return (
                  <div key={store} style={{ background: "#1f1f22", borderRadius: "10px", padding: "12px 16px", borderLeft: `3px solid ${STORE_COLORS[store] ?? "#888"}` }}>
                    <p style={{ color: "#71717a", fontSize: "11px", margin: "0 0 4px" }}>{store}</p>
                    <p className="font-display" style={{ color: "#fff", fontSize: "1.1rem", margin: 0 }}>{last ? fmt(last.price) : "—"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!query && !loading && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "64px 24px", textAlign: "center" }}>
          <TrendingUp size={32} style={{ color: "#3f3f46", margin: "0 auto 12px" }} />
          <p style={{ color: "#52525b", fontSize: "13px", margin: "0 0 4px" }}>Busca un producto para ver su historial de precios.</p>
          <p style={{ color: "#3f3f46", fontSize: "12px", margin: 0 }}>Los precios se registran al comparar listas.</p>
        </div>
      )}
    </div>
  );
}
