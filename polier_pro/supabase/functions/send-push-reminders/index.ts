// Polaris – send-push-reminders
//
// Zwei Arten von Web-Push-Benachrichtigungen, alle als echte Server-Push
// (nicht nur clientseitig, siehe src/hooks/usePushNotifications.js für den
// alten, rein lokalen Ansatz):
//
// 1. Generische Tages-Erinnerungen (Wetterbriefing 6:30, Tagesbericht 17:00,
//    jeweils Europe/Berlin) an ALLE Abonnenten, dedupliziert pro Kalendertag
//    über push_reminder_log.
//
// 2. Automatische Eskalationsleiter für überfällige Aufgaben: bei jedem
//    Cron-Tick werden alle offenen, überfälligen Aufgaben geprüft. Der
//    Verzug in % (Tage überfällig ÷ geplante Dauer) bestimmt eine Stufe
//    1–3. Bei einem STUFENANSTIEG (nicht bei jedem Tick erneut) wird genau
//    die neu erreichte Rollenebene benachrichtigt:
//      Stufe 1 (>0–20% Verzug):  Polier + Vorarbeiter der Firma
//      Stufe 2 (20–40% Verzug):  zusätzlich Bauleiter
//      Stufe 3 (>40% Verzug):    zusätzlich Administrator ("Projektleiter")
//    Der zuletzt erreichte Stand steht in aufgaben_eskalation (siehe
//    Migration aufgaben_eskalation_tabelle), damit nicht bei jedem 15-
//    Minuten-Tick erneut an dieselbe Ebene gesendet wird.
//
// ─── Deployment (einmalig) ──────────────────────────────────────────────
//   supabase functions deploy send-push-reminders
//   supabase secrets set \
//     VAPID_PUBLIC_KEY=<siehe supabase-push-notifications.sql-Kommentar> \
//     VAPID_PRIVATE_KEY=<NIEMALS committen — nur als Secret setzen> \
//     VAPID_SUBJECT=mailto:deine-email@example.com
//
// ─── Scheduling ─────────────────────────────────────────────────────────
// Per pg_cron alle 15 Minuten (siehe supabase-push-notifications.sql,
// Abschnitt 3). Die Eskalationsprüfung ist über den Stufenvergleich in
// aufgaben_eskalation von selbst idempotent — ein häufigerer Takt bedeutet
// nur schnellere Erkennung, keine doppelten Benachrichtigungen.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT     = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type PushSub = { id: number; endpoint: string; p256dh: string; auth_key: string };

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

