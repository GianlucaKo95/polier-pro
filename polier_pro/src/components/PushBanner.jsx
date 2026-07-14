export function PushBanner({ erlaubt, berechtigung }) {
  if (erlaubt) return null;
  return (
    <div style={{ background: "var(--bbg)", borderRadius:12, padding:"12px 16px", marginBottom:12,
      border:`1.5px solid ${'var(--blue)'}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ color: "var(--text)", fontSize:13, fontWeight:700 }}>🔔 Benachrichtigungen aktivieren</div>
        <div style={{ color: "var(--muted)", fontSize:11 }}>Wetterwarnung, Verzug & Tagesbericht-Erinnerung</div>
      </div>
      <button onClick={berechtigung}
        style={{ background: "var(--blue)", color:"#fff", border:"none", borderRadius:8,
          padding:"6px 12px", cursor:"pointer", fontWeight:700, fontSize:12 }}>
        Aktivieren
      </button>
    </div>
  );
}
