import { useState } from "react";
import { ShoppingCart, TrendingUp, LayoutGrid, BookOpen, ClipboardList } from "lucide-react";
import ListInput from "./components/ListInput";
import ComparisonDashboard from "./components/ComparisonDashboard";
import PriceMetrics from "./components/PriceMetrics";
import SavedLists from "./components/SavedLists";
import ManualList, { type ManualItem } from "./components/ManualList";
import LangSelector from "./i18n/LangSelector";
import { LangProvider, useLang } from "./i18n/LangContext";
import { compareList, saveList, type CompareResult } from "./services/api";
import "./index.css";

type View = "input" | "results" | "metrics" | "saved" | "manual";

function AppInner() {
  const { t } = useLang();
  const [view,        setView]        = useState<View>("input");
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<CompareResult | null>(null);
  const [error,       setError]       = useState("");
  const [lastItems,   setLastItems]   = useState<string[]>([]);
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);

  async function handleCompare(
    items: string[],
    force: string[] = [],
    manual: ManualItem[] = manualItems
  ) {
    setLoading(true); setError(""); setLastItems(items);
    try {
      const data = await compareList(items, force, manual);
      setResult(data);
      setView("results");
    } catch (e: any) {
      setError("Error: " + (e.message ?? "intenta de nuevo"));
    } finally {
      setLoading(false);
    }
  }

  function handleForceRefresh(forceItems: string[]) {
    if (!lastItems.length) return;
    handleCompare(lastItems, forceItems);
  }

  async function handleSave(name: string) {
    try { await saveList(name, lastItems); }
    catch (e: any) { console.error("Error guardando:", e); }
  }

  const NAV: { id: View; label: string; Icon: React.ElementType }[] = [
    { id: "input",   label: t.myList,     Icon: ShoppingCart  },
    { id: "manual",  label: t.manualList, Icon: ClipboardList },
    { id: "saved",   label: t.myLists,    Icon: BookOpen      },
    { id: "metrics", label: t.metrics,    Icon: TrendingUp    },
  ];

  const isActive = (id: View) => view === id || (view === "results" && id === "input");

  return (
    <div style={{ minHeight: "100svh", background: "#09090b", color: "#fff" }}>
      {/* Grid bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.025, backgroundImage: "linear-gradient(#a3e635 1px, transparent 1px), linear-gradient(90deg, #a3e635 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #1f1f22", backdropFilter: "blur(16px)", background: "rgba(9,9,11,0.85)" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 16px", height: "54px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          {/* Logo */}
          <button onClick={() => setView("input")} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, background: "#a3e635", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LayoutGrid size={14} style={{ color: "#09090b" }} />
            </div>
            <span className="font-display" style={{ color: "#fff", fontSize: "14px", fontWeight: 700 }}>
              smart<span style={{ color: "#a3e635" }}>shopper</span>
            </span>
          </button>

          {/* Nav */}
          <nav style={{ display: "flex", gap: "2px", overflowX: "auto" }}>
            {NAV.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setView(id)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "8px", border: "none", background: isActive(id) ? "#27272a" : "transparent", color: isActive(id) ? "#fff" : "#71717a", cursor: "pointer", fontSize: "11px", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </nav>

          {/* Language selector */}
          <LangSelector />
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 20px", position: "relative" }}>
        {view === "input" && (
          <div className="animate-fade-in">
            <ListInput onCompare={(items) => handleCompare(items)} loading={loading} />
            {error && <p style={{ color: "#f87171", fontSize: "12px", textAlign: "center", marginTop: "12px" }}>{error}</p>}
          </div>
        )}

        {view === "manual" && (
          <div className="animate-fade-in">
            <ManualList
              items={manualItems}
              onChange={setManualItems}
              onCompare={(scraped, manual) => handleCompare(scraped, [], manual)}
              loading={loading}
              scrapedItems={lastItems}
            />
            {error && <p style={{ color: "#f87171", fontSize: "12px", textAlign: "center", marginTop: "12px" }}>{error}</p>}
          </div>
        )}

        {view === "results" && result && (
          <div className="animate-fade-in">
            <ComparisonDashboard
              data={result}
              onNewSearch={() => setView("input")}
              onSave={handleSave}
              onForceRefresh={handleForceRefresh}
            />
          </div>
        )}

        {view === "metrics" && <div className="animate-fade-in"><PriceMetrics /></div>}

        {view === "saved" && (
          <div className="animate-fade-in">
            <SavedLists onCompareList={(items) => handleCompare(items)} />
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
            <p className="font-display" style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 8px" }}>{t.scraping}</p>
            <p style={{ color: "#71717a", fontSize: "13px", margin: "0 0 16px" }}>{t.scrapingHint}</p>
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

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  );
}
