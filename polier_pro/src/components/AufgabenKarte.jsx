import { useRef, useState } from "react";
import { Calendar, CalendarX, User, Ruler, Camera, TriangleAlert, Trash2 } from "lucide-react";
import { AUFGABEN_TYPEN, AUFGABEN_STATUS, AUFGABEN_PRIO } from "../config/konstanten.js";

const LOESCH_BREITE = 76;

export function AufgabenKarte({ aufgabe, onClick, kolonnen, onDelete }) {
  const typ    = AUFGABEN_TYPEN[aufgabe.typ]    || AUFGABEN_TYPEN.allgemein;
  const status = AUFGABEN_STATUS[aufgabe.status] || AUFGABEN_STATUS.offen;
  const prio   = AUFGABEN_PRIO[aufgabe.prioritaet] || AUFGABEN_PRIO.mittel;
  const erledigt = aufgabe.status === "abgeschlossen";
  const ueberfaellig = aufgabe.faellig_am &&
    new Date(aufgabe.faellig_am) < new Date() &&
    !erledigt;

  // Swipe-to-Delete (Snapchat-artig): nach links ziehen schiebt die Karte
  // frei und legt den Löschen-Button dahinter frei; ein zweites Antippen
  // der (noch offenen) Karte schließt sie nur, statt onClick auszulösen.
  const [offset, setOffset]   = useState(0);
  const [ziehen, setZiehen]   = useState(false);
  const startX     = useRef(0);
  const startOffset = useRef(0);
  const bewegt      = useRef(false);

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX;
    startOffset.current = offset;
    bewegt.current = false;
    setZiehen(true);
  }
  function onTouchMove(e) {
    const dx = e.touches[0].clientX - startX.current;
    if (Math.abs(dx) > 6) bewegt.current = true;
    setOffset(Math.min(0, Math.max(-LOESCH_BREITE, startOffset.current + dx)));
  }
  function onTouchEnd() {
    setZiehen(false);
    setOffset(prev => (prev < -LOESCH_BREITE / 2 ? -LOESCH_BREITE : 0));
  }
  function handleClick() {
    if (bewegt.current) return;
    if (offset !== 0) { setOffset(0); return; }
    onClick?.();
  }

  return (
    <div style={{ position:"relative", overflow:"hidden", marginBottom:6 }}>
      {onDelete && (
        <button onClick={() => onDelete(aufgabe)}
          style={{ position:"absolute", top:0, right:0, bottom:0, width:LOESCH_BREITE,
            background:"var(--red)", color:"#fff", border:"none", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
          <Trash2 size={18} />
          <span style={{ fontSize:10, fontWeight:700 }}>Löschen</span>
        </button>
      )}
      <div onClick={handleClick}
        onTouchStart={onDelete ? onTouchStart : undefined}
        onTouchMove={onDelete ? onTouchMove : undefined}
        onTouchEnd={onDelete ? onTouchEnd : undefined}
        style={{ position:"relative", zIndex:1, background:"var(--surface)", padding:"10px 16px",
          cursor:"pointer", display:"flex", gap:12,
          border:"1px solid var(--border)",
          borderLeft:`4px solid ${ueberfaellig ? "var(--red)" : typ.farbe}`,
          opacity: erledigt ? 0.62 : 1,
          transform:`translateX(${offset}px)`,
          transition: ziehen ? "none" : "transform 0.2s ease" }}>
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
    </div>
  );
}
