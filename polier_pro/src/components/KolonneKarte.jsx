import { useState } from "react";
import { MitarbeiterZeilen } from "./MitarbeiterZeilen.jsx";

export function KolonneKarte({ k, zeitdaten, vonDatum, bisDatum, erfasstVerbunden, setKolonnen, darfBearbeiten = true }) {
  const [expanded, setExpanded] = useState(false);
  const [neuerName, setNeuerName] = useState("");
  const mas = k.mitarbeiter || [];
  const totalMann = mas.length;

  function mitarbeiterHinzufuegen() {
    if (!neuerName.trim() || !setKolonnen) return;
    const neu = { id: Date.now(), name: neuerName.trim() };
    setKolonnen(prev => prev.map(kol =>
      kol.id === k.id ? { ...kol, mitarbeiter: [...(kol.mitarbeiter||[]), neu] } : kol
    ));
    setNeuerName("");
  }

  function mitarbeiterEntfernen(id) {
    if (!setKolonnen) return;
    setKolonnen(prev => prev.map(kol =>
      kol.id === k.id ? { ...kol, mitarbeiter: (kol.mitarbeiter||[]).filter(m => m.id !== id) } : kol
    ));
  }

  // Stunden dieser Kolonne aus Zeitdaten
  const kolonneH = zeitdaten.filter(z => {
    if (!mas.length) return false;
    return mas.some(ma => {
      if (ma.erfasstIdent) return z.person?.ident === ma.erfasstIdent;
      const vn = (z.person?.formattedName || "").toLowerCase();
      return vn.includes(ma.name.split(" ")[0].toLowerCase()) ||
             vn.includes(ma.name.split(" ").pop().toLowerCase());
    });
  }).reduce((s, z) => s + (z.hours||0) + (z.minutes||0)/60, 0);

  const anwesend = mas.filter(ma => zeitdaten.some(z => {
    if (ma.erfasstIdent) return z.person?.ident === ma.erfasstIdent;
    const vn = (z.person?.formattedName || "").toLowerCase();
    return vn.includes(ma.name.split(" ")[0].toLowerCase()) ||
           vn.includes(ma.name.split(" ").pop().toLowerCase());
  })).length;

  return (
    <div style={{ marginBottom:12 }}>
      {/* Kolonne Header */}
      <div style={{ background: "var(--surface)", borderRadius: expanded ? "12px 12px 0 0" : 12,
        padding:"14px 16px", border:`1px solid ${'var(--border)'}`,
        borderBottom: expanded ? "none" : undefined }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ color: "var(--text)", fontWeight:700, fontSize:15 }}>{k.name}</div>
            <div style={{ color: "var(--muted)", fontSize:12, marginTop:2 }}>📍 {k.einsatz}</div>
            {k.vorarbeiter && (
              <div style={{ color: "var(--muted)", fontSize:11, marginTop:2 }}>👷 VA: {k.vorarbeiter}</div>
            )}
          </div>
          <div style={{ textAlign:"right" }}>
            {erfasstVerbunden && kolonneH > 0 ? (
              <div style={{ color: "var(--yellow)", fontWeight:800, fontSize:18 }}>{kolonneH.toFixed(1)}h</div>
            ) : (
              <div style={{ color: "var(--yellow)", fontSize:13 }}>👷 {totalMann} Mann</div>
            )}
            {erfasstVerbunden && (
              <div style={{ color: "var(--muted)", fontSize:10 }}>
                {anwesend}/{totalMann} anwesend
              </div>
            )}
          </div>
        </div>

        {/* Fortschrittsbalken Anwesenheit */}
        {erfasstVerbunden && totalMann > 0 && (
          <div style={{ marginTop:10 }}>
            <div style={{ background: "var(--border)", borderRadius:4, height:5 }}>
              <div style={{ background: anwesend === totalMann ? "var(--green)" : "var(--yellow)",
                width:`${(anwesend/totalMann)*100}%`, height:"100%", borderRadius:4, transition:"width 0.4s" }} />
            </div>
          </div>
        )}

        {/* MA-Vorschau Avatare */}
        <div style={{ display:"flex", alignItems:"center", marginTop:10, gap:6 }}>
          <div style={{ display:"flex" }}>
            {mas.slice(0,5).map((ma, i) => (
              <div key={ma.id} style={{ width:26, height:26, borderRadius:13,
                background: "var(--border)", border:`2px solid ${'var(--surface)'}`,
                marginLeft: i > 0 ? -8 : 0,
                display:"flex", alignItems:"center", justifyContent:"center",
                color: "var(--muted)", fontSize:10, fontWeight:700, zIndex:5-i }}>
                {ma.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
              </div>
            ))}
            {mas.length > 5 && (
              <div style={{ width:26, height:26, borderRadius:13,
                background: "var(--border)", border:`2px solid ${'var(--surface)'}`,
                marginLeft:-8, display:"flex", alignItems:"center", justifyContent:"center",
                color: "var(--muted)", fontSize:9 }}>+{mas.length-5}</div>
            )}
          </div>
          <button onClick={() => setExpanded(e => !e)}
            style={{ marginLeft:"auto", background: "var(--border)", border:"none", color: "var(--text)",
              borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:12 }}>
            {expanded ? "▲ Zuklappen" : "▼ Mitarbeiter"}
          </button>
        </div>
      </div>

      {/* Aufgeklappte MA-Liste */}
      {expanded && (
        <div style={{ background: "var(--surface2)", borderRadius:"0 0 12px 12px",
          border:`1px solid ${'var(--border)'}`, borderTop:"none", padding:"10px 12px" }}>
          {mas.map(ma => (
            <div key={ma.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ flex:1 }}>
                <MitarbeiterZeilen
                  ma={ma}
                  zeitdaten={zeitdaten}
                  vonDatum={vonDatum}
                  bisDatum={bisDatum}
                />
              </div>
              {darfBearbeiten && setKolonnen && (
                <button onClick={() => mitarbeiterEntfernen(ma.id)}
                  style={{ background:"var(--rbg)", color:"var(--red)",
                    border:"1px solid var(--red)", borderRadius:8,
                    padding:"4px 8px", cursor:"pointer", fontSize:11,
                    fontFamily:"inherit", flexShrink:0 }}>
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* Mitarbeiter hinzufügen */}
          {darfBearbeiten && setKolonnen && (
            <div style={{ display:"flex", gap:6, marginTop:10 }}>
              <input value={neuerName} onChange={e=>setNeuerName(e.target.value)}
                placeholder="Name des Mitarbeiters"
                onKeyDown={e => e.key==="Enter" && mitarbeiterHinzufuegen()}
                style={{ flex:1, background:"var(--surface)", color:"var(--text)",
                  border:"1px solid var(--border)", borderRadius:8,
                  padding:"7px 10px", fontSize:12, fontFamily:"inherit" }} />
              <button onClick={mitarbeiterHinzufuegen} disabled={!neuerName.trim()}
                style={{ background: neuerName.trim() ? "var(--yellow)" : "var(--border)",
                  color: neuerName.trim() ? "#1a1200" : "var(--muted)",
                  border:"none", borderRadius:8, padding:"7px 14px",
                  cursor: neuerName.trim() ? "pointer" : "default", fontSize:12,
                  fontWeight:700, fontFamily:"inherit", flexShrink:0 }}>
                + Hinzufügen
              </button>
            </div>
          )}

          {/* Kolonnen-Summe */}
          {erfasstVerbunden && kolonneH > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between",
              background: "var(--border)", borderRadius:8, padding:"10px 12px", marginTop:8 }}>
              <div style={{ color: "var(--muted)", fontSize:12 }}>Kolonne gesamt</div>
              <div style={{ color: "var(--yellow)", fontWeight:800, fontSize:15 }}>{kolonneH.toFixed(1)} h</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
