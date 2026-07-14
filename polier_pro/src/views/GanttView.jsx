import { useEffect, useRef } from "react";
import { daysBetween } from "../lib/utils.js";
import { STATUS_LABEL, STATUS_COLOR } from "../config/konstanten.js";

export function GanttView({ felder }) {
  const heute = new Date();
  const startDate = new Date(heute); startDate.setDate(startDate.getDate() - 14);
  const endDate   = new Date(heute); endDate.setDate(endDate.getDate() + 42);
  const totalDays = daysBetween(startDate.toISOString().slice(0,10), endDate.toISOString().slice(0,10));
  const scrollRef = useRef(null);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const todayOffset = daysBetween(startDate.toISOString().slice(0,10), heute.toISOString().slice(0,10));
      scrollRef.current.scrollLeft = todayOffset * 28 - 60;
    }
  }, []);

  // Generate day headers
  const days = [];
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const todayOffset = daysBetween(startDate.toISOString().slice(0,10), heute.toISOString().slice(0,10));
  const DAY_W = 28;

  return (
    <div>
      <div style={{ color: "var(--text)", fontWeight:700, marginBottom:12 }}>📅 Betonfeld-Terminplan</div>

      {/* Legend */}
      <div style={{ display:"flex", gap:12, marginBottom:12, flexWrap:"wrap" }}>
        {Object.entries(STATUS_LABEL).map(([k,v]) => (
          <div key={k} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11 }}>
            <div style={{ width:10, height:10, borderRadius:2, background: STATUS_COLOR[k] }} />
            <span style={{ color: "var(--muted)" }}>{v.split(" ")[1]}</span>
          </div>
        ))}
      </div>

      {/* Scrollable Gantt */}
      <div style={{ background:"var(--surface)", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", border:`1px solid ${'var(--border)'}` }}>
        <div ref={scrollRef} style={{ overflowX:"auto" }}>
          <div style={{ minWidth: (totalDays + 1) * DAY_W + 130 }}>

            {/* Header row */}
            <div style={{ display:"flex", borderBottom:`2px solid ${'var(--border)'}`, background: "var(--surface2)" }}>
              <div style={{ width:130, minWidth:130, padding:"8px 10px", color: "var(--muted)", fontSize:11, borderRight:`1px solid ${'var(--border)'}` }}>Feld</div>
              {days.map((d,i) => {
                const isToday = d.toDateString() === heute.toDateString();
                const isMon = d.getDay() === 1;
                const isSun = d.getDay() === 0;
                return (
                  <div key={i} style={{
                    width: DAY_W, minWidth: DAY_W, textAlign:"center", padding:"4px 0",
                    background: isToday ? "var(--yellow)"+"33" : isSun ? "var(--surface2)" : "transparent",
                    borderRight: isMon ? `1px solid ${'var(--border)'}` : "none",
                  }}>
                    {(isMon || isToday) && (
                      <div style={{ color: isToday ? "var(--yellow)" : "var(--muted)", fontSize:9, fontWeight: isToday ? 700 : 400 }}>
                        {isToday ? "●" : `${d.getDate()}.${(d.getMonth()+1).toString().padStart(2,"0")}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Felder rows */}
            {felder.map(f => {
              const startOff = daysBetween(startDate.toISOString().slice(0,10), f.geplant);
              const dur = f.dauer_tage || 1;
              const isLate = f.status !== "done" && new Date(f.geplant) < heute;
              return (
                <div key={f.id} style={{ display:"flex", alignItems:"center", borderBottom:`1px solid ${'var(--border)'}`, minHeight:40 }}>
                  <div style={{ width:130, minWidth:130, padding:"6px 10px", borderRight:`1px solid ${'var(--border)'}` }}>
                    <div style={{ color: "var(--text)", fontSize:11, fontWeight:600, lineHeight:1.2 }}>{f.name.split("–")[0].trim()}</div>
                    <div style={{ color: "var(--muted)", fontSize:10 }}>{f.m2}m²</div>
                  </div>
                  <div style={{ flex:1, position:"relative", height:40 }}>
                    {/* Today line */}
                    <div style={{ position:"absolute", left: todayOffset * DAY_W, top:0, bottom:0, width:2, background: "var(--yellow)", opacity:0.7, zIndex:10 }} />

                    {/* Bar */}
                    <div style={{
                      position:"absolute",
                      left: startOff * DAY_W + 2,
                      top: 8, height: 24,
                      width: dur * DAY_W - 4,
                      background: STATUS_COLOR[f.status],
                      borderRadius: 5,
                      opacity: 0.9,
                      display:"flex", alignItems:"center", paddingLeft:6,
                      overflow:"hidden",
                      boxShadow: isLate ? `0 0 0 2px ${'var(--red)'}` : "none",
                    }}>
                      <span style={{ color:"#fff", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>
                        {f.status === "in_progress" ? "▶ " : ""}{f.name.split("–")[1]?.trim() || f.name}
                        {isLate ? " ⚠️" : ""}
                      </span>
                    </div>

                    {/* Festigkeit indicator */}
                    {f.festigkeit && (
                      <div style={{
                        position:"absolute",
                        left: (startOff + dur) * DAY_W + 4,
                        top:14, height:12,
                        width: 32,
                        background: f.festigkeit >= 95 ? "var(--green)"+"44" : "var(--yellow)"+"44",
                        borderRadius:3, display:"flex", alignItems:"center", justifyContent:"center"
                      }}>
                        <span style={{ fontSize:9, color: "var(--text)" }}>{f.festigkeit}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Verzögerungen */}
      {felder.filter(f => f.status !== "done" && new Date(f.geplant) < heute).length > 0 && (
        <div style={{ background:"#2E1A1A", borderRadius:10, padding:14, marginTop:12 }}>
          <div style={{ color: "var(--red)", fontWeight:700, marginBottom:8 }}>⚠️ Verzögerungen</div>
          {felder.filter(f => f.status !== "done" && new Date(f.geplant) < heute).map(f => (
            <div key={f.id} style={{ color:"#FF9999", fontSize:13, marginBottom:4 }}>
              {f.name} – {daysBetween(f.geplant, heute.toISOString().slice(0,10))} Tage Verzug
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
