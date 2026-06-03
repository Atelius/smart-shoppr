import { useState, useRef, useEffect } from "react";
import { useLang } from "./LangContext";
import { LANGUAGES } from "./i18n";
import { ChevronDown } from "lucide-react";

export default function LangSelector() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === lang)!;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 10px", borderRadius: "8px", border: "1px solid #27272a", background: open ? "#27272a" : "transparent", color: "#a1a1aa", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", transition: "all 0.15s" }}
      >
        <span style={{ fontSize: "14px" }}>{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown size={11} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#18181b", border: "1px solid #27272a", borderRadius: "10px", overflow: "hidden", zIndex: 100, minWidth: "130px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "9px 14px", background: lang === l.code ? "#27272a" : "transparent", border: "none", cursor: "pointer", color: lang === l.code ? "#fff" : "#a1a1aa", fontSize: "13px", fontFamily: "inherit", textAlign: "left" }}
            >
              <span style={{ fontSize: "15px" }}>{l.flag}</span>
              <span>{l.label}</span>
              {lang === l.code && <span style={{ marginLeft: "auto", color: "#a3e635", fontSize: "10px" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
