import { useState, useEffect } from "react";
import { ChartColumn, Search, Download } from "lucide-react";
import { sbFetch } from "../lib/supabase.js";
import { TAETIGKEITEN } from "../config/konstanten.js";
import { Label, inputStyle } from "../components/Label.jsx";

export function StundenExportView({ profil, session, projekte, darfAlleSehen = false }) {
  const [vonDatum, setVonDatum] = useState(() => {
    const d = new Date(); d.setDate(1); // Monatserster
    return d.toISOString().slice(0,10);
  });
  const [bisDatum, setBisDatum] = useState(new Date().toISOString().slice(0,10));
  const [laden,    setLaden]    = useState(false);
  const [buchungen,setBuchungen]= useState([]);
  const [geladen,  setGeladen]  = useState(false);
  const [mitarbeiterListe, setMitarbeiterListe] = useState([]);
  const [gewaehlteMA, setGewaehlteMA] = useState("alle");

  // Mitarbeiterliste nur für den Filter-Dropdown — nur laden, wenn die Rolle
  // ohnehin mehr als die eigenen Stunden sehen darf (RLS würde den Zugriff
  // für alle anderen Rollen sowieso verweigern).
  useEffect(() => {
    if (!darfAlleSehen) return;
    sbFetch("profile?select=id,vorname,nachname&order=vorname.asc", {
      headers: { "Authorization": `Bearer ${session?.access_token}` }
    }).then(data => { if (data) setMitarbeiterListe(data); });
  }, [darfAlleSehen]);

  async function ladeZeitraum() {
    setLaden(true); setGeladen(false);
    const filterProfil = !darfAlleSehen
      ? `&profil_id=eq.${profil.id}`
      : gewaehlteMA !== "alle" ? `&profil_id=eq.${gewaehlteMA}` : "";
    const data = await sbFetch(
      `zeitbuchungen?select=*,profile(vorname,nachname)&status=eq.abgeschlossen` +
      `&eingestempelt_at=gte.${vonDatum}T00:00:00` +
      `&eingestempelt_at=lte.${bisDatum}T23:59:59` +
      filterProfil +
      `&order=eingestempelt_at.asc`,
      { headers: { "Authorization": `Bearer ${session?.access_token}` } }
    );
    setBuchungen(data || []);
    setGeladen(true);
    setLaden(false);
  }

  const gesamtMinuten = buchungen.reduce((s,b) => s + (b.netto_minuten||0), 0);
  const gesamtStunden = (gesamtMinuten / 60).toFixed(2);

  function projektName(id) {
    return projekte.find(p => p.id === id)?.name || "—";
  }

  function buchungName(b) {
    return b.profile ? `${b.profile.vorname||""} ${b.profile.nachname||""}`.trim() : `${profil.vorname} ${profil.nachname}`;
  }

  // Pro Mitarbeiter gruppiert statt einer durchmischten Gesamtliste — mit
  // eigener Zwischensumme je Mitarbeiter, damit "pro MA" auch in der CSV
  // selbst klar erkennbar ist, nicht nur über eine Namensspalte.
  function exportCSV() {
    const gruppen = new Map();
    for (const b of buchungen) {
      const name = buchungName(b);
      if (!gruppen.has(name)) gruppen.set(name, []);
      gruppen.get(name).push(b);
    }
    const namenSortiert = [...gruppen.keys()].sort((a,b) => a.localeCompare(b,"de"));

    const rows = [["Datum","Name","Projekt","Tätigkeit","Von","Bis","Pause (min)","Netto (Std)","Adresse Start","Notiz"]];
    for (const name of namenSortiert) {
      rows.push([`Mitarbeiter: ${name}`,"","","","","","","","",""]);
      let summeMinuten = 0;
      for (const b of gruppen.get(name)) {
        const von = new Date(b.eingestempelt_at);
        const bis = b.ausgestempelt_at ? new Date(b.ausgestempelt_at) : null;
        summeMinuten += b.netto_minuten || 0;
        rows.push([
          von.toLocaleDateString("de-DE"),
          name,
          projektName(b.projekt_id),
          TAETIGKEITEN[b.taetigkeit]?.label || "—",
          von.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}),
          bis ? bis.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) : "—",
          b.pause_minuten || 0,
          ((b.netto_minuten||0)/60).toFixed(2).replace(".",","),
          b.ein_adresse || "",
          b.notiz || "",
        ]);
      }
      rows.push(["","","","","","",`Summe ${name}:`,(summeMinuten/60).toFixed(2).replace(".",","),"",""]);
      rows.push([]);
    }
    if (namenSortiert.length > 1) {
      rows.push(["","","","","","","GESAMT (alle):",gesamtStunden.replace(".",","),"",""]);
    }

    const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\n");
    const blob = new Blob(["﻿"+csv], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const maSuffix = gewaehlteMA !== "alle"
      ? "_" + (mitarbeiterListe.find(m => String(m.id) === String(gewaehlteMA))?.nachname || "MA")
      : "";
    link.href = url;
    link.download = `Stunden_${vonDatum}_bis_${bisDatum}${maSuffix}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ color:"var(--text)", fontWeight:800, fontSize:16, marginBottom:10,
        display:"flex", alignItems:"center", gap:8 }}>
        <ChartColumn size={17} /> Stunden-Export
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <Label>Von</Label>
          <input type="date" value={vonDatum} onChange={e=>setVonDatum(e.target.value)}
            style={inputStyle()} />
        </div>
        <div>
          <Label>Bis</Label>
          <input type="date" value={bisDatum} onChange={e=>setBisDatum(e.target.value)}
            style={inputStyle()} />
        </div>
      </div>

      {darfAlleSehen && (
        <div style={{ marginBottom:10 }}>
          <Label>Mitarbeiter</Label>
          <select value={gewaehlteMA} onChange={e=>setGewaehlteMA(e.target.value)}
            style={{ ...inputStyle(), padding:"11px 12px" }}>
            <option value="alle">Alle Mitarbeiter</option>
            {mitarbeiterListe.map(m => (
              <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>
            ))}
          </select>
        </div>
      )}

      <button onClick={ladeZeitraum} disabled={laden}
        style={{ width:"100%", background:"var(--surface2)", color:"var(--text)",
          border:"1.5px solid var(--border)", borderRadius:12, padding:13,
          fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:"inherit",
          marginBottom:16, display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
        {laden ? "Lädt…" : <><Search size={14} /> Zeitraum laden</>}
      </button>

      {geladen && (
        <>
          <div style={{ background:"var(--surface)", borderRadius:14, padding:12,
            marginBottom:10, border:"1.5px solid var(--border)" }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center" }}>
              <div>
                <div style={{ color:"var(--muted)", fontSize:11, fontWeight:700,
                  textTransform:"uppercase" }}>Gesamt</div>
                <div style={{ color:"var(--text)", fontWeight:900, fontSize:24 }}>
                  {gesamtStunden} Std
                </div>
              </div>
              <div style={{ color:"var(--muted)", fontSize:12, textAlign:"right" }}>
                {buchungen.length} Buchung{buchungen.length!==1?"en":""}
              </div>
            </div>
          </div>

          {buchungen.length > 0 && (
            <button onClick={exportCSV}
              style={{ width:"100%", background:"var(--yellow)", color:"#1a1200",
                border:"none", borderRadius:12, padding:14, fontWeight:800,
                fontSize:15, cursor:"pointer", fontFamily:"inherit",
                marginBottom:16, display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
              <Download size={15} /> Als CSV exportieren
            </button>
          )}

          {buchungen.length === 0 && (
            <div style={{ textAlign:"center", padding:"23px 20px", color:"var(--muted)" }}>
              Keine Buchungen im gewählten Zeitraum.
            </div>
          )}

          {buchungen.map(b => {
            const von = new Date(b.eingestempelt_at);
            const name = b.profile ? `${b.profile.vorname||""} ${b.profile.nachname||""}`.trim() : "";
            return (
              <div key={b.id} style={{ background:"var(--surface)", borderRadius:10,
                padding:"7px 12px", marginBottom:6, border:"1px solid var(--border)" }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ color:"var(--text)", fontSize:12, fontWeight:600 }}>
                      {von.toLocaleDateString("de-DE")} {name && `· ${name}`}
                    </div>
                    <div style={{ color:"var(--muted)", fontSize:11, marginTop:2 }}>
                      {projektName(b.projekt_id)}
                      {b.taetigkeit && ` · ${TAETIGKEITEN[b.taetigkeit]?.icon} ${TAETIGKEITEN[b.taetigkeit]?.label}`}
                    </div>
                  </div>
                  <div style={{ color:"var(--text)", fontWeight:700, fontSize:13 }}>
                    {((b.netto_minuten||0)/60).toFixed(1)}h
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
