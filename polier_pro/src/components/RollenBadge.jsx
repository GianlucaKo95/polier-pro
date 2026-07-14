import { ROLLEN } from "../config/konstanten.js";

export function RollenBadge({ rolle }) {
  const r = ROLLEN[rolle];
  if (!r) return null;
  return (
    <div style={{ background:"var(--surface2)", color:"var(--text2)",
      border:"1px solid var(--border)", borderRadius:20,
      padding:"3px 10px", fontSize:11, fontWeight:700,
      display:"flex", alignItems:"center", gap:5 }}>
      <span>{r.icon}</span>
      <span>{r.label}</span>
    </div>
  );
}
