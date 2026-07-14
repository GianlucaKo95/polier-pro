import { WeatherView } from "./WeatherView.jsx";

export function DashboardView({ aufgaben, kolonnen, sbConnected, onNavigate, projekt, wetter }) {
  const offeneAufgaben = aufgaben.filter(a => a.status !== "abgeschlossen");
  const kritisch  = aufgaben.filter(a => a.prioritaet === "kritisch" && a.status !== "abgeschlossen").length;
  const maengel   = aufgaben.filter(a => a.ist_mangel && a.status !== "abgeschlossen").length;
  const ueberfaellig = aufgaben.filter(a => a.faellig_am &&
    new Date(a.faellig_am) < new Date() && a.status !== "abgeschlossen").length;
  const inArbeit  = aufgaben.filter(a => a.status === "in_arbeit").length;
  const totalMann = kolonnen.reduce((s,k) => s + (k.mitarbeiter?.length || 0), 0);

  const betonM2Gesamt = aufgaben.filter(a=>a.typ==="beton").reduce((s,a)=>s+(a.m2||0),0);
  const betonM2Fertig = aufgaben.filter(a=>a.typ==="beton" && a.status==="abgeschlossen").reduce((s,a)=>s+(a.m2||0),0);

  function springeZu(tabId, filter) {
    if (filter) onNavigate(tabId, filter);
    else onNavigate(tabId);
  }

  return (
    <div>
      <WeatherView compact ort={projekt?.ort} plz={projekt?.plz} projektId={projekt?.id} />

      {/* Kennzahlen — jede Kachel ist ein Sprungziel */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        <div onClick={() => springeZu("aufgaben","offen")}
          style={{ background:"var(--surface)", borderRadius:12, padding:"14px 16px",
            borderBottom:"3px solid var(--muted)", cursor:"pointer" }}>
          <div style={{ color:"var(--muted)", fontSize:11, textTransform:"uppercase",
            letterSpacing:0.8 }}>Offene Aufgaben</div>
          <div style={{ color:"var(--text)", fontSize:26, fontWeight:800 }}>
            {offeneAufgaben.length}
          </div>
        </div>
        <div onClick={() => springeZu("aufgaben","kritisch")}
          style={{ background:"var(--surface)", borderRadius:12, padding:"14px 16px",
            borderBottom:`3px solid ${kritisch>0 ? "var(--red)" : "var(--green)"}`,
            cursor:"pointer" }}>
          <div style={{ color:"var(--muted)", fontSize:11, textTransform:"uppercase",
            letterSpacing:0.8 }}>Kritisch</div>
          <div style={{ color:"var(--text)", fontSize:26, fontWeight:800 }}>
            {kritisch}
          </div>
        </div>
        <div onClick={() => springeZu("aufgaben","maengel")}
          style={{ background:"var(--surface)", borderRadius:12, padding:"14px 16px",
            borderBottom:`3px solid ${maengel>0 ? "var(--red)" : "var(--green)"}`,
            cursor:"pointer" }}>
          <div style={{ color:"var(--muted)", fontSize:11, textTransform:"uppercase",
            letterSpacing:0.8 }}>Mängel</div>
          <div style={{ color:"var(--text)", fontSize:26, fontWeight:800 }}>
            {maengel}
          </div>
        </div>
        <div onClick={() => springeZu("aufgaben","alle")}
          style={{ background:"var(--surface)", borderRadius:12, padding:"14px 16px",
            borderBottom:`3px solid ${ueberfaellig>0 ? "var(--orange)" : "var(--green)"}`,
            cursor:"pointer" }}>
          <div style={{ color:"var(--muted)", fontSize:11, textTransform:"uppercase",
            letterSpacing:0.8 }}>Überfällig</div>
          <div style={{ color:"var(--text)", fontSize:26, fontWeight:800 }}>
            {ueberfaellig}
          </div>
        </div>
      </div>

      {/* Betonage-Fortschritt — Sprung zu gefilterten Betonaufgaben */}
      {betonM2Gesamt > 0 && (
        <div onClick={() => springeZu("aufgaben","beton")}
          style={{ background:"var(--surface)", borderRadius:14, padding:16,
            marginBottom:14, cursor:"pointer", border:"1.5px solid var(--border)" }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:8 }}>
            <div style={{ color:"var(--text)", fontWeight:700, fontSize:14 }}>
              🏗️ Betonage-Fortschritt
            </div>
            <div style={{ color:"var(--yellow)", fontWeight:800, fontSize:14 }}>
              {betonM2Fertig}/{betonM2Gesamt} m²
            </div>
          </div>
          <div style={{ background:"var(--surface2)", borderRadius:6, height:8,
            overflow:"hidden", border:"1px solid var(--border)" }}>
            <div style={{ background:"var(--yellow)", height:"100%", borderRadius:6,
              width:`${betonM2Gesamt>0 ? (betonM2Fertig/betonM2Gesamt*100) : 0}%`,
              transition:"width 0.5s" }} />
          </div>
        </div>
      )}

      {/* Schnellzugriff auf Hauptbereiche */}
      <div style={{ color:"var(--text)", fontWeight:700, marginBottom:10, fontSize:14 }}>
        Schnellzugriff
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {[
          ["tagebuch","📋","Tagebuch"],
          ["kolonnen","👷",`Kolonnen (${totalMann} Mann)`],
          ["stempeln","⏱️","Stempeln"],
          ["gantt","📅","Zeitplan"],
        ].map(([tid, icon, label]) => (
          <button key={tid} onClick={() => springeZu(tid)}
            style={{ background:"var(--surface)", border:"1.5px solid var(--border)",
              borderRadius:12, padding:"12px 14px", cursor:"pointer",
              display:"flex", alignItems:"center", gap:10,
              fontFamily:"inherit", textAlign:"left" }}>
            <span style={{ fontSize:20 }}>{icon}</span>
            <span style={{ color:"var(--text)", fontSize:12, fontWeight:600 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Aktive Kolonnen — Sprung zur Kolonnenübersicht */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:10 }}>
        <div style={{ color:"var(--text)", fontWeight:700, fontSize:14 }}>Aktive Kolonnen</div>
        {kolonnen.length > 0 && (
          <button onClick={() => springeZu("kolonnen")}
            style={{ background:"none", border:"none", color:"var(--yellow)",
              fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Alle ansehen →
          </button>
        )}
      </div>
      {kolonnen.length === 0 && (
        <div style={{ background:"var(--surface)", borderRadius:12, padding:"20px 16px",
          textAlign:"center", color:"var(--muted)", fontSize:13,
          border:"1px solid var(--border)" }}>
          Noch keine Kolonnen eingeteilt
        </div>
      )}
      {kolonnen.slice(0,3).map(k => (
        <div key={k.id} onClick={() => springeZu("kolonnen")}
          style={{ background:"var(--surface)", borderRadius:10, padding:"10px 14px",
            marginBottom:8, cursor:"pointer",
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color:"var(--text)", fontSize:13, fontWeight:600 }}>{k.name}</div>
            {k.vorarbeiter && (
              <div style={{ color:"var(--muted)", fontSize:11 }}>👷 {k.vorarbeiter}</div>
            )}
          </div>
          <div style={{ color:"var(--yellow)", fontSize:13, fontWeight:700 }}>
            {(k.mitarbeiter||[]).length} Mann
          </div>
        </div>
      ))}
    </div>
  );
}
