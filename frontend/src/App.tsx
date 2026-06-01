import { useState } from "react";
import { ShoppingCart, TrendingUp, LayoutGrid, BookOpen } from "lucide-react";
import ListInput from "./components/ListInput";
import ComparisonDashboard from "./components/ComparisonDashboard";
import PriceMetrics from "./components/PriceMetrics";
import SavedLists from "./components/SavedLists";
import { compareList, saveList, type CompareResult } from "./services/api";
import "./index.css";

type View = "input" | "results" | "metrics" | "saved";

export default function App() {
  const [view,      setView]      = useState<View>("input");
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState<CompareResult | null>(null);
  const [error,     setError]     = useState("");
  const [lastItems, setLastItems] = useState<string[]>([]);

  async function handleCompare(items: string[]) {
    setLoading(true); setError(""); setLastItems(items);
    try {
      const data = await compareList(items);
      setResult(data);
      setView("results");
    } catch (e: any) {
      setError("Error al comparar: " + (e.message ?? "intenta de nuevo"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(name: string) {
    try { await saveList(name, lastItems); }
    catch (e: any) { console.error("Error guardando:", e); }
  }

  const NAV: { id: View; label: string; Icon: React.ElementType }[] = [
    { id: "input",   label: "Mi Lista",  Icon: ShoppingCart },
    { id: "saved",   label: "Mis Listas", Icon: BookOpen },
    { id: "metrics", label: "Métricas",  Icon: TrendingUp },
  ];

  const isActive = (id: View) => view === id || (view === "results" && id === "input");

  return (
    <div style={{ minHeight: "100svh", background: "#09090b", color: "#fff" }}>
      {/* Grid background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.025, backgroundImage: "linear-gradient(#a3e635 1px, transparent 1px), linear-gradient(90deg, #a3e635 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #1f1f22", backdropFilter: "blur(16px)", background: "rgba(9,9,11,0.85)" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 20px", height: "54px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setView("input")} style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ width: 28, height: 28, background: "#a3e635", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LayoutGrid size={14} style={{ color: "#09090b" }} />
            </div>
            <span className="font-display" style={{ color: "#fff", fontSize: "14px", fontWeight: 700 }}>
              smart<span style={{ color: "#a3e635" }}>shopper</span>
            </span>
          </button>

          <nav style={{ display: "flex", gap: "4px" }}>
            {NAV.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setView(id)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", border: "none", background: isActive(id) ? "#27272a" : "transparent", color: isActive(id) ? "#fff" : "#71717a", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", transition: "all 0.15s" }}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 20px", position: "relative" }}>
        {view === "input" && (
          <div className="animate-fade-in">
            <ListInput onCompare={handleCompare} loading={loading} />
            {error && <p style={{ color: "#f87171", fontSize: "12px", textAlign: "center", marginTop: "12px" }}>{error}</p>}
          </div>
        )}
        {view === "results" && result && (
          <div className="animate-fade-in">
            <ComparisonDashboard data={result} onNewSearch={() => setView("input")} onSave={handleSave} />
          </div>
        )}
        {view === "metrics" && (
          <div className="animate-fade-in"><PriceMetrics /></div>
        )}
        {view === "saved" && (
          <div className="animate-fade-in">
            <SavedLists onCompareList={(items) => { setView("input"); handleCompare(items); }} />
          </div>
        )}
      </main>

      {/* Loading overlay */}
      {loading && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(9,9,11,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "20px", padding: "40px", textAlign: "center", maxWidth: "320px", width: "90%" }}>
            <div style={{ position: "relative", width: 60, height: 60, margin: "0 auto 20px" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(163,230,53,0.15)" }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#a3e635", animation: "spin 0.8s linear infinite" }} />
              <ShoppingCart size={20} style={{ position: "absolute", inset: 0, margin: "auto", color: "#a3e635" }} />
            </div>
            <p className="font-display" style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 8px" }}>Scraping en progreso</p>
            <p style={{ color: "#71717a", fontSize: "13px", margin: "0 0 16px" }}>Navegando HEB y Soriana con Playwright...</p>
            <p style={{ color: "#3f3f46", fontSize: "11px", margin: "0 0 20px" }}>Esto puede tardar 15–30 segundos</p>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "4px", height: "24px" }}>
              {[0,1,2,3,4].map((i) => (
                <div key={i} style={{ width: 4, height: 20, background: "#a3e635", borderRadius: 2, animation: "bounce-bar 0.8s ease-in-out infinite", animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
