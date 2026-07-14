export function Label({ children }) {
  return <div style={{ color: "var(--muted)", fontSize:12, marginBottom:5, fontWeight:600, letterSpacing:0.3 }}>{children}</div>;
}

export function inputStyle() {
  return { width:"100%", background: "var(--surface)", color: "var(--text)",
    border:`1.5px solid ${'var(--border)'}`, borderRadius:10,
    padding:"13px 14px", fontSize:15, boxSizing:"border-box", marginTop:4,
    boxShadow:"0 1px 3px rgba(0,0,0,0.06)" };
}
