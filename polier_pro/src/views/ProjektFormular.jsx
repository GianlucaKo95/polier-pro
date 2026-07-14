import { useState } from "react";
import { leerProjekt } from "../lib/utils.js";
import { Label, inputStyle } from "../components/Label.jsx";
import { PROJEKTTYPEN, ALLE_GEWERKE } from "../config/konstanten.js";

export function ProjektFormular({ initial, onSave, onClose, subs = [], speicherFehler = "" }) {
  const [p, setP] = useState(initial || leerProjekt());
  const [wirdGespeichert, setWirdGespeichert] = useState(false);
  const FARBEN = ["#F5C400","#4A9EE0","#2EAF6A","#C45C2A","#9B59B6","#E84393"];
  const valid = p.name.trim().length > 0;

  async function speichernKlick() {
    if (!valid) return;
    setWirdGespeichert(true);
    await onSave(p);
    // Formular schließt sich nur bei Erfolg (onClose wird vom Parent via
    // setNeuProjekt(false) ausgelöst) — bei Fehler bleibt wirdGespeichert
    // kurz sichtbar und die Fehlermeldung erscheint über speicherFehler.
    setWirdGespeichert(false);
  }

  function toggleSub(id) {
    setP(prev => ({
      ...prev,
      subIds: (prev.subIds||[]).includes(id)
        ? (prev.subIds||[]).filter(x=>x!==id)
        : [...(prev.subIds||[]), id]
    }));
  }

  // Fullscreen statt Modal — vermeidet iOS position:fixed Probleme
  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0,
      background:"var(--bg)", zIndex:500, overflowY:"auto",
      WebkitOverflowScrolling:"touch",
      fontFamily:"'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background:"var(--surface)", padding:"14px 18px",
        borderBottom:"3px solid var(--yellow)", position:"sticky", top:0,
        zIndex:10, display:"flex", justifyContent:"space-between",
        alignItems:"center" }}>
        <div style={{ color:"var(--yellow)", fontWeight:700, fontSize:17 }}>
          {initial?.name ? "✏️ Baustelle bearbeiten" : "➕ Neue Baustelle"}
        </div>
        <button onClick={onClose}
          style={{ background:"var(--surface2)", border:"1px solid var(--border)",
            color:"var(--text)", borderRadius:8, padding:"6px 14px",
            cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>✕</button>
      </div>

      <div style={{ padding:"20px 16px 100px" }}>

        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:18 }}>
          <div style={{ color:"var(--yellow)", fontWeight:700, fontSize:17 }}>
            {initial?.name ? "✏️ Baustelle bearbeiten" : "➕ Neue Baustelle"}
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:"var(--muted)",
              fontSize:24, cursor:"pointer" }}>✕</button>
        </div>

        {/* Projekttyp */}
        <div style={{ marginBottom:18 }}>
          <Label>Projekttyp *</Label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:6 }}>
            {Object.entries(PROJEKTTYPEN).map(([key, cfg]) => (
              <div key={key} onClick={() => setP(prev=>({...prev, typ:key}))}
                style={{ background: p.typ===key ? "var(--ybg)" : "var(--surface2)",
                  border:`2px solid ${p.typ===key ? "var(--yellow)" : "var(--border)"}`,
                  borderRadius:12, padding:"12px 12px", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:8,
                  transition:"all 0.15s" }}>
                <span style={{ fontSize:20 }}>{cfg.icon}</span>
                <span style={{ color: p.typ===key ? "var(--text)" : "var(--muted)",
                  fontSize:12, fontWeight: p.typ===key ? 700 : 400 }}>
                  {cfg.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {[
          ["Projektname *",  "name",          "Neubau Wohnanlage Nord"],
          ["Straße + Nr.",   "adresse",       "Musterstraße 1"],
        ].map(([label, key, ph]) => (
          <div key={key} style={{ marginBottom:13 }}>
            <Label>{label}</Label>
            <input value={p[key]} onChange={e => setP(prev=>({...prev,[key]:e.target.value}))}
              placeholder={ph} style={inputStyle()} />
          </div>
        ))}

        {/* PLZ + Ort getrennt — Ort wird für die Wetter-Standortsuche genutzt,
            eine vollständige Straßenadresse ist dafür nicht nötig und führte
            bisher zu missverständlicher Anzeige (Straßenname statt Stadt). */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:10, marginBottom:13 }}>
          <div>
            <Label>PLZ</Label>
            <input value={p.plz||""} onChange={e => setP(prev=>({...prev,plz:e.target.value}))}
              placeholder="80331" style={inputStyle()} />
          </div>
          <div>
            <Label>Ort *</Label>
            <input value={p.ort||""} onChange={e => setP(prev=>({...prev,ort:e.target.value}))}
              placeholder="München" style={inputStyle()} />
          </div>
        </div>

        {[
          ["Projektnummer",  "projektnummer", "PRJ-2025-001"],
          ["Bauleiter",      "bauleiter",     "Max Mustermann"],
          ["Auftraggeber",   "auftraggeber",  "Muster GmbH"],
        ].map(([label, key, ph]) => (
          <div key={key} style={{ marginBottom:13 }}>
            <Label>{label}</Label>
            <input value={p[key]} onChange={e => setP(prev=>({...prev,[key]:e.target.value}))}
              placeholder={ph} style={inputStyle()} />
          </div>
        ))}

        {/* Farbe */}
        <div style={{ marginBottom:16 }}>
          <Label>Projektfarbe</Label>
          <div style={{ display:"flex", gap:10, marginTop:6 }}>
            {FARBEN.map(f => (
              <div key={f} onClick={() => setP(prev=>({...prev,farbe:f}))}
                style={{ width:36, height:36, borderRadius:18, background:f,
                  cursor:"pointer",
                  border:`3px solid ${p.farbe===f ? "var(--surface)" : "transparent"}`,
                  boxShadow: p.farbe===f ? `0 0 0 2px ${f}` : "none",
                  transition:"transform 0.15s",
                  transform: p.farbe===f ? "scale(1.2)" : "scale(1)" }} />
            ))}
          </div>
        </div>

        {/* Subunternehmer */}
        {subs.filter(s=>s.status==="aktiv").length > 0 && (
          <div style={{ marginBottom:20 }}>
            <Label>Subunternehmer zuweisen</Label>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:8 }}>
              {subs.filter(s=>s.status==="aktiv").map(s => {
                const aktiv = (p.subIds||[]).includes(s.id);
                return (
                  <div key={s.id} onClick={() => toggleSub(s.id)}
                    style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center",
                      background: aktiv ? "var(--bbg)" : "var(--surface2)",
                      border:`1.5px solid ${aktiv ? "var(--blue)" : "var(--border)"}`,
                      borderRadius:10, padding:"10px 12px", cursor:"pointer" }}>
                    <div>
                      <div style={{ color:"var(--text)", fontSize:13,
                        fontWeight: aktiv ? 700 : 400 }}>{s.name}</div>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:3 }}>
                        {(s.gewerke||[]).map(k => {
                          const g = ALLE_GEWERKE.find(x=>x.key===k);
                          return g ? (
                            <span key={k} style={{ color:"var(--muted)", fontSize:10 }}>
                              {g.icon} {g.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <div style={{ fontSize:16, color: aktiv ? "var(--blue)" : "var(--muted)" }}>
                      {aktiv ? "✓" : "○"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {speicherFehler && (
          <div style={{ background:"var(--rbg)", color:"var(--red)", borderRadius:12,
            padding:"12px 16px", marginBottom:14, fontSize:12,
            border:"1px solid var(--red)" }}>
            ⚠️ {speicherFehler}
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, background:"var(--surface2)", color:"var(--muted)",
              border:"1.5px solid var(--border)", borderRadius:12, padding:14,
              cursor:"pointer", fontFamily:"inherit" }}>
            Abbrechen
          </button>
          <button onClick={speichernKlick} disabled={!valid || wirdGespeichert}
            style={{ flex:2,
              background: valid ? "var(--yellow)" : "var(--surface2)",
              color: valid ? "#1a1200" : "var(--muted)",
              border:"none", borderRadius:12, padding:14, fontWeight:800,
              cursor: valid && !wirdGespeichert ? "pointer" : "default", fontSize:15,
              fontFamily:"inherit" }}>
            {wirdGespeichert ? "⏳ Speichert…" : "💾 Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
