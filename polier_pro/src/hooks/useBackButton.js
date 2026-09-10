import { useEffect, useRef } from "react";

// Verbindet ein Subfenster (Vollbild-Formular/Overlay) mit dem Browser-
// Verlauf: Öffnen legt einen Verlaufseintrag an, damit der native
// Zurück-Button (Browser-Pfeil, Android-Geste) das Subfenster schließt
// statt die ganze App zu verlassen — bisher gab es nirgends ein
// history.pushState(), ein Zurück-Klick verließ deshalb sofort die Seite.
//
// Rein reaktiv an "offen" gekoppelt: völlig egal, auf welchem Weg das
// Subfenster geschlossen wird (✕-Button, Speichern, o.ä.) — sobald offen
// auf false wechselt, wird der zuvor angelegte Verlaufseintrag automatisch
// mit aufgeräumt (history.back()), sonst müsste man beim nächsten Mal
// zusätzlich einmal "Zurück" klicken, um wirklich weiterzukommen. Bestehende
// onClose-Handler müssen dafür nicht angepasst werden.
//
//   useBackButton(offen, () => setOffen(false));
export function useBackButton(offen, schliessen) {
  const gepushtRef = useRef(false);
  const schliessenRef = useRef(schliessen);
  schliessenRef.current = schliessen;

  useEffect(() => {
    if (offen && !gepushtRef.current) {
      window.history.pushState({ ...(window.history.state || {}), polarisSub: true }, "");
      gepushtRef.current = true;
    } else if (!offen && gepushtRef.current) {
      gepushtRef.current = false;
      window.history.back();
    }
  }, [offen]);

  useEffect(() => {
    function onPopState() {
      if (gepushtRef.current) {
        gepushtRef.current = false;
        schliessenRef.current();
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
}
