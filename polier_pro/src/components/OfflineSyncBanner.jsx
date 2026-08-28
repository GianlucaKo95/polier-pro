import { RefreshCw, WifiOff, CircleCheckBig } from "lucide-react";

export function OfflineSyncBanner({ pending, syncing, online }) {
  if (online && pending === 0 && !syncing) return null;
  const farbe = syncing ? "var(--green)" : pending > 0 ? "var(--yellow)" : "var(--text)";
  return (
    <div style={{ background: syncing ? "var(--gbg)" : pending > 0 ? "#FFF3CC" : "var(--surface2)",
      borderRadius:10, padding:"6px 14px", marginBottom:7,
      border:`1px solid ${syncing ? "var(--green)" : pending > 0 ? "var(--yellow)" : "var(--surface2)"}`,
      display:"flex", alignItems:"center", gap:10 }}>
      <span style={{ color:farbe, display:"flex", flexShrink:0 }}>
        {syncing ? <RefreshCw size={16} /> : pending > 0 ? <WifiOff size={16} /> : <CircleCheckBig size={16} />}
      </span>
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
