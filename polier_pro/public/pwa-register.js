// Polier Pro – PWA Registration
// Der Service Worker wird von vite-plugin-pwa (Workbox) automatisch generiert.

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
