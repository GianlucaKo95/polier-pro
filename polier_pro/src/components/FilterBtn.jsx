export function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ background: active ? "var(--ink)" : "var(--surface)",
        color: active ? "#fff" : "var(--muted)",
        border:`1px solid ${active ? "var(--ink)" : "var(--border2)"}`,
        padding:"7px 13px", cursor:"pointer",
        fontSize:12, fontWeight: active ? 800 : 600, whiteSpace:"nowrap" }}>
      {children}
    </button>
  );
}
