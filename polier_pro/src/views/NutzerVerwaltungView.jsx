import { useState, useEffect } from "react";
import { sbFetch } from "../lib/supabase.js";
import { ROLLEN } from "../config/konstanten.js";
import { EinladungGenerieren } from "./EinladungGenerieren.jsx";

export function NutzerVerwaltungView({ session, kolonnen = [], firmaId = null }) {
  const [nutzer,      setNutzer]      = useState([]);
  const [einladungen, setEinladungen] = useState([]);
  const [laden,       setLaden]       = useState(true);
  const [ansicht,     setAnsicht]     = useState("nutzer"); // nutzer | einladungen
  const [editNutzer,  setEditNutzer]  = useState(null);
  const [zeigeEinladen, setZeigeEinladen] = useState(false);

  useEffect(() => { ladeAlles(); }, []);

  async function ladeAlles() {
    setLaden(true);
    const [n, e] = await Promise.all([
      sbFetch("profile?select=*&order=created_at.desc", {
        headers: { "Authorization": `Bearer ${session?.access_token}` }
      }),
      sbFetch("einladungen?select=*&order=created_at.desc&limit=20", {
        headers: { "Authorization": `Bearer ${session?.access_token}` }
      }),
    ]);
    if (n) setNutzer(n);
    if (e) setEinladungen(e);
    setLaden(false);
  }

  async function rolleAendern(id, neueRolle) {
    await sbFetch(`profile?id=eq.${id}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ rolle: neueRolle }),
    });
    setNutzer(prev => prev.map(n => n.id === id ? { ...n, rolle: neueRolle } : n));
  }

  async function aktivitaetToggle(id, aktiv) {
    await sbFetch(`profile?id=eq.${id}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ aktiv: !aktiv }),
    });
    setNutzer(prev => prev.map(n => n.id === id ? { ...n, aktiv: !aktiv } : n));
  }

  async function kolonneAendern(id, kolonneId) {
    await sbFetch(`profile?id=eq.${id}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ kolonne_id: kolonneId || null }),
    });
    setNutzer(prev => prev.map(n => n.id === id
      ? { ...n, kolonne_id: kolonneId || null } : n));
  }

  async function einladungWiderrufen(id) {
    await sbFetch(`einladungen?id=eq.${id}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ aktiv: false }),
    });
    setEinladungen(prev => prev.map(e => e.id === id ? { ...e, aktiv: false } : e));
  }

  function teilen(link) {
    if (navigator.share) {
      navigator.share({ title: "Polaris Einladung", url: link });
    } else {
      navigator.clipboard?.writeText(link);
    }
  }

  const aktiveNutzer   = nutzer.filter(n => n.aktiv !== false);
  const inaktiveNutzer = nutzer.filter(n => n.aktiv === false);
  const offeneEinl     = einladungen.filter(e => e.aktiv && new Date(e.läuft_ab_at) > new Date());
  const abgelaufeneEinl= einladungen.filter(e => !e.aktiv || new Date(e.läuft_ab_at) <= new Date());

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:16 }}>
        <div style={{ color:"var(--text)", fontWeight:800, fontSize:16 }}>
          👥 Nutzerverwaltung
        </div>
        <button onClick={() => setZeigeEinladen(true)}
          style={{ background:"var(--yellow)", color:"#1a1200", border:"none",
            borderRadius:10, padding:"8px 14px", fontWeight:700,
            cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
          + Einladen
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
        gap:8, marginBottom:16 }}>
        {[
          ["Aktive Nutzer",    aktiveNutzer.length,    "var(--green)"],
          ["Inaktiv",          inaktiveNutzer.length,  "var(--muted)"],
          ["Offen. Einl.",     offeneEinl.length,      "var(--yellow)"],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:"var(--surface)", borderRadius:12,
            padding:"10px 12px", border:"1.5px solid var(--border)",
            position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0,
              height:3, background:c }} />
            <div style={{ color:"var(--muted)", fontSize:10, fontWeight:700,
              textTransform:"uppercase", marginBottom:4 }}>{l}</div>
            <div style={{ color:"var(--text)", fontWeight:900, fontSize:22 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Tab Toggle */}
      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        {[["nutzer","👤 Nutzer"], ["einladungen","📨 Einladungen"]].map(([k,l]) => (
          <button key={k} onClick={() => setAnsicht(k)}
            style={{ flex:1, background: ansicht===k ? "var(--yellow)" : "var(--surface2)",
              color: ansicht===k ? "#1a1200" : "var(--muted)",
              border:`1.5px solid ${ansicht===k ? "var(--yellow)" : "var(--border)"}`,
              borderRadius:10, padding:9, fontWeight: ansicht===k ? 700 : 400,
              cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>{l}</button>
        ))}
      </div>

      {laden && (
        <div style={{ textAlign:"center", color:"var(--muted)", padding:32 }}>
          ⏳ Laden…
        </div>
      )}

      {/* NUTZER LISTE */}
      {!laden && ansicht === "nutzer" && (
        <div>
          {nutzer.map(n => {
            const rolle = ROLLEN[n.rolle] || ROLLEN.facharbeiter;
            const kolonne = kolonnen.find(k => k.id === n.kolonne_id);
            const isEdit = editNutzer === n.id;
            return (
              <div key={n.id} style={{ background:"var(--surface)", borderRadius:14,
                padding:"14px 16px", marginBottom:10,
                border:`1.5px solid ${n.aktiv === false ? "var(--border)" : "var(--border)"}`,
                opacity: n.aktiv === false ? 0.6 : 1 }}>

                {/* Nutzer Header */}
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", marginBottom: isEdit ? 12 : 0 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    {/* Avatar */}
                    <div style={{ width:40, height:40, borderRadius:20,
                      background:`${rolle.farbe}22`,
                      border:`2px solid ${rolle.farbe}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:16, flexShrink:0 }}>
                      {n.avatar_url
                        ? <img src={n.avatar_url} style={{ width:36, height:36,
                            borderRadius:18, objectFit:"cover" }} />
                        : rolle.icon}
                    </div>
                    <div>
                      <div style={{ color:"var(--text)", fontWeight:700, fontSize:14 }}>
                        {n.vorname || "—"} {n.nachname || ""}
                        {n.aktiv === false && (
                          <span style={{ color:"var(--muted)", fontSize:11,
                            marginLeft:6 }}>· Inaktiv</span>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:6, marginTop:2,
                        alignItems:"center" }}>
                        <div style={{ background:`${rolle.farbe}22`,
                          color:rolle.farbe, borderRadius:20,
                          padding:"1px 8px", fontSize:10, fontWeight:700 }}>
                          {rolle.icon} {rolle.label}
                        </div>
                        {kolonne && (
                          <div style={{ color:"var(--muted)", fontSize:11 }}>
                            👷 {kolonne.name}
                          </div>
                        )}
                      </div>
                      {n.telefon && (
                        <div style={{ color:"var(--muted)", fontSize:11, marginTop:2 }}>
                          📞 {n.telefon}
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setEditNutzer(isEdit ? null : n.id)}
                    style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                      color:"var(--muted)", borderRadius:8, padding:"4px 10px",
                      cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
                    {isEdit ? "✕" : "✏️"}
                  </button>
                </div>

                {/* Edit Panel */}
                {isEdit && (
                  <div style={{ borderTop:"1px solid var(--border)", paddingTop:12,
                    display:"flex", flexDirection:"column", gap:10 }}>
                    <div>
                      <div style={{ color:"var(--muted)", fontSize:11,
                        fontWeight:600, marginBottom:4 }}>Rolle</div>
                      <select value={n.rolle || "facharbeiter"}
                        onChange={e => rolleAendern(n.id, e.target.value)}
                        style={{ width:"100%", background:"var(--surface2)",
                          color:"var(--text)", border:"1px solid var(--border)",
                          borderRadius:8, padding:"8px 10px", fontSize:13,
                          cursor:"pointer", fontFamily:"inherit" }}>
                        {Object.entries(ROLLEN).map(([k,r]) => (
                          <option key={k} value={k}>{r.icon} {r.label}</option>
                        ))}
                      </select>
                    </div>

                    {kolonnen.length > 0 && (
                      <div>
                        <div style={{ color:"var(--muted)", fontSize:11,
                          fontWeight:600, marginBottom:4 }}>Kolonne</div>
                        <select value={n.kolonne_id || ""}
                          onChange={e => kolonneAendern(n.id, e.target.value)}
                          style={{ width:"100%", background:"var(--surface2)",
                            color:"var(--text)", border:"1px solid var(--border)",
                            borderRadius:8, padding:"8px 10px", fontSize:13,
                            cursor:"pointer", fontFamily:"inherit" }}>
                          <option value="">Keine Kolonne</option>
                          {kolonnen.map(k => (
                            <option key={k.id} value={k.id}>{k.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button onClick={() => aktivitaetToggle(n.id, n.aktiv !== false)}
                      style={{ background: n.aktiv === false ? "var(--gbg)" : "var(--rbg)",
                        color: n.aktiv === false ? "var(--green)" : "var(--red)",
                        border:`1px solid ${n.aktiv === false ? "var(--green)" : "var(--red)"}`,
                        borderRadius:8, padding:"8px 14px", cursor:"pointer",
                        fontWeight:700, fontSize:13, fontFamily:"inherit" }}>
                      {n.aktiv === false ? "✅ Nutzer reaktivieren" : "🚫 Nutzer deaktivieren"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {nutzer.length === 0 && !laden && (
            <div style={{ textAlign:"center", padding:"32px 20px",
              color:"var(--muted)" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>👤</div>
              <div>Noch keine Nutzer · Lade Mitarbeiter ein</div>
            </div>
          )}
        </div>
      )}

      {/* EINLADUNGEN */}
      {!laden && ansicht === "einladungen" && (
        <div>
          {offeneEinl.length > 0 && (
            <div style={{ color:"var(--text)", fontWeight:700, fontSize:13,
              marginBottom:8 }}>Offene Einladungen</div>
          )}
          {offeneEinl.map(e => {
            const rolle = ROLLEN[e.rolle] || ROLLEN.facharbeiter;
            const link = `${window.location.origin}?einladung=${e.token}`;
            const abgelaufen = new Date(e.läuft_ab_at).toLocaleDateString("de-DE");
            return (
              <div key={e.id} style={{ background:"var(--surface)", borderRadius:12,
                padding:"12px 14px", marginBottom:8,
                border:"1.5px solid var(--yellow)" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <div style={{ background:`${rolle.farbe}22`, color:rolle.farbe,
                        borderRadius:20, padding:"2px 8px", fontSize:11,
                        fontWeight:700 }}>
                        {rolle.icon} {rolle.label}
                      </div>
                    </div>
                    <div style={{ color:"var(--muted)", fontSize:11, marginTop:4 }}>
                      📅 Gültig bis {abgelaufen}
                      {e.email && ` · ${e.email}`}
                    </div>
                  </div>
                  <button onClick={() => einladungWiderrufen(e.id)}
                    style={{ background:"var(--rbg)", color:"var(--red)",
                      border:"1px solid var(--red)", borderRadius:8,
                      padding:"4px 10px", cursor:"pointer", fontSize:11,
                      fontFamily:"inherit" }}>
                    Widerrufen
                  </button>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <div style={{ flex:1, background:"var(--surface2)", borderRadius:8,
                    padding:"7px 10px", fontSize:11, color:"var(--muted)",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {link}
                  </div>
                  <button onClick={() => navigator.clipboard?.writeText(link)}
                    style={{ background:"var(--surface2)", color:"var(--muted)",
                      border:"1px solid var(--border)", borderRadius:8,
                      padding:"0 12px", cursor:"pointer", fontSize:14,
                      fontFamily:"inherit", flexShrink:0 }}>
                    📋
                  </button>
                  <button onClick={() => teilen(link)}
                    style={{ background:"var(--green)", color:"#fff",
                      border:"none", borderRadius:8, padding:"0 12px",
                      cursor:"pointer", fontSize:14, fontFamily:"inherit",
                      flexShrink:0 }}>
                    ↗
                  </button>
                </div>
              </div>
            );
          })}

          {abgelaufeneEinl.length > 0 && (
            <div>
              <div style={{ color:"var(--muted)", fontWeight:600, fontSize:12,
                marginTop:16, marginBottom:8 }}>Abgelaufen / Widerrufen</div>
              {abgelaufeneEinl.map(e => {
                const rolle = ROLLEN[e.rolle] || ROLLEN.facharbeiter;
                return (
                  <div key={e.id} style={{ background:"var(--surface)", borderRadius:10,
                    padding:"10px 12px", marginBottom:6, opacity:0.5,
                    border:"1px solid var(--border)" }}>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <div style={{ color:rolle.farbe, fontSize:11,
                        fontWeight:700 }}>{rolle.icon} {rolle.label}</div>
                      <div style={{ color:"var(--muted)", fontSize:11 }}>
                        · {e.aktiv === false ? "Widerrufen" : "Abgelaufen"}
                        {e.eingelöst_at ? " · Eingelöst" : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {einladungen.length === 0 && !laden && (
            <div style={{ textAlign:"center", padding:"32px 20px",
              color:"var(--muted)" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📨</div>
              <div>Noch keine Einladungen generiert</div>
            </div>
          )}
        </div>
      )}

      {/* Einladungs-Generator Modal */}
      {zeigeEinladen && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0,
          background:"var(--bg)", zIndex:500, overflowY:"auto",
          WebkitOverflowScrolling:"touch" }}>
          <div style={{ background:"var(--surface)", padding:"14px 18px",
            borderBottom:"3px solid var(--yellow)", position:"sticky", top:0,
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontWeight:700, fontSize:16, color:"var(--text)" }}>
              👤 Mitarbeiter einladen
            </div>
            <button onClick={() => { setZeigeEinladen(false); ladeAlles(); }}
              style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                color:"var(--text)", borderRadius:8, padding:"6px 14px",
                cursor:"pointer", fontFamily:"inherit" }}>✕</button>
          </div>
          <div style={{ padding:"20px 16px" }}>
            <EinladungGenerieren
              session={session}
              firmaId={firmaId}
              kolonnen={kolonnen}
            />
          </div>
        </div>
      )}
    </div>
  );
}
