import { useState, useEffect } from "react";
import { ROLLEN, TAETIGKEITEN } from "../config/konstanten.js";
import { KolonnenSammelstempel } from "./KolonnenSammelstempel.jsx";
import { sbFetch } from "../lib/supabase.js";
import { getGPSPosition, reverseGeocode } from "../lib/geo.js";
import { Label, inputStyle } from "../components/Label.jsx";

export function StempeluhrView({ profil, projekte, session, kolonnen = [] }) {
  const [status,      setStatus]      = useState("aus");   // aus | ein | pause
  const [aktiveBuchung, setAktiveBuchung] = useState(null);
  const [gps,         setGPS]         = useState(null);
  const [gpsLaden,    setGPSLaden]    = useState(false);
  const [gpsError,    setGPSError]    = useState("");
  const [jetzt,       setJetzt]       = useState(new Date());
  const [buchungen,   setBuchungen]   = useState([]);
  const [aktivProjekt,setAktivProjekt]= useState(projekte[0]?.id || null);
  const [notiz,       setNotiz]       = useState("");
  const [taetigkeit,  setTaetigkeit]  = useState("beton");
  const [zeigeSammel, setZeigeSammel] = useState(false);

  // Eigene Kolonne finden (für Vorarbeiter mit Team-Sammelerfassung)
  const eigeneKolonne = kolonnen.find(k => k.id === profil?.kolonne_id);
  const kannSammelStempeln = ROLLEN[profil?.rolle]?.label === "Vorarbeiter" ||
    profil?.rolle === "vorarbeiter" || profil?.rolle === "polier" || profil?.rolle === "administrator";

  if (zeigeSammel && eigeneKolonne) {
    return (
      <KolonnenSammelstempel
        kolonne={eigeneKolonne}
        projekte={projekte}
        session={session}
        onClose={() => setZeigeSammel(false)}
      />
    );
  }

  // Uhr aktualisieren
  useEffect(() => {
    const t = setInterval(() => setJetzt(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Heutige Buchungen laden
  useEffect(() => {
    ladeBuchungen();
  }, []);

  async function ladeBuchungen() {
    if (!session?.access_token) return;
    const heute = new Date().toISOString().slice(0,10);
    const data = await sbFetch(
      `zeitbuchungen?profil_id=eq.${profil.id}&eingestempelt_at=gte.${heute}T00:00:00&order=eingestempelt_at.desc`,
      { headers: { "Authorization": `Bearer ${session.access_token}` } }
    );
    if (data) {
      setBuchungen(data);
      const aktive = data.find(b => b.status === "aktiv" || b.status === "pause");
      if (aktive) {
        setAktiveBuchung(aktive);
        setStatus(aktive.status);
      }
    }
  }

  async function holeGPS() {
    setGPSLaden(true); setGPSError("");
    try {
      const pos = await getGPSPosition();
      const adresse = await reverseGeocode(pos.lat, pos.lng);
      const result = { ...pos, adresse };
      setGPS(result);
      return result;
    } catch(e) {
      setGPSError("GPS nicht verfügbar — bitte Standort aktivieren");
      return null;
    } finally { setGPSLaden(false); }
  }

  async function einstempeln() {
    const pos = await holeGPS();
    const buchung = {
      profil_id:        profil.id,
      projekt_id:       aktivProjekt,
      kolonne_id:       profil.kolonne_id || null,
      eingestempelt_at: new Date().toISOString(),
      ein_lat:          pos?.lat,
      ein_lng:          pos?.lng,
      ein_adresse:      pos?.adresse || null,
      status:           "aktiv",
      notiz:            notiz || null,
      taetigkeit:       taetigkeit,
    };

    if (session?.access_token) {
      const data = await sbFetch("zeitbuchungen", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify(buchung),
      });
      if (data?.[0]) { setAktiveBuchung(data[0]); }
    } else {
      // Demo-Modus: lokal
      const demo = { ...buchung, id: Date.now() };
      setAktiveBuchung(demo);
      setBuchungen(prev => [demo, ...prev]);
    }
    setStatus("ein");
  }

  async function pauseStart() {
    if (!aktiveBuchung) return;
    const update = { pause_start_at: new Date().toISOString(), status: "pause" };
    if (session?.access_token) {
      await sbFetch(`zeitbuchungen?id=eq.${aktiveBuchung.id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify(update),
      });
    }
    setAktiveBuchung(prev => ({ ...prev, ...update }));
    setStatus("pause");
  }

  async function pauseEnde() {
    if (!aktiveBuchung) return;
    const update = { pause_ende_at: new Date().toISOString(), status: "aktiv" };
    if (session?.access_token) {
      await sbFetch(`zeitbuchungen?id=eq.${aktiveBuchung.id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify(update),
      });
    }
    setAktiveBuchung(prev => ({ ...prev, ...update }));
    setStatus("ein");
  }

  async function ausstempeln() {
    const pos = await holeGPS();
    if (!aktiveBuchung) return;

    const ein  = new Date(aktiveBuchung.eingestempelt_at);
    const aus  = new Date();
    const pauseMin = aktiveBuchung.pause_start_at && aktiveBuchung.pause_ende_at
      ? Math.round((new Date(aktiveBuchung.pause_ende_at) - new Date(aktiveBuchung.pause_start_at)) / 60000)
      : 0;
    const nettoMin = Math.round((aus - ein) / 60000) - pauseMin;

    const update = {
      ausgestempelt_at: aus.toISOString(),
      aus_lat:          pos?.lat,
      aus_lng:          pos?.lng,
      aus_adresse:      pos?.adresse || null,
      netto_minuten:    nettoMin,
      status:           "abgeschlossen",
    };

    if (session?.access_token) {
      await sbFetch(`zeitbuchungen?id=eq.${aktiveBuchung.id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify(update),
      });
    }
    setAktiveBuchung(null);
    setStatus("aus");
    await ladeBuchungen();
  }

  // Laufzeit berechnen
  const laufzeit = aktiveBuchung && status !== "aus"
    ? Math.round((jetzt - new Date(aktiveBuchung.eingestempelt_at)) / 60000)
    : 0;
  const laufzeitStr = `${Math.floor(laufzeit/60)}h ${(laufzeit%60).toString().padStart(2,"0")}min`;

  const STATUS_FARBE = { aus: "var(--muted)", ein: "var(--green)", pause: "var(--yellow)" };
  const STATUS_BG    = { aus: "var(--surface2)", ein: "var(--gbg)", pause: "var(--ybg)" };

  return (
    <div>
      {/* Uhr */}
      <div style={{ background:"var(--surface)", borderRadius:20, padding:24,
        marginBottom:16, textAlign:"center", border:"1.5px solid var(--border)",
        boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)",
          textTransform:"uppercase", letterSpacing:2, marginBottom:8 }}>
          {jetzt.toLocaleDateString("de-DE", { weekday:"long", day:"2-digit", month:"long" })}
        </div>
        <div style={{ fontSize:52, fontWeight:900, color:"var(--text)",
          letterSpacing:-2, fontVariantNumeric:"tabular-nums" }}>
          {jetzt.toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" })}
          <span style={{ fontSize:28, color:"var(--muted)" }}>
            :{jetzt.getSeconds().toString().padStart(2,"0")}
          </span>
        </div>

        {/* Status */}
        <div style={{ display:"inline-flex", alignItems:"center", gap:8,
          background: STATUS_BG[status], borderRadius:20, padding:"8px 16px",
          marginTop:12, border:`1.5px solid ${STATUS_FARBE[status]}` }}>
          <div style={{ width:8, height:8, borderRadius:4,
            background: STATUS_FARBE[status],
            animation: status === "ein" ? "pulse 2s infinite" : "none" }} />
          <span style={{ fontSize:13, fontWeight:800, color: STATUS_FARBE[status] }}>
            { status === "aus"   ? "Nicht eingestempelt"
            : status === "ein"   ? `Eingestempelt · ${laufzeitStr}`
            : `Pause · ${laufzeitStr}` }
          </span>
        </div>

        {/* GPS Position */}
        {gps && (
          <div style={{ marginTop:10, fontSize:11, color:"var(--muted)" }}>
            📍 {gps.adresse} · ±{gps.genauigkeit}m
          </div>
        )}
        {gpsError && (
          <div style={{ marginTop:8, fontSize:11, color:"var(--red)" }}>{gpsError}</div>
        )}
      </div>

      {/* Kolonnen-Sammelerfassung — nur wenn eigene Kolonne + berechtigte Rolle */}
      {eigeneKolonne && kannSammelStempeln && status === "aus" && (
        <button onClick={() => setZeigeSammel(true)}
          style={{ width:"100%", background:"var(--bbg)", color:"var(--blue)",
            border:"2px solid var(--blue)", borderRadius:14, padding:14,
            fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:14,
            fontFamily:"inherit", display:"flex", alignItems:"center",
            justifyContent:"center", gap:8 }}>
          👷 Für Kolonne „{eigeneKolonne.name}" sammelbuchen
        </button>
      )}

      {/* Projekt Auswahl */}
      {status === "aus" && (
        <>
          <div style={{ marginBottom:12 }}>
            <Label>Projekt</Label>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:6 }}>
              {projekte.map(p => (
                <button key={p.id} onClick={() => setAktivProjekt(p.id)}
                  style={{ background: aktivProjekt===p.id ? "var(--ybg)" : "var(--surface)",
                    color:"var(--text)", border:`2px solid ${aktivProjekt===p.id ? "var(--yellow)" : "var(--border)"}`,
                    borderRadius:12, padding:"12px 16px", cursor:"pointer",
                    fontFamily:"inherit", textAlign:"left", fontWeight: aktivProjekt===p.id ? 700 : 400 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:4, background:p.farbe }} />
                    <span style={{ fontSize:13 }}>{p.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
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
          <div style={{ marginBottom:16 }}>
            <Label>Notiz (optional)</Label>
            <input value={notiz} onChange={e => setNotiz(e.target.value)}
              placeholder="z.B. Bewehrungsarbeiten B1" style={inputStyle()} />
          </div>
        </>
      )}

      {/* Aktive Buchung Info */}
      {aktiveBuchung && status !== "aus" && (
        <div style={{ background:"var(--surface)", borderRadius:14, padding:16,
          marginBottom:16, border:"1.5px solid var(--border)" }}>
          <div style={{ color:"var(--muted)", fontSize:11, marginBottom:4 }}>Aktuelle Buchung</div>
          <div style={{ color:"var(--text)", fontSize:13, fontWeight:600 }}>
            {projekte.find(p=>p.id===aktiveBuchung.projekt_id)?.name || "—"}
          </div>
          {aktiveBuchung.taetigkeit && (
            <div style={{ color:"var(--ydark)", fontSize:12, marginTop:4,
              fontWeight:600 }}>
              {TAETIGKEITEN[aktiveBuchung.taetigkeit]?.icon} {TAETIGKEITEN[aktiveBuchung.taetigkeit]?.label}
            </div>
          )}
          {aktiveBuchung.ein_adresse && (
            <div style={{ color:"var(--muted)", fontSize:11, marginTop:4 }}>
              📍 Eingestempelt: {aktiveBuchung.ein_adresse}
            </div>
          )}
          {aktiveBuchung.notiz && (
            <div style={{ color:"var(--muted)", fontSize:11, marginTop:2 }}>
              💬 {aktiveBuchung.notiz}
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        {status === "aus" && (
          <button onClick={einstempeln} disabled={gpsLaden || !aktivProjekt}
            style={{ flex:1, background:"var(--green)", color:"#fff",
              border:"none", borderRadius:14, padding:18, fontWeight:900,
              fontSize:18, cursor:"pointer", fontFamily:"inherit",
              opacity: gpsLaden || !aktivProjekt ? 0.6 : 1 }}>
            {gpsLaden ? "📍 GPS…" : "▶ Einstempeln"}
          </button>
        )}
        {status === "ein" && (
          <>
            <button onClick={pauseStart}
              style={{ flex:1, background:"var(--ybg)", color:"var(--ydark)",
                border:"2px solid var(--yellow)", borderRadius:14, padding:16,
                fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
              ⏸ Pause
            </button>
            <button onClick={ausstempeln} disabled={gpsLaden}
              style={{ flex:1, background:"var(--red)", color:"#fff",
                border:"none", borderRadius:14, padding:16, fontWeight:900,
                fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
              {gpsLaden ? "📍…" : "⏹ Ausstempeln"}
            </button>
          </>
        )}
        {status === "pause" && (
          <button onClick={pauseEnde}
            style={{ flex:1, background:"var(--yellow)", color:"#1a1200",
              border:"none", borderRadius:14, padding:18, fontWeight:900,
              fontSize:18, cursor:"pointer", fontFamily:"inherit" }}>
            ▶ Weiterarbeiten
          </button>
        )}
      </div>

      {/* Heutige Buchungen */}
      {buchungen.filter(b=>b.status==="abgeschlossen").length > 0 && (
        <div>
          <div style={{ color:"var(--text)", fontWeight:700, fontSize:14, marginBottom:10 }}>
            Heute abgeschlossen
          </div>
          {buchungen.filter(b=>b.status==="abgeschlossen").map(b => (
            <div key={b.id} style={{ background:"var(--surface)", borderRadius:12,
              padding:"12px 14px", marginBottom:8, border:"1.5px solid var(--border)" }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:12, color:"var(--text2)" }}>
                    {new Date(b.eingestempelt_at).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}
                    {" → "}
                    {b.ausgestempelt_at ? new Date(b.ausgestempelt_at).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) : "—"}
                  </div>
                  {b.ein_adresse && <div style={{ fontSize:10, color:"var(--muted)", marginTop:2 }}>📍 {b.ein_adresse}</div>}
                  {b.taetigkeit && (
                    <div style={{ fontSize:10, color:"var(--ydark)", marginTop:2, fontWeight:600 }}>
                      {TAETIGKEITEN[b.taetigkeit]?.icon} {TAETIGKEITEN[b.taetigkeit]?.label}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight:800, color:"var(--text)", fontSize:14 }}>
                  {b.netto_minuten ? `${Math.floor(b.netto_minuten/60)}h ${b.netto_minuten%60}min` : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.6;transform:scale(1.3)}
        }
      `}</style>
    </div>
  );
}
