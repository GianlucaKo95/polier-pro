import { useState, useEffect } from "react";
import { ERFASST_PROXY, erfasstQuery } from "../lib/erfasst.js";
import { Label, inputStyle } from "../components/Label.jsx";
import { KolonneKarte } from "../components/KolonneKarte.jsx";

export function KolonnenView({ kolonnen, projekt, setKolonnen, darfBearbeiten = true, profil, session }) {
  const [zeitdaten,   setZeitdaten]   = useState([]);
  const [ladeStatus,  setLadeStatus]  = useState("idle"); // idle | loading | ok | error
  const [vonDatum,    setVonDatum]    = useState(() => {
    const d = new Date(); d.setDate(d.getDate()-6);
    return d.toISOString().slice(0,10);
  });
  const [bisDatum,    setBisDatum]    = useState(new Date().toISOString().slice(0,10));
  const [neueKolonne, setNeueKolonne] = useState(false);
  const [kName,       setKName]       = useState("");
  const [kVorarbeiter,setKVorarbeiter]= useState("");

  const konfiguriert  = !ERFASST_PROXY.includes("DEIN-PROJEKT");
  const erfasstLinked = konfiguriert && !!projekt?.erfasstIdent;

  const totalMann = kolonnen.reduce((s,k) => s + (k.mitarbeiter?.length || 0), 0);
  const totalStd  = zeitdaten.reduce((s,z) => s + (z.hours||0) + (z.minutes||0)/60, 0);

  async function ladeZeiten() {
    if (!erfasstLinked) return;
    setLadeStatus("loading");
    try {
      const data = await erfasstQuery(Q_TIMES, {
        from:         vonDatum + "T00:00:00",
        to:           bisDatum + "T23:59:59",
        projectIdent: projekt.erfasstIdent,
      });
      setZeitdaten(data?.hoursBlocks?.nodes || []);
      setLadeStatus("ok");
    } catch(e) {
      setLadeStatus("error");
    }
  }

  useEffect(() => { ladeZeiten(); }, [vonDatum, bisDatum, projekt?.erfasstIdent]);

  function kolonneAnlegen() {
    if (!kName.trim() || !setKolonnen) return;
    const neu = {
      id: Date.now(),
      name: kName.trim(),
      vorarbeiter: kVorarbeiter.trim(),
      mitarbeiter: [],
    };
    setKolonnen(prev => [...prev, neu]);
    setKName(""); setKVorarbeiter(""); setNeueKolonne(false);
  }

  return (
    <div>
      {/* KPI Leiste */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
        <div style={{ background: "var(--surface)", borderRadius:10, padding:"11px 12px", borderBottom:`3px solid ${'var(--yellow)'}` }}>
          <div style={{ color: "var(--muted)", fontSize:10 }}>Kolonnen</div>
          <div style={{ color: "var(--text)", fontWeight:800, fontSize:22 }}>{kolonnen.length}</div>
        </div>
        <div style={{ background: "var(--surface)", borderRadius:10, padding:"11px 12px", borderBottom:`3px solid ${'var(--blue)'}` }}>
          <div style={{ color: "var(--muted)", fontSize:10 }}>Mitarbeiter</div>
          <div style={{ color: "var(--text)", fontWeight:800, fontSize:22 }}>{totalMann}</div>
        </div>
        <div style={{ background: "var(--surface)", borderRadius:10, padding:"11px 12px", borderBottom:`3px solid ${'var(--green)'}` }}>
          <div style={{ color: "var(--muted)", fontSize:10 }}>Stunden Σ</div>
          <div style={{ color: "var(--text)", fontWeight:800, fontSize:22 }}>
            {ladeStatus === "ok" ? totalStd.toFixed(1)+"h" : "—"}
          </div>
        </div>
      </div>

      {/* Datumsfilter (nur wenn 123erfasst verbunden) */}
      {konfiguriert && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:8, marginBottom:14, alignItems:"end" }}>
          <div>
            <Label>Von</Label>
            <input type="date" value={vonDatum} onChange={e => setVonDatum(e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <Label>Bis</Label>
            <input type="date" value={bisDatum} onChange={e => setBisDatum(e.target.value)} style={inputStyle()} />
          </div>
          <button onClick={ladeZeiten}
            style={{ background: "var(--border)", border:"none", color: "var(--text)",
              borderRadius:8, padding:"10px 12px", cursor:"pointer", fontSize:16,
              height:40, display:"flex", alignItems:"center" }}>
            {ladeStatus === "loading" ? "⏳" : "🔄"}
          </button>
        </div>
      )}

      {/* Status-Banner */}
      {!konfiguriert && (
        <div style={{ background: "var(--border)", borderRadius:8, padding:"8px 12px", marginBottom:12,
          display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:14 }}>ℹ️</span>
          <span style={{ color: "var(--muted)", fontSize:12 }}>
            123erfasst nicht konfiguriert — Stunden werden aus Mock-Daten angezeigt.
          </span>
        </div>
      )}
      {konfiguriert && !erfasstLinked && (
        <div style={{ background:"#2A2010", borderRadius:8, padding:"8px 12px", marginBottom:12,
          display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:14 }}>⚠️</span>
          <span style={{ color: "var(--yellow)", fontSize:12 }}>
            Kein 123erfasst-Projekt verknüpft. Im ⏱️ Zeiten-Tab verknüpfen.
          </span>
        </div>
      )}
      {ladeStatus === "error" && (
        <div style={{ background:"#2E1A1A", borderRadius:8, padding:"8px 12px", marginBottom:12, color: "var(--red)", fontSize:12 }}>
          ❌ Zeitdaten konnten nicht geladen werden.
        </div>
      )}

      {/* Kolonnen */}
      {kolonnen.map(k => (
        <KolonneKarte
          key={k.id}
          k={k}
          zeitdaten={zeitdaten}
          vonDatum={vonDatum}
          bisDatum={bisDatum}
          erfasstVerbunden={ladeStatus === "ok"}
          setKolonnen={setKolonnen}
          darfBearbeiten={darfBearbeiten}
        />
      ))}

      {darfBearbeiten && (!neueKolonne ? (
        <button onClick={() => setNeueKolonne(true)}
          style={{ width:"100%", background:"var(--ybg)", color:"var(--ydark)",
            border:"2px dashed var(--yellow)", borderRadius:10, padding:12,
            cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit" }}>
          + Kolonne einteilen
        </button>
      ) : (
        <div style={{ background:"var(--surface)", borderRadius:12, padding:16,
          border:"1.5px solid var(--yellow)" }}>
          <div style={{ color:"var(--text)", fontWeight:700, fontSize:14,
            marginBottom:12 }}>Neue Kolonne</div>
          <div style={{ marginBottom:10 }}>
            <Label>Name</Label>
            <input value={kName} onChange={e => setKName(e.target.value)}
              placeholder="z.B. Kolonne Huber" style={inputStyle()} />
          </div>
          <div style={{ marginBottom:14 }}>
            <Label>Vorarbeiter</Label>
            <input value={kVorarbeiter} onChange={e => setKVorarbeiter(e.target.value)}
              placeholder="z.B. Thomas Huber" style={inputStyle()} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => { setNeueKolonne(false); setKName(""); setKVorarbeiter(""); }}
              style={{ flex:1, background:"var(--surface2)", color:"var(--muted)",
                border:"1px solid var(--border)", borderRadius:10, padding:10,
                cursor:"pointer", fontFamily:"inherit" }}>Abbrechen</button>
            <button onClick={kolonneAnlegen} disabled={!kName.trim()}
              style={{ flex:2, background: kName.trim() ? "var(--yellow)" : "var(--surface2)",
                color: kName.trim() ? "#1a1200" : "var(--muted)",
                border:"none", borderRadius:10, padding:10, fontWeight:700,
                cursor: kName.trim() ? "pointer" : "default", fontFamily:"inherit" }}>
              💾 Anlegen
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
