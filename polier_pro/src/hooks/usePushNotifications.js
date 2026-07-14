import { useState, useEffect } from "react";
import { lokaleNotification, pushBerechtigung } from "../lib/push.js";

export function usePushNotifications(projekte, eigeneFirma) {
  const [erlaubt, setErlaubt] = useState(
    typeof Notification !== "undefined" ? Notification.permission === "granted" : false
  );

  useEffect(() => {
    if (!erlaubt) return;
    const now = new Date();
    const stunde = now.getHours();

    // Morgens 6:30: Wetterbriefing
    if (stunde === 6) {
      const heute = projekte.filter(p => p.felder?.some(f => f.status === "in_progress"));
      if (heute.length > 0) {
        lokaleNotification("☀️ Guten Morgen!", `${heute.length} aktive Baustelle${heute.length > 1 ? "n" : ""} — Wetter checken!`, "morgen-wetter");
      }
    }

    // Prüfe verzögerte Felder
    const verzug = projekte.flatMap(p =>
      (p.felder || []).filter(f => f.status !== "done" && f.geplant && new Date(f.geplant) < now)
    );
    if (verzug.length > 0 && stunde === 7) {
      lokaleNotification("⚠️ Felder in Verzug", `${verzug.length} Feld${verzug.length > 1 ? "er" : ""} hinter dem Zeitplan!`, "verzug");
    }

    // Abends 17:00: Tagesbericht-Erinnerung
    if (stunde === 17) {
      const heute = new Date().toLocaleDateString("de-DE");
      const heuteBericht = projekte.some(p =>
        (p.berichte || []).some(b => b.datum === heute)
      );
      if (!heuteBericht) {
        lokaleNotification("📋 Tagesbericht fehlt", "Bitte noch den Tagesbericht für heute erfassen.", "tagesbericht");
      }
    }
  }, [erlaubt, projekte]);

  async function berechtigung() {
    const ok = await pushBerechtigung();
    setErlaubt(ok);
    if (ok) lokaleNotification("✅ Polaris", "Push-Benachrichtigungen aktiv!", "setup");
  }

  return { erlaubt, berechtigung };
}
