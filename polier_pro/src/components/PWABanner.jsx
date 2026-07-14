export function PWABanner({ pwa }) {
  if (!pwa.installierbar && !pwa.updateVerfügbar && !pwa.offline) return null;
  return (
    <div style={{ position:"fixed", bottom:72, left:8, right:8, zIndex:999,
      display:"flex", flexDirection:"column", gap:6 }}>

      {/* Offline-Banner */}
      {pwa.offline && (
        <div style={{ background:"#2E1A1A", borderRadius:12, padding:"10px 14px",
          display:"flex", alignItems:"center", gap:10,
          border:`1px solid ${'var(--red)'}`, boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize:18 }}>📵</span>
          <div style={{ flex:1 }}>
            <div style={{ color: "var(--red)", fontWeight:700, fontSize:13 }}>Offline</div>
            <div style={{ color: "var(--muted)", fontSize:11 }}>Änderungen werden gespeichert und synchronisiert sobald du wieder online bist.</div>
          </div>
        </div>
      )}

      {/* Update-Banner */}
      {pwa.updateVerfügbar && (
        <div style={{ background:"#1A2A1A", borderRadius:12, padding:"10px 14px",
          display:"flex", alignItems:"center", gap:10,
          border:`1px solid ${'var(--green)'}`, boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize:18 }}>🔄</span>
          <div style={{ flex:1 }}>
            <div style={{ color: "var(--green)", fontWeight:700, fontSize:13 }}>Update verfügbar</div>
            <div style={{ color: "var(--muted)", fontSize:11 }}>Neue Version von Polaris bereit.</div>
          </div>
          <button onClick={pwa.updateAnwenden}
            style={{ background: "var(--green)", color:"#fff", border:"none",
              borderRadius:8, padding:"6px 12px", cursor:"pointer", fontWeight:700, fontSize:12 }}>
            Jetzt
          </button>
        </div>
      )}

      {/* Install-Banner */}
      {pwa.installierbar && !pwa.installiert && (
        <div style={{ background: "var(--surface)", borderRadius:12, padding:"12px 14px",
          display:"flex", alignItems:"center", gap:10,
          border:`1px solid ${'var(--yellow)'}`, boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize:22 }}>⚒️</span>
          <div style={{ flex:1 }}>
            <div style={{ color: "var(--text)", fontWeight:700, fontSize:13 }}>Polaris installieren</div>
            <div style={{ color: "var(--muted)", fontSize:11 }}>Zum Homescreen hinzufügen – funktioniert auch offline.</div>
          </div>
          <button onClick={pwa.installieren}
            style={{ background: "var(--yellow)", color:"#1C2027", border:"none",
              borderRadius:8, padding:"7px 12px", cursor:"pointer", fontWeight:700, fontSize:12 }}>
            Installieren
          </button>
        </div>
      )}
    </div>
  );
}
