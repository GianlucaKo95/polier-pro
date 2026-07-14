import { useState } from "react";
import { sbClientMitToken } from "../lib/supabase.js";
import { ALLE_GEWERKE, ONBOARDING_KEY } from "../config/konstanten.js";
import { Chip } from "../components/Chip.jsx";
import { Label, inputStyle } from "../components/Label.jsx";

export function FirmenView({ owneFirma, setEigeneFirma, subs, setSubs, onOnboardingReset, session = null, firmaId = null }) {
  const [screen, setScreen]     = useState("home"); // home | eigene | subs | subEdit
  const [editSub, setEditSub]   = useState(null);
  const [editOwn, setEditOwn]   = useState(false);
  const [tmpFirma, setTmpFirma] = useState(owneFirma);
  const [speichern, setSpeichern] = useState(false);
  const [speicherFehler, setSpeicherFehler] = useState("");

  async function firmaSpeichern() {
    setEigeneFirma(tmpFirma);

    // Bei echtem Login (mit firmaId aus Supabase) auch in der Datenbank
    // aktualisieren — sonst gehen Änderungen beim nächsten Login/Gerät
    // wieder verloren, weil sie nur lokal im State standen.
    if (session?.access_token && firmaId) {
      setSpeichern(true); setSpeicherFehler("");
      try {
        const client = sbClientMitToken(session);
        const { error } = await client.from("firmen").update({
          name:              tmpFirma.name || "",
          adresse:           tmpFirma.strasse || "",
          plz:               tmpFirma.plz || "",
          ort:               tmpFirma.ort || "",
          telefon:           tmpFirma.telefon || "",
          email:             tmpFirma.email || "",
          steuernummer:      tmpFirma.steuernummer || "",
          logo_url:          tmpFirma.logo || null,
          geschaeftsfuehrer: tmpFirma.geschaeftsfuehrer || "",
          gewerke:           tmpFirma.gewerke || [],
        }).eq("id", firmaId);
        if (error) {
          setSpeicherFehler("Änderungen konnten nicht auf dem Server gespeichert werden.");
        }
      } catch {
        setSpeicherFehler("Netzwerkfehler beim Speichern.");
      }
      setSpeichern(false);
    }

    setScreen("home");
  }

  return (
    <div>
      {/* Home */}
      {screen === "home" && (
        <>
          {/* Eigene Firma Karte */}
          <div onClick={() => { setTmpFirma({...owneFirma}); setScreen("eigene"); }}
            style={{ background: "var(--surface)", borderRadius:14, padding:"16px 18px", marginBottom:14,
              border:`2px solid ${'var(--yellow)'}`, cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ color: "var(--muted)", fontSize:11, marginBottom:2 }}>🏢 Eigenes Unternehmen</div>
                <div style={{ color: "var(--text)", fontWeight:700, fontSize:16 }}>{owneFirma.name || "Firma hinterlegen"}</div>
                {owneFirma.ort && <div style={{ color: "var(--muted)", fontSize:12, marginTop:2 }}>📍 {owneFirma.plz} {owneFirma.ort}</div>}
                {owneFirma.gewerke?.length > 0 && (
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:8 }}>
                    {owneFirma.gewerke.map(k => {
                      const g = ALLE_GEWERKE.find(x=>x.key===k);
                      return g ? <Chip key={k} icon={g.icon} label={g.label} /> : null;
                    })}
                  </div>
                )}
              </div>
              <div style={{ color: "var(--muted)", fontSize:22 }}>›</div>
            </div>
          </div>

          {/* Subunternehmer */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ color: "var(--text)", fontWeight:700 }}>Subunternehmer ({subs.length})</div>
            <button onClick={() => { setEditSub({ id:null, name:"", gewerke:[], kontakt:"", telefon:"", email:"", status:"aktiv", stundensatz:0 }); setScreen("subEdit"); }}
              style={{ background: "var(--yellow)", color:"#1C2027", border:"none", borderRadius:9,
                padding:"7px 14px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
              + Sub
            </button>
          </div>

          {subs.length === 0 ? (
            <div style={{ background: "var(--surface)", borderRadius:12, padding:24, textAlign:"center" }}>
              <div style={{ fontSize:32 }}>🏢</div>
              <div style={{ color: "var(--muted)", marginTop:8 }}>Noch keine Subunternehmer angelegt.</div>
            </div>
          ) : subs.map(s => (
            <div key={s.id} onClick={() => { setEditSub({...s}); setScreen("subEdit"); }}
              style={{ background: "var(--surface)", borderRadius:11, padding:"13px 15px", marginBottom:9,
                border:`1.5px solid ${s.status==="aktiv" ? "var(--border)" : "var(--red)"}`, cursor:"pointer" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ color: "var(--text)", fontWeight:700 }}>{s.name}</div>
                    <div style={{ background: s.status==="aktiv" ? "var(--green)" : "var(--red)",
                      color:"#fff", fontSize:9, padding:"2px 7px", borderRadius:20 }}>
                      {s.status}
                    </div>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize:12, marginTop:3 }}>👤 {s.kontakt} · 📞 {s.telefon}</div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:7 }}>
                    {s.gewerke.map(k => {
                      const g = ALLE_GEWERKE.find(x=>x.key===k);
                      return g ? <Chip key={k} icon={g.icon} label={g.label} /> : null;
                    })}
                  </div>
                  {s.stundensatz > 0 && (
                    <div style={{ color: "var(--muted)", fontSize:11, marginTop:5 }}>💶 {s.stundensatz} €/Std.</div>
                  )}
                </div>
                <div style={{ color: "var(--muted)", fontSize:18 }}>›</div>
              </div>
            </div>
          ))}

          {/* Onboarding zurücksetzen */}
          {onOnboardingReset && (
            <div style={{ marginTop:24, borderTop:`1px solid ${'var(--border)'}`, paddingTop:16 }}>
              <button onClick={() => {
                  if (window.confirm("Onboarding zurücksetzen? Die App startet beim nächsten Laden neu mit dem Einrichtungsassistenten.")) {
                    localStorage.removeItem(ONBOARDING_KEY);
                    onOnboardingReset();
                  }
                }}
                style={{ width:"100%", background: "var(--border)", color: "var(--muted)",
                  border:`1px solid ${'var(--border)'}`, borderRadius:10, padding:12,
                  cursor:"pointer", fontSize:13 }}>
                🔄 Einrichtungsassistent erneut starten
              </button>
            </div>
          )}
        </>
      )}

      {/* Eigene Firma bearbeiten */}
      {screen === "eigene" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <button onClick={() => setScreen("home")}
              style={{ background: "var(--border)", border:"none", color: "var(--text)", borderRadius:8,
                padding:"6px 10px", cursor:"pointer", fontSize:16 }}>‹</button>
            <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:16 }}>🏢 Eigenes Unternehmen</div>
          </div>

          {[
            ["Firmenname",          "name",              "Bauunternehmen GmbH"],
            ["Geschäftsführer",     "geschaeftsfuehrer", "Max Mustermann"],
            ["Straße + Nr.",        "strasse",           "Musterstraße 12"],
            ["PLZ",                 "plz",               "80331"],
            ["Ort",                 "ort",               "München"],
            ["Telefon",             "telefon",           "+49 89 123456"],
            ["E-Mail",              "email",             "info@firma.de"],
            ["Steuernummer",        "steuernummer",      "123/456/78900"],
          ].map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom:12 }}>
              <Label>{label}</Label>
              <input value={tmpFirma[key]||""} onChange={e => setTmpFirma(p=>({...p,[key]:e.target.value}))}
                placeholder={ph} style={inputStyle()} />
            </div>
          ))}

          {/* Gewerke */}
          <div style={{ marginBottom:20 }}>
            <Label>Ausgeführte Gewerke</Label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginTop:8 }}>
              {ALLE_GEWERKE.map(g => {
                const aktiv = (tmpFirma.gewerke||[]).includes(g.key);
                return (
                  <div key={g.key} onClick={() => setTmpFirma(p => ({
                    ...p, gewerke: aktiv
                      ? p.gewerke.filter(x=>x!==g.key)
                      : [...(p.gewerke||[]), g.key]
                  }))}
                    style={{ background: aktiv ? "var(--surface2)" : "var(--border)",
                      border:`2px solid ${aktiv ? "var(--yellow)" : "transparent"}`,
                      borderRadius:9, padding:"8px 10px", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ fontSize:16 }}>{g.icon}</span>
                    <span style={{ color: aktiv ? "var(--text)" : "var(--muted)", fontSize:11, fontWeight: aktiv ? 700 : 400 }}>{g.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {speicherFehler && (
            <div style={{ background:"var(--rbg)", color:"var(--red)", borderRadius:10,
              padding:"10px 14px", marginBottom:12, fontSize:12,
              border:"1px solid var(--red)" }}>
              ❌ {speicherFehler}
            </div>
          )}

          <button onClick={firmaSpeichern} disabled={speichern}
            style={{ width:"100%", background: "var(--yellow)", color:"#1C2027", border:"none",
              borderRadius:10, padding:14, fontWeight:700, cursor:"pointer", fontSize:15 }}>
            {speichern ? "⏳ Speichert…" : "💾 Speichern"}
          </button>
        </div>
      )}

      {/* Sub bearbeiten / anlegen */}
      {screen === "subEdit" && editSub && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <button onClick={() => setScreen("home")}
              style={{ background: "var(--border)", border:"none", color: "var(--text)", borderRadius:8,
                padding:"6px 10px", cursor:"pointer", fontSize:16 }}>‹</button>
            <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:16 }}>
              {editSub.id ? "✏️ Subunternehmer" : "➕ Neuer Subunternehmer"}
            </div>
          </div>

          {[
            ["Firmenname *",     "name",     "Elektro Huber GmbH"],
            ["Ansprechpartner",  "kontakt",  "Max Mustermann"],
            ["Telefon",          "telefon",  "+49 89 123456"],
            ["E-Mail",           "email",    "info@firma.de"],
          ].map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom:12 }}>
              <Label>{label}</Label>
              <input value={editSub[key]||""} onChange={e => setEditSub(p=>({...p,[key]:e.target.value}))}
                placeholder={ph} style={inputStyle()} />
            </div>
          ))}

          <div style={{ marginBottom:12 }}>
            <Label>Stundensatz (€)</Label>
            <input type="number" value={editSub.stundensatz||""} onChange={e => setEditSub(p=>({...p,stundensatz:+e.target.value}))}
              placeholder="85" style={inputStyle()} />
          </div>

          {/* Status */}
          <div style={{ marginBottom:16 }}>
            <Label>Status</Label>
            <div style={{ display:"flex", gap:8, marginTop:6 }}>
              {["aktiv","inaktiv","gesperrt"].map(s => (
                <button key={s} onClick={() => setEditSub(p=>({...p,status:s}))}
                  style={{ flex:1, background: editSub.status===s ? "var(--yellow)" : "var(--border)",
                    color: editSub.status===s ? "#1C2027" : "var(--muted)",
                    border:"none", borderRadius:8, padding:10, cursor:"pointer",
                    fontWeight: editSub.status===s ? 700 : 400, fontSize:12 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Gewerke des Subs */}
          <div style={{ marginBottom:20 }}>
            <Label>Gewerke dieses Subunternehmers</Label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginTop:8 }}>
              {ALLE_GEWERKE.map(g => {
                const aktiv = (editSub.gewerke||[]).includes(g.key);
                return (
                  <div key={g.key} onClick={() => setEditSub(p => ({
                    ...p, gewerke: aktiv
                      ? p.gewerke.filter(x=>x!==g.key)
                      : [...(p.gewerke||[]), g.key]
                  }))}
                    style={{ background: aktiv ? "var(--surface2)" : "var(--border)",
                      border:`2px solid ${aktiv ? "var(--blue)" : "transparent"}`,
                      borderRadius:9, padding:"8px 10px", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ fontSize:16 }}>{g.icon}</span>
                    <span style={{ color: aktiv ? "var(--text)" : "var(--muted)", fontSize:11, fontWeight: aktiv ? 700 : 400 }}>{g.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            {editSub.id && (
              <button onClick={() => { setSubs(prev => prev.filter(s=>s.id!==editSub.id)); setScreen("home"); }}
                style={{ background:"#2E1A1A", color: "var(--red)", border:`1px solid ${'var(--red)'}`,
                  borderRadius:10, padding:"12px 16px", cursor:"pointer" }}>🗑️</button>
            )}
            <button onClick={() => setScreen("home")}
              style={{ flex:1, background: "var(--border)", color: "var(--muted)", border:"none", borderRadius:10, padding:13, cursor:"pointer" }}>
              Abbrechen
            </button>
            <button disabled={!editSub.name} onClick={() => {
                if (editSub.id) {
                  setSubs(prev => prev.map(s => s.id===editSub.id ? editSub : s));
                } else {
                  setSubs(prev => [...prev, { ...editSub, id: Date.now() }]);
                }
                setScreen("home");
              }}
              style={{ flex:2, background: editSub.name ? "var(--yellow)" : "var(--border)",
                color: editSub.name ? "#1C2027" : "var(--muted)",
                border:"none", borderRadius:10, padding:13, fontWeight:700, cursor:"pointer", fontSize:15 }}>
              💾 Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
