import { useState, useEffect } from "react";
import { BookOpen, ShoppingCart, Trash2, ChevronRight } from "lucide-react";

const BASE_URL = "http://localhost:3001";

interface SavedList {
  id: string;
  name: string;
  createdAt: string;
  items: { id: string; quantity: number; product: { name: string; category: string } }[];
}

interface Props {
  onCompareList: (items: string[]) => void;
}

export default function SavedLists({ onCompareList }: Props) {
  const [lists,   setLists]   = useState<SavedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function fetchLists() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/lists`);
      const data = await res.json();
      setLists(data);
    } catch (e) {
      console.error("Error cargando listas:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLists(); }, []);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "64px 0" }}>
        <div style={{ width: 24, height: 24, border: "2px solid #27272a", borderTopColor: "#a3e635", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#52525b", fontSize: "13px" }}>Cargando listas...</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "860px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "999px", border: "1px solid #3f3f46", background: "#18181b", color: "#71717a", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>
          <BookOpen size={11} /> MIS LISTAS
        </div>
        <h2 className="font-display" style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Listas guardadas</h2>
        <p style={{ color: "#52525b", fontSize: "13px", margin: 0 }}>
          {lists.length === 0 ? "Aún no tienes listas guardadas." : `${lists.length} lista${lists.length !== 1 ? "s" : ""} guardada${lists.length !== 1 ? "s" : ""}.`}
        </p>
      </div>

      {/* Empty state */}
      {lists.length === 0 && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "64px 24px", textAlign: "center" }}>
          <BookOpen size={32} style={{ color: "#3f3f46", margin: "0 auto 12px" }} />
          <p style={{ color: "#52525b", fontSize: "13px", margin: "0 0 4px" }}>No hay listas guardadas todavía.</p>
          <p style={{ color: "#3f3f46", fontSize: "12px", margin: 0 }}>Compara una lista y guárdala con un nombre.</p>
        </div>
      )}

      {/* Lists */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {lists.map((list) => (
          <div key={list.id} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "14px", overflow: "hidden" }}>
            {/* List header */}
            <button
              onClick={() => setExpanded(expanded === list.id ? null : list.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <div>
                <p className="font-display" style={{ color: "#fff", fontSize: "15px", fontWeight: 600, margin: "0 0 4px" }}>{list.name}</p>
                <p style={{ color: "#52525b", fontSize: "11px", margin: 0 }}>
                  {list.items.length} producto{list.items.length !== 1 ? "s" : ""} · {formatDate(list.createdAt)}
                </p>
              </div>
              <ChevronRight size={16} style={{ color: "#52525b", transform: expanded === list.id ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
            </button>

            {/* Expanded items */}
            {expanded === list.id && (
              <div style={{ borderTop: "1px solid #27272a" }}>
                <div style={{ padding: "8px 0" }}>
                  {list.items.map((item) => (
                    <div key={item.id} style={{ padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ color: "#e4e4e7", fontSize: "13px", textTransform: "capitalize" }}>{item.product.name}</span>
                      <span style={{ color: "#52525b", fontSize: "11px" }}>{item.product.category}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ padding: "12px 20px", borderTop: "1px solid #27272a", display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => onCompareList(list.items.map((i) => i.product.name))}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", background: "#a3e635", border: "none", borderRadius: "10px", color: "#09090b", fontFamily: "'Syne', sans-serif", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                  >
                    <ShoppingCart size={14} /> Comparar esta lista
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
