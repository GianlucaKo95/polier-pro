export function ThemeToggle({ dark, toggle }) {
  return (
    <button onClick={toggle} title={dark ? "Hellmodus" : "Dunkelmodus"}
      style={{ width:36, height:36, borderRadius:10, background:"var(--surface2)",
        border:"1.5px solid var(--border2)", cursor:"pointer", fontSize:17,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
