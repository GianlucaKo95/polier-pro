import { useState } from "react";
import { PlanErkennung } from "./PlanErkennung.jsx";
import { leereAufgabe } from "../lib/utils.js";
import { AUFGABEN_VORLAGEN, AUFGABEN_TYPEN } from "../config/konstanten.js";
import { Label, inputStyle } from "../components/Label.jsx";

export function SchnellErstellung({ onSave, onClose }) {
  const [modus, setModus] = useState("vorlage"); // vorlage | einzeln | liste | plan

  if (modus === "plan") {
    return <PlanErkennung onSave={onSave} onClose={onClose} onZurueck={() => setModus("vorlage")} />;
  }

  // ── Einzeln: minimales Formular ──
  const [titel,     setTitel]     = useState("");
  const [typ,       setTyp]       = useState("beton");
  const [m2,        setM2]        = useState("");
  const [betonsorte,setBetonsorte]= useState("");

  // ── Liste: mehrzeiliger Text ──
  const [listeText, setListeText] = useState("");

  function ausVorlage(v) {
    onSave([{
      ...leereAufgabe(),
      id: Date.now() + Math.random(),
      titel: v.name,
      typ: v.typ,
      betonsorte: v.betonsorte,
    }]);
  }

  function einzelnSpeichern() {
    if (!titel.trim()) return;
    onSave([{
      ...leereAufgabe(),
      id: Date.now() + Math.random(),
      titel: titel.trim(),
      typ,
      m2: Number(m2) || 0,
      betonsorte,
    }]);
  }

  function listeSpeichern() {
    // Jede Zeile = eine Aufgabe. Format: "Titel" oder "Titel | 45" (mit m²)
    const zeilen = listeText.split("\n").map(l => l.trim()).filter(Boolean);
    if (zeilen.length === 0) return;
    const neue = zeilen.map(zeile => {
      const [titelTeil, m2Teil] = zeile.split("|").map(s => s.trim());
      return {
        ...leereAufgabe(),
        id: Date.now() + Math.random(),
        titel: titelTeil || zeile,
        typ: "beton",
        m2: m2Teil ? Number(m2Teil.replace(/[^\d.,]/g,"").replace(",",".")) || 0 : 0,
      };
    });
    onSave(neue);
  }

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0,
      background:"var(--bg)", zIndex:500, overflowY:"auto",
      WebkitOverflowScrolling:"touch",
      fontFamily:"'Segoe UI', system-ui, sans-serif" }}>

      <div style={{ background:"var(--surface)", padding:"14px 18px",
        borderBottom:"3px solid var(--yellow)", position:"sticky", top:0,
        zIndex:10, display:"flex", justifyContent:"space-between",
        alignItems:"center" }}>
        <div style={{ color:"var(--yellow)", fontWeight:700, fontSize:17 }}>
          ➕ Aufgabe(n) anlegen
        </div>
        <button onClick={onClose}
          style={{ background:"var(--surface2)", border:"1px solid var(--border)",
            color:"var(--text)", borderRadius:8, padding:"6px 14px",
            cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>✕</button>
      </div>

      <div style={{ padding:"18px 16px 100px" }}>
        {/* Modus-Umschalter */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:18 }}>
          {[["vorlage","📋 Vorlage"],["einzeln","✏️ Einzeln"],["liste","📝 Liste"],["plan","📐 DXF"]].map(([k,l]) => (
            <button key={k} onClick={() => setModus(k)}
              style={{ background: modus===k ? "var(--yellow)" : "var(--surface2)",
                color: modus===k ? "#1a1200" : "var(--muted)",
                border:`1.5px solid ${modus===k ? "var(--yellow)" : "var(--border)"}`,
                borderRadius:10, padding:9, fontWeight: modus===k ? 700 : 400,
                cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>{l}</button>
          ))}
        </div>

        {/* VORLAGE: ein Tap → sofort angelegt */}
        {modus === "vorlage" && (
          <div>
            <div style={{ color:"var(--muted)", fontSize:12, marginBottom:12,
              lineHeight:1.5 }}>
              Häufige Aufgabentypen antippen — wird sofort mit sinnvollen
              Standardwerten angelegt. Details kannst du danach ergänzen.
            </div>
            {AUFGABEN_VORLAGEN.map((v, i) => (
              <div key={i} onClick={() => ausVorlage(v)}
                style={{ background:"var(--surface)", borderRadius:12,
                  padding:"14px 16px", marginBottom:8, cursor:"pointer",
                  border:"1.5px solid var(--border)",
                  borderLeftWidth:4,
                  borderLeftColor:AUFGABEN_TYPEN[v.typ]?.farbe,
                  display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:22 }}>{v.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ color:"var(--text)", fontWeight:700, fontSize:14 }}>
                    {v.name}
                  </div>
                  <div style={{ color:"var(--muted)", fontSize:11, marginTop:2 }}>
                    {AUFGABEN_TYPEN[v.typ]?.label}
                    {v.betonsorte && ` · ${v.betonsorte}`}
                  </div>
                </div>
                <div style={{ color:"var(--muted)", fontSize:20 }}>›</div>
              </div>
            ))}
          </div>
        )}

        {/* EINZELN: minimales Formular */}
        {modus === "einzeln" && (
          <div>
            <div style={{ marginBottom:14 }}>
              <Label>Titel *</Label>
              <input value={titel} onChange={e=>setTitel(e.target.value)}
                placeholder="z.B. Bodenplatte B1" style={inputStyle()}
                autoFocus />
            </div>
            <div style={{ marginBottom:14 }}>
              <Label>Typ</Label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
                {Object.entries(AUFGABEN_TYPEN).filter(([k])=>k!=="mangel").map(([k,t]) => (
                  <button key={k} onClick={() => setTyp(k)}
                    style={{ background: typ===k ? t.farbe+"22" : "var(--surface2)",
                      border:`1.5px solid ${typ===k ? t.farbe : "var(--border)"}`,
                      borderRadius:20, padding:"6px 12px", cursor:"pointer",
                      fontSize:12, fontWeight: typ===k ? 700 : 400,
                      color: typ===k ? t.farbe : "var(--muted)",
                      fontFamily:"inherit" }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
            {typ === "beton" && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10,
                marginBottom:14 }}>
                <div>
                  <Label>Fläche (m²)</Label>
                  <input type="number" value={m2} onChange={e=>setM2(e.target.value)}
                    placeholder="0" style={inputStyle()} />
                </div>
                <div>
                  <Label>Betonsorte</Label>
                  <input value={betonsorte} onChange={e=>setBetonsorte(e.target.value)}
                    placeholder="C25/30" style={inputStyle()} />
                </div>
              </div>
            )}
            <button onClick={einzelnSpeichern} disabled={!titel.trim()}
              style={{ width:"100%", background: titel.trim() ? "var(--yellow)" : "var(--surface2)",
                color: titel.trim() ? "#1a1200" : "var(--muted)",
                border:"none", borderRadius:12, padding:14, fontWeight:800,
                cursor: titel.trim() ? "pointer" : "default", fontSize:15,
                fontFamily:"inherit", marginTop:4 }}>
              💾 Anlegen
            </button>
          </div>
        )}

        {/* LISTE: mehrere auf einmal */}
        {modus === "liste" && (
          <div>
            <div style={{ color:"var(--muted)", fontSize:12, marginBottom:10,
              lineHeight:1.5 }}>
              Ein Betonfeld pro Zeile. Optional Fläche mit „|" trennen:
              <br/><code style={{ background:"var(--surface2)", padding:"1px 6px",
                borderRadius:4, fontSize:11 }}>Bodenplatte B1 | 120</code>
            </div>
            <textarea rows={10} value={listeText}
              onChange={e=>setListeText(e.target.value)}
              placeholder={"Bodenplatte B1 | 120\nBodenplatte B2 | 135\nWand C1 Nord | 64\nWand C2 Ost"}
              style={{ width:"100%", background:"var(--surface2)", color:"var(--text)",
                border:"1.5px solid var(--border)", borderRadius:10, padding:12,
                fontSize:13, resize:"none", boxSizing:"border-box",
                fontFamily:"monospace", marginBottom:14 }} />
            <button onClick={listeSpeichern} disabled={!listeText.trim()}
              style={{ width:"100%", background: listeText.trim() ? "var(--yellow)" : "var(--surface2)",
                color: listeText.trim() ? "#1a1200" : "var(--muted)",
                border:"none", borderRadius:12, padding:14, fontWeight:800,
                cursor: listeText.trim() ? "pointer" : "default", fontSize:15,
                fontFamily:"inherit" }}>
              💾 {listeText.split("\n").filter(l=>l.trim()).length || 0} Aufgabe(n) anlegen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
