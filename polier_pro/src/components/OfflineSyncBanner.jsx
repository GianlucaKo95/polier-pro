export function OfflineSyncBanner({ pending, syncing, online }) {
  if (online && pending === 0 && !syncing) return null;
  return (
    <div style={{ background: syncing ? "var(--gbg)" : pending > 0 ? "#FFF3CC" : "var(--surface2)",
      borderRadius:10, padding:"8px 14px", marginBottom:10,
      border:`1px solid ${syncing ? "var(--green)" : pending > 0 ? "var(--yellow)" : "var(--surface2)"}`,
      display:"flex", alignItems:"center", gap:10 }}>
      <span style={{ fontSize:16 }}>{syncing ? "🔄" : pending > 0 ? "📴" : "✅"}</span>
      <div>
        <div style={{ color: syncing ? "var(--green)" : pending > 0 ? "var(--yellow)" : "var(--text)", fontWeight:700, fontSize:12 }}>
          {syncing ? "Synchronisiere…" : pending > 0 ? `${pending} Einträge offline gespeichert` : "Alles synchronisiert"}
        </div>
        {pending > 0 && !syncing && (
          <div style={{ color: "var(--muted)", fontSize:10 }}>Werden synchronisiert sobald wieder online</div>
        )}
      </div>
    </div>
  );
}
