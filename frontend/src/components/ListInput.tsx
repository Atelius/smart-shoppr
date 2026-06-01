import { useState } from "react";
import { ShoppingCart, Sparkles, X } from "lucide-react";

interface ListInputProps {
  onCompare: (items: string[]) => void;
  loading: boolean;
}

const EXAMPLE = "leche\narroz\naceite vegetal\npapel higiénico\ndetergente\nyogurt\npan de caja\nfrijol negro";

function parseItems(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 1);
}

export default function ListInput({ onCompare, loading }: ListInputProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function handleCompare() {
    const items = parseItems(text);
    if (items.length === 0) { setError("Escribe al menos un producto."); return; }
    if (items.length > 20)  { setError("Máximo 20 productos por búsqueda."); return; }
    setError("");
    onCompare(items);
  }

  const count = parseItems(text).length;

  return (
    <div style={{ width: "100%", maxWidth: "640px", margin: "0 auto" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "4px 12px", borderRadius: "999px",
          border: "1px solid rgba(163,230,53,0.3)", background: "rgba(163,230,53,0.06)",
          color: "#a3e635", fontSize: "11px", fontFamily: "inherit",
          letterSpacing: "0.1em", marginBottom: "1rem"
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a3e635", animation: "pulse 2s infinite" }} />
          COMPARADOR ACTIVO
        </div>
        <h1 className="font-display" style={{ fontSize: "2.2rem", fontWeight: 800, lineHeight: 1.15, color: "#fff", margin: "0 0 0.5rem" }}>
          Tu lista de súper,<br />
          <span style={{ color: "#a3e635" }}>al mejor precio.</span>
        </h1>
        <p style={{ color: "#71717a", fontSize: "14px", margin: 0 }}>
          Un producto por línea o separados por comas. Comparamos HEB y Soriana en tiempo real.
        </p>
      </div>

      {/* Card */}
      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", overflow: "hidden" }}>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setError(""); }}
          placeholder={"leche\narroz\npapel higiénico\ndetergente\n..."}
          rows={10}
          style={{
            width: "100%", background: "transparent", border: "none", outline: "none",
            padding: "20px", color: "#e4e4e7", fontFamily: "inherit", fontSize: "14px",
            resize: "none", lineHeight: 1.7, display: "block", boxSizing: "border-box"
          }}
        />
        <div style={{
          padding: "10px 20px", borderTop: "1px solid #27272a",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ color: "#52525b", fontSize: "12px" }}>{count} / 20 productos</span>
            <button
              onClick={() => { setText(EXAMPLE); setError(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", padding: 0, fontFamily: "inherit" }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#a3e635")}
              onMouseOut={(e)  => (e.currentTarget.style.color = "#52525b")}
            >
              <Sparkles size={11} /> cargar ejemplo
            </button>
          </div>
          {text && (
            <button onClick={() => { setText(""); setError(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", padding: 0, display: "flex" }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#a1a1aa")}
              onMouseOut={(e)  => (e.currentTarget.style.color = "#52525b")}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {error && <p style={{ color: "#f87171", fontSize: "12px", textAlign: "center", marginTop: "8px" }}>{error}</p>}

      <button
        onClick={handleCompare}
        disabled={loading || !text.trim()}
        style={{
          marginTop: "12px", width: "100%", padding: "14px",
          background: loading || !text.trim() ? "rgba(163,230,53,0.4)" : "#a3e635",
          color: "#09090b", border: "none", borderRadius: "12px",
          fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 700,
          cursor: loading || !text.trim() ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          transition: "background 0.2s"
        }}
      >
        {loading ? (
          <>
            <span style={{ width: 16, height: 16, border: "2px solid rgba(9,9,11,0.3)", borderTopColor: "#09090b", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
            Scraping en progreso...
          </>
        ) : (
          <><ShoppingCart size={16} /> Comparar precios</>
        )}
      </button>

      {loading && (
        <p style={{ marginTop: "8px", color: "#52525b", fontSize: "12px", textAlign: "center", animation: "pulse 2s infinite" }}>
          Playwright navega las tiendas · esto puede tardar 15–30 segundos
        </p>
      )}
    </div>
  );
}
