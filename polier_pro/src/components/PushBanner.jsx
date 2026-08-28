import { Bell } from "lucide-react";
import { PUSH_VAPID_PUBLIC } from "../lib/push.js";

export function PushBanner({ erlaubt, berechtigung }) {
  if (erlaubt) return null;
  return (
    <div style={{ background: "var(--bbg)", borderRadius:12, padding:"9px 16px", marginBottom:9,
      border:`1.5px solid ${'var(--blue)'}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ color: "var(--text)", fontSize:13, fontWeight:700,
          display:"flex", alignItems:"center", gap:6 }}><Bell size={14} /> Erinnerungen aktivieren</div>
        <div style={{ color: "var(--muted)", fontSize:11 }}>
          Wetterwarnung, Verzug &amp; Tagesbericht
          {!PUSH_VAPID_PUBLIC && " — nur während Polaris geöffnet ist"}
        </div>
      </div>
      <button onClick={berechtigung}
        style={{ background: "var(--blue)", color:"#fff", border:"none", borderRadius:8,
          padding:"6px 12px", cursor:"pointer", fontWeight:700, fontSize:12 }}>
        Aktivieren
      </button>
    </div>
  );
}
