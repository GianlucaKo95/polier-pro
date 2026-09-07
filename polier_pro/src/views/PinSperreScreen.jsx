import { useState } from "react";
import { Lock, LogOut } from "lucide-react";
import { sha256Hex } from "../lib/utils.js";

const MAX_VERSUCHE_OHNE_WARTEN = 5;

// App-Sperre: PIN-Abfrage beim ersten Öffnen und nach längerer Zeit im
// Hintergrund — schneller als ein volles Login, aber schützt Firmendaten,
// falls das Handy in fremde Hände gerät. Der Vergleich läuft komplett
// lokal (Hash gegen Hash), braucht also keine Netzverbindung.
export function PinSperreScreen({ profil, onEntsperrt, onAbmelden }) {
  const [eingabe, setEingabe] = useState("");
  const [fehler,  setFehler]  = useState("");
  const [versuche,setVersuche]= useState(0);
  const [prueft,  setPrueft]  = useState(false);

  async function pruefen() {
    if (eingabe.length !== 4 || prueft) return;
    setPrueft(true);
    const hash = await sha256Hex(eingabe);
    setPrueft(false);
    if (hash === profil.pin) {
      onEntsperrt();
      return;
    }
    setVersuche(v => v + 1);
    setEingabe("");
    setFehler(versuche + 1 >= MAX_VERSUCHE_OHNE_WARTEN
      ? "Falsche PIN — bei wiederholten Fehlversuchen bitte abmelden und mit Passwort anmelden."
      : "Falsche PIN.");
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"var(--ink)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:24, zIndex:1000 }}>
      <Lock size={40} color="var(--yellow)" style={{ marginBottom:16 }} />
      <div style={{ color:"#fff", fontWeight:800, fontSize:19, marginBottom:4, textAlign:"center" }}>
        Hallo {profil.vorname || ""}
      </div>
      <div style={{ color:"var(--ink-text2)", fontSize:13, marginBottom:24, textAlign:"center" }}>
        Bitte PIN eingeben, um Polaris zu entsperren
      </div>
      <input value={eingabe}
        onChange={e => { setEingabe(e.target.value.replace(/\D/g,"").slice(0,4)); setFehler(""); }}
        onKeyDown={e => e.key === "Enter" && pruefen()}
        inputMode="numeric" maxLength={4} autoFocus disabled={prueft}
        style={{ width:150, textAlign:"center", fontSize:30, fontWeight:800,
          letterSpacing:14, padding:"12px 0", borderRadius:12,
          border:`2px solid ${fehler ? "var(--red)" : "rgba(255,255,255,.2)"}`,
          background:"rgba(255,255,255,.06)", color:"#fff", fontFamily:"inherit" }} />
      {fehler && (
        <div style={{ color:"#FCA5A5", fontSize:12, marginTop:10, textAlign:"center", maxWidth:260 }}>
          {fehler}
        </div>
      )}
      <button onClick={pruefen} disabled={eingabe.length !== 4 || prueft}
        style={{ marginTop:24, width:220, background: eingabe.length===4 ? "var(--yellow)" : "rgba(255,255,255,.1)",
          color: eingabe.length===4 ? "#1a1200" : "var(--ink-text2)",
          border:"none", borderRadius:12, padding:14, fontWeight:800, fontSize:15,
          cursor: eingabe.length===4 ? "pointer" : "default", fontFamily:"inherit" }}>
        {prueft ? "…" : "Entsperren"}
      </button>
      <button onClick={onAbmelden}
        style={{ marginTop:20, background:"none", border:"none", color:"var(--ink-text2)",
          cursor:"pointer", fontSize:12, fontFamily:"inherit",
          display:"flex", alignItems:"center", gap:5 }}>
        <LogOut size={13} /> Abmelden und mit Passwort anmelden
      </button>
    </div>
  );
}
