export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
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
