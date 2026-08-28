import { Calendar, CalendarX, User, Ruler, Camera, TriangleAlert } from "lucide-react";
import { AUFGABEN_TYPEN, AUFGABEN_STATUS, AUFGABEN_PRIO } from "../config/konstanten.js";

export function AufgabenKarte({ aufgabe, onClick, kolonnen }) {
  const typ    = AUFGABEN_TYPEN[aufgabe.typ]    || AUFGABEN_TYPEN.allgemein;
  const status = AUFGABEN_STATUS[aufgabe.status] || AUFGABEN_STATUS.offen;
  const prio   = AUFGABEN_PRIO[aufgabe.prioritaet] || AUFGABEN_PRIO.mittel;
  const erledigt = aufgabe.status === "abgeschlossen";
  const ueberfaellig = aufgabe.faellig_am &&
    new Date(aufgabe.faellig_am) < new Date() &&
    !erledigt;

  return (
    <div onClick={onClick}
      style={{ background:"var(--surface)", padding:"14px 16px",
        marginBottom:8, cursor:"pointer", display:"flex", gap:12,
        border:"1px solid var(--border)",
        borderLeft:`4px solid ${ueberfaellig ? "var(--red)" : typ.farbe}`,
        opacity: erledigt ? 0.62 : 1 }}>
      <div style={{ width:22, height:22, flex:"none", marginTop:1,
        border:`2px solid ${erledigt ? "var(--green)" : "rgba(0,0,0,.18)"}`,
        background: erledigt ? "var(--green)" : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>
        {erledigt && <span style={{ fontSize:13, fontWeight:900 }}>✓</span>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
          <div style={{ color:"var(--text)", fontWeight:700, fontSize:14.5, lineHeight:1.25,
            textDecoration: erledigt ? "line-through" : "none" }}>
            {aufgabe.titel || "Unbenannte Aufgabe"}
          </div>
          <div style={{ background:status.bg, color:status.farbe,
            padding:"2px 8px", fontSize:10, fontWeight:800, whiteSpace:"nowrap", flexShrink:0 }}>
            {status.label}
          </div>
        </div>
        {aufgabe.beschreibung && !erledigt && (
          <div style={{ color:"var(--muted)", fontSize:12, lineHeight:1.4, marginTop:4,
            overflow:"hidden", display:"-webkit-box",
            WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
            {aufgabe.beschreibung}
          </div>
        )}
        {!erledigt && (
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center", marginTop:8,
            color:"var(--muted)", fontSize:11.5, fontWeight:600 }}>
            {aufgabe.faellig_am && (
              <span style={{ display:"flex", alignItems:"center", gap:4,
                color: ueberfaellig ? "var(--red)" : "var(--muted)", fontWeight: ueberfaellig ? 700 : 600 }}>
                {ueberfaellig ? <CalendarX size={13} /> : <Calendar size={13} />}
                {new Date(aufgabe.faellig_am).toLocaleDateString("de-DE")}
              </span>
            )}
            {aufgabe.zustaendig && (
              <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                <User size={13} />{aufgabe.zustaendig}
              </span>
            )}
            {aufgabe.m2 > 0 && (
              <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                <Ruler size={13} />{aufgabe.m2} m²
              </span>
            )}
            {aufgabe.fotos?.length > 0 && (
              <span style={{ display:"flex", alignItems:"center", gap:4, color:"var(--blue)" }}>
                <Camera size={13} />{aufgabe.fotos.length}
              </span>
            )}
            {aufgabe.ist_mangel && (
              <span style={{ background:"var(--rbg)", color:"var(--red)",
                padding:"2px 8px", fontWeight:800, display:"inline-flex", alignItems:"center", gap:4 }}>
                <TriangleAlert size={11} />MANGEL
              </span>
            )}
            {aufgabe.prioritaet === "kritisch" && (
              <span style={{ color:prio.farbe, fontWeight:800 }}>‼ Kritisch</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
