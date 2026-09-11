import { SUPABASE_URL } from "./supabase.js";
import { betonCheck } from "./geo.js";
import { AUFGABEN_TYPEN, AUFGABEN_STATUS } from "../config/konstanten.js";

export async function generiereBerichtKI(diktat, projekt, kolonnen, wetter, session) {
  const kolonnenInfo = (kolonnen || []).map(k =>
    `${k.name}: ${k.mitarbeiter?.length || 0} Mann, Einsatz: ${k.einsatz}`
  ).join("\n");

  const wetterInfo = wetter
    ? `Temperatur: ${wetter.temp}°C, Wind: ${wetter.wind}km/h, Niederschlag: ${wetter.rain}mm`
    : "keine Wetterdaten";

  const prompt = `Du bist ein erfahrener Polier und schreibst einen professionellen Bautagesbericht.

Projekt: ${projekt?.name || ""}
Adresse: ${projekt?.adresse || ""}
Datum: ${new Date().toLocaleDateString("de-DE")}
Wetter: ${wetterInfo}
Kolonnen heute:
${kolonnenInfo || "keine Kolonnen eingetragen"}

Diktat des Poliers:
"${diktat}"

Erstelle daraus einen vollständigen, professionellen Bautagesbericht. Antworte NUR mit einem JSON-Objekt ohne Markdown:
{
  "taetigkeit": "Ausführliche Beschreibung der Tätigkeiten (3-5 Sätze, fachlich korrekt)",
  "besonderheiten": "Besonderheiten, Mängel, Vorkommnisse (oder leer wenn keine)",
  "material": "Materiallieferungen falls erwähnt (oder leer)",
  "fazit": "Kurzes Fazit zum Tagesfortschritt"
}`;

  const data = await rufeClaudeAuf(prompt, 1000, session);
  const text = data.content?.find(b => b.type === "text")?.text || "{}";
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { taetigkeit: diktat, besonderheiten: "", material: "", fazit: "" };
  }
}

// Ruft NIE Anthropic direkt aus dem Browser auf — ein API-Key im
// Frontend-Code wäre für jeden Nutzer der installierten App über die
// Entwicklertools auslesbar. Stattdessen die ki-proxy Edge Function:
// die liest den Anthropic-Key der jeweiligen Firma serverseitig aus der
// Datenbank (siehe supabase/functions/ki-proxy) und ruft Anthropic damit
// auf — der Key selbst erreicht den Client nie.
async function rufeClaudeAuf(prompt, maxTokens, session) {
  const data = await rufeKiProxyAuf({ prompt, maxTokens }, session);
  return data;
}

async function rufeKiProxyAuf(body, session) {
  if (!session?.access_token) {
    throw new Error("Keine gültige Sitzung für KI-Anfrage.");
  }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ki-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const fehlerBody = await res.json().catch(() => ({}));
    throw new Error(fehlerBody?.error || `KI-Anfrage fehlgeschlagen (${res.status})`);
  }
  const data = await res.json();
  // stop_reason:"refusal" kommt als HTTP 200 zurück (Sicherheits-Klassifikator
  // hat abgelehnt, z.B. weil der ki-proxy trotz "default"-Fallback kein
  // Ersatzmodell mehr fand) — content ist dann leer oder unvollständig. Ohne
  // diese Prüfung würden alle Aufrufer hier einfach ein leeres/falsches
  // Ergebnis weiterverarbeiten, statt einen sichtbaren Fehler zu zeigen.
  if (data.stop_reason === "refusal") {
    throw new Error("Die KI konnte diese Anfrage nicht bearbeiten (vom Sicherheitsfilter abgelehnt). Bitte das Diktat umformulieren oder erneut versuchen.");
  }
  return data;
}

