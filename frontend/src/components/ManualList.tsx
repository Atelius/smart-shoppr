import { useState } from "react";
import { Plus, Trash2, ShoppingCart, Store } from "lucide-react";
import { useLang } from "../i18n/LangContext";

export interface ManualItem {
  id: string;
  name: string;
  store: string;
  price: number;
}

interface Props {
  items: ManualItem[];
  onChange: (items: ManualItem[]) => void;
  onCompare: (scrapedItems: string[], manualItems: ManualItem[]) => void;
  loading: boolean;
  // Items being scraped (from ListInput) to merge into comparison
  scrapedItems: string[];
}

const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export default function ManualList({ items, onChange, onCompare, loading, scrapedItems }: Props) {
  const { t } = useLang();
  const [name,  setName]  = useState("");
  const [store, setStore] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  function handleAdd() {
    if (!name.trim())  { setError("Escribe el nombre del producto."); return; }
    if (!store.trim()) { setError("Escribe el nombre de la tienda."); return; }
    const p = parseFloat(price);
    if (!price || isNaN(p) || p <= 0) { setError("Escribe un precio válido."); return; }

    setError("");
    onChange([
      ...items,
      { id: crypto.randomUUID(), name: name.trim().toLowerCase(), store: store.trim(), price: p },
    ]);
    setName(""); setStore(""); setPrice("");
  }

  function handleDelete(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
  }

  const totalManual = items.reduce((s, i) => s + i.price, 0);

  // Group by store for preview
  const byStore: Record<string, ManualItem[]> = {};
  for (const item of items) {
    if (!byStore[item.store]) byStore[item.store] = [];
    byStore[item.store].push(item);
  }

  return (
    <div style={{ width: "100%", maxWidth: "640px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "999px", border: "1px solid rgba(163,230,53,0.3)", background: "rgba(163,230,53,0.06)", color: "#a3e635", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>
          <Store size={11} /> {t.manualList.toUpperCase()}
        </div>
        <h1 className="font-display" style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
          {t.manualTitle}
        </h1>
        <p style={{ color: "#71717a", fontSize: "14px", margin: 0 }}>{t.manualSubtitle}</p>
      </div>

      {/* Add form */}
      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
          <div>
            <label style={{ color: "#52525b", fontSize: "10px", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>{t.productName.toUpperCase()}</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="leche, arroz..."
              style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: "8px", padding: "9px 12px", color: "#e4e4e7", fontFamily: "inherit", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ color: "#52525b", fontSize: "10px", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>{t.storeName.toUpperCase()}</label>
            <input
              value={store}
              onChange={(e) => { setStore(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="Sam's, Costco..."
              style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: "8px", padding: "9px 12px", color: "#e4e4e7", fontFamily: "inherit", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: "#52525b", fontSize: "10px", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>{t.price.toUpperCase()}</label>
            <input
              type="number"
              value={price}
              onChange={(e) => { setPrice(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: "8px", padding: "9px 12px", color: "#e4e4e7", fontFamily: "inherit", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <button
            onClick={handleAdd}
            style={{ padding: "9px 16px", background: "#a3e635", border: "none", borderRadius: "8px", color: "#09090b", fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
          >
            <Plus size={14} /> {t.addProduct}
          </button>
        </div>
        {error && <p style={{ color: "#f87171", fontSize: "11px", margin: "8px 0 0" }}>{error}</p>}
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", padding: "40px 24px", textAlign: "center" }}>
          <Store size={28} style={{ color: "#3f3f46", margin: "0 auto 10px" }} />
          <p style={{ color: "#52525b", fontSize: "13px", margin: 0 }}>{t.emptyManual}</p>
        </div>
      ) : (
        <div>
          {Object.entries(byStore).map(([storeName, storeItems]) => (
            <div key={storeName} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", overflow: "hidden", marginBottom: "10px" }}>
              <div style={{ padding: "9px 16px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", gap: "8px" }}>
                <Store size={12} style={{ color: "#52525b" }} />
                <span style={{ color: "#a1a1aa", fontSize: "11px", letterSpacing: "0.08em" }}>{storeName.toUpperCase()}</span>
              </div>
              {storeItems.map((item, i) => (
                <div key={item.id} style={{ padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: i > 0 ? "1px solid #1f1f22" : "none" }}>
                  <div>
                    <p style={{ color: "#e4e4e7", fontSize: "13px", margin: "0 0 2px", textTransform: "capitalize" }}>{item.name}</p>
                    <span style={{ fontSize: "9px", color: "#a3e635", border: "1px solid rgba(163,230,53,0.3)", borderRadius: "4px", padding: "1px 5px" }}>{t.manualBadge}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: "#a3e635", fontSize: "13px", fontWeight: 700 }}>{fmt(item.price)}</span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#3f3f46", display: "flex", padding: 2 }}
                      onMouseOver={(e) => (e.currentTarget.style.color = "#f87171")}
                      onMouseOut={(e)  => (e.currentTarget.style.color = "#3f3f46")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Total manual */}
          <div style={{ background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.15)", borderRadius: "12px", padding: "12px 16px", display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.08em" }}>SUBTOTAL MANUAL</span>
            <span className="font-display" style={{ color: "#a3e635", fontSize: "1.1rem", fontWeight: 700 }}>{fmt(totalManual)}</span>
          </div>

          {/* Compare button */}
          <button
            onClick={() => onCompare(scrapedItems, items)}
            disabled={loading}
            style={{ width: "100%", padding: "14px", background: loading ? "rgba(163,230,53,0.4)" : "#a3e635", border: "none", borderRadius: "12px", color: "#09090b", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            {loading ? (
              <>
                <span style={{ width: 16, height: 16, border: "2px solid rgba(9,9,11,0.3)", borderTopColor: "#09090b", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                {t.scraping}
              </>
            ) : (
              <><ShoppingCart size={16} /> {t.compareManual}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
