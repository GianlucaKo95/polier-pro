import { useState } from "react";
import { Label, inputStyle } from "../components/Label.jsx";

export function PreisFormular({ initial, onSave, onClose }) {
  const [p, setP] = useState(initial || { gewerk:"", einheit:"m²", preis:0, beschreibung:"" });
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ color:"var(--yellow)", fontWeight:700, fontSize:16 }}>
          {initial?.id ? "✏️ Preis bearbeiten" : "➕ Neuer Einheitspreis"}
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none",
          color:"var(--muted)", fontSize:24, cursor:"pointer" }}>✕</button>
      </div>
      {[["Gewerk","gewerk","z.B. Betonage"],["Beschreibung","beschreibung","z.B. Beton C25/30 inkl. Einbau"]].map(([l,k,ph]) => (
        <div key={k} style={{ marginBottom:12 }}>
          <Label>{l}</Label>
          <input value={p[k]||""} onChange={e=>setP(x=>({...x,[k]:e.target.value}))}
            placeholder={ph} style={inputStyle()} />
        </div>
      ))}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        <div>
          <Label>Einheit</Label>
          <select value={p.einheit} onChange={e=>setP(x=>({...x,einheit:e.target.value}))}
            style={{ ...inputStyle(), padding:"11px 12px" }}>
            {["m²","m³","m","t","h","Stk","pau"].map(u=><option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <Label>Einheitspreis (€)</Label>
          <input type="number" value={p.preis||""} onChange={e=>setP(x=>({...x,preis:Number(e.target.value)}))}
            placeholder="0" style={inputStyle()} />
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onClose} style={{ flex:1, background:"var(--surface2)",
          color:"var(--muted)", border:"1.5px solid var(--border)", borderRadius:12,
          padding:13, cursor:"pointer", fontFamily:"inherit" }}>Abbrechen</button>
        <button onClick={() => p.gewerk && p.beschreibung && onSave(p)}
          style={{ flex:2, background:"var(--yellow)", color:"#1a1200",
            border:"none", borderRadius:12, padding:13, fontWeight:800,
            cursor:"pointer", fontFamily:"inherit" }}>💾 Speichern</button>
      </div>
    </div>
  );
}
