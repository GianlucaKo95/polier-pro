import { sbClientMitToken } from "./supabase.js";

// Muss der öffentliche Teil eines echten, für dieses Projekt generierten
// VAPID-Schlüsselpaars sein (siehe supabase-push-notifications.sql für die
// Server-Seite). Vorher stand hier der öffentlich bekannte Demo-Key aus
// Googles web-push-Tutorial — damit hätte kein Server dieser App jemals
// einen echten Push signieren können. Ohne konfigurierten Key bleibt "echter"
// Server-Push deaktiviert; lokale Erinnerungen (lokaleNotification) laufen
// unabhängig davon weiter, solange der Tab offen ist.
export const PUSH_VAPID_PUBLIC = import.meta.env?.VITE_PUSH_VAPID_PUBLIC || "";

export async function pushBerechtigung() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
  return result === "granted";
}

// PushManager.subscribe() verlangt laut Spec einen Uint8Array (BufferSource)
// für applicationServerKey, keinen rohen Base64url-String — ohne diese
// Konvertierung wirft subscribe() einen TypeError, selbst mit einem
// korrekten VAPID-Key.
function base64UrlZuUint8Array(base64Url) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function pushAbonnieren() {
  if (!PUSH_VAPID_PUBLIC) return null; // kein echter Server-Push konfiguriert
  try {
    if (!navigator.serviceWorker) return null;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlZuUint8Array(PUSH_VAPID_PUBLIC),
    });
    return sub;
  } catch(e) {
    return null;
  }
}

// Abonniert echten Server-Push (falls konfiguriert) und speichert das Abo in
// Supabase, damit die "send-push-reminders"-Edge-Function es später nutzen
// kann. Schlägt lautlos fehl, wenn kein VAPID-Key konfiguriert oder der
// Nutzer nicht eingeloggt ist — lokale Erinnerungen funktionieren trotzdem.
export async function synchronisierePushAbo(session) {
  const sub = await pushAbonnieren();
  if (!sub || !session?.access_token || !session.user?.id) return sub;
  try {
    const { endpoint, keys } = sub.toJSON();
    const client = sbClientMitToken(session);
    await client.from("push_subscriptions").upsert({
      profil_id: session.user.id,
      endpoint,
      p256dh:    keys?.p256dh,
      auth_key:  keys?.auth,
    }, { onConflict: "endpoint" });
  } catch (e) {
    // Speichern des Abos fehlgeschlagen (z.B. Tabelle existiert noch nicht,
    // weil supabase-push-notifications.sql noch nicht ausgeführt wurde) —
    // die Browser-Subscription selbst bleibt trotzdem gültig.
  }
  return sub;
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
