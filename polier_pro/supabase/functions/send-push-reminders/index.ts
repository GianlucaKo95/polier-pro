// Polaris – send-push-reminders
//
// Versendet die drei täglichen Erinnerungen (Wetterbriefing 6:30, Verzug
// 7:00, Tagesbericht-Erinnerung 17:00, jeweils Europe/Berlin) als echte
// Web-Push-Benachrichtigungen an alle Nutzer mit einer gespeicherten
// push_subscriptions-Zeile. Ersetzt den vorherigen rein clientseitigen
// Reminder-Check (src/hooks/usePushNotifications.js), der nur feuerte,
// solange der Tab zufällig zur richtigen Uhrzeit offen war.
//
// Bewusste Vereinfachung: die Erinnerungen sind hier NICHT pro Firma
// personalisiert (keine exakte Anzahl "aktiver Baustellen"/"verzögerter
// Aufgaben" wie im alten Client-Code) — das würde Joins über
// push_subscriptions → profile → projekte/aufgaben brauchen, die ohne
// Zugriff auf ein echtes Supabase-Projekt hier nicht verifizierbar wären.
// Alle Abonnenten bekommen dieselbe generische Erinnerung; das lässt sich
// bei Bedarf später pro Firma erweitern.
//
// ─── Deployment (einmalig) ──────────────────────────────────────────────
//   supabase functions deploy send-push-reminders
//   supabase secrets set \
//     VAPID_PUBLIC_KEY=<siehe supabase-push-notifications.sql-Kommentar> \
//     VAPID_PRIVATE_KEY=<NIEMALS committen — nur als Secret setzen> \
//     VAPID_SUBJECT=mailto:deine-email@example.com
//
// ─── Scheduling ─────────────────────────────────────────────────────────
// Per pg_cron (siehe supabase-push-notifications.sql, Abschnitt 3) oder
// einem externen Scheduler alle 15 Minuten aufrufen. Die Funktion selbst
// prüft die aktuelle Berliner Uhrzeit und dedupliziert pro Kalendertag über
// push_reminder_log, ein 15-Minuten-Takt sendet also nicht mehrfach.
//
// ─── Hinweis ────────────────────────────────────────────────────────────
// Diese Datei ist nicht gegen ein echtes Supabase-Projekt getestet (kein
// Deploy-Zugriff aus dieser Session heraus). Vor Produktivbetrieb einmal
// manuell aufrufen und die Function-Logs prüfen.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT     = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function berlinerStunde(): number {
  const fmt = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin", hour: "2-digit", hour12: false,
  });
  return parseInt(fmt.format(new Date()), 10);
}

// Trägt sich selbst in push_reminder_log ein; schlägt der Insert wegen des
// unique(reminder_typ, tag)-Constraints fehl, wurde heute schon gesendet.
async function schonHeuteGesendet(typ: string): Promise<boolean> {
  const { error } = await supabase.from("push_reminder_log").insert({ reminder_typ: typ });
  return !!error;
}

async function sendeAnAlle(titel: string, text: string, tag: string): Promise<number> {
  const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
  if (error || !subs?.length) return 0;

  let versendet = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({ title: titel, body: text, tag })
      );
      versendet++;
    } catch (err) {
      // 404/410 = Subscription ist beim Push-Dienst nicht mehr gültig
      // (z.B. Nutzer hat die Benachrichtigungen im Browser widerrufen) —
      // aufräumen statt bei jedem Lauf erneut zu scheitern.
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
  return versendet;
}

Deno.serve(async () => {
  const stunde = berlinerStunde();
  const ergebnis: Record<string, number> = {};

  if (stunde === 6 && !(await schonHeuteGesendet("morgen-wetter"))) {
    ergebnis["morgen-wetter"] = await sendeAnAlle(
      "☀️ Guten Morgen!", "Wetter für die heutigen Baustellen checken.", "morgen-wetter"
    );
  }

  if (stunde === 7 && !(await schonHeuteGesendet("verzug"))) {
    ergebnis["verzug"] = await sendeAnAlle(
      "⚠️ Verzug prüfen", "Bitte offene Aufgaben und Fristen kontrollieren.", "verzug"
    );
  }

  if (stunde === 17 && !(await schonHeuteGesendet("tagesbericht"))) {
    ergebnis["tagesbericht"] = await sendeAnAlle(
      "📋 Tagesbericht nicht vergessen", "Bitte den Tagesbericht für heute erfassen.", "tagesbericht"
    );
  }

  return new Response(JSON.stringify({ ok: true, stunde, ergebnis }), {
    headers: { "Content-Type": "application/json" },
  });
});
