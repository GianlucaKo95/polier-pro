import { useState, useEffect, useRef } from "react";
import { lokaleNotification, pushBerechtigung, synchronisierePushAbo } from "../lib/push.js";

// Nur einmal pro Kalendertag und Erinnerungstyp feuern (in localStorage
// gemerkt) — verhindert sowohl "nie" (früher: nur ein einmaliger Check beim
// Mount, der die richtige Stunde fast immer verpasste) als auch "spammt
// jede Minute" (wenn man die Stunde nur per Intervall neu prüft).
function schonHeuteBenachrichtigt(typ) {
  const key = `polaris-reminder-${typ}`;
  const heute = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(key) === heute) return true;
  localStorage.setItem(key, heute);
  return false;
}

export function usePushNotifications(projekte, eigeneFirma) {
  const [erlaubt, setErlaubt] = useState(
    typeof Notification !== "undefined" ? Notification.permission === "granted" : false
  );
  const projekteRef = useRef(projekte);
  projekteRef.current = projekte;

  useEffect(() => {
    if (!erlaubt) return;

    function pruefeErinnerungen() {
      const now = new Date();
      const stunde = now.getHours();
      const projekte = projekteRef.current;

      // Morgens 6:30: Wetterbriefing
      if (stunde === 6 && !schonHeuteBenachrichtigt("morgen-wetter")) {
        const heute = projekte.filter(p => p.felder?.some(f => f.status === "in_progress"));
        if (heute.length > 0) {
          lokaleNotification("☀️ Guten Morgen!", `${heute.length} aktive Baustelle${heute.length > 1 ? "n" : ""} — Wetter checken!`, "morgen-wetter");
        }
      }

      // Prüfe verzögerte Felder
      if (stunde === 7 && !schonHeuteBenachrichtigt("verzug")) {
        const verzug = projekte.flatMap(p =>
          (p.felder || []).filter(f => f.status !== "done" && f.geplant && new Date(f.geplant) < now)
        );
        if (verzug.length > 0) {
          lokaleNotification("⚠️ Felder in Verzug", `${verzug.length} Feld${verzug.length > 1 ? "er" : ""} hinter dem Zeitplan!`, "verzug");
        }
      }

      // Abends 17:00: Tagesbericht-Erinnerung
      if (stunde === 17 && !schonHeuteBenachrichtigt("tagesbericht")) {
        const heuteStr = now.toLocaleDateString("de-DE");
        const heuteBericht = projekte.some(p =>
          (p.berichte || []).some(b => b.datum === heuteStr)
        );
        if (!heuteBericht) {
          lokaleNotification("📋 Tagesbericht fehlt", "Bitte noch den Tagesbericht für heute erfassen.", "tagesbericht");
        }
      }
    }

    pruefeErinnerungen();
    // Minütlich prüfen statt nur einmal beim Mount — sonst wurde die
    // passende Stunde fast immer verpasst, weil dieser Effect vorher nur
    // beim ersten Rendern (bzw. bei Projekt-Änderungen) einmalig lief.
    const interval = setInterval(pruefeErinnerungen, 60000);
    return () => clearInterval(interval);
  }, [erlaubt]);

  async function berechtigung(session) {
    const ok = await pushBerechtigung();
    setErlaubt(ok);
    if (ok) {
      lokaleNotification("✅ Polaris", "Erinnerungen aktiv!", "setup");
      // Läuft im Hintergrund weiter, auch wenn kein echter Push konfiguriert
      // ist (dann macht synchronisierePushAbo nichts) oder das Speichern
      // fehlschlägt — lokale Erinnerungen sind davon unabhängig.
      synchronisierePushAbo(session).catch(() => {});
    }
  }

  return { erlaubt, berechtigung };
}