// ── KI-Assistent: Fragen zu echten Projektdaten ─────────────────────────
// Baut aus Aufgaben, Kolonnen, Wettervorhersage und Terminprognose einen
// System-Prompt mit klaren Leitplanken gegen Halluzination — die KI
// bekommt NUR diese Daten und die Anweisung, nichts darüber hinaus zu
// behaupten. Läuft als mehrstufiger Chat (verlauf), damit Rückfragen den
// bisherigen Gesprächskontext behalten.
function baueProjektKontext({ projekt, aufgaben = [], kolonnen = [], wetterVorhersage, terminprognose }) {
  const heute = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const offeneAufgaben = aufgaben.filter(a => a.status !== "abgeschlossen");
  const aufgabenText = offeneAufgaben.map(a => {
    const teile = [
      AUFGABEN_TYPEN[a.typ]?.label || a.typ,
      `Status: ${AUFGABEN_STATUS[a.status]?.label || a.status}`,
    ];
    if (a.faellig_am) teile.push(`fällig am ${new Date(a.faellig_am).toLocaleDateString("de-DE")}`);
    if (a.zustaendig) teile.push(`zuständig: ${a.zustaendig}`);
    if (a.soll_stunden) teile.push(`Soll-Stunden: ${a.soll_stunden}`);
    if (a.ist_mangel) teile.push("MANGEL");
    if (a.prioritaet === "kritisch") teile.push("PRIORITÄT KRITISCH");
    return `- "${a.titel}" (${teile.join(", ")})`;
  }).join("\n") || "keine offenen Aufgaben erfasst";

  const kolonnenText = kolonnen.map(k =>
    `- ${k.name}: ${k.mitarbeiter?.length || 0} Mann${k.vorarbeiter ? `, Vorarbeiter ${k.vorarbeiter}` : ""}, Einsatz: ${k.einsatz || "—"}`
  ).join("\n") || "keine Kolonnen erfasst";

  const wetterText = (wetterVorhersage || []).map(f => {
    const warn = betonCheck({ temp: f.max, wind: f.wind, rain: f.rain });
    const status = warn.length ? warn.join("; ") : "keine Einschränkungen für Betonage";
    return `- ${f.day} ${new Date(f.date).toLocaleDateString("de-DE")}: ${f.min}–${f.max}°C, Regen ${f.rain}mm, Wind ${f.wind}km/h → ${status}`;
  }).join("\n") || "keine Wettervorhersage verfügbar";

  const terminText = terminprognose?.zielTermin
    ? `Berechneter Fertigstellungstermin: ${terminprognose.projektEnde.toLocaleDateString("de-DE")}. `
      + `Ziel laut gesetzten Fälligkeitsdaten: ${terminprognose.zielTermin.toLocaleDateString("de-DE")}. `
      + (terminprognose.deltaTage > 0
        ? `Aktuell ${terminprognose.deltaTage} Tag(e) Verzug gegenüber diesem Ziel.`
        : "Aktuell im Plan.")
    : "keine Terminberechnung möglich (keine Fälligkeitsdaten an Aufgaben gesetzt)";

  return `Du bist ein erfahrener Baustellen-Assistent in der App "Polaris". Du beantwortest Fragen eines Poliers, Vorarbeiters oder Bauleiters ausschließlich anhand der unten aufgeführten echten Projektdaten.

VERBINDLICHE REGELN:
- Erfinde niemals Zahlen, Prozentangaben, Uhrzeiten oder Fakten, die sich nicht aus den Daten unten ableiten lassen.
- Wenn eine angefragte Information nicht in den Daten enthalten ist (z.B. Wetter für ein Datum außerhalb der 7-Tage-Vorhersage, eine nicht existierende Aufgabe oder Kolonne), sage das ausdrücklich — rate niemals.
- Bei sicherheitsrelevanten Einschätzungen (insbesondere Betonage/Wetter) nenne die konkreten Grenzwerte, die zur Einschätzung geführt haben, und erwähne verbleibende Unsicherheit statt falscher Präzision vorzutäuschen.
- Antworte kurz, konkret und in der Sprache eines erfahrenen Poliers — keine Floskeln, keine Wiederholung der Frage.

HEUTE: ${heute}
PROJEKT: ${projekt?.name || "—"}${projekt?.ort ? `, ${projekt.ort}` : ""}

OFFENE AUFGABEN:
${aufgabenText}

KOLONNEN:
${kolonnenText}

WETTERVORHERSAGE (7 Tage, sofern verfügbar):
${wetterText}

TERMINPROGNOSE:
${terminText}`;
}

export async function kiProjektFrage(frage, verlauf, kontext, session) {
  const system = baueProjektKontext(kontext);
  const messages = [
    ...verlauf.map(m => ({ role: m.rolle === "ki" ? "assistant" : "user", content: m.text })),
    { role: "user", content: frage },
  ];
  const data = await rufeKiProxyAuf({ system, messages, maxTokens: 700 }, session);
  return data.content?.find(b => b.type === "text")?.text || "";
}

