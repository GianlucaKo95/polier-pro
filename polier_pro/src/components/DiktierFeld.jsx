import { useState, useEffect, useRef } from "react";
import { Label } from "./Label.jsx";

export function DiktierFeld({ label, value, rows = 3, onChange }) {
  const [aktiv,      setAktiv]      = useState(false);
  const [unterstuetzt, setUnterstuetzt] = useState(true);
  const [interim,    setInterim]    = useState(""); // Live-Vorschau während Diktat
  const erkennerRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setUnterstuetzt(false); return; }

    const er = new SR();
    er.lang           = "de-DE";
    er.continuous     = true;   // Läuft bis manuell gestoppt
    er.interimResults = true;   // Live-Vorschau während Sprechen

    er.onresult = (e) => {
      let finalText  = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText  += t;
        else                       interimText += t;
      }
      if (finalText) {
        // Finalen Text anhängen (mit Leerzeichen wenn schon was da ist)
        onChange((value + (value && !value.endsWith(" ") ? " " : "") + finalText).trimStart());
      }
      setInterim(interimText);
    };

    er.onerror = (e) => {
      if (e.error !== "no-speech") { setAktiv(false); setInterim(""); }
    };

    er.onend = () => {
      // Wenn noch aktiv (z.B. kurze Pause), automatisch neu starten
      if (erkennerRef.current?._shouldRestart) {
        try { er.start(); } catch {}
      } else {
        setAktiv(false);
        setInterim("");
      }
    };

    erkennerRef.current = er;
    return () => { try { er.stop(); } catch {} };
  }, [value]); // value als Dep damit Closure aktuell bleibt

  function toggleDiktat() {
    const er = erkennerRef.current;
    if (!er) return;
    if (aktiv) {
      er._shouldRestart = false;
      er.stop();
      setAktiv(false);
      setInterim("");
    } else {
      er._shouldRestart = true;
      setAktiv(true);
      try { er.start(); } catch {}
    }
  }

  return (
    <div style={{ marginBottom:14 }}>
      {/* Label + Diktat-Button */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <Label>{label}</Label>
        {unterstuetzt && (
          <button onClick={toggleDiktat}
            style={{ background: aktiv ? "var(--red)" : "var(--border)",
              color: aktiv ? "#fff" : "var(--muted)",
              border: aktiv ? `1px solid ${'var(--red)'}` : `1px solid ${'var(--surface2)'}`,
              borderRadius:20, padding:"3px 10px", cursor:"pointer",
              fontSize:11, fontWeight: aktiv ? 700 : 400,
              display:"flex", alignItems:"center", gap:5,
              transition:"all 0.2s" }}>
            {aktiv ? (
              <>
                <span style={{ width:7, height:7, borderRadius:4,
                  background:"#fff", display:"inline-block",
                  animation:"blink 1s infinite" }} />
                Diktat stoppen
              </>
            ) : "🎤 Diktieren"}
          </button>
        )}
      </div>

      {/* Pulsierende Aufnahme-Anzeige */}
      {aktiv && (
        <div style={{ background:"#2E1A1A", borderRadius:8, padding:"8px 12px",
          marginBottom:6, display:"flex", alignItems:"center", gap:8,
          border:`1px solid ${'var(--red)'}44` }}>
          <div style={{ width:8, height:8, borderRadius:4, background: "var(--red)",
            flexShrink:0, animation:"blink 1s infinite" }} />
          <div style={{ flex:1 }}>
            {interim ? (
              <span style={{ color:"#FF9999", fontSize:12, fontStyle:"italic" }}>
                {interim}
              </span>
            ) : (
              <span style={{ color: "var(--muted)", fontSize:12 }}>Sprechen Sie jetzt…</span>
            )}
          </div>
        </div>
      )}

      {/* Textarea */}
      <textarea rows={rows} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={aktiv ? "Diktat läuft…" : "Tippen oder 🎤 Diktieren"}
        style={{ width:"100%", background: aktiv ? "#1A1A2E" : "var(--surface2)",
          color: "var(--text)",
          border:`1px solid ${aktiv ? "var(--red)"+"66" : "var(--border)"}`,
          borderRadius:8, padding:10, fontSize:13, resize:"none",
          boxSizing:"border-box", transition:"border-color 0.2s, background 0.2s" }} />

      <style>{`
        @keyframes blink {
          0%, 100% { opacity:1; }
          50%       { opacity:0.2; }
        }
      `}</style>
    </div>
  );
}
