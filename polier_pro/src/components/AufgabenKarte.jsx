import { AUFGABEN_TYPEN, AUFGABEN_STATUS, AUFGABEN_PRIO } from "../config/konstanten.js";

export function AufgabenKarte({ aufgabe, onClick, kolonnen }) {
  const typ    = AUFGABEN_TYPEN[aufgabe.typ]    || AUFGABEN_TYPEN.allgemein;
  const status = AUFGABEN_STATUS[aufgabe.status] || AUFGABEN_STATUS.offen;
  const prio   = AUFGABEN_PRIO[aufgabe.prioritaet] || AUFGABEN_PRIO.mittel;
  const ueberfaellig = aufgabe.faellig_am &&
    new Date(aufgabe.faellig_am) < new Date() &&
    aufgabe.status !== "abgeschlossen";

  return (
    <div onClick={onClick}
      style={{ background:"var(--surface)", borderRadius:14, padding:"14px 16px",
        marginBottom:10, cursor:"pointer",
        borderLeft:`4px solid ${typ.farbe}`,
        border:`1.5px solid var(--border)`,
        borderLeftWidth:4, borderLeftColor:typ.farbe,
        boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:6 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
            <span style={{ fontSize:14 }}>{typ.icon}</span>
            <span style={{ color:"var(--text)", fontWeight:700, fontSize:14 }}>
              {aufgabe.titel || "Unbenannte Aufgabe"}
            </span>
          </div>
          {aufgabe.beschreibung && (
            <div style={{ color:"var(--muted)", fontSize:12, lineHeight:1.4,
              overflow:"hidden", display:"-webkit-box",
              WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
              {aufgabe.beschreibung}
            </div>
          )}
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end",
          gap:4, marginLeft:8, flexShrink:0 }}>
          <div style={{ background:status.bg, color:status.farbe,
            borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>
            {status.icon} {status.label}
          </div>
          <div style={{ color:prio.farbe, fontSize:10, fontWeight:700 }}>
            {prio.icon} {prio.label}
          </div>
        </div>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        {aufgabe.faellig_am && (
          <div style={{ color: ueberfaellig ? "var(--red)" : "var(--muted)",
            fontSize:11, fontWeight: ueberfaellig ? 700 : 400 }}>
            📅 {new Date(aufgabe.faellig_am).toLocaleDateString("de-DE")}
            {ueberfaellig && " · Überfällig!"}
          </div>
        )}
        {aufgabe.zustaendig && (
          <div style={{ color:"var(--muted)", fontSize:11 }}>👤 {aufgabe.zustaendig}</div>
        )}
        {aufgabe.m2 > 0 && (
          <div style={{ color:"var(--muted)", fontSize:11 }}>📐 {aufgabe.m2} m²</div>
        )}
        {aufgabe.fotos?.length > 0 && (
          <div style={{ color:"var(--blue)", fontSize:11 }}>📷 {aufgabe.fotos.length}</div>
        )}
        {aufgabe.ist_mangel && (
          <div style={{ background:"var(--rbg)", color:"var(--red)",
            borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>
            ⚠️ Mangel
          </div>
        )}
      </div>
    </div>
  );
}
