import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "./hooks/useTheme.js";
import { useAuth } from "./hooks/useAuth.js";
import { DEFAULT_EINHEITSPREISE, DEFAULT_LV_VORLAGEN, ONBOARDING_KEY, ROLLEN, PROJEKTTYPEN } from "./config/konstanten.js";
import { usePWA } from "./hooks/usePWA.js";
import { usePushNotifications } from "./hooks/usePushNotifications.js";
import { useOfflineSync } from "./hooks/useOfflineSync.js";
import { sbClientMitToken, SUPABASE_URL, sbAufgabeSpeichern, sbAufgabeLoeschen, sbBerichtSpeichern, sbKolonneSpeichern, sbKolonneLoeschen } from "./lib/supabase.js";
import { PasswortSetzenScreen } from "./views/PasswortSetzenScreen.jsx";
import { EinladungScreen } from "./views/EinladungScreen.jsx";
import { RegistrierungScreen } from "./views/RegistrierungScreen.jsx";
import { LoginScreen } from "./views/LoginScreen.jsx";
import { RollenBadge } from "./components/RollenBadge.jsx";
import { ThemeToggle } from "./components/ThemeToggle.jsx";
import { StempeluhrView } from "./views/StempeluhrView.jsx";
import { OnboardingFlow } from "./views/OnboardingFlow.jsx";
import { ProjektFormular } from "./views/ProjektFormular.jsx";
import { Chip } from "./components/Chip.jsx";
import { FirmenView } from "./views/FirmenView.jsx";
import { Aktenregister } from "./components/Aktenregister.jsx";
import { ProjektInfoStrip } from "./components/ProjektInfoStrip.jsx";
import { PlanGuard } from "./views/PlanGuard.jsx";
import { DashboardView } from "./views/DashboardView.jsx";
import { GanttView } from "./views/GanttView.jsx";
import { WeatherView } from "./views/WeatherView.jsx";
import { KolonnenView } from "./views/KolonnenView.jsx";
import { TagesbuchView } from "./views/TagesbuchView.jsx";
import { AufgabenView } from "./views/AufgabenView.jsx";
import { KostenView } from "./views/KostenView.jsx";
import { StundenExportView } from "./views/StundenExportView.jsx";
import { AngebotView } from "./views/AngebotView.jsx";
import { AdminParameterView } from "./views/AdminParameterView.jsx";
import { NutzerVerwaltungView } from "./views/NutzerVerwaltungView.jsx";
import { PWABanner } from "./components/PWABanner.jsx";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fehler: null };
  }
  static getDerivedStateFromError(fehler) {
    return { fehler };
  }
  componentDidCatch(fehler, info) {
    // In Produktion könnte hier ein Fehler-Tracking-Dienst angebunden werden.
    // Aktuell bewusst ohne externen Dienst — nur Konsole für lokales Debugging.
    console.error("Polaris Rendering-Fehler:", fehler, info?.componentStack);
  }
  render() {
    if (!this.state.fehler) return this.props.children;
    return (
      <div style={{ background:"var(--bg, #0B1120)", minHeight:"100dvh",
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", padding:24, textAlign:"center",
        fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
        <div style={{ color:"#fff", fontWeight:800, fontSize:18,
          marginBottom:8 }}>
          Etwas ist schiefgelaufen
        </div>
        <div style={{ color:"#8B9EC8", fontSize:13, marginBottom:24,
          maxWidth:340, lineHeight:1.5 }}>
          Ein unerwarteter Fehler ist aufgetreten. Deine Daten sind sicher
          gespeichert — ein Neuladen behebt das Problem meistens.
        </div>
        <button onClick={() => window.location.reload()}
          style={{ background:"#F5C400", color:"#1a1200", border:"none",
            borderRadius:12, padding:"14px 28px", fontWeight:800,
            fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
          🔄 Seite neu laden
        </button>
        {this.state.fehler?.message && (
          <div style={{ color:"#5A6B8C", fontSize:11, marginTop:20,
            maxWidth:320, wordBreak:"break-word" }}>
            {this.state.fehler.message}
          </div>
        )}
      </div>
    );
  }
}

export default function PolierApp() {
  const theme   = useTheme();
  const auth    = useAuth();
  const [projekte,      setProjekte]    = useState([]);
  const [projekteLaden, setProjekteLaden] = useState(false);
  const [projekteLadeFehler, setProjekteLadeFehler] = useState("");

  const [aktivId,       setAktivId]     = useState(null);
  const [tab,           setTab]         = useState("dashboard");
  const [aufgabenFilter,setAufgabenFilter] = useState("alle"); // für Dashboard-Sprungziele
  const [zeigeMehr,     setZeigeMehr]    = useState(false);
  const [sbConnected,   setSbConn]      = useState(false);
  const [neuProjekt,    setNeuProjekt]  = useState(false);
  const [editProjekt,   setEditProjekt] = useState(false);
  const [eigeneFirma,   setEigeneFirma] = useState({ name:"", strasse:"", plz:"", ort:"", telefon:"", email:"", geschaeftsfuehrer:"", steuernummer:"", gewerke:[], logo:null });
  const [subs,          setSubs]        = useState([]);
  const [homeTab,       setHomeTab]     = useState("projekte");
  const [zeitbuchungen, setZeitbuchungen] = useState([]);
  const [einheitspreise,setEinheitspreise]= useState(DEFAULT_EINHEITSPREISE);
  const [lvVorlagen,    setLvVorlagen]    = useState(DEFAULT_LV_VORLAGEN);
  const pwa  = usePWA();
  const push = usePushNotifications(projekte, eigeneFirma);
  const offline = useOfflineSync(pwa.online === false ? false : true, sbConnected);

  // Onboarding: gilt als abgeschlossen wenn entweder localStorage es sagt
  // ODER der eingeloggte Nutzer in Supabase bereits einer Firma zugeordnet ist.
  // localStorage allein reicht nicht — bei neuem Gerät/Browser/gelöschtem Cache
  // würde die App sonst fälschlich erneut das Onboarding zeigen, obwohl in der
  // Datenbank längst eine Firma für diesen Nutzer existiert (führt zu
  // wiederholt angelegten Firmen für denselben Account).
  const [onboardingLocal, setOnboardingLocal] = useState(
    () => !!localStorage.getItem(ONBOARDING_KEY)
  );
  const onboardingDone = onboardingLocal || !!auth.profil?.firma_id;

  function setOnboardingDone(val) {
    if (val) localStorage.setItem(ONBOARDING_KEY, "1");
    else localStorage.removeItem(ONBOARDING_KEY);
    setOnboardingLocal(val);
  }

  const [zeigeRegistrierung, setZeigeRegistrierung] = useState(false);
  const [firma,              setFirma]              = useState(null);

  // Einladungs-Token aus URL erkennen (sicher)
  const einladungsToken = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("einladung")
    : null;

  // Firma laden wenn eingeloggt — und lokalen eigeneFirma-State (der für
  // PDFs, Onboarding-Anzeige etc. verwendet wird) mit den echten Daten
  // aus der firmen-Tabelle synchronisieren. Ohne dieses Mapping blieb
  // eigeneFirma dauerhaft leer und die App zeigte "Firma hinterlegen"
  // trotz bereits vorhandener Firma in der Datenbank.
  const [firmaLadeFehler, setFirmaLadeFehler] = useState("");
  useEffect(() => {
    if (auth.profil?.firma_id && auth.session?.access_token) {
      setFirmaLadeFehler("");
      const client = sbClientMitToken(auth.session);
      client.from("firmen").select("*").eq("id", auth.profil.firma_id)
        .then(({ data: d, error, status }) => {
          if (error) {
            setFirmaLadeFehler(`Firma konnte nicht geladen werden (HTTP ${status}): ${error.message?.slice(0,200) || ""}`);
            return;
          }
          if (d?.[0]) {
            setFirma(d[0]);
            setEigeneFirma(prev => ({
              ...prev,
              name:              d[0].name || "",
              strasse:           d[0].adresse || "",
              plz:               d[0].plz || "",
              ort:               d[0].ort || "",
              telefon:           d[0].telefon || "",
              email:             d[0].email || "",
              steuernummer:      d[0].steuernummer || "",
              logo:              d[0].logo_url || null,
              geschaeftsfuehrer: d[0].geschaeftsfuehrer || "",
              gewerke:           d[0].gewerke || [],
            }));
          } else {
            setFirmaLadeFehler(`Keine Firma mit ID ${auth.profil.firma_id} gefunden — profile.firma_id zeigt ins Leere.`);
          }
        }).catch(e => {
          setFirmaLadeFehler("Netzwerkfehler beim Laden der Firma: " + e.message);
        });
    }
  }, [auth.profil?.firma_id, auth.session?.access_token]);

  // Projekte aus Supabase laden, sobald die Firma bekannt ist.
  // Ohne dies existierten Baustellen nur im Browser-Speicher — Neuladen,
  // Gerätewechsel oder Cache-Verlust hätte alle Baustellen gelöscht.
  useEffect(() => {
    if (!firma?.id || !auth.session?.access_token) return;
    setProjekteLaden(true);
    setProjekteLadeFehler("");
    const client = sbClientMitToken(auth.session);
    client.from("projekte").select("*").eq("firma_id", firma.id)
      .eq("archiviert", false).order("created_at", { ascending: false })
      .then(({ data, error, status }) => {
        if (error) {
          setProjekteLadeFehler(`Baustellen konnten nicht geladen werden (HTTP ${status}): ${error.message?.slice(0,200) || ""}`);
          setProjekteLaden(false);
          return;
        }
        if (Array.isArray(data)) {
          setProjekte(data.map(p => ({
            id: p.id, name: p.name, adresse: p.adresse, plz: p.plz, ort: p.ort,
            projektnummer: p.projektnummer, bauleiter: p.bauleiter,
            auftraggeber: p.auftraggeber, typ: p.typ, farbe: p.farbe,
          })));
        }
        setProjekteLaden(false);
      }).catch(e => {
        setProjekteLadeFehler("Netzwerkfehler beim Laden der Baustellen: " + e.message);
        setProjekteLaden(false);
      });
  }, [firma?.id, auth.session?.access_token]);

  // Supabase-Verbindungsstatus — MUSS vor allen early returns stehen (Rules of Hooks)
  useEffect(() => {
    if (SUPABASE_URL.includes("DEIN")) { setSbConn(false); return; }
    setSbConn(true);
  }, []);

  // Aufgaben, Kolonnen und Berichte sind normalisierte, eigenständige
  // Tabellen (nicht mehr im Projekt-Objekt verschachtelt) — bei jedem
  // Wechsel der aktiven Baustelle neu aus Supabase laden.
  const [aktProjektAufgaben,  setAktProjektAufgaben]  = useState([]);
  const [aktProjektKolonnen,  setAktProjektKolonnen]  = useState([]);
  const [aktProjektBerichte,  setAktProjektBerichte]  = useState([]);
  const [projektDatenLaden,   setProjektDatenLaden]   = useState(false);
  const [projektDatenFehler,  setProjektDatenFehler]  = useState("");

  useEffect(() => {
    if (!aktivId || !auth.session?.access_token) {
      setAktProjektAufgaben([]); setAktProjektKolonnen([]); setAktProjektBerichte([]);
      return;
    }
    let abgebrochen = false;
    setProjektDatenLaden(true);
    setProjektDatenFehler("");

    const client = sbClientMitToken(auth.session);

    Promise.all([
      client.from("aufgaben").select("*").eq("projekt_id", aktivId).order("created_at", { ascending: false }),
      client.from("kolonnen").select("*").eq("projekt_id", aktivId).order("created_at", { ascending: true }),
      client.from("tagesberichte").select("*").eq("projekt_id", aktivId).order("datum", { ascending: false }),
    ]).then(([aRes, kRes, bRes]) => {
      if (abgebrochen) return;
      const fehler = [];
      if (aRes.error) fehler.push(`Aufgaben: ${aRes.error.message}`);
      if (kRes.error) fehler.push(`Kolonnen: ${kRes.error.message}`);
      if (bRes.error) fehler.push(`Berichte: ${bRes.error.message}`);
      if (fehler.length) {
        setProjektDatenFehler("Projektdaten konnten nicht vollständig geladen werden: " + fehler.join(", "));
      }

      setAktProjektAufgaben(aRes.data || []);
      setAktProjektKolonnen(kRes.data || []);
      setAktProjektBerichte(bRes.data || []);
      setProjektDatenLaden(false);
    }).catch(e => {
      if (abgebrochen) return;
      setProjektDatenFehler("Netzwerkfehler beim Laden der Projektdaten: " + e.message);
      setProjektDatenLaden(false);
    });

    return () => { abgebrochen = true; };
  }, [aktivId, auth.session?.access_token]);

  // ── Demo-Rolle (ohne Supabase) ──
  const demoRolle = localStorage.getItem("polaris-demo-rolle");
  const aktiveProfil = auth.profil || (demoRolle ? {
    id: "demo", vorname: "Demo",
    nachname: ROLLEN[demoRolle]?.label || demoRolle,
    rolle: demoRolle, kolonne_id: demoRolle === "vorarbeiter" ? 1 : null,
  } : null);
  const aktiveRolle  = aktiveProfil?.rolle || null;
  const rolleConfig  = aktiveRolle ? ROLLEN[aktiveRolle] : null;

  // ── Passwort-Setzen nach Einladung ──
  if (auth.inviteToken) {
    return <PasswortSetzenScreen auth={auth} type={auth.inviteType} />;
  }

  // ── Einladungs-Screen ──
  if (einladungsToken && !aktiveProfil) {
    return <EinladungScreen
      token={einladungsToken}
      onErfolg={() => {
        window.history.replaceState({}, "", window.location.pathname);
        window.location.reload();
      }}
    />;
  }

  // ── Registrierungs-Screen ──
  if (zeigeRegistrierung) {
    return <RegistrierungScreen
      auth={auth}
      onZurueck={() => setZeigeRegistrierung(false)}
    />;
  }

  // ── Login Screen ──
  if (!aktiveProfil) {
    return <LoginScreen
      auth={auth}
      onDemoLogin={rolle => {
        localStorage.setItem("polaris-demo-rolle", rolle);
        window.location.reload();
      }}
      onRegistrieren={() => setZeigeRegistrierung(true)}
    />;
  }

  async function abmelden() {
    localStorage.removeItem("polaris-demo-rolle");
    // WICHTIG: auth.abmelden() ist async (wartet auf sbSignOut + löscht
    // localStorage danach). Ohne await läuft window.location.reload()
    // bereits BEVOR die Session aus dem localStorage entfernt wurde —
    // die neu geladene Seite findet die alte Session dann sofort wieder
    // und meldet automatisch erneut an.
    await auth.abmelden?.();
    window.location.reload();
  }

  // ── Facharbeiter → nur Stempeluhr ──
  if (aktiveRolle === "facharbeiter") {
    return (
      <div style={{ background:"var(--bg)", minHeight:"100dvh",
        fontFamily:"'Segoe UI', system-ui, sans-serif", color:"var(--text)" }}>
        <div style={{ background:"var(--surface)", padding:"14px 18px",
          borderBottom:"3px solid var(--yellow)", display:"flex",
          justifyContent:"space-between", alignItems:"center",
          boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
          <div>
            <div style={{ fontWeight:900, fontSize:18, letterSpacing:-1 }}>
              <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
            </div>
            <RollenBadge rolle={aktiveRolle} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <ThemeToggle dark={theme.dark} toggle={theme.toggle} />
            <button onClick={abmelden}
              style={{ background:"var(--surface2)", color:"var(--muted)",
                border:"1px solid var(--border)", borderRadius:8,
                padding:"6px 12px", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
              Abmelden
            </button>
          </div>
        </div>
        <div style={{ padding:"20px 16px" }}>
          <StempeluhrView profil={aktiveProfil}
            projekte={aktiveProfil?.kolonne_id
              ? projekte.filter(p => (p.kolonnen||[]).some(k => k.id === aktiveProfil.kolonne_id)).length > 0
                ? projekte.filter(p => (p.kolonnen||[]).some(k => k.id === aktiveProfil.kolonne_id))
                : projekte
              : projekte}
            session={auth.session} />
        </div>
      </div>
    );
  }

  async function handleOnboardingComplete(firmaDaten, ersterPolier) {
    setEigeneFirma(prev => ({ ...prev, ...firmaDaten }));

    // Falls echter Supabase-Login vorliegt (kein Demo-Modus): Firma jetzt
    // WIRKLICH in der Datenbank anlegen, sonst geht die Zuordnung beim
    // nächsten Login verloren und das Onboarding beginnt erneut von vorn.
    if (auth.session?.access_token && !auth.profil?.firma_id) {
      try {
        const client = sbClientMitToken(auth.session);
        const { error } = await client.rpc("firma_registrieren", {
          p_user_id:    auth.session.user?.id,
          p_firma_name: firmaDaten?.name || "Meine Firma",
          p_email:      auth.session.user?.email || "",
        });
        if (!error) {
          setOnboardingDone(true);
          // auth.profil kennt die neue firma_id erst nach einem frischen
          // Profil-Fetch. useAuth lädt das Profil beim Mounten anhand des
          // Tokens neu — ein Reload ist der zuverlässigste Weg, damit
          // auth.profil.firma_id ab sofort korrekt gesetzt ist.
          window.location.reload();
          return;
        }
      } catch {
        // Bei Netzwerkfehler bleibt Onboarding zumindest lokal abgeschlossen;
        // die Firma kann bei Bedarf später über den Registrierungs-Flow nachgeholt werden.
      }
    }

    setOnboardingDone(true);
    // neuProjekt wird im Home-Screen durch leere Projektliste gezeigt
  }

  // Onboarding anzeigen wenn noch nicht abgeschlossen

  if (!onboardingDone) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  const projekt = projekte.find(p => p.id === aktivId) || null;

  // Projekt-Daten updaten
  function updateProjekt(id, changes) {
    setProjekte(prev => prev.map(p => p.id===id ? { ...p, ...changes } : p));
  }


  const felder    = aktProjektAufgaben;
  const berichte  = aktProjektBerichte;
  const kolonnen  = aktProjektKolonnen;

  // ── Aufgaben: laden + speichern direkt gegen Supabase ──
  async function setFelder(fn) {
    const neu = typeof fn === "function" ? fn(felder) : fn;
    // Diff bestimmen: was ist neu, was geändert, was gelöscht
    const alteIds = new Set(felder.map(a => a.id));
    const neueIds = new Set(neu.map(a => a.id));

    for (const a of neu) {
      const istNeu = !alteIds.has(a.id) || typeof a.id !== "number" || a.id > 1e12;
      await sbAufgabeSpeichern(a, aktivId, auth.session, istNeu);
    }
    for (const alteId of alteIds) {
      if (!neueIds.has(alteId)) await sbAufgabeLoeschen(alteId, auth.session);
    }
    setAktProjektAufgaben(neu);
  }

  // ── Berichte: laden + speichern direkt gegen Supabase ──
  async function setBerichte(fn) {
    const neu = typeof fn === "function" ? fn(berichte) : fn;
    const alteIds = new Set(berichte.map(b => b.id));
    for (const b of neu) {
      if (!alteIds.has(b.id)) await sbBerichtSpeichern(b, aktivId, auth.session);
    }
    setAktProjektBerichte(neu);
  }

  // ── Kolonnen: laden + speichern direkt gegen Supabase ──
  async function setKolonnen(fn) {
    const neu = typeof fn === "function" ? fn(kolonnen) : fn;
    const alteIds = new Set(kolonnen.map(k => k.id));
    const neueIds = new Set(neu.map(k => k.id));

    for (const k of neu) {
      const istNeu = !alteIds.has(k.id) || typeof k.id !== "number" || k.id > 1e12;
      await sbKolonneSpeichern(k, aktivId, auth.session, istNeu);
    }
    for (const alteId of alteIds) {
      if (!neueIds.has(alteId)) await sbKolonneLoeschen(alteId, auth.session);
    }
    setAktProjektKolonnen(neu);
  }

  async function handleSaveProjekt(p) {
    const istNeu = !projekte.find(x => x.id === p.id);
    const payload = {
      firma_id:      firma?.id,
      name:          p.name || "",
      adresse:       p.adresse || "",
      plz:           p.plz || "",
      ort:           p.ort || "",
      projektnummer: p.projektnummer || "",
      bauleiter:     p.bauleiter || "",
      auftraggeber:  p.auftraggeber || "",
      typ:           p.typ || "hochbau",
      farbe:         p.farbe || "#F5C400",
    };

    // Ohne Firma (z.B. Demo-Modus ohne echten Login, ODER weil die Firma
    // noch nicht fertig geladen wurde) NICHT lautlos nur lokal speichern —
    // das sah für den Nutzer aus wie ein erfolgreiches Speichern, obwohl
    // in Supabase nichts ankam. Bei echtem Login mit fehlender firma?.id
    // ist das ein klarer Fehlerfall, kein Demo-Fallback.
    if (!auth.session?.access_token) {
      // Wirklich kein Login (Demo-Modus) → lokal ist hier korrekt und erwartet
      if (istNeu) setProjekte(prev => [...prev, p]);
      else setProjekte(prev => prev.map(x => x.id===p.id ? p : x));
      setNeuProjekt(false); setEditProjekt(false);
      if (!aktivId) setAktivId(p.id);
      return;
    }
    if (!firma?.id) {
      // Echter Login, aber Firma ist noch nicht geladen — häufigste Ursache:
      // direkt nach Firmenregistrierung ist der firma-State im Root-App
      // noch nicht synchronisiert (der Lade-Effect braucht einen Moment).
      setProjekteLadeFehler(
        "Deine Firma wurde noch nicht vollständig geladen. Bitte warte einen Moment und versuche es erneut — falls das Problem bestehen bleibt, lade die Seite neu."
      );
      return;
    }

    try {
      const client = sbClientMitToken(auth.session);
      const query = istNeu
        ? client.from("projekte").insert(payload).select()
        : client.from("projekte").update(payload).eq("id", p.id).select();
      const { data, error, status } = await query;
      if (error) {
        setProjekteLadeFehler(`Baustelle konnte nicht gespeichert werden (HTTP ${status}): ${error.message?.slice(0,200) || ""}`);
        return;
      }
      const gespeichert = data?.[0];
      if (gespeichert) {
        const normalisiert = {
          id: gespeichert.id, name: gespeichert.name, adresse: gespeichert.adresse,
          plz: gespeichert.plz, ort: gespeichert.ort, projektnummer: gespeichert.projektnummer,
          bauleiter: gespeichert.bauleiter, auftraggeber: gespeichert.auftraggeber,
          typ: gespeichert.typ, farbe: gespeichert.farbe,
        };
        if (istNeu) setProjekte(prev => [...prev, normalisiert]);
        else setProjekte(prev => prev.map(x => x.id===p.id ? normalisiert : x));
        setNeuProjekt(false); setEditProjekt(false);
        if (!aktivId) setAktivId(normalisiert.id);
      }
    } catch (e) {
      setProjekteLadeFehler("Netzwerkfehler beim Speichern der Baustelle: " + e.message);
    }
  }

  // ── Home Screen (Baustellen + Firmen) ──
  if (!aktivId) {

    // Baustelle anlegen → direkt Formular zeigen
    if (neuProjekt) {
      return (
        <ProjektFormular
          subs={subs}
          onSave={handleSaveProjekt}
          onClose={() => setNeuProjekt(false)}
          speicherFehler={projekteLadeFehler}
        />
      );
    }

    return (
      <>
        <div style={{ background:"var(--bg)", minHeight:"100dvh",
          fontFamily:"'Segoe UI', system-ui, sans-serif", color:"var(--text)" }}>

          {/* Header */}
          <div style={{ background:"var(--surface)", padding:"16px 18px 0",
            borderBottom:"2px solid var(--yellow)",
            boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontWeight:900, fontSize:20, letterSpacing:-1,
                  color:"var(--text)", lineHeight:1 }}>
                  <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
                </div>
                <div style={{ fontSize:10, color:"var(--muted)", fontWeight:600,
                  letterSpacing:2, textTransform:"uppercase", marginTop:2 }}>
                  Baustellenmanagement
                </div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <RollenBadge rolle={aktiveRolle} />
                <ThemeToggle dark={theme.dark} toggle={theme.toggle} />
                <button onClick={abmelden}
                  style={{ width:36, height:36, borderRadius:10,
                    background:"var(--surface2)", border:"1.5px solid var(--border2)",
                    cursor:"pointer", fontSize:14, display:"flex",
                    alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}
                  title="Abmelden">🚪</button>
              </div>
            </div>
            {/* Home Tabs */}
            <div style={{ display:"flex", gap:0 }}>
              {[["projekte","🏗️","Baustellen"],["firmen","🏢","Unternehmen"]].map(([id,icon,label]) => (
                <button key={id} onClick={() => setHomeTab(id)}
                  style={{ flex:1, background:"none", border:"none", cursor:"pointer",
                    padding:"10px 0 12px", fontFamily:"inherit",
                    borderBottom:`3px solid ${homeTab===id ? "var(--yellow)" : "transparent"}` }}>
                  <div style={{ fontSize:22 }}>{icon}</div>
                  <div style={{ color: homeTab===id ? "var(--text)" : "var(--muted)",
                    fontSize:12, marginTop:2,
                    fontWeight: homeTab===id ? 700 : 400 }}>{label}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding:"16px 14px 100px" }}>
            {firmaLadeFehler && (
              <div style={{ background:"var(--rbg)", color:"var(--red)", borderRadius:12,
                padding:"12px 16px", marginBottom:14, fontSize:12,
                border:"1px solid var(--red)" }}>
                ⚠️ {firmaLadeFehler}
              </div>
            )}

            {projekteLadeFehler && (
              <div style={{ background:"var(--rbg)", color:"var(--red)", borderRadius:12,
                padding:"12px 16px", marginBottom:14, fontSize:12,
                border:"1px solid var(--red)" }}>
                ⚠️ {projekteLadeFehler}
              </div>
            )}

            {homeTab === "projekte" && (
              <>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:14 }}>
                  <div style={{ color:"var(--text)", fontWeight:700, fontSize:15 }}>
                    Meine Baustellen
                  </div>
                  <div style={{ background:"var(--surface2)", color:"var(--muted)",
                    fontSize:12, padding:"4px 10px", borderRadius:20,
                    border:"1px solid var(--border)" }}>
                    {projekte.length} {projekte.length === 1 ? "Projekt" : "Projekte"}
                  </div>
                </div>

                {projekte.length === 0 && (
                  <div style={{ textAlign:"center", padding:"40px 20px",
                    color:"var(--muted)", fontSize:14 }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>🏗️</div>
                    <div style={{ fontWeight:700, color:"var(--text)", marginBottom:8 }}>
                      Noch keine Baustellen
                    </div>
                    <div style={{ marginBottom:20 }}>Leg deine erste Baustelle an um loszulegen.</div>
                    {auth.session?.access_token && !firma?.id ? (
                      <div style={{ color:"var(--muted)", fontSize:13 }}>
                        ⏳ Firmendaten werden geladen…
                      </div>
                    ) : (
                      <button onClick={() => setNeuProjekt(true)}
                        style={{ background:"var(--yellow)", color:"#1a1200",
                          border:"none", borderRadius:12, padding:"14px 28px",
                          fontWeight:800, fontSize:16, cursor:"pointer",
                          fontFamily:"inherit" }}>
                        🏗️ Erste Baustelle anlegen
                      </button>
                    )}
                  </div>
                )}

                {projekte.map(p => {
                  const eltern  = p.felder.filter(f=>!f.parentId);
                  const done    = eltern.filter(f=>f.status==="done").length;
                  const total   = eltern.length;
                  const pct     = total > 0 ? Math.round(done/total*100) : 0;
                  const delayed = eltern.filter(f=>f.status!=="done" && f.geplant && new Date(f.geplant)<new Date()).length;
                  const projSubs = subs.filter(s => (p.subIds||[]).includes(s.id));
                  return (
                    <div key={p.id} onClick={() => { setAktivId(p.id); setTab("dashboard"); }}
                      style={{ background:"var(--surface)", borderRadius:16,
                        padding:"18px 20px", marginBottom:14,
                        border:"1.5px solid var(--border)", cursor:"pointer",
                        borderLeft:`5px solid ${p.farbe}`,
                        boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"flex-start" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ color:"var(--text)", fontWeight:700,
                            fontSize:15 }}>{p.name}</div>
                          <div style={{ color:"var(--muted)", fontSize:12,
                            marginTop:2 }}>📍 {[p.adresse, [p.plz, p.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</div>
                          <div style={{ display:"flex", gap:8, marginTop:6,
                            flexWrap:"wrap" }}>
                            <Chip icon={PROJEKTTYPEN[p.typ]?.icon||"🏗️"} label={PROJEKTTYPEN[p.typ]?.label||p.typ} />
                            <Chip icon="🔢" label={p.projektnummer} />
                            <Chip icon="👤" label={p.bauleiter} />
                          </div>
                        </div>
                        <div style={{ color:"var(--muted)", fontSize:22,
                          marginLeft:8 }}>›</div>
                      </div>
                      {total > 0 && (
                        <div style={{ marginTop:12 }}>
                          <div style={{ display:"flex", justifyContent:"space-between",
                            marginBottom:4 }}>
                            <div style={{ color:"var(--muted)", fontSize:11 }}>
                              {done}/{total} {PROJEKTTYPEN[p.typ]?.fortschrittLabel||"fertig"}
                            </div>
                            <div style={{ display:"flex", gap:8 }}>
                              {delayed > 0 && (
                                <div style={{ color:"var(--red)", fontSize:11 }}>
                                  ⚠️ {delayed} Verzug
                                </div>
                              )}
                              <div style={{ color: p.farbe, fontSize:11,
                                fontWeight:700 }}>{pct}%</div>
                            </div>
                          </div>
                          <div style={{ background:"var(--surface2)", borderRadius:4,
                            height:6, border:"1px solid var(--border)" }}>
                            <div style={{ background: p.farbe, width:`${pct}%`,
                              height:"100%", borderRadius:4,
                              transition:"width 0.5s" }} />
                          </div>
                        </div>
                      )}
                      {total === 0 && (
                        <div style={{ color:"var(--muted)", fontSize:12,
                          marginTop:8 }}>Noch keine Felder angelegt</div>
                      )}
                    </div>
                  );
                })}

                {/* Neue Baustelle */}
                <div onClick={() => setNeuProjekt(true)}
                  style={{ border:"2px dashed var(--yellow)", borderRadius:16,
                    padding:"28px 24px", textAlign:"center", cursor:"pointer",
                    background:"var(--ybg)",
                    boxShadow:"0 2px 8px rgba(245,196,0,0.12)" }}>
                  <div style={{ fontSize:36 }}>➕</div>
                  <div style={{ color:"var(--ydark)", fontWeight:700,
                    marginTop:10, fontSize:15 }}>
                    Neue Baustelle anlegen
                  </div>
                </div>
              </>
            )}

            {homeTab === "firmen" && (
              <FirmenView
                owneFirma={eigeneFirma}
                setEigeneFirma={setEigeneFirma}
                subs={subs}
                setSubs={setSubs}
                onOnboardingReset={() => setOnboardingDone(false)}
                session={auth.session}
                firmaId={firma?.id}
              />
            )}
          </div>
        </div>

      </>
    );
  }

  // ── Projekt bearbeiten ──
  if (editProjekt && projekt) {
    return (
      <ProjektFormular
        initial={projekt}
        subs={subs}
        onSave={handleSaveProjekt}
        onClose={() => setEditProjekt(false)}
        speicherFehler={projekteLadeFehler}
      />
    );
  }

  // ── Neue Baustelle (aus dem Aktenregister heraus aufrufbar) ──
  if (neuProjekt) {
    return (
      <ProjektFormular
        subs={subs}
        onSave={handleSaveProjekt}
        onClose={() => setNeuProjekt(false)}
        speicherFehler={projekteLadeFehler}
      />
    );
  }

  // ── Baustellen-Ansicht ──
  // Rollenbasierte Tabs
  const ALLE_TABS = [
    { id:"dashboard",     icon:"📊",  label:"Übersicht",   rollen:["administrator","bauleiter","polier","vorarbeiter"] },
    { id:"aufgaben",      icon:"✅",  label:"Aufgaben",    rollen:["administrator","bauleiter","polier","vorarbeiter"] },
    { id:"gantt",         icon:"📅",  label:"Zeitplan",    rollen:["administrator","bauleiter","polier"] },
    { id:"kosten",        icon:"💰",  label:"Kosten",      rollen:["administrator","bauleiter","polier"] },
    { id:"wetter",        icon:"🌤️", label:"Wetter",      rollen:["administrator","bauleiter","polier","vorarbeiter"] },
    { id:"kolonnen",      icon:"👷",  label:"Kolonnen",    rollen:["administrator","bauleiter","polier","vorarbeiter"] },
    { id:"tagebuch",      icon:"📋",  label:"Tagebuch",    rollen:["administrator","polier","vorarbeiter"] },
    { id:"stempeln",      icon:"⏱️",  label:"Stempeln",    rollen:["administrator","polier","vorarbeiter","facharbeiter"] },
    { id:"stunden",       icon:"📊",  label:"Stunden",     rollen:["administrator","bauleiter","polier","vorarbeiter"] },
    { id:"angebot",       icon:"📄",  label:"Angebot",     rollen:["administrator","bauleiter","polier"] },
    { id:"admin_params",  icon:"⚙️",  label:"Parameter",   rollen:["administrator"] },
    { id:"nutzer",        icon:"👥",  label:"Nutzer",      rollen:["administrator"] },
  ];
  const TABS = ALLE_TABS.filter(t => !aktiveRolle || t.rollen.includes(aktiveRolle));

  // ── Navigation gruppieren: Hauptfunktionen sichtbar, Rest unter "Mehr" ──
  const HAUPT_TAB_IDS = ["dashboard", "aufgaben", "tagebuch", "kolonnen", "stempeln"];
  const hauptTabs = TABS.filter(t => HAUPT_TAB_IDS.includes(t.id))
    .sort((a,b) => HAUPT_TAB_IDS.indexOf(a.id) - HAUPT_TAB_IDS.indexOf(b.id));
  const mehrTabs  = TABS.filter(t => !HAUPT_TAB_IDS.includes(t.id));
  const aktivInMehr = mehrTabs.some(t => t.id === tab);

  return (
    <div style={{ background:"var(--bg)", minHeight:"100dvh",
      fontFamily:"'Segoe UI', system-ui, sans-serif", color:"var(--text)" }}>

      {/* ── TOP BAR ── */}
      <div style={{ background:"var(--surface)", padding:"13px 16px 0",
        borderBottom:"1px solid var(--border)", position:"sticky", top:0, zIndex:60,
        boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:10 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:19, letterSpacing:-1,
              color:"var(--text)", lineHeight:1 }}>
              <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
            </div>
            <div style={{ fontSize:10, color:"var(--muted)", fontWeight:600,
              letterSpacing:2, textTransform:"uppercase", marginTop:1 }}>
              Baustellenmanagement
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ width:8, height:8, borderRadius:4,
              background: sbConnected ? "var(--green)" : "var(--muted)" }} />
            <RollenBadge rolle={aktiveRolle} />
            <ThemeToggle dark={theme.dark} toggle={theme.toggle} />
            <button onClick={abmelden}
              style={{ width:36, height:36, borderRadius:10,
                background:"var(--surface2)", border:"1.5px solid var(--border2)",
                cursor:"pointer", fontSize:14, display:"flex",
                alignItems:"center", justifyContent:"center" }}
              title="Abmelden">
              🚪
            </button>
          </div>
        </div>

        {/* ── AKTENREGISTER ── */}
        <Aktenregister
          projekte={projekte}
          aktivId={aktivId}
          onSelect={id => { setAktivId(id); setTab("dashboard"); }}
          onNeu={() => setNeuProjekt(true)}
        />
      </div>

      {/* ── PROJEKT INFO STRIP ── */}
      <ProjektInfoStrip projekt={projekt} aufgaben={felder} />

      {/* ── CONTENT ── */}
      <PlanGuard firma={firma} ressource="app">
      <div style={{ padding:"16px 14px 100px", background:"var(--bg)", minHeight:"100dvh" }}>
        {tab === "dashboard" && <DashboardView aufgaben={felder} kolonnen={kolonnen} sbConnected={sbConnected} projekt={projekt}
            onNavigate={(tabId, filter) => {
              if (filter) setAufgabenFilter(filter);
              else setAufgabenFilter("alle");
              setTab(tabId);
            }} />}
        {tab === "gantt"     && <GanttView felder={felder} />}
        {tab === "wetter"    && <WeatherView ort={projekt?.ort} plz={projekt?.plz} projektId={projekt?.id} />}
        {tab === "kolonnen"  && <KolonnenView kolonnen={kolonnen} projekt={projekt} setKolonnen={setKolonnen} darfBearbeiten={rolleConfig?.kannBearbeiten !== false} />}
        {tab === "tagebuch"  && <TagesbuchView
            berichte={berichte} setBerichte={setBerichte} sbConnected={sbConnected}
            projekt={projekt} eigeneFirma={eigeneFirma} kolonnen={kolonnen}
            offlineSpeichern={offline.speichereOffline}
            aufgaben={felder} setAufgaben={setFelder}
          />}
        {tab === "aufgaben"      && <AufgabenView aufgaben={felder} setAufgaben={setFelder} kolonnen={kolonnen} sbConnected={sbConnected} darfBearbeiten={rolleConfig?.kannBearbeiten !== false} initialFilter={aufgabenFilter} />}
        {tab === "kosten"        && <KostenView projekt={projekt} aufgaben={felder} kolonnen={kolonnen} zeitbuchungen={zeitbuchungen} />}
        {tab === "stempeln"      && <StempeluhrView profil={aktiveProfil}
            projekte={aktiveProfil?.kolonne_id
              ? projekte.filter(p => (p.kolonnen||[]).some(k => k.id === aktiveProfil.kolonne_id)).length > 0
                ? projekte.filter(p => (p.kolonnen||[]).some(k => k.id === aktiveProfil.kolonne_id))
                : projekte
              : projekte}
            session={auth.session} kolonnen={kolonnen} />}
        {tab === "stunden"       && <StundenExportView profil={aktiveProfil} session={auth.session} projekte={projekte} darfAlleSehen={rolleConfig?.kannBearbeiten !== false && aktiveRolle !== "vorarbeiter"} />}
        {tab === "angebot"       && <AngebotView projekt={projekt} aufgaben={felder} einheitspreise={einheitspreise} lvVorlagen={lvVorlagen} eigeneFirma={eigeneFirma} />}
        {tab === "admin_params" && <AdminParameterView einheitspreise={einheitspreise} setEinheitspreise={setEinheitspreise} lvVorlagen={lvVorlagen} setLvVorlagen={setLvVorlagen} />}
        {tab === "nutzer"       && <NutzerVerwaltungView session={auth.session} kolonnen={kolonnen} firmaId={firma?.id} />}
      </div>
      </PlanGuard>

      {/* ── BOTTOM NAV ── */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0,
        background:"var(--surface)", borderTop:"2px solid var(--border)",
        display:"flex", zIndex:50,
        boxShadow:"0 -2px 12px rgba(0,0,0,0.10)",
        paddingBottom:"env(safe-area-inset-bottom)" }}>
        {hauptTabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setZeigeMehr(false); }}
            style={{ flex:1, padding:"10px 0 12px", background:"none",
              border:"none", cursor:"pointer", fontFamily:"inherit",
              borderTop:`3px solid ${tab===t.id ? projekt.farbe : "transparent"}`,
              transition:"border-color 0.15s" }}>
            <div style={{ fontSize:20 }}>{t.icon}</div>
            <div style={{ color: tab===t.id ? projekt.farbe : "var(--muted)",
              fontSize:9, marginTop:2,
              fontWeight: tab===t.id ? 800 : 500 }}>{t.label}</div>
          </button>
        ))}
        {mehrTabs.length > 0 && (
          <button onClick={() => setZeigeMehr(m => !m)}
            style={{ flex:1, padding:"10px 0 12px", background:"none",
              border:"none", cursor:"pointer", fontFamily:"inherit",
              borderTop:`3px solid ${(aktivInMehr || zeigeMehr) ? projekt.farbe : "transparent"}`,
              transition:"border-color 0.15s" }}>
            <div style={{ fontSize:20 }}>⋯</div>
            <div style={{ color: (aktivInMehr || zeigeMehr) ? projekt.farbe : "var(--muted)",
              fontSize:9, marginTop:2,
              fontWeight: (aktivInMehr || zeigeMehr) ? 800 : 500 }}>Mehr</div>
          </button>
        )}
      </div>

      {/* ── MEHR-MENÜ (Bottom Sheet) ── */}
      {zeigeMehr && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0,
          background:"rgba(0,0,0,0.4)", zIndex:60 }}
          onClick={() => setZeigeMehr(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ position:"absolute", bottom:0, left:0, right:0,
              background:"var(--surface)", borderRadius:"20px 20px 0 0",
              padding:"20px 16px", paddingBottom:"calc(20px + env(safe-area-inset-bottom))",
              boxShadow:"0 -4px 20px rgba(0,0,0,0.2)" }}>
            <div style={{ width:36, height:4, background:"var(--border)",
              borderRadius:2, margin:"0 auto 18px" }} />
            <div style={{ color:"var(--text)", fontWeight:700, fontSize:15,
              marginBottom:14 }}>Weitere Funktionen</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              {mehrTabs.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setZeigeMehr(false); }}
                  style={{ background: tab===t.id ? "var(--ybg)" : "var(--surface2)",
                    border:`1.5px solid ${tab===t.id ? "var(--yellow)" : "var(--border)"}`,
                    borderRadius:14, padding:"14px 8px", cursor:"pointer",
                    display:"flex", flexDirection:"column", alignItems:"center",
                    gap:6, fontFamily:"inherit" }}>
                  <span style={{ fontSize:22 }}>{t.icon}</span>
                  <span style={{ color: tab===t.id ? "var(--ydark)" : "var(--text2)",
                    fontSize:11, fontWeight:600, textAlign:"center" }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <PWABanner pwa={pwa} />
    </div>
  );
}
