import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

const LOESCH_BREITE = 76;

// Swipe-to-Delete (Snapchat-artig), generisch für beliebige Listenkarten:
// nach links ziehen schiebt den Inhalt frei und legt den Löschen-Button
// dahinter frei; ein Tap auf die (noch offene) Karte schließt sie nur,
// statt onClick auszulösen. Ohne onDelete verhält sich die Karte wie ein
// normaler Klick-Container ohne Wischgeste.
export function SwipeToDelete({ onDelete, onClick, disabled, children, style }) {
  const [offset, setOffset] = useState(0);
  const [ziehen, setZiehen] = useState(false);
  const startX      = useRef(0);
  const startOffset = useRef(0);
  const bewegt       = useRef(false);

  const aktiv = !!onDelete && !disabled;

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
    <div style={{ position:"relative", overflow:"hidden", ...style }}>
      {aktiv && (
        <button onClick={onDelete}
          style={{ position:"absolute", top:0, right:0, bottom:0, width:LOESCH_BREITE,
            background:"var(--red)", color:"#fff", border:"none", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
          <Trash2 size={18} />
          <span style={{ fontSize:10, fontWeight:700 }}>Löschen</span>
        </button>
      )}
      <div onClick={handleClick}
        onTouchStart={aktiv ? onTouchStart : undefined}
        onTouchMove={aktiv ? onTouchMove : undefined}
        onTouchEnd={aktiv ? onTouchEnd : undefined}
        style={{ position:"relative", zIndex:1, background:"var(--surface)",
          transform:`translateX(${offset}px)`,
          transition: ziehen ? "none" : "transform 0.2s ease" }}>
        {children}
      </div>
    </div>
  );
}
