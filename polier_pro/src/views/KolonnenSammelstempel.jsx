import { useState } from "react";
import { getGPSPosition, reverseGeocode } from "../lib/geo.js";
import { sbFetch } from "../lib/supabase.js";
import { Label } from "../components/Label.jsx";
import { TAETIGKEITEN } from "../config/konstanten.js";

export function KolonnenSammelstempel({ kolonne, projekte, session, onClose }) {
  const [ausgewaehlt, setAusgewaehlt] = useState(() => {
    const sel = {};
    (kolonne.mitarbeiter || []).forEach((_, i) => sel[i] = true);
    return sel;
  });
  const [aktivProjekt, setAktivProjekt] = useState(projekte[0]?.id || null);
  const [taetigkeit,   setTaetigkeit]   = useState("beton");
  const [gpsLaden,     setGpsLaden]     = useState(false);
  const [ergebnis,     setErgebnis]     = useState(null); // { erfolg, fehler }

  const anzahlAusgewaehlt = Object.values(ausgewaehlt).filter(Boolean).length;

  async function sammelEinstempeln() {
    setGpsLaden(true);
    let pos = null, adresse = null;
    try {
      pos = await getGPSPosition();
      adresse = await reverseGeocode(pos.lat, pos.lng);
    } catch { /* GPS optional — Buchung geht auch ohne */ }
    setGpsLaden(false);

    const ausgewaehlteMitarbeiter = (kolonne.mitarbeiter || [])
      .filter((_, i) => ausgewaehlt[i]);

    let erfolgreich = 0, fehlgeschlagen = 0;
    for (const mitarbeiter of ausgewaehlteMitarbeiter) {
      const buchung = {
        profil_id:        null, // kein eigener Account — Name in Notiz
        projekt_id:       aktivProjekt,
        kolonne_id:       kolonne.id,
        eingestempelt_at: new Date().toISOString(),
        ein_lat:          pos?.lat,
        ein_lng:          pos?.lng,
        ein_adresse:      adresse || null,
        status:           "aktiv",
        taetigkeit:       taetigkeit,
        notiz:            `Sammelbuchung Kolonne ${kolonne.name}: ${mitarbeiter.name}`,
      };
      if (session?.access_token) {
        const data = await sbFetch("zeitbuchungen", {
          method: "POST",
          headers: { "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify(buchung),
        });
        if (data?.[0]) erfolgreich++; else fehlgeschlagen++;
      } else {
        erfolgreich++; // Demo-Modus: immer "erfolgreich"
      }
    }
    setErgebnis({ erfolgreich, fehlgeschlagen, gesamt: ausgewaehlteMitarbeiter.length });
  }

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0,
      background:"var(--bg)", zIndex:500, overflowY:"auto",
      WebkitOverflowScrolling:"touch",
      fontFamily:"'Segoe UI', system-ui, sans-serif" }}>

      <div style={{ background:"var(--surface)", padding:"14px 18px",
        borderBottom:"3px solid var(--yellow)", position:"sticky", top:0,
        zIndex:10, display:"flex", justifyContent:"space-between",
        alignItems:"center" }}>
        <div style={{ color:"var(--yellow)", fontWeight:700, fontSize:17 }}>
          👷 Kolonne einstempeln
        </div>
        <button onClick={onClose}
          style={{ background:"var(--surface2)", border:"1px solid var(--border)",
            color:"var(--text)", borderRadius:8, padding:"6px 14px",
            cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>✕</button>
      </div>

      <div style={{ padding:"18px 16px 100px" }}>

        {!ergebnis ? (
          <>
            <div style={{ color:"var(--muted)", fontSize:13, marginBottom:16,
              lineHeight:1.5 }}>
              Stempelt <strong>{kolonne.name}</strong> gesammelt ein. Praktisch
              wenn nicht jeder Mitarbeiter ein eigenes Smartphone mit App hat —
              der Vorarbeiter erfasst für das ganze Team auf einmal.
            </div>

            <div style={{ marginBottom:14 }}>
              <Label>Projekt</Label>
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:6 }}>
                {projekte.map(p => (
                  <button key={p.id} onClick={() => setAktivProjekt(p.id)}
                    style={{ background: aktivProjekt===p.id ? "var(--ybg)" : "var(--surface)",
                      color:"var(--text)", border:`2px solid ${aktivProjekt===p.id ? "var(--yellow)" : "var(--border)"}`,
                      borderRadius:12, padding:"10px 14px", cursor:"pointer",
                      fontFamily:"inherit", textAlign:"left",
                      fontWeight: aktivProjekt===p.id ? 700 : 400, fontSize:13 }}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <Label>Tätigkeit</Label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6 }}>
                {Object.entries(TAETIGKEITEN).map(([key, t]) => (
                  <button key={key} onClick={() => setTaetigkeit(key)}
                    style={{ background: taetigkeit===key ? "var(--ybg)" : "var(--surface2)",
                      color: taetigkeit===key ? "var(--ydark)" : "var(--muted)",
                      border:`1.5px solid ${taetigkeit===key ? "var(--yellow)" : "var(--border)"}`,
                      borderRadius:20, padding:"6px 12px", cursor:"pointer",
                      fontSize:12, fontWeight: taetigkeit===key ? 700 : 400,
                      fontFamily:"inherit" }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:10 }}>
              <Label>Mitarbeiter</Label>
              <div style={{ color:"var(--muted)", fontSize:12 }}>
                {anzahlAusgewaehlt} / {(kolonne.mitarbeiter||[]).length} ausgewählt
              </div>
            </div>

            {(kolonne.mitarbeiter||[]).length === 0 && (
              <div style={{ background:"var(--surface)", borderRadius:12,
                padding:"20px 16px", textAlign:"center", color:"var(--muted)",
                fontSize:13, border:"1px solid var(--border)" }}>
                Diese Kolonne hat noch keine Mitarbeiter hinterlegt.
                Füge sie in der Kolonnen-Verwaltung hinzu.
              </div>
            )}

            {(kolonne.mitarbeiter||[]).map((mitarbeiter, i) => (
              <div key={mitarbeiter.id ?? i} onClick={() => setAusgewaehlt(p=>({...p,[i]:!p[i]}))}
                style={{ display:"flex", alignItems:"center", gap:10,
                  background:"var(--surface)", borderRadius:10,
                  padding:"10px 14px", marginBottom:6, cursor:"pointer",
                  border:`1.5px solid ${ausgewaehlt[i] ? "var(--yellow)" : "var(--border)"}` }}>
                <div style={{ width:22, height:22, borderRadius:6, flexShrink:0,
                  background: ausgewaehlt[i] ? "var(--yellow)" : "var(--surface2)",
                  border:`1.5px solid ${ausgewaehlt[i] ? "var(--yellow)" : "var(--border)"}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:13, color:"#1a1200" }}>
                  {ausgewaehlt[i] && "✓"}
                </div>
                <div style={{ color:"var(--text)", fontSize:13, fontWeight:600 }}>
                  {mitarbeiter.name}
                </div>
              </div>
            ))}

            <button onClick={sammelEinstempeln}
              disabled={gpsLaden || anzahlAusgewaehlt===0 || !aktivProjekt}
              style={{ width:"100%", background: anzahlAusgewaehlt>0 && aktivProjekt ? "var(--green)" : "var(--surface2)",
                color: anzahlAusgewaehlt>0 && aktivProjekt ? "#fff" : "var(--muted)",
                border:"none", borderRadius:14, padding:16, fontWeight:800,
                fontSize:16, marginTop:20,
                cursor: anzahlAusgewaehlt>0 && aktivProjekt ? "pointer" : "default",
                fontFamily:"inherit" }}>
              {gpsLaden ? "📍 GPS…" : `▶ ${anzahlAusgewaehlt} Mitarbeiter einstempeln`}
            </button>
          </>
        ) : (
          <div style={{ textAlign:"center", paddingTop:20 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>
              {ergebnis.fehlgeschlagen === 0 ? "✅" : "⚠️"}
            </div>
            <div style={{ color:"var(--text)", fontWeight:800, fontSize:18,
              marginBottom:8 }}>
              {ergebnis.erfolgreich} von {ergebnis.gesamt} eingestempelt
            </div>
            {ergebnis.fehlgeschlagen > 0 && (
              <div style={{ color:"var(--red)", fontSize:13, marginBottom:16 }}>
                {ergebnis.fehlgeschlagen} Buchung(en) fehlgeschlagen — bitte erneut versuchen.
              </div>
            )}
            <button onClick={onClose}
              style={{ background:"var(--yellow)", color:"#1a1200", border:"none",
                borderRadius:12, padding:"12px 24px", fontWeight:800,
                cursor:"pointer", fontSize:15, fontFamily:"inherit" }}>
              Fertig
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
