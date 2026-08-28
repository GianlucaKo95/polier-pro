export function Chip({ icon, label }) {
  return (
    <div style={{ background: "var(--surface2)", padding:"5px 10px 5px 8px", display:"flex", gap:5, alignItems:"center",
      border:`1px solid ${'var(--border)'}` }}>
      <span style={{ fontSize:12 }}>{icon}</span>
      <span style={{ color: "var(--text2)", fontSize:12, fontWeight:600 }}>{label}</span>
    </div>
  );
}
