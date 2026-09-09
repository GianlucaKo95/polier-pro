import { useState } from "react";
import { FlaskConical, CloudRain, Clock3, TriangleAlert, CircleCheckBig } from "lucide-react";
import { terminprognose } from "../lib/terminkette.js";
import { Label, inputStyle } from "../components/Label.jsx";

// Rein deterministische "Was-wäre-wenn"-Berechnung — keine KI beteiligt.
// Beide Szenarien verändern nur eine In-Memory-Kopie der Aufgaben (nichts
// wird gespeichert) und rechnen dieselbe Terminketten-Engine wie der
// Zeitplan-Tab zweimal: einmal als Basis, einmal mit der Änderung.
//
// Bewusst NICHT unterstützt: Personal zwischen Baustellen verschieben.
// Kolonnen sind in den Daten fest an ein Projekt gebunden, und ohne ein
// Ressourcenmodell über mehrere Baustellen hinweg wäre jede Zahl dazu
// geraten statt berechnet — siehe Chat-Diskussion.
export function SimulationView({ aufgaben = [] }) {
  const [modus, setModus] = useState("verzoegern"); // verzoegern | wetter
  const offeneAufgaben = aufgaben.filter(a => a.status !== "abgeschlossen");

  const [aufgabeId, setAufgabeId] = useState(offeneAufgaben[0]?.id ?? "");
  const [zusatzTage, setZusatzTage] = useState(3);

  const [wetterStart, setWetterStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [wetterTage,  setWetterTage]  = useState(3);

  const [ergebnis, setErgebnis] = useState(null);

  function simulieren() {
    const basis = terminprognose(aufgaben);
    let simAufgaben = aufgaben;
    let betroffen = [];

    if (modus === "verzoegern") {
      const a = aufgaben.find(x => x.id === Number(aufgabeId));
      if (!a) return;
      simAufgaben = aufgaben.map(x => x.id === a.id
        ? { ...x, dauer_tage: (x.dauer_tage && x.dauer_tage > 0 ? x.dauer_tage : 1) + Number(zusatzTage) }
        : x);
      betroffen = [a.titel];
    } else {
      const start = new Date(wetterStart);
      const ende = new Date(start); ende.setDate(ende.getDate() + Number(wetterTage) - 1);
      simAufgaben = aufgaben.map(x => {
        if (x.typ !== "beton" || x.status === "abgeschlossen" || !x.faellig_am) return x;
        const faellig = new Date(x.faellig_am);
        if (faellig >= start && faellig <= ende) {
          betroffen.push(x.titel);
          return { ...x, dauer_tage: (x.dauer_tage && x.dauer_tage > 0 ? x.dauer_tage : 1) + Number(wetterTage) };
        }
        return x;
      });
    }

    const sim = terminprognose(simAufgaben);
    const deltaTage = Math.round((sim.projektEnde - basis.projektEnde) / 86400000);
    setErgebnis({ basis, sim, deltaTage, betroffen });
  }

  return (
    <div>
      <div style={{ color:"var(--text)", fontWeight:700, marginBottom:9,
        display:"flex", alignItems:"center", gap:7 }}><FlaskConical size={16} color="var(--yellow)" /> Baustellen-Simulation</div>
      <div style={{ color:"var(--muted)", fontSize:12, marginBottom:14, lineHeight:1.5 }}>
        Rechnet zwei Szenarien mit der echten Terminketten-Logik durch (dieselbe wie im Zeitplan) —
        keine KI-Schätzung, nur eine Was-wäre-wenn-Berechnung. Es wird nichts gespeichert.
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        {[["verzoegern","Aufgabe verzögert sich"],["wetter","Regen-Tage"]].map(([k,l]) => (
          <button key={k} onClick={() => { setModus(k); setErgebnis(null); }}
            style={{ flex:1, background: modus===k ? "var(--ink)" : "var(--surface)",
              color: modus===k ? "#fff" : "var(--muted)",
              border:`1px solid ${modus===k ? "var(--ink)" : "var(--border)"}`,
              padding:"9px 0", cursor:"pointer", fontSize:12.5, fontWeight: modus===k ? 700 : 500,
              fontFamily:"inherit" }}>{l}</button>
        ))}
      </div>

      {modus === "verzoegern" && (
        <div style={{ marginBottom:14 }}>
          {offeneAufgaben.length === 0 ? (
            <div style={{ color:"var(--muted)", fontSize:12.5 }}>Keine offenen Aufgaben zum Simulieren vorhanden.</div>
          ) : (
            <>
              <div style={{ marginBottom:9 }}>
                <Label>Aufgabe</Label>
                <select value={aufgabeId} onChange={e => setAufgabeId(e.target.value)}
                  style={{ ...inputStyle(), padding:"11px 12px" }}>
                  {offeneAufgaben.map(a => <option key={a.id} value={a.id}>{a.titel}</option>)}
                </select>
              </div>
              <div>
                <Label>Zusätzliche Verzögerung (Tage)</Label>
                <input type="number" min="1" value={zusatzTage} onChange={e => setZusatzTage(e.target.value)} style={inputStyle()} />
              </div>
            </>
          )}
        </div>
      )}

      {modus === "wetter" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div>
            <Label>Regen ab</Label>
            <input type="date" value={wetterStart} onChange={e => setWetterStart(e.target.value)}
              style={{ ...inputStyle(), padding:"11px 12px" }} />
          </div>
          <div>
            <Label>Anzahl Tage</Label>
            <input type="number" min="1" value={wetterTage} onChange={e => setWetterTage(e.target.value)} style={inputStyle()} />
          </div>
          <div style={{ gridColumn:"1 / -1", color:"var(--muted)", fontSize:11 }}>
            Betrifft alle offenen Betonage-Aufgaben mit Fälligkeitsdatum in diesem Zeitraum.
          </div>
        </div>
      )}

      <button onClick={simulieren}
        disabled={modus === "verzoegern" && offeneAufgaben.length === 0}
        style={{ width:"100%", background:"var(--yellow)", color:"#1a1200", border:"none",
          padding:14, fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:16,
          opacity: modus === "verzoegern" && offeneAufgaben.length === 0 ? 0.5 : 1 }}>
        {modus === "wetter" ? <CloudRain size={16} /> : <Clock3 size={16} />} Simulieren
      </button>

      {ergebnis && (
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:12.5 }}>
            <span style={{ color:"var(--muted)" }}>Ohne Simulation</span>
            <span style={{ color:"var(--text)", fontWeight:700 }}>{ergebnis.basis.projektEnde.toLocaleDateString("de-DE")}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12, fontSize:12.5 }}>
            <span style={{ color:"var(--muted)" }}>Mit Simulation</span>
            <span style={{ color:"var(--text)", fontWeight:700 }}>{ergebnis.sim.projektEnde.toLocaleDateString("de-DE")}</span>
          </div>

          <div style={{ background: ergebnis.deltaTage > 0 ? "var(--rbg)" : "var(--gbg)", borderRadius:8,
            padding:"10px 12px", display:"flex", alignItems:"center", gap:8 }}>
            {ergebnis.deltaTage > 0
              ? <TriangleAlert size={16} color="var(--red)" />
              : <CircleCheckBig size={16} color="var(--green)" />}
            <div style={{ color: ergebnis.deltaTage > 0 ? "var(--red)" : "var(--green)", fontWeight:700, fontSize:13 }}>
              {ergebnis.deltaTage > 0
                ? `Gesamttermin verschiebt sich um ${ergebnis.deltaTage} Tag${ergebnis.deltaTage===1?"":"e"}`
                : "Gesamttermin bleibt unverändert"}
            </div>
          </div>

          {ergebnis.betroffen.length > 0 && (
            <div style={{ marginTop:10, fontSize:11.5, color:"var(--muted)" }}>
              Betroffene Aufgabe{ergebnis.betroffen.length===1?"":"n"}: {ergebnis.betroffen.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
