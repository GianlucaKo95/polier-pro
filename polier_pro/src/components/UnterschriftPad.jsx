import { useState, useRef } from "react";

export function UnterschriftPad({ label, onSave }) {
  const canvasRef  = useRef(null);
  const [zeichnen, setZeichnen] = useState(false);
  const [hatZeichen, setHatZeichen] = useState(false);
  const lastPos = useRef(null);

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    setZeichnen(true);
    lastPos.current = getPos(e);
  }
  function draw(e) {
    e.preventDefault();
    if (!zeichnen) return;
    const ctx  = canvasRef.current.getContext("2d");
    const pos  = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#0B1120";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.stroke();
    lastPos.current = pos;
    setHatZeichen(true);
  }
  function stop(e) { e.preventDefault(); setZeichnen(false); }

  function loeschen() {
    const canvas = canvasRef.current;
    canvasRef.current.getContext("2d").clearRect(0,0,canvas.width,canvas.height);
    setHatZeichen(false);
  }

  function speichern() {
    if (!hatZeichen) return;
    onSave(canvasRef.current.toDataURL("image/png"));
  }

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ color:"var(--muted)", fontSize:11, fontWeight:600,
        marginBottom:6 }}>{label}</div>
      <div style={{ position:"relative", border:"1.5px solid var(--border)",
        borderRadius:12, background:"#fff", overflow:"hidden" }}>
        <canvas ref={canvasRef} width={360} height={100}
          style={{ display:"block", width:"100%", touchAction:"none",
            cursor:"crosshair" }}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop} />
        {!hatZeichen && (
          <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, display:"flex",
            alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <span style={{ color:"#ccc", fontSize:13 }}>Hier unterschreiben</span>
          </div>
        )}
      </div>
      <div style={{ display:"flex", gap:8, marginTop:6 }}>
        <button onClick={loeschen}
          style={{ background:"var(--surface2)", color:"var(--muted)",
            border:"1px solid var(--border)", borderRadius:8,
            padding:"5px 12px", cursor:"pointer", fontSize:12,
            fontFamily:"inherit" }}>
          Löschen
        </button>
        <button onClick={speichern} disabled={!hatZeichen}
          style={{ background: hatZeichen ? "var(--green)" : "var(--surface2)",
            color: hatZeichen ? "#fff" : "var(--muted)",
            border:"none", borderRadius:8, padding:"5px 14px",
            cursor: hatZeichen ? "pointer" : "default", fontSize:12,
            fontWeight:700, fontFamily:"inherit" }}>
          ✓ Übernehmen
        </button>
      </div>
    </div>
  );
}
