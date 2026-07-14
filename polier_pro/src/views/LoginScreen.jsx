import { useState } from "react";
import { Label, inputStyle } from "../components/Label.jsx";
import { ROLLEN } from "../config/konstanten.js";

export function LoginScreen({ auth, onDemoLogin, onRegistrieren }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [zeigeReset, setZeigeReset] = useState(false);
  const [resetGesendet, setResetGesendet] = useState(false);

  async function resetAnfordern() {
    if (!email) return;
    const ok = await auth.passwortVergessen(email);
    if (ok) setResetGesendet(true);
  }

  if (zeigeReset) {
    return (
      <div style={{ background:"var(--bg)", minHeight:"100dvh", display:"flex",
        flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:"24px 20px", fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontWeight:900, fontSize:24, letterSpacing:-1, color:"var(--text)" }}>
            <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
          </div>
        </div>
        <div style={{ background:"var(--surface)", borderRadius:20, padding:28,
          width:"100%", maxWidth:380, border:"1.5px solid var(--border)" }}>
          {!resetGesendet ? (
            <>
              <div style={{ color:"var(--text)", fontWeight:800, fontSize:18,
                marginBottom:6 }}>Passwort zurücksetzen</div>
              <div style={{ color:"var(--muted)", fontSize:13, marginBottom:20 }}>
                Gib deine E-Mail-Adresse ein — wir schicken dir einen Link zum
                Zurücksetzen deines Passworts.
              </div>
              {auth.fehler && (
                <div style={{ background:"var(--rbg)", color:"var(--red)",
                  borderRadius:10, padding:"10px 14px", marginBottom:16,
                  fontSize:13, border:"1px solid var(--red)" }}>
                  ❌ {auth.fehler}
                </div>
              )}
              <div style={{ marginBottom:20 }}>
                <Label>E-Mail</Label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@firma.de" style={inputStyle()}
                  onKeyDown={e => e.key==="Enter" && resetAnfordern()} />
              </div>
              <button onClick={resetAnfordern} disabled={auth.loading || !email}
                style={{ width:"100%", background: email ? "var(--yellow)" : "var(--surface2)",
                  color: email ? "#1a1200" : "var(--muted)",
                  border:"none", borderRadius:12, padding:15, fontWeight:800,
                  fontSize:15, cursor: email ? "pointer" : "default", fontFamily:"inherit" }}>
                {auth.loading ? "⏳ Wird gesendet…" : "Link senden →"}
              </button>
            </>
          ) : (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
              <div style={{ color:"var(--text)", fontWeight:800, fontSize:16,
                marginBottom:8 }}>E-Mail gesendet!</div>
              <div style={{ color:"var(--muted)", fontSize:13, lineHeight:1.6 }}>
                Falls ein Konto mit dieser E-Mail existiert, erhältst du in
                Kürze einen Link zum Zurücksetzen deines Passworts.
              </div>
            </div>
          )}
          <div style={{ textAlign:"center", marginTop:16 }}>
            <button onClick={() => { setZeigeReset(false); setResetGesendet(false); }}
              style={{ background:"none", border:"none", color:"var(--muted)",
                cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
              ← Zurück zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background:"var(--bg)", minHeight:"100dvh", display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"24px 20px", fontFamily:"'Segoe UI', system-ui, sans-serif" }}>

      {/* Logo */}
      <div style={{ textAlign:"center", marginBottom:40 }}>
        <div style={{ fontSize:56, marginBottom:12 }}>★</div>
        <div style={{ fontWeight:900, fontSize:32, letterSpacing:-2, color:"var(--text)" }}>
          <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
        </div>
        <div style={{ fontSize:12, color:"var(--muted)", fontWeight:600,
          letterSpacing:3, textTransform:"uppercase", marginTop:4 }}>
          Baustellenmanagement
        </div>
      </div>

      {/* Login Card */}
      <div style={{ background:"var(--surface)", borderRadius:20, padding:28,
        width:"100%", maxWidth:380, border:"1.5px solid var(--border)",
        boxShadow:"0 8px 32px rgba(0,0,0,0.12)" }}>
        <div style={{ color:"var(--text)", fontWeight:800, fontSize:18,
          marginBottom:20 }}>Anmelden</div>

        {auth.fehler && (
          <div style={{ background:"var(--rbg)", color:"var(--red)",
            borderRadius:10, padding:"10px 14px", marginBottom:16,
            fontSize:13, border:"1px solid var(--red)" }}>
            ❌ {auth.fehler}
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <Label>E-Mail</Label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="name@firma.de" style={inputStyle()}
            onKeyDown={e => e.key==="Enter" && auth.anmelden(email, password)} />
        </div>

        <div style={{ marginBottom:10 }}>
          <Label>Passwort</Label>
          <div style={{ position:"relative" }}>
            <input type={showPw ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" style={{ ...inputStyle(), paddingRight:44 }}
              onKeyDown={e => e.key==="Enter" && auth.anmelden(email, password)} />
            <button onClick={() => setShowPw(p=>!p)}
              style={{ position:"absolute", right:12, top:"50%",
                transform:"translateY(-50%)", background:"none", border:"none",
                cursor:"pointer", fontSize:16, color:"var(--muted)" }}>
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <div style={{ textAlign:"right", marginBottom:20 }}>
          <button onClick={() => setZeigeReset(true)}
            style={{ background:"none", border:"none", color:"var(--muted)",
              cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
            Passwort vergessen?
          </button>
        </div>

        <button onClick={() => auth.anmelden(email, password)}
          disabled={auth.loading || !email || !password}
          style={{ width:"100%", background: email && password ? "var(--yellow)" : "var(--surface2)",
            color: email && password ? "#1a1200" : "var(--muted)",
            border:"none", borderRadius:12, padding:16, fontWeight:800,
            fontSize:16, cursor: email && password ? "pointer" : "default",
            fontFamily:"inherit" }}>
          {auth.loading ? "⏳ Anmelden…" : "Anmelden →"}
        </button>

        {/* Demo-Modus wenn Supabase nicht konfiguriert */}
        {!auth.supabaseKonfiguriert && (
          <div style={{ marginTop:20, borderTop:"1px solid var(--border)", paddingTop:16 }}>
            <div style={{ color:"var(--muted)", fontSize:12, marginBottom:10, textAlign:"center" }}>
              Supabase nicht konfiguriert — Demo-Modus:
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {Object.entries(ROLLEN).map(([key, r]) => (
                <button key={key} onClick={() => onDemoLogin(key)}
                  style={{ background:"var(--surface2)", color:"var(--text)",
                    border:"1.5px solid var(--border)", borderRadius:10,
                    padding:"8px 10px", cursor:"pointer", fontFamily:"inherit",
                    fontSize:11, fontWeight:700, textAlign:"left" }}>
                  {r.icon} {r.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop:20, fontSize:12, color:"var(--muted)", textAlign:"center" }}>
        Zugangsdaten beim Administrator anfragen
      </div>
    </div>
  );
}
