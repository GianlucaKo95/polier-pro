export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

const HTML_ESCAPES = { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" };

// Escaped Freitext, bevor er in ein window.document.write()-gerendertes
// PDF/Druck-Template eingefügt wird — ohne das kann jedes Textfeld
// (Tätigkeit, Besonderheiten, Mangel-Titel, Firmenname, ...) HTML/JS
// einschleusen, das beim Öffnen des Exports im selben Origin ausgeführt wird.
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => HTML_ESCAPES[c]);
}

export async function sha256Hex(text) {
  const bytes  = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join("");
}

export function leereAufgabe() {
  return {
    id:           Date.now(),
    titel:        "",
    typ:          "allgemein",
    status:       "offen",
    prioritaet:   "mittel",
    faellig_am:   "",
    zustaendig:   "",
    beschreibung: "",
    fotos:        [],
    ist_mangel:   false,
    plan_x:       null,
    plan_y:       null,
    // Betonfeld-Felder
    m2:           0,
    betonsorte:   "",
    festigkeit:   null,
    // Kosten
    budget_pos:   "",
    created_at:   new Date().toISOString(),
  };
}

export function leerProjekt() {
  return { id: Date.now(), name:"", adresse:"", plz:"", ort:"", projektnummer:"", bauleiter:"", auftraggeber:"",
    typ: "hochbau",
    farbe: ["#F5C400","#4A9EE0","#2EAF6A","#C45C2A","#9B59B6"][Math.floor(Math.random()*5)],
    felder:[], kolonnen:[], berichte:[] };
}
