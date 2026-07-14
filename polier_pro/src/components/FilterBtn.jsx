export function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ background: active ? "var(--yellow)" : "#FFFFFF",
        color: active ? "#1C2027" : "var(--muted)",
        border:`1.5px solid ${active ? "var(--yellow)" : "var(--border)"}`,
        borderRadius:20, padding:"8px 16px", cursor:"pointer",
        fontSize:13, fontWeight: active ? 700 : 500, whiteSpace:"nowrap",
        boxShadow: active ? "0 2px 8px rgba(245,196,0,0.3)" : "0 1px 3px rgba(0,0,0,0.06)" }}>
      {children}
    </button>
  );
}
