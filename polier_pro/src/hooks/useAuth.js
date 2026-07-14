import { useState, useEffect } from "react";
import { sbGetProfile, supabase, sbSignIn, sbClientMitToken, sbSignOut, SUPABASE_URL } from "../lib/supabase.js";
import { ROLLEN } from "../config/konstanten.js";

export function useAuth() {
  const [session, setSession]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("polaris-session") || "null"); } catch { return null; }
  });
  const [profil,      setProfil]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [fehler,      setFehler]      = useState("");
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteType,  setInviteType]  = useState(null);

  // Supabase Invite/Recovery Token aus URL Hash lesen
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const token = params.get("access_token");
    const type  = params.get("type"); // invite | recovery | signup
    if (token && (type === "invite" || type === "recovery" || type === "signup")) {
      setInviteToken(token);
      setInviteType(type);
      // Hash aus URL entfernen
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (session?.access_token) {
      sbGetProfile(session.access_token).then(p => {
        if (p) setProfil(p);
        else { localStorage.removeItem("polaris-session"); setSession(null); }
      });
    }
  }, [session?.access_token]);

  // Automatischer Token-Refresh vor Ablauf (Supabase Tokens laufen nach 1h ab)
  useEffect(() => {
    if (!session?.refresh_token) return;

    async function refreshSession() {
      try {
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: session.refresh_token,
        });
        if (!error && data.session?.access_token) {
          const neueSession = {
            access_token:  data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_in:    data.session.expires_in,
            user:          data.user,
          };
          localStorage.setItem("polaris-session", JSON.stringify(neueSession));
          setSession(neueSession);
        } else {
          // Refresh fehlgeschlagen → Session ist ungültig, abmelden
          localStorage.removeItem("polaris-session");
          setSession(null);
          setProfil(null);
        }
      } catch {
        // Netzwerkfehler beim Refresh — Session vorerst behalten, nächster Versuch folgt
      }
    }

    // Supabase Tokens laufen typischerweise nach 3600s ab.
    // expires_in gibt die Gültigkeitsdauer in Sekunden an; wir erneuern 5 Minuten vorher.
    const expiresInMs = (session.expires_in || 3600) * 1000;
    const refreshInMs = Math.max(expiresInMs - 5 * 60 * 1000, 30 * 1000);
    const timer = setTimeout(refreshSession, refreshInMs);
    return () => clearTimeout(timer);
  }, [session?.access_token, session?.refresh_token]);

  // Bei Wiederherstellung des Tabs (App aus Hintergrund geholt): Session sofort prüfen
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && session?.access_token) {
        sbGetProfile(session.access_token).then(p => {
          if (!p) {
            // Token ist ungültig geworden (z.B. abgelaufen während App im Hintergrund war)
            localStorage.removeItem("polaris-session");
            setSession(null);
            setProfil(null);
          }
        });
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [session?.access_token]);

  // 401-Handler: bei ungültigem Token die Session verifizieren bevor abgemeldet wird.
  // Ein einzelner fehlgeschlagener Request (z.B. RLS-Policy verweigert Zugriff auf
  // eine bestimmte Tabelle) ist kein Beweis dass die gesamte Session ungültig ist —
  // nur ein zusätzlicher fehlgeschlagener Profil-Check rechtfertigt den Logout.
  useEffect(() => {
    async function handleAuthInvalid() {
      if (!session?.access_token) return;
      const p = await sbGetProfile(session.access_token);
      if (!p) {
        // Session wirklich ungültig — jetzt abmelden
        localStorage.removeItem("polaris-session");
        setSession(null);
        setProfil(null);
        setFehler("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
      }
      // Profil ließ sich laden → Session ist gültig, der 401 kam von einer
      // einzelnen Tabelle/RLS-Policy. Kein Logout nötig.
    }
    window.addEventListener("polaris-auth-invalid", handleAuthInvalid);
    return () => window.removeEventListener("polaris-auth-invalid", handleAuthInvalid);
  }, [session?.access_token]);

  async function anmelden(email, password) {
    setLoading(true); setFehler("");
    const data = await sbSignIn(email, password);
    if (data.access_token) {
      localStorage.setItem("polaris-session", JSON.stringify(data));
      setSession(data);
    } else {
      setFehler(data.error_description || data.msg || "Anmeldung fehlgeschlagen");
    }
    setLoading(false);
  }

  async function passwortVergessen(email) {
    setLoading(true); setFehler("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      setLoading(false);
      return !error;
    } catch {
      setFehler("Passwort-Reset konnte nicht angefordert werden.");
      setLoading(false);
      return false;
    }
  }

  async function passwortSetzen(password) {
    if (!inviteToken) return;
    setLoading(true); setFehler("");
    const client = sbClientMitToken({ access_token: inviteToken });
    const { data, error } = await client.auth.updateUser({ password });
    if (!error && data.user?.id) {
      // Einloggen mit dem Invite-Token als Session
      const session = { access_token: inviteToken, user: data.user };
      localStorage.setItem("polaris-session", JSON.stringify(session));
      setSession(session);
      setInviteToken(null);
    } else {
      setFehler("Passwort konnte nicht gesetzt werden.");
    }
    setLoading(false);
  }

  async function abmelden() {
    if (session?.access_token) await sbSignOut(session.access_token);
    localStorage.removeItem("polaris-session");
    setSession(null); setProfil(null);
  }

  const rolle = profil?.rolle || null;
  const rolleConfig = rolle ? ROLLEN[rolle] : null;

  // Fallback: wenn Supabase nicht konfiguriert → Demo-Modus
  const supabaseKonfiguriert = !SUPABASE_URL.includes("DEIN");

  return { session, profil, rolle, rolleConfig, loading, fehler,
    anmelden, abmelden, supabaseKonfiguriert,
    inviteToken, inviteType, passwortSetzen, passwortVergessen };
}
