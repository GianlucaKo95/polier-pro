// ═══════════════════════════════════════════════════════════════════════════
// Polier Pro – PWA Registration & Install Handling
// Einbinden in index.html: <script src="/pwa-register.js"></script>
// ═══════════════════════════════════════════════════════════════════════════

// ── Service Worker registrieren ────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      console.log("[PWA] Service Worker registriert:", reg.scope);

      // Update-Erkennung: neuer SW verfügbar → User informieren
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        newSW?.addEventListener("statechange", () => {
          if (newSW.state === "installed" && navigator.serviceWorker.controller) {
            // App-Update verfügbar – Event feuern damit React-App Banner zeigen kann
            window.dispatchEvent(new CustomEvent("pwa-update-available"));
          }
        });
      });
    } catch (err) {
      console.warn("[PWA] Service Worker Fehler:", err);
    }
  });
}

// ── Install-Prompt abfangen (Add to Homescreen) ───────────────────────────
let installPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  // Event feuern damit React-App Install-Button zeigen kann
  window.dispatchEvent(new CustomEvent("pwa-installable"));
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  window.dispatchEvent(new CustomEvent("pwa-installed"));
  console.log("[PWA] App wurde installiert");
});

// Öffentliche Funktion zum Triggern des Install-Dialogs
window.pwaInstall = async () => {
  if (!installPrompt) return false;
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  installPrompt = null;
  return outcome === "accepted";
};

// ── Offline/Online Status ──────────────────────────────────────────────────
window.addEventListener("online",  () => window.dispatchEvent(new CustomEvent("pwa-online")));
window.addEventListener("offline", () => window.dispatchEvent(new CustomEvent("pwa-offline")));
