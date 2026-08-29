// Polier Pro – PWA Registration
// sw.js ist handgeschrieben (kein Build-Tool generiert ihn) und liegt als
// statische Datei in public/, wird also unverändert mit ausgeliefert.

if ("serviceWorker" in navigator) {
  // Sobald ein neuer Service Worker die Kontrolle übernimmt (nach
  // skipWaiting()/clients.claim() in sw.js), läuft in der schon offenen
  // Seite trotzdem weiter der ALTE JS-Bundle im Speicher — erst ein
  // echtes Neuladen holt den neuen. Ohne diesen Reload blieb jedes Update
  // unsichtbar, bis iOS die PWA irgendwann zufällig komplett neu lud
  // (auch ein "harter" Neustart der App reicht dafür nicht zuverlässig).
  let neuGeladen = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (neuGeladen) return;
    neuGeladen = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      // updateViaCache:"none" verhindert, dass Safari/WebKit die sw.js
      // selbst über den normalen HTTP-Cache ausliefert — der nginx-
      // Cache-Control-Header allein hat sich als nicht zuverlässig genug
      // erwiesen, um Update-Checks in der installierten PWA zu erzwingen.
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      console.log("[PWA] Service Worker registriert:", reg.scope);

      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        newSW?.addEventListener("statechange", () => {
          if (newSW.state === "installed" && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent("pwa-update-available"));
          }
        });
      });

      // Browser prüfen laut Spezifikation nur bei einer Navigation auf eine
      // neue sw.js — eine als PWA im Hintergrund liegende, nicht komplett
      // beendete App navigiert aber unter Umständen tagelang nicht neu und
      // verpasst so jedes Update. Beim Zurückkehren in den Vordergrund
      // deshalb aktiv nachfragen, ob eine neue Version vorliegt.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update();
      });
    } catch (err) {
      console.warn("[PWA] Service Worker Fehler:", err);
    }
  });
}

let installPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  window.dispatchEvent(new CustomEvent("pwa-installable"));
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  window.dispatchEvent(new CustomEvent("pwa-installed"));
});
window.pwaInstall = async () => {
  if (!installPrompt) return false;
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  installPrompt = null;
  return outcome === "accepted";
};
window.addEventListener("online",  () => window.dispatchEvent(new CustomEvent("pwa-online")));
window.addEventListener("offline", () => window.dispatchEvent(new CustomEvent("pwa-offline")));
