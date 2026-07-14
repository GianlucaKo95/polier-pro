import { useState } from "react";
import { SchnellErstellung } from "./SchnellErstellung.jsx";
import { AufgabenFormular } from "./AufgabenFormular.jsx";
import { leereAufgabe } from "../lib/utils.js";
import { FilterBtn } from "../components/FilterBtn.jsx";
import { AufgabenKarte } from "../components/AufgabenKarte.jsx";
import { AUFGABEN_STATUS, AUFGABEN_TYPEN } from "../config/konstanten.js";

export function AufgabenView({ aufgaben, setAufgaben, kolonnen, sbConnected, darfBearbeiten = true, initialFilter = "alle" }) {
  const [ansicht,     setAnsicht]     = useState("liste");  // liste | kanban
  const [filter,      setFilter]      = useState(initialFilter);
  const [neuAufgabe,  setNeuAufgabe]  = useState(false);
  const [neuMangel,   setNeuMangel]   = useState(false);
  const [editAufgabe, setEditAufgabe] = useState(null);
  const [detail,      setDetail]      = useState(null);

  const gefiltert = aufgaben.filter(a => {
    if (filter === "alle")      return true;
    if (filter === "maengel")   return a.ist_mangel;
    if (filter === "offen")     return a.status === "offen";
    if (filter === "kritisch")  return a.prioritaet === "kritisch";
    return a.typ === filter;
  });

  function handleSave(a) {
    if (editAufgabe) {
      setAufgaben(prev => prev.map(x => x.id===a.id ? a : x));
    } else {
      setAufgaben(prev => [a, ...prev]);
    }
    setNeuAufgabe(false);
    setEditAufgabe(null);
  }

  function handleSchnellSave(neueAufgaben) {
    setAufgaben(prev => [...neueAufgaben, ...prev]);
    setNeuAufgabe(false);
  }

  if (neuAufgabe) {
    return (
      <SchnellErstellung
        onSave={handleSchnellSave}
        onClose={() => setNeuAufgabe(false)}
      />
    );
  }

  if (neuMangel) {
    return (
      <AufgabenFormular
        initial={{ ...leereAufgabe(), typ:"mangel", ist_mangel:true }}
        kolonnen={kolonnen}
        onSave={handleSave}
        onClose={() => setNeuMangel(false)}
      />
    );
  }

  if (editAufgabe) {
    return (
      <AufgabenFormular
        initial={editAufgabe}
        kolonnen={kolonnen}
        onSave={handleSave}
        onClose={() => setEditAufgabe(null)}
      />
    );
  }

  function statusWechsel(id, neuerStatus) {
    setAufgaben(prev => prev.map(a =>
      a.id === id ? { ...a, status: neuerStatus } : a
    ));
  }

  const stats = {
    gesamt:        aufgaben.length,
    offen:         aufgaben.filter(a=>a.status==="offen").length,
    in_arbeit:     aufgaben.filter(a=>a.status==="in_arbeit").length,
    abgeschlossen: aufgaben.filter(a=>a.status==="abgeschlossen").length,
    maengel:       aufgaben.filter(a=>a.ist_mangel && a.status!=="abgeschlossen").length,
    ueberfaellig:  aufgaben.filter(a=>a.faellig_am &&
      new Date(a.faellig_am)<new Date() && a.status!=="abgeschlossen").length,
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)",
        gap:8, marginBottom:14 }}>
        {[
          ["Offen",       stats.offen,         "var(--muted)"],
          ["In Arbeit",   stats.in_arbeit,      "var(--yellow)"],
          ["Fertig",      stats.abgeschlossen,  "var(--green)"],
          ["Mängel",      stats.maengel,        "var(--red)"],
          ["Überfällig",  stats.ueberfaellig,   "var(--orange)"],
          ["Gesamt",      stats.gesamt,         "var(--text)"],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:"var(--surface)", borderRadius:12,
            padding:"10px 12px", border:"1.5px solid var(--border)",
            position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0,
              height:3, background:c }} />
            <div style={{ color:"var(--muted)", fontSize:10,
              fontWeight:700, textTransform:"uppercase", marginBottom:4 }}>{l}</div>
            <div style={{ color:"var(--text)", fontWeight:900,
              fontSize:22 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:10 }}>
        <div style={{ display:"flex", gap:6, overflowX:"auto" }}>
          {[
            ["alle","Alle"],
            ["maengel","⚠️ Mängel"],
            ["offen","Offen"],
            ["kritisch","Kritisch"],
            ["beton","🏗️"],
            ["schalung","🪵"],
            ["bewehrung","🔩"],
          ].map(([k,l]) => (
            <FilterBtn key={k} active={filter===k}
              onClick={() => setFilter(k)}>{l}</FilterBtn>
          ))}
        </div>
        {darfBearbeiten && (
          <button onClick={() => filter === "maengel" ? setNeuMangel(true) : setNeuAufgabe(true)}
            style={{ background: filter === "maengel" ? "var(--red)" : "var(--yellow)",
              color: filter === "maengel" ? "#fff" : "#1a1200", border:"none",
              borderRadius:10, padding:"8px 14px", fontWeight:700,
              cursor:"pointer", fontSize:13, fontFamily:"inherit",
              flexShrink:0, marginLeft:8 }}>
            {filter === "maengel" ? "+ Mangel" : "+ Aufgabe"}
          </button>
        )}
      </div>

      {/* Kanban / Liste Toggle */}
      <div style={{ display:"flex", gap:6, marginBottom:12 }}>
        {[["liste","☰ Liste"],["kanban","⊞ Kanban"]].map(([v,l]) => (
          <button key={v} onClick={() => setAnsicht(v)}
            style={{ background: ansicht===v ? "var(--surface)" : "transparent",
              color: ansicht===v ? "var(--text)" : "var(--muted)",
              border:`1px solid ${ansicht===v ? "var(--border)" : "transparent"}`,
              borderRadius:8, padding:"5px 12px", cursor:"pointer",
              fontSize:12, fontFamily:"inherit",
              fontWeight: ansicht===v ? 700 : 400 }}>{l}</button>
        ))}
      </div>

      {/* Liste */}
      {ansicht === "liste" && (
        <div>
          {gefiltert.length === 0 && (
            <div style={{ textAlign:"center", padding:"40px 20px",
              color:"var(--muted)" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>
                {filter === "maengel" ? "✅" : "✅"}
              </div>
              <div>
                {filter === "maengel" ? "Keine Mängel erfasst" : "Keine Aufgaben gefunden"}
              </div>
            </div>
          )}
          {gefiltert.map(a => (
            <AufgabenKarte key={a.id} aufgabe={a} kolonnen={kolonnen}
              onClick={() => darfBearbeiten && setEditAufgabe(a)} />
          ))}
        </div>
      )}

      {/* Kanban */}
      {ansicht === "kanban" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
          {Object.entries(AUFGABEN_STATUS).map(([statusKey, statusCfg]) => {
            const spalte = gefiltert.filter(a => a.status === statusKey);
            return (
              <div key={statusKey} style={{ background:"var(--surface2)",
                borderRadius:12, padding:10,
                border:"1px solid var(--border)" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:8 }}>
                  <div style={{ color:statusCfg.farbe, fontWeight:700, fontSize:12 }}>
                    {statusCfg.icon} {statusCfg.label}
                  </div>
                  <div style={{ background:statusCfg.bg, color:statusCfg.farbe,
                    borderRadius:10, padding:"1px 7px", fontSize:11,
                    fontWeight:700 }}>{spalte.length}</div>
                </div>
                {spalte.map(a => (
                  <div key={a.id} onClick={() => darfBearbeiten && setEditAufgabe(a)}
                    style={{ background:"var(--surface)", borderRadius:10,
                      padding:"10px 12px", marginBottom:6, cursor:"pointer",
                      borderLeft:`3px solid ${AUFGABEN_TYPEN[a.typ]?.farbe || "var(--muted)"}`,
                      boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                    <div style={{ color:"var(--text)", fontWeight:600, fontSize:12 }}>
                      {AUFGABEN_TYPEN[a.typ]?.icon} {a.titel}
                    </div>
                    {a.zustaendig && (
                      <div style={{ color:"var(--muted)", fontSize:10, marginTop:3 }}>
                        👤 {a.zustaendig}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
