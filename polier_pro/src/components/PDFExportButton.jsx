import { druckePDF, buildBerichtHTML, buildBetonprotokollHTML } from "../lib/pdf.jsx";

export function PDFExportButton({ bericht, feld, projekt, eigeneFirma, wetter, kolonnen, typ = "bericht" }) {
  function handleExport() {
    if (typ === "bericht") {
      const b = { ...bericht, kolonnen: kolonnen || [] };
      druckePDF(buildBerichtHTML(b, projekt, eigeneFirma, wetter), `Bautagebuch_${bericht.datum}.pdf`);
    } else {
      druckePDF(buildBetonprotokollHTML(feld, projekt, eigeneFirma, wetter), `Betonierprotokoll_${feld?.name}.pdf`);
    }
  }
  return (
    <button onClick={handleExport}
      style={{ background: "var(--red)", color:"#fff", border:"none", borderRadius:8,
        padding:"6px 14px", fontWeight:700, cursor:"pointer", fontSize:13,
        display:"flex", alignItems:"center", gap:6 }}>
      📄 PDF
    </button>
  );
}
