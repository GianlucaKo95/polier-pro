import { useState } from "react";

export function MitarbeiterZeilen({ ma, zeitdaten, vonDatum, bisDatum }) {
  const [open, setOpen] = useState(false);

  // Buchungen für diesen MA aus den geladenen Zeitdaten filtern
  // Matching über Namen (Fallback wenn erfasstIdent nicht verknüpft)
  const maBuchungen = zeitdaten.filter(z => {
    if (ma.erfasstIdent) return z.person?.ident === ma.erfasstIdent;
    const vn = (z.person?.formattedName || "").toLowerCase();
    return vn.includes(ma.name.split(" ")[0].toLowerCase()) ||
           vn.includes(ma.name.split(" ").pop().toLowerCase());
  });

  const totalH = maBuchungen.reduce((s, z) => s + (z.hours||0) + (z.minutes||0)/60, 0);
  const hatDaten = zeitdaten.length > 0;

  const ROLLEN_FARBE = { "Vorarbeiter": "var(--yellow)", "Facharbeiter": "var(--blue)", "Helfer": "var(--muted)" };

  return (
    <div style={{ marginBottom:6 }}>
      {/* MA Zeile */}
      <div onClick={() => hatDaten && setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:10,
          background: open ? "var(--surface2)" : "var(--border)",
          borderRadius: open ? "8px 8px 0 0" : 8,
          padding:"10px 12px",
          cursor: hatDaten ? "pointer" : "default",
          border:`1px solid ${open ? "var(--yellow)"+"66" : "transparent"}` }}>
        {/* Avatar */}
        <div style={{ width:32, height:32, borderRadius:16, flexShrink:0,
          background: "var(--surface)", display:"flex", alignItems:"center", justifyContent:"center",
          border:`2px solid ${ROLLEN_FARBE[ma.rolle] || "var(--muted)"}`,
          color: ROLLEN_FARBE[ma.rolle] || "var(--muted)", fontSize:13, fontWeight:700 }}>
          {ma.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ color: "var(--text)", fontSize:13, fontWeight:600 }}>{ma.name}</div>
          <div style={{ color: ROLLEN_FARBE[ma.rolle] || "var(--muted)", fontSize:10 }}>{ma.rolle}</div>
        </div>
        {/* Stunden */}
        {hatDaten ? (
          <div style={{ textAlign:"right" }}>
            <div style={{ color: totalH > 0 ? "var(--yellow)" : "var(--muted)", fontWeight:700, fontSize:14 }}>
              {totalH > 0 ? totalH.toFixed(1)+"h" : "—"}
            </div>
            <div style={{ color: "var(--muted)", fontSize:10 }}>
              {maBuchungen.length > 0 ? `${maBuchungen.length} Buchung${maBuchungen.length>1?"en":""}` : "keine"}
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--muted)", fontSize:11 }}>nicht geladen</div>
        )}
        {hatDaten && maBuchungen.length > 0 && (
          <div style={{ color: "var(--muted)", fontSize:12 }}>{open ? "▲" : "▼"}</div>
        )}
      </div>

      {/* Aufgeklappte Buchungen */}
      {open && maBuchungen.length > 0 && (
        <div style={{ background: "var(--surface)", borderRadius:"0 0 8px 8px",
          border:`1px solid ${"var(--yellow)"+"66"}`, borderTop:"none", padding:"8px 10px" }}>
          {maBuchungen.map((z, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", padding:"6px 4px",
              borderBottom: i < maBuchungen.length-1 ? `1px solid ${'var(--border)'}` : "none" }}>
              <div>
                <div style={{ color: "var(--text2)", fontSize:12 }}>
                  {new Date(z.date).toLocaleDateString("de-DE", { weekday:"short", day:"2-digit", month:"2-digit" })}
                </div>
                {z.activity?.name && (
                  <div style={{ color: "var(--muted)", fontSize:10 }}>🔧 {z.activity.name}</div>
                )}
                {z.note && (
                  <div style={{ color: "var(--muted)", fontSize:10, fontStyle:"italic" }}>💬 {z.note}</div>
                )}
              </div>
              <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:13 }}>
                {(z.hours||0)}h{z.minutes > 0 ? ` ${z.minutes}min` : ""}
              </div>
            </div>
          ))}
          {/* MA-Summe */}
          <div style={{ display:"flex", justifyContent:"space-between",
            borderTop:`1px solid ${'var(--border)'}`, marginTop:4, paddingTop:6 }}>
            <div style={{ color: "var(--muted)", fontSize:11 }}>Gesamt</div>
            <div style={{ color: "var(--yellow)", fontWeight:800, fontSize:14 }}>{totalH.toFixed(1)} h</div>
          </div>
        </div>
      )}
    </div>
  );
}
