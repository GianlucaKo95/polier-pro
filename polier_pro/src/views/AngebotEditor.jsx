import { useState } from "react";
import { AUFGABEN_TYPEN } from "../config/konstanten.js";
import { inputStyle, Label } from "../components/Label.jsx";

export function AngebotEditor({ angebot, onSave, onClose, aufgaben, einheitspreise, lvVorlagen, projekt, eigeneFirma }) {
  const [a,         setA]         = useState(angebot);
  const [ansicht,   setAnsicht]   = useState("positionen"); // positionen | einstellungen
  const [vonVorlage,setVonVorlage]= useState(false);
  const [vonAufgabe,setVonAufgabe]= useState(false);

  const netto   = a.positionen.reduce((s,p)=>s+(p.menge||0)*(p.ep||0),0);
  const rabattBetrag = netto * (a.rabatt||0)/100;
  const nettoNachRabatt = netto - rabattBetrag;
  const mwstBetrag = nettoNachRabatt * (a.mwst||19)/100;
  const bruttoGesamt = nettoNachRabatt + mwstBetrag;

  function addPosition(pos) {
    setA(x => ({ ...x, positionen:[...x.positionen, { ...pos, id:Date.now() }] }));
  }

  function updatePos(id, key, val) {
    setA(x => ({ ...x, positionen:x.positionen.map(p =>
      p.id===id ? { ...p, [key]:key==="menge"||key==="ep" ? Number(val) : val } : p) }));
  }

  function removePos(id) {
    setA(x => ({ ...x, positionen:x.positionen.filter(p=>p.id!==id) }));
  }

  function vorlageLaden(vorlage) {
    const neuPos = vorlage.positionen.map(p => {
      const ep = einheitspreise.find(e=>e.id===p.ep_id);
      return { id:Date.now()+Math.random(), bez:p.bez,
        einheit:p.einheit, menge:0, ep:ep?.preis||0 };
    });
    setA(x => ({ ...x, positionen:[...x.positionen, ...neuPos] }));
    setVonVorlage(false);
  }

  function aufgabeImportieren(aufgabe) {
    const typ   = aufgabe.typ;
    const ep    = einheitspreise.find(e =>
      e.gewerk.toLowerCase().includes(typ) || typ.includes(e.gewerk.toLowerCase())
    );
    addPosition({
      bez:      aufgabe.titel,
      einheit:  aufgabe.m2 ? "m²" : "h",
      menge:    aufgabe.m2 || 0,
      ep:       ep?.preis || 0,
    });
    setVonAufgabe(false);
  }

  function exportPDF() {
    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; font-size:10.5pt; color:#1a1a1a; }
.page { width:210mm; padding:14mm 18mm; }
.header { display:flex; justify-content:space-between; align-items:flex-start;
  border-bottom:3px solid #F5C400; padding-bottom:12px; margin-bottom:16px; }
.logo { font-size:22pt; font-weight:900; letter-spacing:-1px; }
.logo span { color:#F5C400; }
.firma-info { font-size:9pt; color:#666; margin-top:3px; line-height:1.5; }
.angebot-title { text-align:right; }
.angebot-title h1 { font-size:16pt; font-weight:900; }
.angebot-title .meta { font-size:9pt; color:#666; margin-top:3px; }
.empfaenger { background:#f8f8f8; border-radius:6px; padding:12px 14px; margin-bottom:16px; }
.empfaenger-label { font-size:8pt; color:#888; margin-bottom:4px; }
.table { width:100%; border-collapse:collapse; margin-bottom:16px; }
.table th { background:#1a1a1a; color:#F5C400; padding:8px 10px;
  text-align:left; font-size:9pt; }
.table th:last-child, .table td:last-child { text-align:right; }
.table td { padding:8px 10px; border-bottom:1px solid #eee; font-size:10pt; }
.table tr:nth-child(even) td { background:#f8f8f8; }
.summen { margin-left:auto; width:260px; }
.summen-row { display:flex; justify-content:space-between;
  padding:5px 0; font-size:10pt; }
.summen-row.gesamt { border-top:2px solid #1a1a1a; margin-top:4px;
  padding-top:8px; font-weight:900; font-size:12pt; }
.summen-row.gesamt span:last-child { color:#F5C400; }
.footer-text { background:#f8f8f8; border-radius:6px; padding:10px 14px;
  font-size:9pt; color:#666; margin-top:16px; line-height:1.6; }
.footer { border-top:1px solid #ddd; margin-top:14px; padding-top:6px;
  font-size:7pt; color:#aaa; display:flex; justify-content:space-between; }
</style></head><body><div class="page">

<div class="header">
  <div>
    <div class="logo"><span>★</span> ${eigeneFirma?.name||"Polaris"}</div>
    <div class="firma-info">
      ${eigeneFirma?.strasse||""} · ${eigeneFirma?.plz||""} ${eigeneFirma?.ort||""}<br>
      Tel: ${eigeneFirma?.telefon||""} · ${eigeneFirma?.email||""}<br>
      ${eigeneFirma?.steuernummer ? "St-Nr: "+eigeneFirma.steuernummer : ""}
    </div>
  </div>
  <div class="angebot-title">
    <h1>Angebot</h1>
    <div class="meta">Datum: ${new Date(a.datum).toLocaleDateString("de-DE")}</div>
    <div class="meta">Gültig bis: ${new Date(a.gueltig_bis).toLocaleDateString("de-DE")}</div>
    <div class="meta" style="font-weight:bold">Projekt: ${projekt?.name||""}</div>
    <div class="meta">${projekt?.projektnummer||""}</div>
  </div>
</div>

<div class="empfaenger">
  <div class="empfaenger-label">ANGEBOT FÜR</div>
  <strong>${a.empfaenger||"—"}</strong>
</div>

<table class="table">
  <thead>
    <tr>
      <th style="width:5%">Pos.</th>
      <th style="width:45%">Bezeichnung</th>
      <th style="width:10%">Menge</th>
      <th style="width:10%">Einheit</th>
      <th style="width:15%">EP (€)</th>
      <th style="width:15%">GP (€)</th>
    </tr>
  </thead>
  <tbody>
    ${a.positionen.map((p,i) => `
    <tr>
      <td>${i+1}</td>
      <td>${p.bez}</td>
      <td>${(p.menge||0).toLocaleString("de-DE")}</td>
      <td>${p.einheit}</td>
      <td>${(p.ep||0).toLocaleString("de-DE",{minimumFractionDigits:2})}</td>
      <td><strong>${((p.menge||0)*(p.ep||0)).toLocaleString("de-DE",{minimumFractionDigits:2})}</strong></td>
    </tr>`).join("")}
  </tbody>
</table>

<div class="summen">
  <div class="summen-row"><span>Nettobetrag</span><span>${netto.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span></div>
  ${a.rabatt > 0 ? `<div class="summen-row"><span>Rabatt ${a.rabatt}%</span><span>- ${rabattBetrag.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span></div>` : ""}
  <div class="summen-row"><span>Netto nach Rabatt</span><span>${nettoNachRabatt.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span></div>
  <div class="summen-row"><span>MwSt. ${a.mwst}%</span><span>${mwstBetrag.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span></div>
  <div class="summen-row gesamt"><span>Gesamtbetrag</span><span>${bruttoGesamt.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span></div>
</div>

<div class="footer-text">
  Dieses Angebot ist gültig bis ${new Date(a.gueltig_bis).toLocaleDateString("de-DE")}.
  Alle Preise verstehen sich zzgl. ${a.mwst}% MwSt.
  Zahlungsbedingungen: 14 Tage netto.
</div>

<div class="footer">
  <span>Erstellt mit Polaris · ${new Date().toLocaleString("de-DE")}</span>
  <span>${eigeneFirma?.name||""}</span>
</div>

</div></body></html>`;

    const win = window.open("","_blank","width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }

  function exportCSV() {
    const rows = [
      ["Pos.","Bezeichnung","Menge","Einheit","EP (€)","GP (€)"],
      ...a.positionen.map((p,i) => [
        i+1, p.bez, p.menge||0, p.einheit,
        (p.ep||0).toFixed(2), ((p.menge||0)*(p.ep||0)).toFixed(2)
      ]),
      ["","","","","Netto:", netto.toFixed(2)],
      ["","","","","MwSt "+a.mwst+"%:", mwstBetrag.toFixed(2)],
      ["","","","","GESAMT:", bruttoGesamt.toFixed(2)],
    ];
    const csv = rows.map(r => r.map(v => '"'+v+'"').join(";")).join("\n");
    const blob = new Blob(["﻿"+csv], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = ("Angebot_"+a.titel.replace(/ /g,"_")+".csv");
    link.click(); URL.revokeObjectURL(url);
  }

  // ── LV-Vorlage Auswahl als eigener Screen ──
  if (vonVorlage) {
    return (
      <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0,
        background:"var(--bg)", zIndex:700, overflowY:"auto",
        WebkitOverflowScrolling:"touch",
        fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ background:"var(--surface)", padding:"14px 18px",
          borderBottom:"3px solid var(--yellow)", position:"sticky", top:0,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ color:"var(--yellow)", fontWeight:700, fontSize:16 }}>
            📋 LV-Vorlage laden
          </div>
          <button onClick={() => setVonVorlage(false)}
            style={{ background:"var(--surface2)", border:"1px solid var(--border)",
              color:"var(--text)", borderRadius:8, padding:"6px 14px",
              cursor:"pointer", fontFamily:"inherit" }}>✕</button>
        </div>
        <div style={{ padding:"20px 16px" }}>
          {lvVorlagen.length === 0 && (
            <div style={{ color:"var(--muted)", textAlign:"center", padding:24 }}>
              Keine Vorlagen vorhanden · Administrator anlegen lassen
            </div>
          )}
          {lvVorlagen.map(v => (
            <div key={v.id} onClick={() => vorlageLaden(v)}
              style={{ background:"var(--surface)", borderRadius:12,
                padding:"12px 14px", marginBottom:8, cursor:"pointer",
                border:"1.5px solid var(--border)" }}>
              <div style={{ color:"var(--text)", fontWeight:700 }}>{v.name}</div>
              <div style={{ color:"var(--muted)", fontSize:12, marginTop:3 }}>
                {v.positionen.length} Positionen · {v.gewerk}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Aufgaben-Import als eigener Screen ──
  if (vonAufgabe) {
    return (
      <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0,
        background:"var(--bg)", zIndex:700, overflowY:"auto",
        WebkitOverflowScrolling:"touch",
        fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ background:"var(--surface)", padding:"14px 18px",
          borderBottom:"3px solid var(--green)", position:"sticky", top:0,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ color:"var(--green)", fontWeight:700, fontSize:16 }}>
            ✅ Aus Aufgaben importieren
          </div>
          <button onClick={() => setVonAufgabe(false)}
            style={{ background:"var(--surface2)", border:"1px solid var(--border)",
              color:"var(--text)", borderRadius:8, padding:"6px 14px",
              cursor:"pointer", fontFamily:"inherit" }}>✕</button>
        </div>
        <div style={{ padding:"20px 16px" }}>
          {aufgaben.length === 0 && (
            <div style={{ color:"var(--muted)", textAlign:"center", padding:24 }}>
              Keine Aufgaben vorhanden
            </div>
          )}
          {aufgaben.map(aufg => (
            <div key={aufg.id} onClick={() => aufgabeImportieren(aufg)}
              style={{ background:"var(--surface)", borderRadius:12,
                padding:"12px 14px", marginBottom:8, cursor:"pointer",
                border:"1.5px solid var(--border)",
                borderLeftWidth:4,
                borderLeftColor:AUFGABEN_TYPEN[aufg.typ]?.farbe||"var(--muted)" }}>
              <div style={{ color:"var(--text)", fontWeight:700 }}>
                {AUFGABEN_TYPEN[aufg.typ]?.icon} {aufg.titel}
              </div>
              <div style={{ color:"var(--muted)", fontSize:12, marginTop:3 }}>
                {aufg.m2 ? aufg.m2+" m²" : ""} · {AUFGABEN_TYPEN[aufg.typ]?.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background:"var(--surface)", padding:"14px 16px",
        borderBottom:"1px solid var(--border)", position:"sticky", top:0,
        zIndex:10, display:"flex", justifyContent:"space-between",
        alignItems:"center" }}>
        <button onClick={onClose}
          style={{ background:"var(--surface2)", border:"1.5px solid var(--border)",
            color:"var(--text)", borderRadius:10, padding:"7px 14px",
            cursor:"pointer", fontSize:16, fontFamily:"inherit" }}>‹</button>
        <div style={{ color:"var(--text)", fontWeight:700, fontSize:14,
          flex:1, textAlign:"center", margin:"0 10px" }}>{a.titel}</div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={exportCSV}
            style={{ background:"var(--surface2)", color:"var(--text)",
              border:"1.5px solid var(--border)", borderRadius:8,
              padding:"6px 10px", cursor:"pointer", fontSize:12,
              fontFamily:"inherit" }}>📊 CSV</button>
          <button onClick={exportPDF}
            style={{ background:"var(--yellow)", color:"#1a1200", border:"none",
              borderRadius:8, padding:"6px 12px", fontWeight:700,
              cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>📄 PDF</button>
        </div>
      </div>

      <div style={{ padding:"16px 14px 100px" }}>
        {/* Summen-Banner */}
        <div style={{ background:"#1a1a1a", borderRadius:14, padding:"14px 18px",
          marginBottom:16, display:"flex", justifyContent:"space-between",
          alignItems:"center" }}>
          <div>
            <div style={{ color:"#888", fontSize:11 }}>Angebotssumme (brutto)</div>
            <div style={{ color:"#F5C400", fontWeight:900, fontSize:26, marginTop:2 }}>
              {bruttoGesamt.toLocaleString("de-DE",{minimumFractionDigits:2})} €
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:"#888", fontSize:11 }}>Netto</div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:14 }}>
              {netto.toLocaleString("de-DE",{minimumFractionDigits:2})} €
            </div>
            <div style={{ color:"#888", fontSize:11, marginTop:2 }}>
              MwSt. {mwstBetrag.toLocaleString("de-DE",{minimumFractionDigits:2})} €
            </div>
          </div>
        </div>

        {/* Tab-Toggle */}
        <div style={{ display:"flex", gap:6, marginBottom:14 }}>
          {[["positionen","📋 Positionen"],["einstellungen","⚙️ Einstellungen"]].map(([k,l]) => (
            <button key={k} onClick={() => setAnsicht(k)}
              style={{ flex:1, background: ansicht===k ? "var(--yellow)" : "var(--surface2)",
                color: ansicht===k ? "#1a1200" : "var(--muted)",
                border:`1.5px solid ${ansicht===k ? "var(--yellow)" : "var(--border)"}`,
                borderRadius:10, padding:9, fontWeight: ansicht===k ? 700 : 400,
                cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>{l}</button>
          ))}
        </div>

        {/* POSITIONEN */}
        {ansicht === "positionen" && (
          <div>
            {/* Import-Buttons */}
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <button onClick={() => setVonVorlage(true)}
                style={{ flex:1, background:"var(--bbg)", color:"var(--blue)",
                  border:"1.5px solid var(--blue)", borderRadius:10, padding:"9px 0",
                  cursor:"pointer", fontSize:12, fontWeight:700,
                  fontFamily:"inherit" }}>📋 Aus Vorlage</button>
              <button onClick={() => setVonAufgabe(true)}
                style={{ flex:1, background:"var(--gbg)", color:"var(--green)",
                  border:"1.5px solid var(--green)", borderRadius:10, padding:"9px 0",
                  cursor:"pointer", fontSize:12, fontWeight:700,
                  fontFamily:"inherit" }}>✅ Aus Aufgaben</button>
              <button onClick={() => addPosition({ bez:"", einheit:"m²", menge:0, ep:0 })}
                style={{ flex:1, background:"var(--surface2)", color:"var(--text)",
                  border:"1.5px solid var(--border)", borderRadius:10, padding:"9px 0",
                  cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>+ Manuell</button>
            </div>

            {/* Positionen */}
            {a.positionen.length === 0 && (
              <div style={{ textAlign:"center", padding:"32px 20px", color:"var(--muted)",
                fontSize:13 }}>
                Noch keine Positionen · Aus Vorlage oder Aufgaben importieren
              </div>
            )}
            {a.positionen.map((pos, i) => (
              <div key={pos.id} style={{ background:"var(--surface)", borderRadius:12,
                padding:"12px 14px", marginBottom:8,
                border:"1.5px solid var(--border)" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:6 }}>
                  <div style={{ color:"var(--muted)", fontSize:11,
                    fontWeight:700 }}>Pos. {i+1}</div>
                  <button onClick={() => removePos(pos.id)}
                    style={{ background:"var(--rbg)", color:"var(--red)",
                      border:"none", borderRadius:6, padding:"2px 8px",
                      cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>✕</button>
                </div>
                <input value={pos.bez}
                  onChange={e=>updatePos(pos.id,"bez",e.target.value)}
                  placeholder="Bezeichnung"
                  style={{ ...inputStyle(), marginBottom:8, fontSize:13 }} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                  <div>
                    <div style={{ color:"var(--muted)", fontSize:10,
                      marginBottom:3 }}>Menge</div>
                    <input type="number" value={pos.menge||""}
                      onChange={e=>updatePos(pos.id,"menge",e.target.value)}
                      style={{ ...inputStyle(), padding:"8px 10px", fontSize:12 }} />
                  </div>
                  <div>
                    <div style={{ color:"var(--muted)", fontSize:10, marginBottom:3 }}>Einheit</div>
                    <select value={pos.einheit}
                      onChange={e=>updatePos(pos.id,"einheit",e.target.value)}
                      style={{ ...inputStyle(), padding:"8px 10px", fontSize:12 }}>
                      {["m²","m³","m","t","h","Stk","pau"].map(u=><option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ color:"var(--muted)", fontSize:10, marginBottom:3 }}>
                      EP (€/{pos.einheit})
                    </div>
                    <input type="number" value={pos.ep||""}
                      onChange={e=>updatePos(pos.id,"ep",e.target.value)}
                      style={{ ...inputStyle(), padding:"8px 10px", fontSize:12 }} />
                  </div>
                </div>
                <div style={{ textAlign:"right", marginTop:6,
                  color:"var(--yellow)", fontWeight:800, fontSize:14 }}>
                  {((pos.menge||0)*(pos.ep||0)).toLocaleString("de-DE",
                    {minimumFractionDigits:2})} €
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EINSTELLUNGEN */}
        {ansicht === "einstellungen" && (
          <div>
            {[
              ["Titel","titel","Angebot Bodenplatte"],
              ["Empfänger","empfaenger","Auftraggeber GmbH"],
            ].map(([l,k,ph]) => (
              <div key={k} style={{ marginBottom:12 }}>
                <Label>{l}</Label>
                <input value={a[k]||""} onChange={e=>setA(x=>({...x,[k]:e.target.value}))}
                  placeholder={ph} style={inputStyle()} />
              </div>
            ))}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div>
                <Label>Angebotsdatum</Label>
                <input type="date" value={a.datum}
                  onChange={e=>setA(x=>({...x,datum:e.target.value}))}
                  style={inputStyle()} />
              </div>
              <div>
                <Label>Gültig bis</Label>
                <input type="date" value={a.gueltig_bis}
                  onChange={e=>setA(x=>({...x,gueltig_bis:e.target.value}))}
                  style={inputStyle()} />
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div>
                <Label>Rabatt (%)</Label>
                <input type="number" value={a.rabatt||0}
                  onChange={e=>setA(x=>({...x,rabatt:Number(e.target.value)}))}
                  style={inputStyle()} min="0" max="100" />
              </div>
              <div>
                <Label>MwSt (%)</Label>
                <select value={a.mwst||19}
                  onChange={e=>setA(x=>({...x,mwst:Number(e.target.value)}))}
                  style={{ ...inputStyle(), padding:"11px 12px" }}>
                  <option value={19}>19% (Standard)</option>
                  <option value={7}>7% (ermäßigt)</option>
                  <option value={0}>0% (steuerbefreit)</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <Label>Status</Label>
              <select value={a.status}
                onChange={e=>setA(x=>({...x,status:e.target.value}))}
                style={{ ...inputStyle(), padding:"11px 12px" }}>
                {[["entwurf","📝 Entwurf"],["versendet","📤 Versendet"],
                  ["angenommen","✅ Angenommen"],["abgelehnt","❌ Abgelehnt"]
                ].map(([k,l])=><option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <button onClick={() => onSave(a)}
              style={{ width:"100%", background:"var(--yellow)", color:"#1a1200",
                border:"none", borderRadius:12, padding:14, fontWeight:800,
                cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>
              💾 Angebot speichern
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
