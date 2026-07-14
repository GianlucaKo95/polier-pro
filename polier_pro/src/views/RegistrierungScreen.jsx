import { useState } from "react";
import { supabase, sbClientMitToken } from "../lib/supabase.js";
import { Label, inputStyle } from "../components/Label.jsx";
import { PLAN_CONFIG } from "../config/konstanten.js";

export function RegistrierungScreen({ auth, onZurueck }) {
  const [schritt,     setSchritt]     = useState(0); // 0=Konto 1=Firma 2=Fertig
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [firmaName,   setFirmaName]   = useState("");
  const [laden,       setLaden]       = useState(false);
  const [fehler,      setFehler]      = useState("");

  async function kontoAnlegen() {
    if (!email || !password || password.length < 8) {
      setFehler("Passwort muss mindestens 8 Zeichen haben."); return;
    }
    setLaden(true); setFehler("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setFehler(error.message); setLaden(false); return; }
    setSchritt(1);
    setLaden(false);
  }

  async function firmaAnlegen() {
    if (!firmaName.trim()) { setFehler("Firmenname ist Pflicht."); return; }
    setLaden(true); setFehler("");

    // Erst einloggen
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError || !loginData.session?.access_token) {
      setFehler("Login fehlgeschlagen."); setLaden(false); return;
    }
    const session = {
      access_token:  loginData.session.access_token,
      refresh_token: loginData.session.refresh_token,
      expires_in:    loginData.session.expires_in,
      user:          loginData.user,
    };

    // Firma registrieren via RPC
    const client = sbClientMitToken(session);
    const { error: rpcError } = await client.rpc("firma_registrieren", {
      p_user_id:    session.user?.id,
      p_firma_name: firmaName,
      p_email:      email,
    });

    if (!rpcError) {
      localStorage.setItem("polaris-session", JSON.stringify(session));
      setSchritt(2);
    } else {
      setFehler("Firma konnte nicht angelegt werden.");
    }
    setLaden(false);
  }

  return (
    <div style={{ background:"var(--bg)", minHeight:"100dvh",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"24px 20px",
      fontFamily:"'Segoe UI', system-ui, sans-serif" }}>

      {/* Logo */}
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ fontWeight:900, fontSize:28, letterSpacing:-1.5,
          color:"var(--text)" }}>
          <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
        </div>
        <div style={{ fontSize:10, color:"var(--muted)", fontWeight:600,
          letterSpacing:3, textTransform:"uppercase", marginTop:2 }}>
          Baustellenmanagement
        </div>
      </div>

      {/* Fortschritt */}
      <div style={{ display:"flex", gap:8, marginBottom:24, alignItems:"center" }}>
        {["Konto", "Firma", "Fertig"].map((s, i) => (
          <div key={s} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:14,
              background: i < schritt ? "var(--green)"
                : i === schritt ? "var(--yellow)" : "var(--surface2)",
              border: `2px solid ${i <= schritt ? (i < schritt ? "var(--green)" : "var(--yellow)") : "var(--border)"}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:12, fontWeight:700,
              color: i < schritt ? "#fff" : i === schritt ? "#1a1200" : "var(--muted)" }}>
              {i < schritt ? "✓" : i + 1}
            </div>
            <span style={{ fontSize:12, color: i === schritt ? "var(--text)" : "var(--muted)",
              fontWeight: i === schritt ? 700 : 400 }}>{s}</span>
            {i < 2 && <div style={{ width:24, height:1, background:"var(--border)" }} />}
          </div>
        ))}
      </div>

      <div style={{ background:"var(--surface)", borderRadius:20, padding:28,
        width:"100%", maxWidth:400, border:"1.5px solid var(--border)" }}>

        {fehler && (
          <div style={{ background:"var(--rbg)", color:"var(--red)",
            borderRadius:10, padding:"10px 14px", marginBottom:16,
            fontSize:13, border:"1px solid var(--red)" }}>
            ❌ {fehler}
          </div>
        )}

        {/* Schritt 0: Konto */}
        {schritt === 0 && (
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:"var(--text)",
              marginBottom:4 }}>Konto erstellen</div>
            <div style={{ color:"var(--muted)", fontSize:13, marginBottom:20 }}>
              14 Tage kostenlos testen — keine Kreditkarte nötig.
            </div>
            <div style={{ marginBottom:14 }}>
              <Label>E-Mail</Label>
              <input type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="chef@bauunternehmen.de"
                style={inputStyle()} />
            </div>
            <div style={{ marginBottom:20 }}>
              <Label>Passwort (min. 8 Zeichen)</Label>
              <input type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle()} />
            </div>
            <button onClick={kontoAnlegen} disabled={laden}
              style={{ width:"100%", background:"var(--yellow)", color:"#1a1200",
                border:"none", borderRadius:12, padding:15, fontWeight:800,
                fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
              {laden ? "⏳ Wird angelegt…" : "Konto erstellen →"}
            </button>
            <div style={{ textAlign:"center", marginTop:16 }}>
              <span style={{ color:"var(--muted)", fontSize:13 }}>
                Bereits registriert?{" "}
              </span>
              <button onClick={onZurueck}
                style={{ background:"none", border:"none", color:"var(--blue)",
                  cursor:"pointer", fontSize:13, fontWeight:600,
                  fontFamily:"inherit" }}>
                Anmelden
              </button>
            </div>
          </div>
        )}

        {/* Schritt 1: Firma */}
        {schritt === 1 && (
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:"var(--text)",
              marginBottom:4 }}>Dein Unternehmen</div>
            <div style={{ color:"var(--muted)", fontSize:13, marginBottom:20 }}>
              Wie heißt dein Bauunternehmen?
            </div>
            <div style={{ marginBottom:20 }}>
              <Label>Firmenname *</Label>
              <input value={firmaName}
                onChange={e => setFirmaName(e.target.value)}
                placeholder="Koeven Bau GmbH"
                style={inputStyle()} />
            </div>

            {/* Plan Auswahl */}
            <Label>Plan (nach Testphase)</Label>
            <div style={{ display:"flex", flexDirection:"column", gap:8,
              marginTop:6, marginBottom:20 }}>
              {Object.entries(PLAN_CONFIG).map(([key, p]) => (
                <div key={key} style={{ background:"var(--surface2)",
                  borderRadius:12, padding:"12px 16px",
                  border:`1.5px solid ${key === "starter" ? "var(--blue)" : "var(--border)"}`,
                  display:"flex", justifyContent:"space-between",
                  alignItems:"center" }}>
                  <div>
                    <div style={{ color:"var(--text)", fontWeight:700,
                      fontSize:13 }}>{p.icon} {p.label}</div>
                    <div style={{ color:"var(--muted)", fontSize:11 }}>
                      {key === "trial" ? "Automatisch aktiv" : p.preis}
                    </div>
                  </div>
                  {key === "starter" && (
                    <div style={{ background:"var(--bbg)", color:"var(--blue)",
                      borderRadius:20, padding:"2px 8px", fontSize:10,
                      fontWeight:700 }}>Empfohlen</div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={firmaAnlegen} disabled={laden || !firmaName.trim()}
              style={{ width:"100%",
                background: firmaName.trim() ? "var(--yellow)" : "var(--surface2)",
                color: firmaName.trim() ? "#1a1200" : "var(--muted)",
                border:"none", borderRadius:12, padding:15, fontWeight:800,
                fontSize:15, cursor: firmaName.trim() ? "pointer" : "default",
                fontFamily:"inherit" }}>
              {laden ? "⏳ Wird eingerichtet…" : "Polaris einrichten 🚀"}
            </button>
          </div>
        )}

        {/* Schritt 2: Fertig */}
        {schritt === 2 && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🎉</div>
            <div style={{ fontWeight:800, fontSize:20, color:"var(--green)",
              marginBottom:8 }}>Willkommen bei Polaris!</div>
            <div style={{ color:"var(--text2)", fontSize:14, lineHeight:1.6,
              marginBottom:24 }}>
              Dein Unternehmen <strong>{firmaName}</strong> wurde eingerichtet.
              Du hast 14 Tage kostenlos zum Testen.
            </div>
            <button onClick={() => window.location.reload()}
              style={{ width:"100%", background:"var(--yellow)", color:"#1a1200",
                border:"none", borderRadius:12, padding:15, fontWeight:800,
                fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
              Los geht's →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
