import { PROJEKTTYPEN } from "../config/konstanten.js";

export function ProjektInfoStrip({ projekt, aufgaben = [] }) {
  if (!projekt) return null;
  const relevante = aufgaben.filter(a => a.typ === "beton");
  const done   = relevante.filter(a => a.status === "abgeschlossen").length;
  const total  = relevante.length;
  const pct    = total > 0 ? Math.round(done/total*100) : 0;
  return (
    <div style={{ background:"var(--surface2)", borderBottom:"1px solid var(--border)",
      padding:"7px 16px", display:"flex", justifyContent:"space-between",
      alignItems:"center", flexShrink:0 }}>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)" }}>
          {projekt.projektnummer} · {PROJEKTTYPEN[projekt.typ]?.label || projekt.typ}
        </div>
        <div style={{ fontSize:11, color:"var(--text2)", marginTop:1 }}>
          👤 {projekt.bauleiter}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
        <div style={{ width:64, height:5, background:"var(--border2)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:projekt.farbe, borderRadius:3,
            transition:"width 0.4s" }} />
        </div>
        <span style={{ fontSize:11, fontWeight:800, color:"var(--text)" }}>{pct}%</span>
      </div>
    </div>
  );
}
