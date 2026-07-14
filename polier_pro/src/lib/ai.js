export async function generiereBerichtKI(diktat, projekt, kolonnen, wetter) {
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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "{}";
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { taetigkeit: diktat, besonderheiten: "", material: "", fazit: "" };
  }
}

export async function kiTagesabschluss(diktat, projekt, kolonnen, wetter) {
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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role:"user", content:prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.find(b=>b.type==="text")?.text || "{}";
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}
