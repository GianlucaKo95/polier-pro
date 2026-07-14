import { useState, useRef } from "react";
import { leereAufgabe } from "../lib/utils.js";
import { Label, inputStyle } from "../components/Label.jsx";
import { AUFGABEN_TYPEN, AUFGABEN_STATUS, AUFGABEN_PRIO } from "../config/konstanten.js";

export function AufgabenFormular({ initial, kolonnen, onSave, onClose }) {
  const [a,       setA]       = useState(initial || leereAufgabe());
  const [bilder,  setBilder]  = useState([]);
  const [planMode,setPlanMode]= useState(false);
  const fileRef               = useRef(null);
  const planRef               = useRef(null);

  function handleBild(e) {
    Array.from(e.target.files).forEach(file => {
      const r = new FileReader();
      r.onload = ev => setA(p => ({ ...p, fotos:[...p.fotos, ev.target.result] }));
      r.readAsDataURL(file);
    });
  }

  function handlePlanKlick(e) {
    if (!planRef.current || !planMode) return;
    const rect = planRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
    const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
    setA(p => ({ ...p, plan_x:Number(x), plan_y:Number(y) }));
    setPlanMode(false);
  }

  const valid = a.titel.trim().length > 0;

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0,
      background:"rgba(15,23,42,0.7)",
      zIndex:500, display:"flex", alignItems:"flex-end",
      justifyContent:"center" }}>
      <div style={{ background:"var(--surface)", borderRadius:"20px 20px 0 0",
        padding:22, width:"100%", maxWidth:520,
        maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 -4px 30px rgba(0,0,0,0.15)" }}>

        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:18 }}>
          <div style={{ color:"var(--yellow)", fontWeight:700, fontSize:17 }}>
            {initial ? "✏️ Aufgabe bearbeiten" : "➕ Neue Aufgabe"}
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:"var(--muted)",
              fontSize:24, cursor:"pointer" }}>✕</button>
        </div>

        {/* Typ */}
        <div style={{ marginBottom:14 }}>
          <Label>Aufgabentyp</Label>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
            {Object.entries(AUFGABEN_TYPEN).map(([key, t]) => (
              <button key={key} onClick={() => setA(p=>({...p, typ:key,
                ist_mangel:key==="mangel"}))}
                style={{ background: a.typ===key ? t.farbe+"22" : "var(--surface2)",
                  border:`1.5px solid ${a.typ===key ? t.farbe : "var(--border)"}`,
                  borderRadius:20, padding:"6px 12px", cursor:"pointer",
                  fontSize:12, fontWeight: a.typ===key ? 700 : 400,
                  color: a.typ===key ? t.farbe : "var(--muted)",
                  fontFamily:"inherit" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Titel */}
        <div style={{ marginBottom:13 }}>
          <Label>Titel *</Label>
          <input value={a.titel} onChange={e=>setA(p=>({...p,titel:e.target.value}))}
            placeholder="z.B. Bodenplatte B1 betonieren" style={inputStyle()} />
        </div>

        {/* Status + Priorität */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:13 }}>
          <div>
            <Label>Status</Label>
            <select value={a.status} onChange={e=>setA(p=>({...p,status:e.target.value}))}
              style={{ ...inputStyle(), padding:"11px 12px" }}>
              {Object.entries(AUFGABEN_STATUS).map(([k,s]) => (
                <option key={k} value={k}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Priorität</Label>
            <select value={a.prioritaet} onChange={e=>setA(p=>({...p,prioritaet:e.target.value}))}
              style={{ ...inputStyle(), padding:"11px 12px" }}>
              {Object.entries(AUFGABEN_PRIO).map(([k,s]) => (
                <option key={k} value={k}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Zuständig + Fällig */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:13 }}>
          <div>
            <Label>Zuständig</Label>
            <select value={a.zustaendig} onChange={e=>setA(p=>({...p,zustaendig:e.target.value}))}
              style={{ ...inputStyle(), padding:"11px 12px" }}>
              <option value="">— auswählen —</option>
              {kolonnen.map(k => (
                <option key={k.id} value={k.name}>{k.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Fällig am</Label>
            <input type="date" value={a.faellig_am}
              onChange={e=>setA(p=>({...p,faellig_am:e.target.value}))}
              style={{ ...inputStyle(), padding:"11px 12px" }} />
          </div>
        </div>

        {/* Beschreibung */}
        <div style={{ marginBottom:13 }}>
          <Label>Beschreibung</Label>
          <textarea rows={3} value={a.beschreibung}
            onChange={e=>setA(p=>({...p,beschreibung:e.target.value}))}
            placeholder="Details zur Aufgabe…"
            style={{ width:"100%", background:"var(--surface2)", color:"var(--text)",
              border:"1.5px solid var(--border)", borderRadius:10, padding:10,
              fontSize:13, resize:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
        </div>

        {/* Beton-spezifisch */}
        {a.typ === "beton" && (
          <div style={{ background:"var(--ybg)", borderRadius:12, padding:14,
            marginBottom:14, border:"1px solid var(--yellow)" }}>
            <div style={{ color:"var(--ydark)", fontWeight:700, fontSize:12,
              marginBottom:10 }}>🏗️ Betonage-Details</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div>
                <Label>Fläche (m²)</Label>
                <input type="number" value={a.m2||""}
                  onChange={e=>setA(p=>({...p,m2:Number(e.target.value)}))}
                  placeholder="0" style={inputStyle()} />
              </div>
              <div>
                <Label>Betonsorte</Label>
                <input value={a.betonsorte||""}
                  onChange={e=>setA(p=>({...p,betonsorte:e.target.value}))}
                  placeholder="C25/30" style={inputStyle()} />
              </div>
            </div>
          </div>
        )}

        {/* Mangel-spezifisch */}
        {a.ist_mangel && (
          <div style={{ background:"var(--rbg)", borderRadius:12, padding:14,
            marginBottom:14, border:"1px solid var(--red)" }}>
            <div style={{ color:"var(--red)", fontWeight:700, fontSize:12,
              marginBottom:10 }}>⚠️ Mangel-Details</div>
            <div style={{ marginBottom:10 }}>
              <Label>Verursacher / Gewerk</Label>
              <input value={a.mangel_verursacher||""}
                onChange={e=>setA(p=>({...p,mangel_verursacher:e.target.value}))}
                placeholder="z.B. Elektriker, Maler…" style={inputStyle()} />
            </div>
            {/* Planverortung */}
            {a.plan_bild_url ? (
              <div>
                <Label>Planverortung</Label>
                <div ref={planRef} onClick={handlePlanKlick}
                  style={{ position:"relative", borderRadius:10, overflow:"hidden",
                    cursor: planMode ? "crosshair" : "default",
                    border:"2px solid var(--red)", marginTop:6 }}>
                  <img src={a.plan_bild_url} alt="Plan"
                    style={{ width:"100%", display:"block" }} />
                  {a.plan_x !== null && a.plan_y !== null && (
                    <div style={{ position:"absolute",
                      left:`${a.plan_x}%`, top:`${a.plan_y}%`,
                      transform:"translate(-50%,-50%)",
                      width:24, height:24, borderRadius:12,
                      background:"var(--red)", border:"2px solid #fff",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:12, color:"#fff", fontWeight:700 }}>!</div>
                  )}
                  {planMode && (
                    <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0,
                      background:"rgba(220,38,38,0.1)",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <div style={{ color:"var(--red)", fontWeight:700,
                        background:"var(--surface)", borderRadius:8,
                        padding:"6px 12px", fontSize:12 }}>
                        Auf Plan tippen zum Verorten
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => setPlanMode(true)}
                  style={{ marginTop:8, background:"var(--red)", color:"#fff",
                    border:"none", borderRadius:8, padding:"6px 14px",
                    cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
                  📍 {a.plan_x ? "Neu verorten" : "Auf Plan verorten"}
                </button>
              </div>
            ) : (
              <div>
                <Label>Grundriss hochladen (optional)</Label>
                <input type="file" accept="image/*"
                  onChange={e => {
                    const f = e.target.files[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = ev => setA(p=>({...p,plan_bild_url:ev.target.result}));
                    r.readAsDataURL(f);
                  }}
                  style={{ marginTop:6, fontSize:12, color:"var(--muted)" }} />
              </div>
            )}
          </div>
        )}

        {/* Fotos */}
        <div style={{ marginBottom:16 }}>
          <Label>Fotos ({a.fotos?.length || 0})</Label>
          <input ref={fileRef} type="file" accept="image/*" multiple
            style={{ display:"none" }} onChange={handleBild} />
          <button onClick={() => fileRef.current.click()}
            style={{ background:"var(--surface2)", color:"var(--muted)",
              border:"1.5px dashed var(--border)", borderRadius:10,
              padding:"8px 16px", cursor:"pointer", fontSize:12,
              fontFamily:"inherit", marginTop:6 }}>
            📷 Fotos hinzufügen
          </button>
          {a.fotos?.length > 0 && (
            <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
              {a.fotos.map((url, i) => (
                <div key={i} style={{ position:"relative" }}>
                  <img src={url} alt="" style={{ width:56, height:56,
                    borderRadius:8, objectFit:"cover" }} />
                  <button onClick={() => setA(p=>({...p,
                    fotos:p.fotos.filter((_,j)=>j!==i)}))}
                    style={{ position:"absolute", top:-4, right:-4,
                      width:18, height:18, borderRadius:9,
                      background:"var(--red)", color:"#fff", border:"none",
                      cursor:"pointer", fontSize:10, padding:0 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, background:"var(--surface2)", color:"var(--muted)",
              border:"1.5px solid var(--border)", borderRadius:12, padding:14,
              cursor:"pointer", fontFamily:"inherit" }}>Abbrechen</button>
          <button onClick={() => valid && onSave(a)} disabled={!valid}
            style={{ flex:2, background: valid ? "var(--yellow)" : "var(--surface2)",
              color: valid ? "#1a1200" : "var(--muted)",
              border:"none", borderRadius:12, padding:14, fontWeight:800,
              cursor: valid ? "pointer" : "default", fontSize:15,
              fontFamily:"inherit" }}>
            💾 Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
