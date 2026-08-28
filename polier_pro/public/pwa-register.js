// Polier Pro – PWA Registration
// sw.js ist handgeschrieben (kein Build-Tool generiert ihn) und liegt als
// statische Datei in public/, wird also unverändert mit ausgeliefert.

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
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
