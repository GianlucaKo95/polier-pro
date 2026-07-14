export function PlanGuard({ firma, children, ressource }) {
  if (!firma) return children;

  const trial_abgelaufen = firma.plan === "trial" &&
    firma.trial_ends_at && new Date(firma.trial_ends_at) < new Date();
  const abo_inaktiv = firma.plan_status === "cancelled" ||
    firma.plan_status === "expired";

  if (!trial_abgelaufen && !abo_inaktiv) return children;

  return (
    <div style={{ background:"var(--bg)", minHeight:"100dvh",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:24,
      fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <div style={{ fontWeight:800, fontSize:22, color:"var(--text)",
        marginBottom:8, textAlign:"center" }}>
        {trial_abgelaufen ? "Testphase abgelaufen" : "Abo inaktiv"}
      </div>
      <div style={{ color:"var(--text2)", fontSize:14, textAlign:"center",
        maxWidth:320, marginBottom:28, lineHeight:1.6 }}>
        {trial_abgelaufen
          ? "Deine 14-tägige Testphase ist beendet. Wähle einen Plan um weiterzumachen."
          : "Dein Abo ist nicht mehr aktiv. Bitte erneuere dein Abonnement."}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10,
        width:"100%", maxWidth:340 }}>
        {[
          { key:"starter", label:"Starter",  preis:"49 €/Monat", features:"5 Projekte, 10 Nutzer" },
          { key:"pro",     label:"Pro",       preis:"99 €/Monat", features:"20 Projekte, 50 Nutzer, API" },
        ].map(p => (
          <div key={p.key} style={{ background:"var(--surface)", borderRadius:14,
            padding:"16px 20px", border:`2px solid ${p.key === "pro" ? "var(--yellow)" : "var(--border)"}` }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:6 }}>
              <div style={{ fontWeight:800, fontSize:16, color:"var(--text)" }}>
                {p.label}
              </div>
              <div style={{ fontWeight:700, color:"var(--yellow)" }}>{p.preis}</div>
            </div>
            <div style={{ color:"var(--muted)", fontSize:12, marginBottom:12 }}>
              {p.features}
            </div>
            <button
              onClick={() => window.location.href = "mailto:support@polaris-app.de?subject=Plan%20Upgrade&body=Ich%20möchte%20auf%20den%20" + p.label + "-Plan%20wechseln."}
              style={{ width:"100%",
                background: p.key === "pro" ? "var(--yellow)" : "var(--surface2)",
                color: p.key === "pro" ? "#1a1200" : "var(--text)",
                border:"none", borderRadius:10, padding:12, fontWeight:700,
                cursor:"pointer", fontFamily:"inherit" }}>
              {p.key === "pro" ? "⚡ Pro wählen" : "Starter wählen"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
