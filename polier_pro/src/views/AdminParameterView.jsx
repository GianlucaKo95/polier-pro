import { useState } from "react";
import { PreisFormular } from "./PreisFormular.jsx";
import { VorlageFormular } from "./VorlageFormular.jsx";

export function AdminParameterView({ einheitspreise, setEinheitspreise, lvVorlagen, setLvVorlagen }) {
  const [aktiv,    setAktiv]    = useState("preise"); // preise | vorlagen
  const [neuPreis, setNeuPreis] = useState(null);
  const [neuVorlage,setNeuVorlage] = useState(null);
  const [editPreis, setEditPreis] = useState(null);

  function preisLoeschen(id) {
    setEinheitspreise(prev => prev.filter(p => p.id !== id));
  }

  function preisSpeichern(p) {
    if (p.id && einheitspreise.find(x=>x.id===p.id)) {
      setEinheitspreise(prev => prev.map(x => x.id===p.id ? p : x));
    } else {
      setEinheitspreise(prev => [...prev, { ...p, id:Date.now() }]);
    }
    setNeuPreis(null); setEditPreis(null);
  }

  return (
    <div>
      <div style={{ color:"var(--text)", fontWeight:700, fontSize:15, marginBottom:14 }}>
        ⚙️ Angebots-Parameter
      </div>

      {/* Tab-Toggle */}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {[["preise","💰 Einheitspreise"],["vorlagen","📋 LV-Vorlagen"]].map(([k,l]) => (
          <button key={k} onClick={() => setAktiv(k)}
            style={{ flex:1, background: aktiv===k ? "var(--yellow)" : "var(--surface2)",
              color: aktiv===k ? "#1a1200" : "var(--muted)",
              border:`1.5px solid ${aktiv===k ? "var(--yellow)" : "var(--border)"}`,
              borderRadius:10, padding:10, fontWeight: aktiv===k ? 700 : 400,
              cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>{l}</button>
        ))}
      </div>

      {/* EINHEITSPREISE */}
      {aktiv === "preise" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:10 }}>
            <div style={{ color:"var(--muted)", fontSize:12 }}>
              {einheitspreise.length} Positionen
            </div>
            <button onClick={() => setNeuPreis({ gewerk:"", einheit:"m²", preis:0, beschreibung:"" })}
              style={{ background:"var(--yellow)", color:"#1a1200", border:"none",
                borderRadius:10, padding:"7px 14px", fontWeight:700,
                cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
              + Position
            </button>
          </div>

          {einheitspreise.map(p => (
            <div key={p.id} style={{ background:"var(--surface)", borderRadius:12,
              padding:"12px 14px", marginBottom:8,
              border:"1.5px solid var(--border)" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ color:"var(--text)", fontWeight:700, fontSize:13 }}>
                    {p.gewerk} · {p.beschreibung}
                  </div>
                  <div style={{ color:"var(--muted)", fontSize:12, marginTop:2 }}>
                    {p.einheit} · {p.preis.toLocaleString("de-DE")} €/{p.einheit}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => setEditPreis(p)}
                    style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                      color:"var(--muted)", borderRadius:8, padding:"4px 10px",
                      cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>✏️</button>
                  <button onClick={() => preisLoeschen(p.id)}
                    style={{ background:"var(--rbg)", border:"1px solid var(--red)",
                      color:"var(--red)", borderRadius:8, padding:"4px 10px",
                      cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LV-VORLAGEN */}
      {aktiv === "vorlagen" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:10 }}>
            <div style={{ color:"var(--muted)", fontSize:12 }}>
              {lvVorlagen.length} Vorlagen
            </div>
            <button onClick={() => setNeuVorlage({ name:"", gewerk:"", positionen:[] })}
              style={{ background:"var(--yellow)", color:"#1a1200", border:"none",
                borderRadius:10, padding:"7px 14px", fontWeight:700,
                cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
              + Vorlage
            </button>
          </div>

          {lvVorlagen.map(v => (
            <div key={v.id} style={{ background:"var(--surface)", borderRadius:12,
              padding:"12px 14px", marginBottom:8,
              border:"1.5px solid var(--border)" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:6 }}>
                <div style={{ color:"var(--text)", fontWeight:700, fontSize:13 }}>
                  {v.name}
                </div>
                <button onClick={() => setLvVorlagen(prev => prev.filter(x=>x.id!==v.id))}
                  style={{ background:"var(--rbg)", border:"1px solid var(--red)",
                    color:"var(--red)", borderRadius:8, padding:"4px 10px",
                    cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>✕</button>
              </div>
              {v.positionen.map((pos,i) => (
                <div key={i} style={{ color:"var(--muted)", fontSize:11,
                  padding:"3px 0", borderBottom:"1px solid var(--border)" }}>
                  {pos.bez} · {pos.einheit}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Preis-Formular */}
      {(neuPreis || editPreis) && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"var(--bg)", zIndex:600, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
          <div style={{ background:"var(--surface)", borderRadius:"20px 20px 0 0",
            padding:22, width:"100%", maxWidth:480 }}>
            <PreisFormular
              initial={editPreis || neuPreis}
              onSave={preisSpeichern}
              onClose={() => { setNeuPreis(null); setEditPreis(null); }}
            />
          </div>
        </div>
      )}

      {/* Vorlagen-Formular */}
      {neuVorlage && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"var(--bg)", zIndex:600, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
          <div style={{ background:"var(--surface)", borderRadius:"20px 20px 0 0",
            padding:22, width:"100%", maxWidth:480, maxHeight:"80vh",
            overflowY:"auto" }}>
            <VorlageFormular
              initial={neuVorlage}
              einheitspreise={einheitspreise}
              onSave={v => { setLvVorlagen(prev=>[...prev,{...v,id:Date.now()}]); setNeuVorlage(null); }}
              onClose={() => setNeuVorlage(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