const GUELTIGE_PROJEKTTYPEN = ["hochbau", "tiefgarage", "tiefbau", "dach", "pv"];

// Extrahiert Baustellen-Stammdaten aus einem Diktat — füllt nur das
// Neue-Baustelle-Formular vor, legt NICHTS selbst an. Der Administrator
// sieht die übernommenen Felder vor dem Speichern und kann sie noch
// korrigieren; das Anlegen selbst läuft weiter über den normalen
// "Speichern"-Klick im Formular.
export async function kiBaustelleAnlegen(diktat, session) {
  const prompt = `Du extrahierst aus einem gesprochenen Diktat die Stammdaten für eine neue Baustelle in einer Bauleitungs-App.

Diktat:
"${diktat}"

Erfinde NICHTS, was im Diktat nicht vorkommt — nicht erwähnte Felder bleiben ein leerer String. Antworte NUR mit einem JSON-Objekt ohne Markdown:
{
  "typ": "hochbau|tiefgarage|tiefbau|dach|pv — welche Bauart am ehesten passt, sonst \\"hochbau\\"",
  "name": "Projektname",
  "adresse": "Straße und Hausnummer",
  "plz": "Postleitzahl",
  "ort": "Ort",
  "projektnummer": "Projekt-/Auftragsnummer falls genannt",
  "bauleiter": "Name des Bauleiters falls genannt",
  "auftraggeber": "Name des Auftraggebers falls genannt"
}`;

  const data = await rufeClaudeAuf(prompt, 500, session);
  const text = data.content?.find(b => b.type === "text")?.text || "{}";
  try {
    const r = JSON.parse(text.replace(/```json|```/g, "").trim());
    return {
      typ:           GUELTIGE_PROJEKTTYPEN.includes(r.typ) ? r.typ : "hochbau",
      name:          r.name || "",
      adresse:       r.adresse || "",
      plz:           r.plz || "",
      ort:           r.ort || "",
      projektnummer: r.projektnummer || "",
      bauleiter:     r.bauleiter || "",
      auftraggeber:  r.auftraggeber || "",
    };
  } catch {
    return null;
  }
}

export async function kiTagesabschluss(diktat, projekt, kolonnen, wetter, session) {
  const heute = new Date().toLocaleDateString("de-DE");
  const wetterInfo = wetter
    ? `${wetter.temp}°C, Wind ${wetter.wind}km/h, Niederschlag ${wetter.rain}mm`
    : "keine Wetterdaten";

  const prompt = `Du bist ein erfahrener Polier-Assistent. Analysiere dieses Diktat vom Tagesabschluss und extrahiere strukturierte Daten.

Datum: ${heute}
Projekt: ${projekt?.name || ""}
Wetter heute: ${wetterInfo}
Kolonnen: ${kolonnen.map(k=>k.name).join(", ")}

Diktat des Poliers:
"${diktat}"

Antworte NUR mit diesem JSON (kein Markdown, keine Erklärungen):
{
  "bericht": {
    "taetigkeit": "Professionelle Beschreibung der heutigen Tätigkeiten (3-4 Sätze, VOB-konform)",
    "besonderheiten": "Besonderheiten, Probleme, Vorkommnisse (oder leerer String)",
    "material": "Erwähnte Materiallieferungen (oder leerer String)",
    "arbeiter": 0
  },
  "neue_aufgaben": [
    {
      "titel": "Aufgabentitel",
      "typ": "beton|schalung|bewehrung|abdichtung|allgemein",
      "prioritaet": "niedrig|mittel|hoch|kritisch",
      "beschreibung": "Details"
    }
  ],
  "neue_maengel": [
    {
      "titel": "Mangelbeschreibung",
      "mangel_verursacher": "Wer hat den Mangel verursacht",
      "prioritaet": "mittel|hoch|kritisch"
    }
  ],
  "wetter_warnung": "Warnung wenn morgen kritisches Wetter für geplante Arbeiten (oder leerer String)"
}`;

  const data = await rufeClaudeAuf(prompt, 1500, session);
  const text = data.content?.find(b=>b.type==="text")?.text || "{}";
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}