async function sendeAnSubscriptions(subs: PushSub[], titel: string, text: string, tag: string): Promise<number> {
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

async function sendeAnAlle(titel: string, text: string, tag: string): Promise<number> {
  const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
  if (error || !subs?.length) return 0;
  return sendeAnSubscriptions(subs as PushSub[], titel, text, tag);
}

// Push an alle Nutzer einer Firma mit einer der angegebenen Rollen.
async function sendeAnRollen(firmaId: number, rollen: string[], titel: string, text: string, tag: string): Promise<number> {
  const { data: profile } = await supabase.from("profile").select("id").eq("firma_id", firmaId).in("rolle", rollen);
  const profilIds = (profile || []).map(p => p.id);
  if (!profilIds.length) return 0;
  const { data: subs } = await supabase.from("push_subscriptions").select("*").in("profil_id", profilIds);
  if (!subs?.length) return 0;
  return sendeAnSubscriptions(subs as PushSub[], titel, text, tag);
}

// Rollen, die bei Erreichen einer Stufe NEU informiert werden (kumulativ:
// wer schon auf Stufe 1 informiert wurde, wird bei Stufe 2 nicht erneut
// mit derselben Meldung behelligt — nur die jeweils neu hinzukommende
// Ebene bekommt die Benachrichtigung für diesen Stufensprung).
const ESKALATIONS_ROLLEN: Record<number, string[]> = {
  1: ["polier", "vorarbeiter"],
  2: ["bauleiter"],
  3: ["administrator"],
};
const ESKALATIONS_TITEL: Record<number, string> = {
  1: "⚠️ Aufgabe in Verzug",
  2: "🟠 Verzug eskaliert",
  3: "🔴 Termin gefährdet",
};

async function pruefeEskalationen(): Promise<Record<string, number>> {
  const heute = new Date();
  const heuteISO = heute.toISOString().slice(0, 10);

  const { data: aufgaben } = await supabase
    .from("aufgaben")
    .select("id, titel, faellig_am, dauer_tage, status, projekt_id, projekte!inner(id, name, firma_id)")
    .neq("status", "abgeschlossen")
    .not("faellig_am", "is", null)
    .lt("faellig_am", heuteISO);

  const ergebnis: Record<string, number> = { stufe1: 0, stufe2: 0, stufe3: 0 };
  const aktiveIds: number[] = [];

  for (const a of aufgaben || []) {
    aktiveIds.push(a.id);
    const projekt = (a as unknown as { projekte: { id: number; name: string; firma_id: number } }).projekte;

    const faellig = new Date(a.faellig_am as string);
    const verzugTage = Math.round((Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth(), heute.getUTCDate())
      - Date.UTC(faellig.getUTCFullYear(), faellig.getUTCMonth(), faellig.getUTCDate())) / 86400000);
    if (verzugTage <= 0) continue;

    const dauer = a.dauer_tage && a.dauer_tage > 0 ? a.dauer_tage : 1;
    const verzugProzent = (verzugTage / dauer) * 100;
    const neueStufe = verzugProzent > 40 ? 3 : verzugProzent > 20 ? 2 : 1;

    const { data: bestehend } = await supabase
      .from("aufgaben_eskalation").select("stufe").eq("aufgabe_id", a.id).maybeSingle();
    const alteStufe = bestehend?.stufe || 0;

    if (neueStufe > alteStufe) {
      const rollen = ESKALATIONS_ROLLEN[neueStufe] || [];
      const text = `${projekt.name}: "${a.titel}" ist ${verzugTage} Tag${verzugTage === 1 ? "" : "e"} `
        + `(${Math.round(verzugProzent)}%) hinter Plan.`;
      const versendet = await sendeAnRollen(projekt.firma_id, rollen, ESKALATIONS_TITEL[neueStufe], text, `eskalation-${a.id}`);
      ergebnis[`stufe${neueStufe}`] = (ergebnis[`stufe${neueStufe}`] || 0) + versendet;
    }

    await supabase.from("aufgaben_eskalation").upsert({
      aufgabe_id: a.id, stufe: neueStufe, verzug_prozent: verzugProzent, aktualisiert_am: new Date().toISOString(),
    });
  }

  // Aufräumen: Aufgaben, die nicht mehr überfällig sind (erledigt oder
  // Termin verschoben), auf Stufe 0 zurücksetzen — eine erneute Verspätung
  // beginnt dann wieder bei Stufe 1, statt sofort erneut zu eskalieren.
  await supabase.from("aufgaben_eskalation")
    .update({ stufe: 0, verzug_prozent: 0 })
    .neq("stufe", 0)
    .not("aufgabe_id", "in", `(${aktiveIds.length ? aktiveIds.join(",") : "0"})`);

  return ergebnis;
}

Deno.serve(async () => {
  const stunde = berlinerStunde();
  const ergebnis: Record<string, unknown> = {};

  if (stunde === 6 && !(await schonHeuteGesendet("morgen-wetter"))) {
    ergebnis["morgen-wetter"] = await sendeAnAlle(
      "☀️ Guten Morgen!", "Wetter für die heutigen Baustellen checken.", "morgen-wetter"
    );
  }

  if (stunde === 17 && !(await schonHeuteGesendet("tagesbericht"))) {
    ergebnis["tagesbericht"] = await sendeAnAlle(
      "📋 Tagesbericht nicht vergessen", "Bitte den Tagesbericht für heute erfassen.", "tagesbericht"
    );
  }

  ergebnis["eskalation"] = await pruefeEskalationen();

  return new Response(JSON.stringify({ ok: true, stunde, ergebnis }), {
    headers: { "Content-Type": "application/json" },
  });
});
