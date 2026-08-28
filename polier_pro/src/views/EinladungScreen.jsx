import { useState, useEffect } from "react";
import { CircleX, ArrowRight, CircleCheckBig, PartyPopper } from "lucide-react";
import { supabase, sbClientMitToken } from "../lib/supabase.js";
import { ROLLEN } from "../config/konstanten.js";
import { Label, inputStyle } from "../components/Label.jsx";

export function EinladungScreen({ token, onErfolg }) {
  const [einladung,  setEinladung]  = useState(null);
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [laden,      setLaden]      = useState(true);
  const [fehler,     setFehler]     = useState("");
  const [schritt,    setSchritt]    = useState(0); // 0=laden 1=registrieren 2=fertig

  useEffect(() => { pruefeToken(); }, [token]);

  async function pruefeToken() {
    // Läuft über eine SECURITY DEFINER-RPC (nicht mehr über eine offene
    // SELECT-Policy): so kann ein anonymer Client nur genau die Einladung
    // zu einem bekannten Token abrufen, statt alle aktiven Einladungen
    // aller Firmen auflisten zu können.
    const { data, error } = await supabase.rpc("einladung_pruefen", { p_token: token });
    const row = data?.[0];
    if (!error && row) {
      setEinladung({
        token: row.token, email: row.email, rolle: row.rolle,
        firma_id: row.firma_id, kolonne_id: row.kolonne_id,
        firmen: { name: row.firma_name, logo_url: row.firma_logo_url },
      });
      setEmail(row.email || "");
      setSchritt(1);
    } else {
      setFehler("Diese Einladung ist ungültig oder abgelaufen.");
    }
    setLaden(false);
  }

  async function registrierenUndEinloesen() {
    if (!email || !password || password.length < 6) {
      setFehler("Bitte E-Mail und Passwort eingeben (min. 6 Zeichen)."); return;
    }
    setLaden(true); setFehler("");

    // Registrieren (Fehler hier ignorieren wir bewusst — falls der Account
    // schon existiert, greift direkt danach der Login-Versuch)
    await supabase.auth.signUp({ email, password });

    // Falls schon registriert: einloggen
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError || !loginData.session?.access_token) {
      setFehler("Anmeldung fehlgeschlagen. Passwort korrekt?");
      setLaden(false); return;
    }
    const session = {
      access_token:  loginData.session.access_token,
      refresh_token: loginData.session.refresh_token,
      expires_in:    loginData.session.expires_in,
      user:          loginData.user,
    };

    // Einladung einlösen
    const client = sbClientMitToken(session);
    const { data: result, error: rpcError } = await client.rpc("einladung_einloesen", {
      p_token: token, p_user_id: session.user?.id,
    });

    if (!rpcError && result?.ok) {
      localStorage.setItem("polaris-session", JSON.stringify(session));
      setSchritt(2);
      setTimeout(() => onErfolg?.(), 2000);
    } else {
      setFehler(result?.fehler || "Einladung konnte nicht eingelöst werden.");
    }
    setLaden(false);
  }

  if (laden && schritt === 0) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      minHeight:"100dvh", background:"var(--bg)", color:"var(--muted)",
      fontFamily:"inherit" }}>
      Einladung wird geprüft…
    </div>
  );

  return (
    <div style={{ background:"var(--bg)", minHeight:"100dvh",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"24px 20px" }}>

      <div style={{ fontWeight:900, fontSize:24, letterSpacing:-1,
        color:"var(--text)", marginBottom:24, textAlign:"center" }}>
        <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
      </div>

      <div style={{ background:"var(--surface)", borderRadius:20, padding:28,
        width:"100%", maxWidth:400, border:"1.5px solid var(--border)" }}>

        {fehler && (
          <div style={{ background:"var(--rbg)", color:"var(--red)",
            borderRadius:10, padding:"10px 14px", marginBottom:16,
            fontSize:13, border:"1px solid var(--red)",
            display:"flex", alignItems:"center", gap:6 }}>
            <CircleX size={14} /> {fehler}
          </div>
        )}

        {schritt === 1 && einladung && (
          <div>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:8, color:"var(--yellow)" }}><PartyPopper size={34} /></div>
              <div style={{ fontWeight:800, fontSize:18, color:"var(--text)" }}>
                Du wurdest eingeladen!
              </div>
              <div style={{ color:"var(--text2)", fontSize:13, marginTop:6 }}>
                Tritt <strong>{einladung.firmen?.name}</strong> als{" "}
                <strong>{ROLLEN[einladung.rolle]?.label}</strong> bei.
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <Label>E-Mail</Label>
              <input type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="deine@email.de" style={inputStyle()} />
            </div>
            <div style={{ marginBottom:20 }}>
              <Label>Passwort wählen</Label>
              <input type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" style={inputStyle()} />
            </div>
            <button onClick={registrierenUndEinloesen} disabled={laden}
              style={{ width:"100%", background:"var(--yellow)", color:"#1a1200",
                border:"none", borderRadius:12, padding:15, fontWeight:800,
                fontSize:15, cursor:"pointer", fontFamily:"inherit",
                display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
              {laden ? "…" : <>Einladung annehmen <ArrowRight size={15} /></>}
            </button>
          </div>
        )}

        {schritt === 2 && (
          <div style={{ textAlign:"center" }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:12, color:"var(--green)" }}><CircleCheckBig size={40} /></div>
            <div style={{ fontWeight:800, fontSize:18, color:"var(--green)" }}>
              Willkommen im Team!
            </div>
            <div style={{ color:"var(--muted)", fontSize:13, marginTop:8 }}>
              Du wirst weitergeleitet…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
