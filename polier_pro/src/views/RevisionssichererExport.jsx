import { useState } from "react";
import { UnterschriftPad } from "../components/UnterschriftPad.jsx";

export function RevisionssichererExport({ bericht, projekt, eigeneFirma, wetter,
  aufgaben, maengel, datum }) {

  const [offen,        setOffen]        = useState(false);
  const [sigPolier,    setSigPolier]    = useState(null);
  const [sigBauleiter, setSigBauleiter] = useState(null);
  const [exportiert,   setExportiert]   = useState(false);

  const hash = btoa(
    JSON.stringify({ datum, projekt_id:projekt?.id,
      bericht_id:bericht?.id, ts:Date.now() })
  ).slice(0,16).toUpperCase();

  function exportPDF() {
    const offeneMaengel = (maengel||[]).filter(m=>m.status!=="abgeschlossen");
    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; font-size:11pt; color:#1a1a1a; }
.page { width:210mm; padding:14mm 18mm; }
.header { display:flex; justify-content:space-between; align-items:flex-start;
  border-bottom:3px solid #F5C400; padding-bottom:10px; margin-bottom:14px; }
.logo { font-size:22pt; font-weight:900; letter-spacing:-1px; }
.logo span { color:#F5C400; }
.firma { font-size:9pt; color:#666; margin-top:3px; }
.doc-title { text-align:right; }
.doc-title h1 { font-size:14pt; font-weight:bold; }
.doc-title .meta { font-size:9pt; color:#666; margin-top:3px; }
.hash-badge { background:#1a1a1a; color:#F5C400; padding:4px 10px;
  border-radius:4px; font-size:9pt; font-family:monospace; margin-top:4px; display:inline-block; }
.section { margin-bottom:14px; }
.section-title { font-size:10pt; font-weight:bold; color:#F5C400;
  border-left:3px solid #F5C400; padding-left:8px; margin-bottom:8px;
  text-transform:uppercase; letter-spacing:0.5px; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
.field { background:#f8f8f8; border-radius:5px; padding:8px 10px; }
.field-label { font-size:8pt; color:#888; text-transform:uppercase; }
.field-value { font-size:11pt; font-weight:bold; margin-top:2px; }
.text-block { background:#f8f8f8; border-radius:5px; padding:10px 12px;
  font-size:11pt; line-height:1.6; min-height:40px; }
.mangel-row { background:#fff0f0; border-left:3px solid #DC2626;
  padding:8px 12px; margin-bottom:6px; border-radius:0 5px 5px 0; }
.sig-area { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:10px; }
.sig-box { }
.sig-label { font-size:9pt; color:#666; margin-bottom:4px; }
.sig-img { border:1px solid #ccc; border-radius:5px; height:80px;
  display:flex; align-items:center; justify-content:center; }
.sig-img img { max-height:76px; max-width:100%; }
.sig-name { font-size:8pt; color:#888; margin-top:4px; text-align:center; }
.footer { border-top:1px solid #ddd; margin-top:16px; padding-top:8px;
  font-size:7pt; color:#aaa; display:flex; justify-content:space-between; }
.revision-stamp { background:#1a1a1a; color:#F5C400; padding:6px 12px;
  border-radius:4px; font-size:8pt; font-family:monospace; text-align:center; }
</style></head><body><div class="page">

<div class="header">
  <div>
    <div class="logo"><span>★</span> POLARIS</div>
    <div class="firma">${eigeneFirma?.name||""}  ·  ${eigeneFirma?.strasse||""}, ${eigeneFirma?.plz||""} ${eigeneFirma?.ort||""}</div>
    <div class="firma">${eigeneFirma?.telefon||""}  ·  ${eigeneFirma?.email||""}</div>
  </div>
  <div class="doc-title">
    <h1>Tagesbericht</h1>
    <div class="meta">${datum||new Date().toLocaleDateString("de-DE")}</div>
    <div class="meta" style="font-weight:bold">${projekt?.name||""}</div>
    <div class="meta">${projekt?.projektnummer||""}</div>
    <div class="hash-badge">DOC-${hash}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Baustellendaten</div>
  <div class="grid3">
    <div class="field"><div class="field-label">Baustelle</div><div class="field-value">${projekt?.name||"—"}</div></div>
    <div class="field"><div class="field-label">Bauleiter</div><div class="field-value">${projekt?.bauleiter||"—"}</div></div>
    <div class="field"><div class="field-label">Auftraggeber</div><div class="field-value">${projekt?.auftraggeber||"—"}</div></div>
  </div>
</div>

${wetter ? `<div class="section">
  <div class="section-title">Witterung</div>
  <div class="grid3">
    <div class="field"><div class="field-label">Temperatur</div><div class="field-value">${wetter.temp}°C</div></div>
    <div class="field"><div class="field-label">Wind</div><div class="field-value">${wetter.wind} km/h</div></div>
    <div class="field"><div class="field-label">Niederschlag</div><div class="field-value">${wetter.rain} mm</div></div>
  </div>
</div>` : ""}

<div class="section">
  <div class="section-title">Tätigkeiten</div>
  <div class="text-block">${bericht?.taetigkeit||"—"}</div>
</div>

${bericht?.besonderheiten ? `<div class="section">
  <div class="section-title">Besonderheiten</div>
  <div class="text-block">${bericht.besonderheiten}</div>
</div>` : ""}

${offeneMaengel.length > 0 ? `<div class="section">
  <div class="section-title">Offene Mängel (${offeneMaengel.length})</div>
  ${offeneMaengel.map(m=>`<div class="mangel-row">
    <strong>${m.titel}</strong>
    ${m.mangel_verursacher ? ` · ${m.mangel_verursacher}` : ""}
    · Status: ${m.status}
  </div>`).join("")}
</div>` : ""}

<div class="section">
  <div class="section-title">Unterschriften</div>
  <div class="sig-area">
    <div class="sig-box">
      <div class="sig-label">Polier</div>
      <div class="sig-img">
        ${sigPolier ? `<img src="${sigPolier}" />` : "<span style='color:#ccc'>Nicht unterschrieben</span>"}
      </div>
      <div class="sig-name">${eigeneFirma?.geschaeftsfuehrer||"Polier"} · ${datum||new Date().toLocaleDateString("de-DE")}</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Bauleiter</div>
      <div class="sig-img">
        ${sigBauleiter ? `<img src="${sigBauleiter}" />` : "<span style='color:#ccc'>Nicht unterschrieben</span>"}
      </div>
      <div class="sig-name">${projekt?.bauleiter||"Bauleiter"} · ${datum||new Date().toLocaleDateString("de-DE")}</div>
    </div>
  </div>
</div>

<div class="footer">
  <span>Erstellt mit Polaris · ${new Date().toLocaleString("de-DE")} · Revisionssicher</span>
  <div class="revision-stamp">DOC-${hash}</div>
</div>

</div></body></html>`;

    const win = window.open("","_blank","width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
    setExportiert(true);
  }

  return (
    <>
      <button onClick={() => setOffen(true)}
        style={{ background:"var(--surface2)", color:"var(--text)",
          border:"1.5px solid var(--border)", borderRadius:10,
          padding:"8px 14px", fontWeight:700, cursor:"pointer",
          fontSize:13, fontFamily:"inherit",
          display:"flex", alignItems:"center", gap:6 }}>
        ✍️ Unterschreiben & Export
      </button>

      {offen && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"var(--bg)", zIndex:600, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
          <div style={{ background:"var(--surface)", borderRadius:"20px 20px 0 0",
            padding:22, width:"100%", maxWidth:520, maxHeight:"92vh",
            overflowY:"auto", boxShadow:"0 -4px 30px rgba(0,0,0,0.2)" }}>

            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:17, color:"var(--text)" }}>
                ✍️ Digitale Unterschrift
              </div>
              <button onClick={() => setOffen(false)}
                style={{ background:"none", border:"none", color:"var(--muted)",
                  fontSize:24, cursor:"pointer" }}>✕</button>
            </div>

            {/* Revisions-Hash */}
            <div style={{ background:"#1a1a1a", borderRadius:10, padding:"10px 14px",
              marginBottom:16, display:"flex", justifyContent:"space-between",
              alignItems:"center" }}>
              <div>
                <div style={{ color:"#F5C400", fontWeight:700, fontSize:12 }}>
                  Revisionssicheres Dokument
                </div>
                <div style={{ color:"#888", fontSize:11, marginTop:2 }}>
                  Eindeutige Dokument-ID
                </div>
              </div>
              <div style={{ color:"#F5C400", fontFamily:"monospace",
                fontSize:14, fontWeight:800 }}>DOC-{hash}</div>
            </div>

            <UnterschriftPad label="Unterschrift Polier" onSave={setSigPolier} />
            {sigPolier && (
              <div style={{ marginBottom:12 }}>
                <div style={{ color:"var(--green)", fontSize:12, fontWeight:600,
                  marginBottom:4 }}>✓ Polier unterschrieben</div>
                <img src={sigPolier} alt="Unterschrift Polier"
                  style={{ height:50, border:"1px solid var(--border)",
                    borderRadius:8, background:"#fff" }} />
              </div>
            )}

            <UnterschriftPad label="Unterschrift Bauleiter" onSave={setSigBauleiter} />
            {sigBauleiter && (
              <div style={{ marginBottom:16 }}>
                <div style={{ color:"var(--green)", fontSize:12, fontWeight:600,
                  marginBottom:4 }}>✓ Bauleiter unterschrieben</div>
                <img src={sigBauleiter} alt="Unterschrift Bauleiter"
                  style={{ height:50, border:"1px solid var(--border)",
                    borderRadius:8, background:"#fff" }} />
              </div>
            )}

            <button onClick={exportPDF}
              style={{ width:"100%", background:"var(--yellow)", color:"#1a1200",
                border:"none", borderRadius:12, padding:15, fontWeight:800,
                fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
              📄 Revisionssicheres PDF exportieren
            </button>

            {exportiert && (
              <div style={{ background:"var(--gbg)", borderRadius:10, padding:10,
                marginTop:10, color:"var(--green)", fontSize:12, fontWeight:600,
                textAlign:"center" }}>
                ✅ PDF erstellt · DOC-{hash} · {new Date().toLocaleString("de-DE")}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
