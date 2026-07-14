import { useState, useEffect } from "react";

export function usePWA() {
  const [installierbar,  setInstallierbar]  = useState(false);
  const [installiert,    setInstalliert]    = useState(false);
  const [updateVerfügbar,setUpdateVerfügbar]= useState(false);
  const [offline,        setOffline]        = useState(!navigator.onLine);

  useEffect(() => {
    const onInstallable = () => setInstallierbar(true);
    const onInstalled   = () => { setInstallierbar(false); setInstalliert(true); };
    const onUpdate      = () => setUpdateVerfügbar(true);
    const onOnline      = () => setOffline(false);
    const onOffline     = () => setOffline(true);

    window.addEventListener("pwa-installable",       onInstallable);
    window.addEventListener("pwa-installed",         onInstalled);
    window.addEventListener("pwa-update-available",  onUpdate);
    window.addEventListener("pwa-online",            onOnline);
    window.addEventListener("pwa-offline",           onOffline);

    return () => {
      window.removeEventListener("pwa-installable",      onInstallable);
      window.removeEventListener("pwa-installed",        onInstalled);
      window.removeEventListener("pwa-update-available", onUpdate);
      window.removeEventListener("pwa-online",           onOnline);
      window.removeEventListener("pwa-offline",          onOffline);
    };
  }, []);

  async function installieren() {
    const ok = await window.pwaInstall?.();
    if (ok) setInstalliert(true);
  }

  function updateAnwenden() {
    window.location.reload();
  }

  return { installierbar, installiert, updateVerfügbar, offline, installieren, updateAnwenden };
}
