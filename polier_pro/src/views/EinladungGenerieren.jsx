import { useState } from "react";
import { sbClientMitToken } from "../lib/supabase.js";
import { Label, inputStyle } from "../components/Label.jsx";
import { ROLLEN } from "../config/konstanten.js";

export function EinladungGenerieren({ session, firmaId, kolonnen }) {
  const [rolle,      setRolle]      = useState("facharbeiter");
  const [kolonneId,  setKolonneId]  = useState("");
  const [email,      setEmail]      = useState("");
  const [tage,       setTage]       = useState(7);
  const [link,       setLink]       = useState("");
  const [laden,      setLaden]      = useState(false);
  const [fehler,     setFehler]     = useState("");

  async function generieren() {
    if (!firmaId) {
      setFehler("Firma konnte nicht ermittelt werden. Bitte Seite neu laden und erneut versuchen.");
      return;
    }
    setLaden(true); setFehler("");
    try {
      const client = sbClientMitToken(session);
      const { data, error } = await client.from("einladungen").insert({
        firma_id:     firmaId,
        rolle,
        kolonne_id:   kolonneId || null,
        email:        email || null,
        läuft_ab_at:  new Date(Date.now() + tage * 86400000).toISOString(),
        max_nutzungen: 1,
      }).select();
      if (error) {
        setFehler(`Einladung konnte nicht erstellt werden: ${error.message?.slice(0,150) || "Unbekannter Fehler"}`);
        setLaden(false);
        return;
      }
      if (data?.[0]?.token) {
        const baseUrl = window.location.origin;
        setLink(`${baseUrl}?einladung=${data[0].token}`);
      } else {
        setFehler("Einladung wurde nicht erstellt — keine Rückmeldung vom Server.");
      }
    } catch (e) {
      setFehler("Netzwerkfehler beim Erstellen der Einladung: " + e.message);
    }
    setLaden(false);
  }

  function kopieren() {
    navigator.clipboard.writeText(link);
  }

  return (
    <div style={{ background:"var(--surface)", borderRadius:16, padding:20,
      border:"1.5px solid var(--border)", marginBottom:16 }}>
      <div style={{ fontWeight:700, fontSize:14, color:"var(--text)",
        marginBottom:16 }}>👥 Mitarbeiter einladen</div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10,
        marginBottom:14 }}>
        <div>
          <Label>Rolle</Label>
          <select value={rolle} onChange={e => setRolle(e.target.value)}
            style={{ ...inputStyle(), padding:"10px 12px" }}>
            {Object.entries(ROLLEN).map(([k,r]) => (
              <option key={k} value={k}>{r.icon} {r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Gültig (Tage)</Label>
          <select value={tage} onChange={e => setTage(Number(e.target.value))}
            style={{ ...inputStyle(), padding:"10px 12px" }}>
            {[1,3,7,14,30].map(d => (
              <option key={d} value={d}>{d} Tage</option>
            ))}
          </select>
        </div>
      </div>

      {kolonnen?.length > 0 && (rolle === "vorarbeiter" || rolle === "facharbeiter") && (
        <div style={{ marginBottom:14 }}>
          <Label>Kolonne (optional)</Label>
          <select value={kolonneId} onChange={e => setKolonneId(e.target.value)}
            style={{ ...inputStyle(), padding:"10px 12px" }}>
            <option value="">Keine Zuordnung</option>
            {kolonnen.map(k => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginBottom:14 }}>
        <Label>E-Mail vorausfüllen (optional)</Label>
        <input type="email" value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="mitarbeiter@firma.de" style={inputStyle()} />
      </div>

      {fehler && (
        <div style={{ background:"var(--rbg)", color:"var(--red)", borderRadius:10,
          padding:"10px 14px", marginBottom:12, fontSize:12,
          border:"1px solid var(--red)" }}>
          ❌ {fehler}
        </div>
      )}

      <button onClick={generieren} disabled={laden}
        style={{ width:"100%", background:"var(--yellow)", color:"#1a1200",
          border:"none", borderRadius:10, padding:12, fontWeight:700,
          cursor:"pointer", fontFamily:"inherit", fontSize:14 }}>
        {laden ? "⏳…" : "🔗 Einladungslink generieren"}
      </button>

      {link && (
        <div style={{ marginTop:14 }}>
          <Label>Einladungslink</Label>
          <div style={{ display:"flex", gap:8, marginTop:6 }}>
            <div style={{ flex:1, background:"var(--surface2)",
              borderRadius:10, padding:"10px 12px", fontSize:11,
              color:"var(--text2)", wordBreak:"break-all",
              border:"1px solid var(--border)" }}>
              {link}
            </div>
            <button onClick={kopieren}
              style={{ background:"var(--green)", color:"#fff", border:"none",
                borderRadius:10, padding:"0 14px", cursor:"pointer",
                fontSize:16, flexShrink:0 }}>
              📋
            </button>
          </div>
          <div style={{ color:"var(--muted)", fontSize:11, marginTop:6 }}>
            Link per WhatsApp, E-Mail oder QR-Code teilen.
          </div>
        </div>
      )}
    </div>
  );
}
