export const PUSH_VAPID_PUBLIC = "BEl62iUYgUivxIkv69yViEuiBIa40Hi-GJVabpPADEaLJCO1a6-FqZ3mnpBcRjMsYCU7HoEaRLqMkqFbFfBRE";

export async function pushBerechtigung() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
  return result === "granted";
}

export async function pushAbonnieren() {
  try {
    if (!navigator.serviceWorker) return;
  const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: PUSH_VAPID_PUBLIC,
    });
    return sub;
  } catch(e) {
    return null;
  }
}

export function lokaleNotification(titel, text, tag) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (typeof Notification === "undefined") return;
  new Notification(titel, {
    body:  text,
    icon:  "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    tag:   tag || "polier-pro",
    vibrate: [200, 100, 200],
  });
}
