import { useState, useEffect, useRef } from "react";

// ─── Design Tokens ───────────────────────────────────────────────────────────
// ─── Design Tokens ───────────────────────────────────────────────────────────
// Automatischer Dark/Light Mode via CSS-Variablen
// Injiziere :root Styles in den DOM
(function injectTheme() {
  if (document.getElementById("polaris-theme")) return;
  const style = document.createElement("style");
  style.id = "polaris-theme";
  style.textContent = `
    :root {
      --bg:      #DDE1E8;
      --surface: #FFFFFF;
      --surface2:#EEF1F6;
      --border:  rgba(0,0,0,0.10);
      --border2: rgba(0,0,0,0.16);
      --text:    #0B1120;
      --text2:   #3A4560;
      --muted:   #7A8499;
      --yellow:  #F5C400;
      --ydark:   #A07800;
      --ybg:     #FFF8DC;
      --green:   #15803D;
      --gbg:     #DCFCE7;
      --red:     #B91C1C;
      --rbg:     #FEE2E2;
      --blue:    #1D4ED8;
      --bbg:     #DBEAFE;
      --orange:  #C2410C;
      --obg:     #FFEDD5;
      --radius:  14px;
      --radius-sm: 10px;
      --radius-lg: 20px;
    }
    [data-theme="dark"] {
      --bg:      #0B1120;
      --surface: #161F30;
      --surface2:#1E2A3F;
      --border:  rgba(255,255,255,0.08);
      --border2: rgba(255,255,255,0.14);
      --text:    #F0F4FF;
      --text2:   #8B9EC8;
      --muted:   #4A5878;
      --ydark:   #F5C400;
      --ybg:     #1A1500;
      --gbg:     #052e16;
      --rbg:     #450a0a;
      --bbg:     #0f1f4a;
      --obg:     #2a1200;
    }
    * { box-sizing: border-box; }
    body {
      background: var(--bg) !important;
      color: var(--text) !important;
      transition: background 0.25s, color 0.25s;
    }
  `;
  document.head.appendChild(style);
})();

// Token-Shorthand für inline styles
const C = {
  bg:         "var(--bg)",
  bgMid:      "var(--surface)",
  bgLight:    "var(--surface2)",
  bgFaint:    "var(--border)",
  gelb:       "var(--yellow)",
  gelbDark:   "var(--ydark)",
  gelbLight:  "var(--ybg)",
  gruen:      "var(--green)",
  gruenLight: "var(--gbg)",
  rot:        "var(--red)",
  rotLight:   "var(--rbg)",
  rost:       "var(--orange)",
  rostLight:  "var(--obg)",
  blau:       "var(--blue)",
  blauLight:  "var(--bbg)",
  text:       "var(--text)",
  textMed:    "var(--text2)",
  muted:      "var(--muted)",
  betonLight: "var(--text2)",
  beton:      "var(--muted)",
  // Raw hex für spezifische Einsatzzwecke
  _yellow:    "#F5C400",
  _green:     "#15803D",
  _red:       "#B91C1C",
  _blue:      "#1D4ED8",
};

// ─── Supabase Config ─────────────────────────────────────────────────────────
// Ersetze diese Werte mit deinen echten Supabase-Credentials
const SUPABASE_URL = "https://DEIN-PROJEKT.supabase.co";
const SUPABASE_ANON_KEY = "DEIN-ANON-KEY";

async function sbFetch(path, opts = {}) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
        ...opts.headers,
      },
      ...opts,
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Fallback Mock Data (wenn Supabase nicht konfiguriert) ───────────────────
const MOCK_FELDER = [
  { id: 1, name: "A1 – Fundament Nord",    status: "done",        m2: 48,  geplant: "2025-06-10", betoniert: "2025-06-10", dauer_tage: 1, festigkeit: 98 },
  { id: 2, name: "A2 – Fundament Ost",     status: "done",        m2: 52,  geplant: "2025-06-12", betoniert: "2025-06-12", dauer_tage: 1, festigkeit: 87 },
  { id: 3, name: "B1 – Bodenplatte Mitte", status: "in_progress", m2: 120, geplant: "2025-06-22", betoniert: null,         dauer_tage: 2, festigkeit: null },
  { id: 4, name: "B2 – Bodenplatte West",  status: "planned",     m2: 135, geplant: "2025-06-25", betoniert: null,         dauer_tage: 2, festigkeit: null },
  { id: 5, name: "C1 – Wand EG Nord",      status: "planned",     m2: 64,  geplant: "2025-07-01", betoniert: null,         dauer_tage: 1, festigkeit: null },
  { id: 6, name: "C2 – Wand EG Ost",       status: "planned",     m2: 60,  geplant: "2025-07-03", betoniert: null,         dauer_tage: 1, festigkeit: null },
  { id: 7, name: "D1 – Decke EG",          status: "blocked",     m2: 280, geplant: "2025-07-10", betoniert: null,         dauer_tage: 3, festigkeit: null },
];

const MOCK_KOLONNEN = [
  { id: 1, name: "Kolonne Huber", vorarbeiter: "Thomas Huber", einsatz: "B1 – Bodenplatte Mitte", stunden: 7.5,
    mitarbeiter: [
      { id: 101, name: "Thomas Huber",   rolle: "Vorarbeiter", erfasstIdent: null },
      { id: 102, name: "Klaus Bauer",    rolle: "Facharbeiter", erfasstIdent: null },
      { id: 103, name: "Ali Yilmaz",     rolle: "Facharbeiter", erfasstIdent: null },
      { id: 104, name: "Stefan Müller",  rolle: "Helfer",       erfasstIdent: null },
    ]
  },
  { id: 2, name: "Kolonne Meier", vorarbeiter: "Maria Meier", einsatz: "Schalung C1", stunden: 8,
    mitarbeiter: [
      { id: 201, name: "Maria Meier",    rolle: "Vorarbeiter", erfasstIdent: null },
      { id: 202, name: "Peter Schmidt",  rolle: "Facharbeiter", erfasstIdent: null },
      { id: 203, name: "Jan Fischer",    rolle: "Facharbeiter", erfasstIdent: null },
    ]
  },
  { id: 3, name: "Kolonne Schmidt", vorarbeiter: "Hans Schmidt", einsatz: "Bewehrung B2", stunden: 6,
    mitarbeiter: [
      { id: 301, name: "Hans Schmidt",   rolle: "Vorarbeiter", erfasstIdent: null },
      { id: 302, name: "Ozan Demir",     rolle: "Facharbeiter", erfasstIdent: null },
      { id: 303, name: "Felix Wagner",   rolle: "Facharbeiter", erfasstIdent: null },
      { id: 304, name: "Lukas Brand",    rolle: "Facharbeiter", erfasstIdent: null },
      { id: 305, name: "Max Richter",    rolle: "Helfer",       erfasstIdent: null },
    ]
  },
];

const MOCK_BERICHTE = [
  { id: 1, datum: "22.06.2025", wetter: "☀️ 14°C", arbeiter: 12, taetigkeit: "Betonage B1 gestartet, 60m² abgeschlossen. Schalung C1 aufgebaut.", maengel: 0 },
  { id: 2, datum: "21.06.2025", wetter: "⛅ 13°C", arbeiter: 10, taetigkeit: "Bewehrungsarbeiten B1 abgeschlossen. Betonierplan freigegeben.",      maengel: 1 },
  { id: 3, datum: "20.06.2025", wetter: "🌧️ 9°C",  arbeiter: 8,  taetigkeit: "Schlechtwettertag. Nur Innenarbeiten. Schalung A2 ausgeschalt.",      maengel: 0 },
];

// ─── Wetter Utilities ────────────────────────────────────────────────────────
const WMO_ICONS = {
  0:"☀️",1:"🌤️",2:"⛅",3:"☁️",
  45:"🌫️",48:"🌫️",
  51:"🌦️",53:"🌦️",55:"🌧️",
  61:"🌧️",63:"🌧️",65:"🌧️",
  71:"🌨️",73:"🌨️",75:"❄️",
  80:"🌦️",81:"🌧️",82:"⛈️",
  95:"⛈️",96:"⛈️",99:"⛈️",
};
function wmoIcon(code) { return WMO_ICONS[code] || "🌡️"; }

function betonCheck(w) {
  const warn = [];
  if (!w) return warn;
  if (w.temp < 5)    warn.push("🚫 Temperatur unter 5°C – Frostschutzmaßnahmen erforderlich");
  if (w.temp > 30)   warn.push("⚠️ Hitze über 30°C – Nachbehandlung intensivieren");
  if (w.wind > 40)   warn.push("🚫 Wind über 40 km/h – Betonage nicht empfohlen");
  if (w.rain > 5)    warn.push("🚫 Starkregen – Betonage stoppen");
  if (w.humidity>90) warn.push("⚠️ Sehr hohe Luftfeuchtigkeit");
  return warn;
}

// ─── Gantt Utilities ─────────────────────────────────────────────────────────
function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d;
}
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}
function fmt(dateStr) {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")}`;
}

// ─── Status Helpers ───────────────────────────────────────────────────────────
const STATUS_COLOR = { done:"#16A34A", in_progress:"#F5C400", planned:"#64748B", blocked:"#DC2626" };
const STATUS_BG    = { done:"#DCFCE7",  in_progress:"#FFF3CC",  planned:"#F1F5F9",   blocked:"#FEE2E2" };
const STATUS_LABEL = { done:"✅ Fertig", in_progress:"🔄 Läuft", planned:"📅 Geplant", blocked:"🚫 Blockiert" };

// ════════════════════════════════════════════════════════════════════════════
// WEATHER COMPONENT (Open-Meteo API)
// ════════════════════════════════════════════════════════════════════════════
function WeatherView({ compact = false }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loc, setLoc] = useState({ lat: 48.137, lon: 11.576, name: "München" });

  useEffect(() => {
    fetchWeather(loc.lat, loc.lon);
  }, [loc.lat, loc.lon]);

  async function fetchWeather(lat, lon) {
    setLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
        + `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code`
        + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code`
        + `&timezone=Europe%2FBerlin&forecast_days=7`;
      const res = await fetch(url);
      const data = await res.json();
      const cur = data.current;
      setWeather({
        temp:     Math.round(cur.temperature_2m),
        humidity: cur.relative_humidity_2m,
        rain:     cur.precipitation,
        wind:     Math.round(cur.wind_speed_10m),
        icon:     wmoIcon(cur.weather_code),
        forecast: data.daily.time.slice(0,7).map((day,i) => ({
          day:  ["So","Mo","Di","Mi","Do","Fr","Sa"][new Date(day).getDay()],
          date: day,
          max:  Math.round(data.daily.temperature_2m_max[i]),
          min:  Math.round(data.daily.temperature_2m_min[i]),
          rain: data.daily.precipitation_sum[i],
          icon: wmoIcon(data.daily.weather_code[i]),
        })),
      });
    } catch (e) {
      setWeather(null);
    }
    setLoading(false);
  }

  const warn = betonCheck(weather);
  const ok = warn.length === 0;

  if (loading) return (
    <div style={{ background: "var(--surface)", borderRadius: 12, padding: 20, textAlign:"center", color: "var(--muted)" }}>
      ⏳ Wetterdaten werden geladen…
    </div>
  );

  if (!weather) return (
    <div style={{ background: "var(--surface)", borderRadius: 12, padding: 20, textAlign:"center", color: "var(--red)" }}>
      ❌ Wetterdaten nicht verfügbar
    </div>
  );

  if (compact) return (
    <div style={{ background: "var(--surface)", borderRadius: 12, padding: "14px 16px", border: `1px solid ${ok ? "var(--green)" : "var(--orange)"}`, marginBottom: 14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ color: "var(--muted)", fontSize: 11, textTransform:"uppercase", letterSpacing:1 }}>{loc.name}</div>
          <div style={{ color: "var(--text)", fontSize: 26, fontWeight: 700 }}>{weather.icon} {weather.temp}°C</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>💨 {weather.wind} km/h · 💧 {weather.humidity}% · 🌧️ {weather.rain}mm</div>
        </div>
        <div style={{ background: ok ? "var(--green)" : "var(--orange)", color:"#fff", borderRadius:8, padding:"8px 14px", fontWeight:700, fontSize:13, textAlign:"center" }}>
          {ok ? "✅ Betonage\nmöglich" : "⚠️ Prüfen"}
        </div>
      </div>
      {warn.length > 0 && (
        <div style={{ background:"#3A1A1A", borderRadius:8, padding:"8px 12px", marginTop:10 }}>
          {warn.map((w,i) => <div key={i} style={{ color:"#FF9999", fontSize:12 }}>{w}</div>)}
        </div>
      )}
      <div style={{ display:"flex", gap:6, marginTop:10, overflowX:"auto" }}>
        {weather.forecast.map((f,i) => (
          <div key={i} style={{ minWidth:52, background: "var(--surface2)", borderRadius:12, padding:"8px 4px", textAlign:"center",
            border: betonCheck({temp:f.max,wind:0,rain:f.rain,humidity:70}).length > 0
              ? `2px solid ${'var(--red)'}` : `1px solid ${'var(--border)'}` }}>
            <div style={{ color: "var(--muted)", fontSize:10 }}>{f.day}</div>
            <div style={{ fontSize:16 }}>{f.icon}</div>
            <div style={{ color: "var(--text)", fontSize:11, fontWeight:600 }}>{f.max}°</div>
            {f.rain > 0 && <div style={{ color:"#6CA8FF", fontSize:10 }}>{f.rain}mm</div>}
          </div>
        ))}
      </div>
    </div>
  );

  // Full weather view
  return (
    <div>
      <div style={{ background: "var(--surface)", borderRadius:12, padding:18, border:`1px solid ${ok ? "var(--green)" : "var(--orange)"}`, marginBottom:14 }}>
        <div style={{ color: "var(--muted)", fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>📍 {loc.name} · Live-Wetter</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color: "var(--text)", fontSize:42, fontWeight:800 }}>{weather.icon} {weather.temp}°C</div>
            <div style={{ color: "var(--muted)", fontSize:13, marginTop:4 }}>
              💨 {weather.wind} km/h Wind &nbsp;|&nbsp; 💧 {weather.humidity}% Feuchte &nbsp;|&nbsp; 🌧️ {weather.rain} mm
            </div>
          </div>
        </div>
        <div style={{ background: ok ? "#1A3A28" : "#3A1A1A", borderRadius:10, padding:14, marginTop:14 }}>
          <div style={{ color: ok ? "var(--green)" : "var(--red)", fontWeight:700, fontSize:15, marginBottom: warn.length ? 8 : 0 }}>
            {ok ? "✅ Betonage heute möglich" : "🚫 Betonage eingeschränkt"}
          </div>
          {warn.map((w,i) => <div key={i} style={{ color:"#FF9999", fontSize:13, marginTop:4 }}>{w}</div>)}
        </div>
      </div>

      {/* Checkliste */}
      <div style={{ background: "var(--surface)", borderRadius:12, padding:16, marginBottom:14 }}>
        <div style={{ color: "var(--yellow)", fontWeight:700, marginBottom:12 }}>🧱 Betonier-Checkliste</div>
        {[
          ["Temperatur",    `${weather.temp}°C`,        weather.temp >= 5 && weather.temp <= 30, "5°C – 30°C"],
          ["Wind",          `${weather.wind} km/h`,     weather.wind <= 40,                      "max. 40 km/h"],
          ["Niederschlag",  `${weather.rain} mm`,       weather.rain <= 5,                       "max. 5 mm"],
          ["Luftfeuchte",   `${weather.humidity}%`,     weather.humidity <= 90,                  "max. 90%"],
        ].map(([k,v,ok,limit]) => (
          <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${'var(--border)'}` }}>
            <div>
              <div style={{ color: "var(--text2)", fontSize:14 }}>{k}</div>
              <div style={{ color: "var(--muted)", fontSize:11 }}>Grenzwert: {limit}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ color: "var(--text)", fontWeight:700 }}>{v}</span>
              <span style={{ fontSize:18 }}>{ok ? "✅" : "🚫"}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 7-Tage */}
      <div style={{ background: "var(--surface)", borderRadius:12, padding:16 }}>
        <div style={{ color: "var(--yellow)", fontWeight:700, marginBottom:12 }}>📅 7-Tage Betonierplan</div>
        {weather.forecast.map((f,i) => {
          const dayWarn = betonCheck({ temp:f.max, wind:30, rain:f.rain, humidity:70 });
          const dayOk = dayWarn.length === 0;
          return (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"10px 12px", borderRadius:8, marginBottom:6,
              background: dayOk ? "#1A2E1E" : "#2E1A1A",
              border: `1px solid ${dayOk ? "var(--green)" : "var(--red)"}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:20 }}>{f.icon}</span>
                <div>
                  <div style={{ color: "var(--text)", fontWeight:600, fontSize:13 }}>{f.day} · {new Date(f.date).getDate()}.{(new Date(f.date).getMonth()+1).toString().padStart(2,"0")}.</div>
                  <div style={{ color: "var(--muted)", fontSize:11 }}>{f.min}° – {f.max}° · {f.rain > 0 ? `🌧️ ${f.rain}mm` : "kein Regen"}</div>
                </div>
              </div>
              <div style={{ color: dayOk ? "var(--green)" : "var(--red)", fontWeight:700, fontSize:12 }}>
                {dayOk ? "✅ OK" : "🚫 Nein"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// GANTT CHART
// ════════════════════════════════════════════════════════════════════════════
function GanttView({ felder }) {
  const heute = new Date("2025-06-22");
  const startDate = new Date("2025-06-08");
  const endDate = new Date("2025-07-20");
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

// ════════════════════════════════════════════════════════════════════════════
// SUPABASE STATUS + SETUP
// ════════════════════════════════════════════════════════════════════════════
function SupabaseStatus({ connected }) {
  return (
    <div style={{ background: connected ? "var(--gbg)" : "var(--surface2)", borderRadius:10, padding:"10px 14px",
      border:`1.5px solid ${connected ? "var(--green)" : "var(--border)"}`, marginBottom:14,
      display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ color: connected ? "var(--green)" : "var(--muted)", fontWeight:700, fontSize:12 }}>
          {connected ? "🟢 Supabase verbunden" : "⚫ Supabase nicht konfiguriert"}
        </div>
        <div style={{ color: "var(--muted)", fontSize:10 }}>
          {connected ? "Echtzeit-Daten aktiv" : "Mock-Daten werden angezeigt"}
        </div>
      </div>
      {!connected && (
        <div style={{ color: "var(--yellow)", fontSize:11, textAlign:"right" }}>
          URL + Key<br/>eintragen →
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BETONFELDER (mit Supabase)
// ════════════════════════════════════════════════════════════════════════════
// ─── Unterfeld-Schnellanlage Modal ──────────────────────────────────────────
function UnterfeldSchnellanlage({ parent, onAdd, onClose }) {
  const [praefix, setPraefix] = useState(parent.name.split(" ")[0] || "F");
  const [datum,   setDatum]   = useState(parent.geplant || "");
  const [modus,   setModus]   = useState("gleich"); // "gleich" | "einzeln"
  const [stdM2,   setStdM2]   = useState(30);
  const [felder,  setFelder]  = useState([
    { name: `${parent.name.split(" ")[0] || "F"}-01`, m2: 30, datum: parent.geplant || "" },
    { name: `${parent.name.split(" ")[0] || "F"}-02`, m2: 80, datum: parent.geplant || "" },
    { name: `${parent.name.split(" ")[0] || "F"}-03`, m2: 40, datum: parent.geplant || "" },
  ]);

  const totalM2 = modus === "gleich"
    ? felder.length * stdM2
    : felder.reduce((s, f) => s + (Number(f.m2) || 0), 0);

  const elternM2 = parent.m2 || 0;
  const diffM2   = elternM2 - totalM2;
  const diffOk   = Math.abs(diffM2) < 1;

  function updateFeld(i, key, val) {
    setFelder(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
  }

  function addFeld() {
    const nr = String(felder.length + 1).padStart(2, "0");
    setFelder(prev => [...prev, { name: `${praefix}-${nr}`, m2: stdM2, datum }]);
  }

  function removeFeld(i) {
    setFelder(prev => prev.filter((_, idx) => idx !== i));
  }

  // Wenn Präfix ändert → alle Namen aktualisieren
  function updatePraefix(val) {
    setPraefix(val);
    setFelder(prev => prev.map((f, i) => ({ ...f, name: `${val}-${String(i+1).padStart(2,"0")}` })));
  }

  // Wenn Modus auf "gleich" → stdM2 auf alle anwenden
  function switchModus(m) {
    setModus(m);
    if (m === "gleich") setFelder(prev => prev.map(f => ({ ...f, m2: stdM2 })));
  }

  function anlegen() {
    const neu = felder.map((f, i) => ({
      id:              Date.now() + i,
      name:            f.name,
      m2:              modus === "gleich" ? stdM2 : (Number(f.m2) || 0),
      geplant:         f.datum || datum,
      dauer_tage:      1,
      bewehrung:       parent.bewehrung || "",
      abhaengigkeiten: [],
      status:          "planned",
      festigkeit:      null,
      betoniert:       null,
      parentId:        parent.id,
      gewerk:          parent.gewerk || "",
    }));
    onAdd(neu);
    onClose();
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:400,
      display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background: "var(--surface)", borderRadius:"16px 16px 0 0", padding:20,
        width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:16 }}>⚡ Unterfelder Schnellanlage</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color: "var(--muted)", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ color: "var(--muted)", fontSize:12, marginBottom:14 }}>
          Unterfelder für <span style={{ color: "var(--text)", fontWeight:700 }}>{parent.name}</span>
          {elternM2 > 0 && <span style={{ color: "var(--muted)" }}> · {elternM2} m² gesamt</span>}
        </div>

        {/* Präfix + Datum */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div>
            <Label>Kürzel / Präfix</Label>
            <input value={praefix} onChange={e => updatePraefix(e.target.value)}
              style={inputStyle()} placeholder="z.B. BF" />
          </div>
          <div>
            <Label>Standard-Termin</Label>
            <input type="date" value={datum} onChange={e => {
              setDatum(e.target.value);
              setFelder(prev => prev.map(f => ({ ...f, datum: e.target.value })));
            }} style={inputStyle()} />
          </div>
        </div>

        {/* Modus-Auswahl */}
        <div style={{ marginBottom:14 }}>
          <Label>m²-Modus</Label>
          <div style={{ display:"flex", gap:8, marginTop:6 }}>
            {[["gleich","🔲 Alle gleich"],["einzeln","✏️ Individuell"]].map(([v,l]) => (
              <button key={v} onClick={() => switchModus(v)}
                style={{ flex:1, background: modus===v ? "var(--yellow)" : "var(--border)",
                  color: modus===v ? "#1C2027" : "var(--muted)",
                  border:"none", borderRadius:8, padding:"9px 0",
                  fontWeight: modus===v ? 700 : 400, cursor:"pointer", fontSize:13 }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Gleich-Modus: Standard m² */}
        {modus === "gleich" && (
          <div style={{ marginBottom:14 }}>
            <Label>m² pro Feld</Label>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:6 }}>
              <StepBtn onClick={() => { setStdM2(m=>Math.max(1,m-5)); setFelder(prev=>prev.map(f=>({...f,m2:Math.max(1,stdM2-5)}))); }}>−</StepBtn>
              <input type="number" value={stdM2}
                onChange={e => { setStdM2(+e.target.value); setFelder(prev=>prev.map(f=>({...f,m2:+e.target.value}))); }}
                style={{ ...inputStyle(), width:80, textAlign:"center", fontSize:18, fontWeight:700 }} />
              <StepBtn onClick={() => { setStdM2(m=>m+5); setFelder(prev=>prev.map(f=>({...f,m2:stdM2+5}))); }}>+</StepBtn>
              <span style={{ color: "var(--muted)", fontSize:13 }}>m²</span>
            </div>
          </div>
        )}

        {/* Feldliste */}
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <Label>Felder ({felder.length})</Label>
            <button onClick={addFeld}
              style={{ background: "var(--border)", color: "var(--text)", border:"none", borderRadius:7,
                padding:"4px 12px", cursor:"pointer", fontSize:12 }}>+ Feld</button>
          </div>

          {felder.map((f, i) => (
            <div key={i} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:7 }}>
              {/* Nummer-Badge */}
              <div style={{ background: "var(--border)", color: "var(--muted)", borderRadius:6,
                padding:"4px 8px", fontSize:11, fontWeight:700, minWidth:28, textAlign:"center" }}>
                {i+1}
              </div>
              {/* Name */}
              <input value={f.name} onChange={e => updateFeld(i, "name", e.target.value)}
                style={{ ...inputStyle(), flex:2, fontSize:12, padding:"8px 10px" }} />
              {/* m² — nur im Einzelmodus editierbar */}
              <div style={{ position:"relative", flex:1 }}>
                <input
                  type="number"
                  value={f.m2}
                  readOnly={modus === "gleich"}
                  onChange={e => modus === "einzeln" && updateFeld(i, "m2", +e.target.value)}
                  style={{ ...inputStyle(), fontSize:13, padding:"8px 10px",
                    color: modus === "gleich" ? "var(--muted)" : "var(--text)",
                    background: modus === "gleich" ? "var(--border)" : "var(--surface2)",
                    cursor: modus === "gleich" ? "default" : "text" }}
                />
                <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                  color: "var(--muted)", fontSize:10, pointerEvents:"none" }}>m²</span>
              </div>
              {/* Löschen */}
              <button onClick={() => removeFeld(i)}
                style={{ background:"none", border:"none", color: "var(--red)", cursor:"pointer", fontSize:18, padding:"0 2px" }}>✕</button>
            </div>
          ))}
        </div>

        {/* Summen-Anzeige */}
        <div style={{ background: diffOk ? "#1A3A28" : elternM2 > 0 ? "#2A2010" : "var(--border)",
          borderRadius:10, padding:"10px 14px", marginBottom:14,
          border:`1px solid ${diffOk ? "var(--green)" : elternM2 > 0 ? "var(--yellow)" : "var(--surface2)"}` }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ color: "var(--muted)", fontSize:12 }}>Summe Unterfelder</span>
            <span style={{ color: "var(--text)", fontWeight:700 }}>{totalM2} m²</span>
          </div>
          {elternM2 > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              <span style={{ color: "var(--muted)", fontSize:12 }}>Elternfeld</span>
              <span style={{ color: "var(--muted)" }}>{elternM2} m²</span>
            </div>
          )}
          {elternM2 > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              <span style={{ color: "var(--muted)", fontSize:12 }}>Differenz</span>
              <span style={{ color: diffOk ? "var(--green)" : "var(--yellow)", fontWeight:700 }}>
                {diffM2 > 0 ? `−${diffM2}` : diffM2 < 0 ? `+${Math.abs(diffM2)}` : "✓ Passt genau"} {diffOk ? "" : "m²"}
              </span>
            </div>
          )}
        </div>

        <button onClick={anlegen} disabled={felder.length === 0}
          style={{ width:"100%", background: felder.length > 0 ? "var(--yellow)" : "var(--border)",
            color: felder.length > 0 ? "#1C2027" : "var(--muted)",
            border:"none", borderRadius:10, padding:14, fontWeight:700, cursor:"pointer", fontSize:15 }}>
          ⚡ {felder.length} Unterfelder anlegen · {totalM2} m² gesamt
        </button>
      </div>
    </div>
  );
}

// ─── Einzelnes Elternfeld mit Unterfeldern ───────────────────────────────────
function FeldKarte({ f, unterfelder, selected, onSelect, onEdit, onSchnell, onStatusChange }) {
  const hatUnter = unterfelder.length > 0;
  const unterDone = unterfelder.filter(u => u.status === "done").length;
  const unterPct  = hatUnter ? Math.round(unterDone / unterfelder.length * 100) : null;
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Elternfeld */}
      <div onClick={() => onSelect(f)}
        style={{ background: "var(--surface)",
          border:`2px solid ${selected?.id === f.id ? "var(--yellow)" : STATUS_COLOR[f.status]}`,
          borderRadius: expanded ? "10px 10px 0 0" : 10,
          padding:"12px 14px", cursor:"pointer" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            {f.gewerk && <div style={{ color: "var(--muted)", fontSize:10, marginBottom:2 }}>{f.gewerk}</div>}
            <div style={{ color: "var(--text)", fontSize:13, fontWeight:700 }}>{f.name}</div>
            <div style={{ color: "var(--muted)", fontSize:11, marginTop:3 }}>
              {f.m2} m²{f.geplant ? ` · ${fmt(f.geplant)}` : ""}
              {hatUnter && <span style={{ color: "var(--muted)", marginLeft:6 }}>· {unterfelder.length} Unterfelder</span>}
            </div>
            {(f.subIds||[]).length > 0 && (
              <div style={{ marginTop:5 }}>
                <span style={{ color: "var(--blue)", fontSize:10 }}>🏢 Sub zugewiesen</span>
              </div>
            )}
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
            <div style={{ background: STATUS_COLOR[f.status], color:"#fff", fontSize:9,
              padding:"2px 7px", borderRadius:20 }}>
              {STATUS_LABEL[f.status]?.split(" ")[0]}
            </div>
            {hatUnter && (
              <div onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                style={{ color: "var(--muted)", fontSize:11, cursor:"pointer", userSelect:"none" }}>
                {expanded ? "▲" : "▼"} {unterDone}/{unterfelder.length}
              </div>
            )}
          </div>
        </div>
        {/* Unterfeld-Fortschritt */}
        {hatUnter && (
          <div style={{ marginTop:8 }}>
            <div style={{ background: "var(--border)", borderRadius:3, height:5 }}>
              <div style={{ background: unterPct === 100 ? "var(--green)" : "var(--yellow)",
                width:`${unterPct}%`, height:"100%", borderRadius:3, transition:"width 0.4s" }} />
            </div>
            <div style={{ color: "var(--muted)", fontSize:10, marginTop:2 }}>{unterPct}% der Unterfelder fertig</div>
          </div>
        )}
        {f.festigkeit && !hatUnter && (
          <div style={{ marginTop:6 }}>
            <div style={{ background: "var(--border)", borderRadius:3, height:4 }}>
              <div style={{ background: f.festigkeit >= 95 ? "var(--green)" : "var(--yellow)",
                width:`${f.festigkeit}%`, height:"100%", borderRadius:3 }} />
            </div>
            <div style={{ color: "var(--muted)", fontSize:10, marginTop:2 }}>Festigkeit {f.festigkeit}%</div>
          </div>
        )}
      </div>

      {/* Unterfelder (ausgeklappt) */}
      {expanded && hatUnter && (
        <div style={{ background: "var(--surface2)", borderRadius:"0 0 10px 10px",
          border:`1px solid ${'var(--border)'}`, borderTop:"none", padding:"8px 10px" }}>
          {unterfelder.map(u => (
            <div key={u.id} onClick={() => onSelect(u)}
              style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                background: "var(--surface)", borderRadius:8, padding:"8px 10px", marginBottom:5,
                border:`1.5px solid ${selected?.id === u.id ? "var(--yellow)" : STATUS_COLOR[u.status]}`,
                cursor:"pointer" }}>
              <div>
                <div style={{ color: "var(--text)", fontSize:12, fontWeight:600 }}>{u.name}</div>
                <div style={{ color: "var(--muted)", fontSize:10 }}>{u.m2} m²{u.geplant ? ` · ${fmt(u.geplant)}` : ""}</div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <div style={{ background: STATUS_COLOR[u.status], color:"#fff",
                  fontSize:9, padding:"2px 6px", borderRadius:20 }}>
                  {STATUS_LABEL[u.status]?.split(" ")[0]}
                </div>
                <button onClick={e => { e.stopPropagation(); onEdit(u); }}
                  style={{ background:"none", border:"none", color: "var(--muted)", cursor:"pointer", fontSize:14 }}>✏️</button>
              </div>
            </div>
          ))}
          <button onClick={() => onSchnell(f)}
            style={{ width:"100%", background: "var(--border)", color: "var(--muted)",
              border:`1px dashed ${'var(--muted)'}`, borderRadius:8, padding:"7px 0",
              cursor:"pointer", fontSize:12, marginTop:2 }}>
            ⚡ Weitere Unterfelder hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Detailpanel für ausgewähltes Feld ───────────────────────────────────────
function FeldDetail({ selected, felder, onEdit, onStatusChange, onSchnell, projSubs=[], onSaveFeld, projekt, eigeneFirma, wetter }) {
  const istUnterfeld = !!selected.parentId;
  const eltern = istUnterfeld ? felder.find(f => f.id === selected.parentId) : null;
  const unterfelder = felder.filter(f => f.parentId === selected.id);

  function toggleSubFeld(subId) {
    const current = selected.subIds || [];
    const updated = current.includes(subId)
      ? current.filter(x => x !== subId)
      : [...current, subId];
    onSaveFeld({ ...selected, subIds: updated });
  }

  const zugewieseneSubs = projSubs.filter(s => (selected.subIds||[]).includes(s.id));

  return (
    <div style={{ background: "var(--surface2)", borderRadius:10, padding:16,
      border:`1px solid ${'var(--yellow)'}`, marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ flex:1 }}>
          {eltern && <div style={{ color: "var(--muted)", fontSize:10, marginBottom:2 }}>↳ Unterfeld von {eltern.name}</div>}
          {selected.gewerk && <div style={{ color: "var(--muted)", fontSize:11 }}>{selected.gewerk}</div>}
          <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:15 }}>{selected.name}</div>
          {/* Zugewiesene Subs Badge */}
          {zugewieseneSubs.length > 0 && (
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:6 }}>
              {zugewieseneSubs.map(s => (
                <div key={s.id} style={{ background:"#1A2040", color: "var(--blue)",
                  fontSize:10, padding:"2px 8px", borderRadius:10, border:`1px solid ${'var(--blue)'}44` }}>
                  🏢 {s.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {!istUnterfeld && unterfelder.length === 0 && (
            <button onClick={() => onSchnell(selected)}
              style={{ background: "var(--border)", color: "var(--text)", border:`1px solid ${'var(--muted)'}`,
                borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:11 }}>
              ⚡ Unterfelder
            </button>
          )}
          <button onClick={() => onEdit(selected)}
            style={{ background: "var(--border)", color: "var(--text)", border:"none",
              borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:12 }}>
            ✏️ Bearbeiten
          </button>
          <PDFExportButton feld={selected} projekt={projekt} eigeneFirma={eigeneFirma} wetter={wetter} typ="betonprotokoll" />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
        {[
          ["Fläche",    `${selected.m2} m²`],
          ["Geplant",   selected.geplant ? fmt(selected.geplant) : "—"],
          ["Dauer",     `${selected.dauer_tage || 1} Tag(e)`],
          ["Bewehrung", selected.bewehrung || "—"],
          ...(selected.festigkeit ? [["Festigkeit", `${selected.festigkeit}%`]] : []),
          ...(selected.elektro_phase   ? [["Elektro",  selected.elektro_phase]]   : []),
          ...(selected.sanitaer_phase  ? [["Sanitär",  selected.sanitaer_phase]]  : []),
          ...(selected.heizung_phase   ? [["Heizung",  selected.heizung_phase]]   : []),
          ...(selected.belegreife      ? [["Belegreife",selected.belegreife]]      : []),
          ...(selected.ausbau_phase    ? [["Ausbau",   selected.ausbau_phase]]    : []),
          ...(selected.belag_phase     ? [["Belag",    selected.belag_phase]]     : []),
        ].map(([k,v]) => (
          <div key={k}>
            <div style={{ color: "var(--muted)", fontSize:10 }}>{k}</div>
            <div style={{ color: "var(--text)", fontSize:13, fontWeight:600 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Sub-Zuweisung auf Feldebene */}
      {projSubs.length > 0 && (
        <div style={{ marginBottom:12 }}>
          <div style={{ color: "var(--muted)", fontSize:11, marginBottom:6 }}>🏢 Subunternehmer für dieses Feld:</div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {projSubs.map(s => {
              const aktiv = (selected.subIds||[]).includes(s.id);
              return (
                <div key={s.id} onClick={() => toggleSubFeld(s.id)}
                  style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    background: aktiv ? "#1A2040" : "var(--border)",
                    border:`1.5px solid ${aktiv ? "var(--blue)" : "transparent"}`,
                    borderRadius:8, padding:"8px 11px", cursor:"pointer" }}>
                  <div>
                    <div style={{ color: "var(--text)", fontSize:12, fontWeight: aktiv ? 700 : 400 }}>{s.name}</div>
                    <div style={{ display:"flex", gap:5, marginTop:3 }}>
                      {s.gewerke.map(k => {
                        const g = ALLE_GEWERKE.find(x=>x.key===k);
                        return g ? <span key={k} style={{ color: "var(--muted)", fontSize:10 }}>{g.icon}</span> : null;
                      })}
                      {s.stundensatz > 0 && <span style={{ color: "var(--muted)", fontSize:10 }}>· {s.stundensatz}€/Std.</span>}
                    </div>
                  </div>
                  <span style={{ fontSize:16 }}>{aktiv ? "🔵" : "⚪"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {unterfelder.length > 0 ? (
        <div style={{ background: "var(--border)", borderRadius:8, padding:"8px 10px", marginBottom:10 }}>
          <div style={{ color: "var(--muted)", fontSize:11, marginBottom:4 }}>
            Unterfelder: {unterfelder.filter(u=>u.status==="done").length}/{unterfelder.length} fertig
          </div>
          <div style={{ color: "var(--muted)", fontSize:10 }}>
            Status des Elternfeldes wird automatisch aktualisiert.
          </div>
        </div>
      ) : (
        <>
          <div style={{ color: "var(--muted)", fontSize:11, marginBottom:6 }}>Status ändern:</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {Object.entries(STATUS_LABEL).map(([k,v]) => (
              <button key={k} onClick={() => onStatusChange(selected.id, k)}
                style={{ background: selected.status === k ? STATUS_COLOR[k] : "var(--border)",
                  color: selected.status === k ? "#fff" : "var(--muted)",
                  border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12 }}>
                {v}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Haupt-BetonfelderView ────────────────────────────────────────────────────
function BetonfelderView({ felder, setFelder, sbConnected, projektTyp, projSubs=[], projekt, eigeneFirma, wetter }) {
  const cfg = typConfig(projektTyp);
  const [selected,     setSelected]     = useState(null);
  const [editFeld,     setEditFeld]     = useState(null);
  const [schnellParent,setSchnellParent]= useState(null);
  const [gewerkFilter, setGewerkFilter] = useState("alle");

  // Elternfelder = Felder ohne parentId
  const elternFelder = felder.filter(f => !f.parentId);
  const total  = elternFelder.length;
  const done   = elternFelder.filter(f => f.status === "done").length;
  const progress = total > 0 ? Math.round(done / total * 100) : 0;

  const gefilterteEltern = gewerkFilter === "alle"
    ? elternFelder
    : elternFelder.filter(f => f.gewerk?.includes(gewerkFilter));

  // Auto-Status: wenn alle Unterfelder eines Elternfelds fertig sind → Elternfeld auf "done"
  function autoStatusUpdate(updatedFelder) {
    return updatedFelder.map(f => {
      const kinder = updatedFelder.filter(u => u.parentId === f.id);
      if (kinder.length > 0 && kinder.every(u => u.status === "done") && f.status !== "done") {
        return { ...f, status: "done" };
      }
      if (kinder.length > 0 && !kinder.every(u => u.status === "done") && f.status === "done") {
        return { ...f, status: "in_progress" };
      }
      return f;
    });
  }

  async function updateStatus(id, newStatus) {
    const base = felder.map(f => f.id === id ? { ...f, status: newStatus } : f);
    const updated = autoStatusUpdate(base);
    setFelder(updated);
    setSelected(updated.find(f => f.id === id) || null);
  }

  function handleSave(f) {
    const base = felder.some(x => x.id === f.id)
      ? felder.map(x => x.id === f.id ? f : x)
      : [...felder, { ...f, id: Date.now() }];
    setFelder(autoStatusUpdate(base));
    setEditFeld(null);
    setSelected(null);
  }

  function handleDelete(id) {
    // also delete all children
    setFelder(prev => autoStatusUpdate(
      prev.filter(f => f.id !== id && f.parentId !== id)
          .map(f => ({ ...f, abhaengigkeiten: (f.abhaengigkeiten||[]).filter(x => x !== id) }))
    ));
    setEditFeld(null);
    setSelected(null);
  }

  function handleSchnellAdd(neuFelder) {
    const base = [...felder, ...neuFelder];
    setFelder(autoStatusUpdate(base));
  }

  return (
    <div>
      <SupabaseStatus connected={sbConnected} />

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ color: "var(--text)", fontWeight:700 }}>
          {cfg.einheitenPl} · {done}/{total} fertig
        </div>
        <button onClick={() => setEditFeld({ name:"", m2:0, geplant:"", dauer_tage:1, bewehrung:"", abhaengigkeiten:[], status:"planned" })}
          style={{ background: "var(--yellow)", color:"#1C2027", border:"none", borderRadius:9,
            padding:"7px 14px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
          + {cfg.einheitLabel}
        </button>
      </div>

      {/* Fortschritt */}
      <div style={{ background: "var(--border)", borderRadius:4, height:8, marginBottom:14 }}>
        <div style={{ background: "var(--green)", width:`${progress}%`, height:"100%", borderRadius:4, transition:"width 0.6s" }} />
      </div>

      {felder.length === 0 ? (
        <div style={{ background: "var(--surface)", borderRadius:12, padding:32, textAlign:"center" }}>
          <div style={{ fontSize:36 }}>🏗️</div>
          <div style={{ color: "var(--muted)", marginTop:10, marginBottom:16 }}>Noch keine {cfg.einheitenPl} angelegt.</div>
          <button onClick={() => setEditFeld({ name:"", m2:0, geplant:"", dauer_tage:1, bewehrung:"", abhaengigkeiten:[], status:"planned" })}
            style={{ background: "var(--yellow)", color:"#1C2027", border:"none", borderRadius:10,
              padding:"12px 24px", fontWeight:700, cursor:"pointer", fontSize:14 }}>
            + Erste {cfg.einheitLabel} anlegen
          </button>
        </div>
      ) : (
        <>
          {/* Gewerk-Filter */}
          {projektTyp === "hochbau" && (
            <div style={{ display:"flex", gap:6, marginBottom:10, overflowX:"auto", paddingBottom:2 }}>
              <FilterBtn active={gewerkFilter==="alle"} onClick={() => setGewerkFilter("alle")}>
                Alle ({elternFelder.length})
              </FilterBtn>
              {Object.values(HOCHBAU_GEWERKE).map(g => {
                const n = elternFelder.filter(f => f.gewerk?.includes(g.label)).length;
                if (!n) return null;
                return (
                  <FilterBtn key={g.label} active={gewerkFilter===g.label} onClick={() => setGewerkFilter(g.label)}>
                    {g.icon} {g.label} ({n})
                  </FilterBtn>
                );
              })}
            </div>
          )}

          {/* Feldliste */}
          {gefilterteEltern.map(f => (
            <FeldKarte
              key={f.id}
              f={f}
              unterfelder={felder.filter(u => u.parentId === f.id)}
              selected={selected}
              onSelect={s => setSelected(selected?.id === s.id ? null : s)}
              onEdit={setEditFeld}
              onSchnell={setSchnellParent}
              onStatusChange={updateStatus}
            />
          ))}

          {/* Detail-Panel */}
          {selected && (
            <FeldDetail
              selected={selected}
              felder={felder}
              onEdit={setEditFeld}
              onStatusChange={updateStatus}
              onSchnell={setSchnellParent}
              projSubs={projSubs}
              onSaveFeld={handleSave}
              projekt={projekt}
              eigeneFirma={eigeneFirma}
              wetter={wetter}
            />
          )}
        </>
      )}

      {/* Modals */}
      {editFeld !== null && (
        <FeldEditor
          feld={editFeld}
          allFelder={felder}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditFeld(null)}
          projektTyp={projektTyp}
          projSubs={projSubs}
        />
      )}
      {schnellParent && (
        <UnterfeldSchnellanlage
          parent={schnellParent}
          onAdd={handleSchnellAdd}
          onClose={() => setSchnellParent(null)}
        />
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ background: active ? "var(--yellow)" : "#FFFFFF",
        color: active ? "#1C2027" : "var(--muted)",
        border:`1.5px solid ${active ? "var(--yellow)" : "var(--border)"}`,
        borderRadius:20, padding:"8px 16px", cursor:"pointer",
        fontSize:13, fontWeight: active ? 700 : 500, whiteSpace:"nowrap",
        boxShadow: active ? "0 2px 8px rgba(245,196,0,0.3)" : "0 1px 3px rgba(0,0,0,0.06)" }}>
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// KOLONNEN
// ════════════════════════════════════════════════════════════════════════════
// ─── Einzelner MA mit Stunden aus 123erfasst ────────────────────────────────
function MitarbeiterZeilen({ ma, zeitdaten, vonDatum, bisDatum }) {
  const [open, setOpen] = useState(false);

  // Buchungen für diesen MA aus den geladenen Zeitdaten filtern
  // Matching über Namen (Fallback wenn erfasstIdent nicht verknüpft)
  const maBuchungen = zeitdaten.filter(z => {
    if (ma.erfasstIdent) return z.person?.ident === ma.erfasstIdent;
    const vn = (z.person?.formattedName || "").toLowerCase();
    return vn.includes(ma.name.split(" ")[0].toLowerCase()) ||
           vn.includes(ma.name.split(" ").pop().toLowerCase());
  });

  const totalH = maBuchungen.reduce((s, z) => s + (z.hours||0) + (z.minutes||0)/60, 0);
  const hatDaten = zeitdaten.length > 0;

  const ROLLEN_FARBE = { "Vorarbeiter": "var(--yellow)", "Facharbeiter": "var(--blue)", "Helfer": "var(--muted)" };

  return (
    <div style={{ marginBottom:6 }}>
      {/* MA Zeile */}
      <div onClick={() => hatDaten && setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:10,
          background: open ? "var(--surface2)" : "var(--border)",
          borderRadius: open ? "8px 8px 0 0" : 8,
          padding:"10px 12px",
          cursor: hatDaten ? "pointer" : "default",
          border:`1px solid ${open ? "var(--yellow)"+"66" : "transparent"}` }}>
        {/* Avatar */}
        <div style={{ width:32, height:32, borderRadius:16, flexShrink:0,
          background: "var(--surface)", display:"flex", alignItems:"center", justifyContent:"center",
          border:`2px solid ${ROLLEN_FARBE[ma.rolle] || "var(--muted)"}`,
          color: ROLLEN_FARBE[ma.rolle] || "var(--muted)", fontSize:13, fontWeight:700 }}>
          {ma.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ color: "var(--text)", fontSize:13, fontWeight:600 }}>{ma.name}</div>
          <div style={{ color: ROLLEN_FARBE[ma.rolle] || "var(--muted)", fontSize:10 }}>{ma.rolle}</div>
        </div>
        {/* Stunden */}
        {hatDaten ? (
          <div style={{ textAlign:"right" }}>
            <div style={{ color: totalH > 0 ? "var(--yellow)" : "var(--muted)", fontWeight:700, fontSize:14 }}>
              {totalH > 0 ? totalH.toFixed(1)+"h" : "—"}
            </div>
            <div style={{ color: "var(--muted)", fontSize:10 }}>
              {maBuchungen.length > 0 ? `${maBuchungen.length} Buchung${maBuchungen.length>1?"en":""}` : "keine"}
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--muted)", fontSize:11 }}>nicht geladen</div>
        )}
        {hatDaten && maBuchungen.length > 0 && (
          <div style={{ color: "var(--muted)", fontSize:12 }}>{open ? "▲" : "▼"}</div>
        )}
      </div>

      {/* Aufgeklappte Buchungen */}
      {open && maBuchungen.length > 0 && (
        <div style={{ background: "var(--surface)", borderRadius:"0 0 8px 8px",
          border:`1px solid ${"var(--yellow)"+"66"}`, borderTop:"none", padding:"8px 10px" }}>
          {maBuchungen.map((z, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", padding:"6px 4px",
              borderBottom: i < maBuchungen.length-1 ? `1px solid ${'var(--border)'}` : "none" }}>
              <div>
                <div style={{ color: "var(--text2)", fontSize:12 }}>
                  {new Date(z.date).toLocaleDateString("de-DE", { weekday:"short", day:"2-digit", month:"2-digit" })}
                </div>
                {z.activity?.name && (
                  <div style={{ color: "var(--muted)", fontSize:10 }}>🔧 {z.activity.name}</div>
                )}
                {z.note && (
                  <div style={{ color: "var(--muted)", fontSize:10, fontStyle:"italic" }}>💬 {z.note}</div>
                )}
              </div>
              <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:13 }}>
                {(z.hours||0)}h{z.minutes > 0 ? ` ${z.minutes}min` : ""}
              </div>
            </div>
          ))}
          {/* MA-Summe */}
          <div style={{ display:"flex", justifyContent:"space-between",
            borderTop:`1px solid ${'var(--border)'}`, marginTop:4, paddingTop:6 }}>
            <div style={{ color: "var(--muted)", fontSize:11 }}>Gesamt</div>
            <div style={{ color: "var(--yellow)", fontWeight:800, fontSize:14 }}>{totalH.toFixed(1)} h</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Kolonne-Karte mit aufklappbarer MA-Liste ────────────────────────────────
function KolonneKarte({ k, zeitdaten, vonDatum, bisDatum, erfasstVerbunden }) {
  const [expanded, setExpanded] = useState(false);
  const mas = k.mitarbeiter || [];
  const totalMann = mas.length;

  // Stunden dieser Kolonne aus Zeitdaten
  const kolonneH = zeitdaten.filter(z => {
    if (!mas.length) return false;
    return mas.some(ma => {
      if (ma.erfasstIdent) return z.person?.ident === ma.erfasstIdent;
      const vn = (z.person?.formattedName || "").toLowerCase();
      return vn.includes(ma.name.split(" ")[0].toLowerCase()) ||
             vn.includes(ma.name.split(" ").pop().toLowerCase());
    });
  }).reduce((s, z) => s + (z.hours||0) + (z.minutes||0)/60, 0);

  const anwesend = mas.filter(ma => zeitdaten.some(z => {
    if (ma.erfasstIdent) return z.person?.ident === ma.erfasstIdent;
    const vn = (z.person?.formattedName || "").toLowerCase();
    return vn.includes(ma.name.split(" ")[0].toLowerCase()) ||
           vn.includes(ma.name.split(" ").pop().toLowerCase());
  })).length;

  return (
    <div style={{ marginBottom:12 }}>
      {/* Kolonne Header */}
      <div style={{ background: "var(--surface)", borderRadius: expanded ? "12px 12px 0 0" : 12,
        padding:"14px 16px", border:`1px solid ${'var(--border)'}`,
        borderBottom: expanded ? "none" : undefined }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ color: "var(--text)", fontWeight:700, fontSize:15 }}>{k.name}</div>
            <div style={{ color: "var(--muted)", fontSize:12, marginTop:2 }}>📍 {k.einsatz}</div>
            {k.vorarbeiter && (
              <div style={{ color: "var(--muted)", fontSize:11, marginTop:2 }}>👷 VA: {k.vorarbeiter}</div>
            )}
          </div>
          <div style={{ textAlign:"right" }}>
            {erfasstVerbunden && kolonneH > 0 ? (
              <div style={{ color: "var(--yellow)", fontWeight:800, fontSize:18 }}>{kolonneH.toFixed(1)}h</div>
            ) : (
              <div style={{ color: "var(--yellow)", fontSize:13 }}>👷 {totalMann} Mann</div>
            )}
            {erfasstVerbunden && (
              <div style={{ color: "var(--muted)", fontSize:10 }}>
                {anwesend}/{totalMann} anwesend
              </div>
            )}
          </div>
        </div>

        {/* Fortschrittsbalken Anwesenheit */}
        {erfasstVerbunden && totalMann > 0 && (
          <div style={{ marginTop:10 }}>
            <div style={{ background: "var(--border)", borderRadius:4, height:5 }}>
              <div style={{ background: anwesend === totalMann ? "var(--green)" : "var(--yellow)",
                width:`${(anwesend/totalMann)*100}%`, height:"100%", borderRadius:4, transition:"width 0.4s" }} />
            </div>
          </div>
        )}

        {/* MA-Vorschau Avatare */}
        <div style={{ display:"flex", alignItems:"center", marginTop:10, gap:6 }}>
          <div style={{ display:"flex" }}>
            {mas.slice(0,5).map((ma, i) => (
              <div key={ma.id} style={{ width:26, height:26, borderRadius:13,
                background: "var(--border)", border:`2px solid ${'var(--surface)'}`,
                marginLeft: i > 0 ? -8 : 0,
                display:"flex", alignItems:"center", justifyContent:"center",
                color: "var(--muted)", fontSize:10, fontWeight:700, zIndex:5-i }}>
                {ma.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
              </div>
            ))}
            {mas.length > 5 && (
              <div style={{ width:26, height:26, borderRadius:13,
                background: "var(--border)", border:`2px solid ${'var(--surface)'}`,
                marginLeft:-8, display:"flex", alignItems:"center", justifyContent:"center",
                color: "var(--muted)", fontSize:9 }}>+{mas.length-5}</div>
            )}
          </div>
          <button onClick={() => setExpanded(e => !e)}
            style={{ marginLeft:"auto", background: "var(--border)", border:"none", color: "var(--text)",
              borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:12 }}>
            {expanded ? "▲ Zuklappen" : "▼ Mitarbeiter"}
          </button>
        </div>
      </div>

      {/* Aufgeklappte MA-Liste */}
      {expanded && (
        <div style={{ background: "var(--surface2)", borderRadius:"0 0 12px 12px",
          border:`1px solid ${'var(--border)'}`, borderTop:"none", padding:"10px 12px" }}>
          {mas.map(ma => (
            <MitarbeiterZeilen
              key={ma.id}
              ma={ma}
              zeitdaten={zeitdaten}
              vonDatum={vonDatum}
              bisDatum={bisDatum}
            />
          ))}
          {/* Kolonnen-Summe */}
          {erfasstVerbunden && kolonneH > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between",
              background: "var(--border)", borderRadius:8, padding:"10px 12px", marginTop:8 }}>
              <div style={{ color: "var(--muted)", fontSize:12 }}>Kolonne gesamt</div>
              <div style={{ color: "var(--yellow)", fontWeight:800, fontSize:15 }}>{kolonneH.toFixed(1)} h</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Haupt KolonnenView ───────────────────────────────────────────────────────
function KolonnenView({ kolonnen, projekt }) {
  const [zeitdaten,   setZeitdaten]   = useState([]);
  const [ladeStatus,  setLadeStatus]  = useState("idle"); // idle | loading | ok | error
  const [vonDatum,    setVonDatum]    = useState(() => {
    const d = new Date(); d.setDate(d.getDate()-6);
    return d.toISOString().slice(0,10);
  });
  const [bisDatum, setBisDatum] = useState(new Date().toISOString().slice(0,10));

  const konfiguriert  = !ERFASST_PROXY.includes("DEIN-PROJEKT");
  const erfasstLinked = konfiguriert && !!projekt?.erfasstIdent;

  const totalMann = kolonnen.reduce((s,k) => s + (k.mitarbeiter?.length || 0), 0);
  const totalStd  = zeitdaten.reduce((s,z) => s + (z.hours||0) + (z.minutes||0)/60, 0);

  async function ladeZeiten() {
    if (!erfasstLinked) return;
    setLadeStatus("loading");
    try {
      const data = await erfasstQuery(Q_TIMES, {
        from:         vonDatum + "T00:00:00",
        to:           bisDatum + "T23:59:59",
        projectIdent: projekt.erfasstIdent,
      });
      setZeitdaten(data?.hoursBlocks?.nodes || []);
      setLadeStatus("ok");
    } catch(e) {
      setLadeStatus("error");
    }
  }

  useEffect(() => { ladeZeiten(); }, [vonDatum, bisDatum, projekt?.erfasstIdent]);

  return (
    <div>
      {/* KPI Leiste */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
        <div style={{ background: "var(--surface)", borderRadius:10, padding:"11px 12px", borderBottom:`3px solid ${'var(--yellow)'}` }}>
          <div style={{ color: "var(--muted)", fontSize:10 }}>Kolonnen</div>
          <div style={{ color: "var(--text)", fontWeight:800, fontSize:22 }}>{kolonnen.length}</div>
        </div>
        <div style={{ background: "var(--surface)", borderRadius:10, padding:"11px 12px", borderBottom:`3px solid ${'var(--blue)'}` }}>
          <div style={{ color: "var(--muted)", fontSize:10 }}>Mitarbeiter</div>
          <div style={{ color: "var(--text)", fontWeight:800, fontSize:22 }}>{totalMann}</div>
        </div>
        <div style={{ background: "var(--surface)", borderRadius:10, padding:"11px 12px", borderBottom:`3px solid ${'var(--green)'}` }}>
          <div style={{ color: "var(--muted)", fontSize:10 }}>Stunden Σ</div>
          <div style={{ color: "var(--text)", fontWeight:800, fontSize:22 }}>
            {ladeStatus === "ok" ? totalStd.toFixed(1)+"h" : "—"}
          </div>
        </div>
      </div>

      {/* Datumsfilter (nur wenn 123erfasst verbunden) */}
      {konfiguriert && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:8, marginBottom:14, alignItems:"end" }}>
          <div>
            <Label>Von</Label>
            <input type="date" value={vonDatum} onChange={e => setVonDatum(e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <Label>Bis</Label>
            <input type="date" value={bisDatum} onChange={e => setBisDatum(e.target.value)} style={inputStyle()} />
          </div>
          <button onClick={ladeZeiten}
            style={{ background: "var(--border)", border:"none", color: "var(--text)",
              borderRadius:8, padding:"10px 12px", cursor:"pointer", fontSize:16,
              height:40, display:"flex", alignItems:"center" }}>
            {ladeStatus === "loading" ? "⏳" : "🔄"}
          </button>
        </div>
      )}

      {/* Status-Banner */}
      {!konfiguriert && (
        <div style={{ background: "var(--border)", borderRadius:8, padding:"8px 12px", marginBottom:12,
          display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:14 }}>ℹ️</span>
          <span style={{ color: "var(--muted)", fontSize:12 }}>
            123erfasst nicht konfiguriert — Stunden werden aus Mock-Daten angezeigt.
          </span>
        </div>
      )}
      {konfiguriert && !erfasstLinked && (
        <div style={{ background:"#2A2010", borderRadius:8, padding:"8px 12px", marginBottom:12,
          display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:14 }}>⚠️</span>
          <span style={{ color: "var(--yellow)", fontSize:12 }}>
            Kein 123erfasst-Projekt verknüpft. Im ⏱️ Zeiten-Tab verknüpfen.
          </span>
        </div>
      )}
      {ladeStatus === "error" && (
        <div style={{ background:"#2E1A1A", borderRadius:8, padding:"8px 12px", marginBottom:12, color: "var(--red)", fontSize:12 }}>
          ❌ Zeitdaten konnten nicht geladen werden.
        </div>
      )}

      {/* Kolonnen */}
      {kolonnen.map(k => (
        <KolonneKarte
          key={k.id}
          k={k}
          zeitdaten={zeitdaten}
          vonDatum={vonDatum}
          bisDatum={bisDatum}
          erfasstVerbunden={ladeStatus === "ok"}
        />
      ))}

      <button style={{ width:"100%", background: "var(--border)", color: "var(--text)",
        border:`1px dashed ${'var(--muted)'}`, borderRadius:10, padding:12, cursor:"pointer", fontSize:14 }}>
        + Kolonne einteilen
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DIKTIERFUNKTION – Web Speech API
// ════════════════════════════════════════════════════════════════════════════
function DiktierFeld({ label, value, rows = 3, onChange }) {
  const [aktiv,      setAktiv]      = useState(false);
  const [unterstuetzt, setUnterstuetzt] = useState(true);
  const [interim,    setInterim]    = useState(""); // Live-Vorschau während Diktat
  const erkennerRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setUnterstuetzt(false); return; }

    const er = new SR();
    er.lang           = "de-DE";
    er.continuous     = true;   // Läuft bis manuell gestoppt
    er.interimResults = true;   // Live-Vorschau während Sprechen

    er.onresult = (e) => {
      let finalText  = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText  += t;
        else                       interimText += t;
      }
      if (finalText) {
        // Finalen Text anhängen (mit Leerzeichen wenn schon was da ist)
        onChange((value + (value && !value.endsWith(" ") ? " " : "") + finalText).trimStart());
      }
      setInterim(interimText);
    };

    er.onerror = (e) => {
      if (e.error !== "no-speech") { setAktiv(false); setInterim(""); }
    };

    er.onend = () => {
      // Wenn noch aktiv (z.B. kurze Pause), automatisch neu starten
      if (erkennerRef.current?._shouldRestart) {
        try { er.start(); } catch {}
      } else {
        setAktiv(false);
        setInterim("");
      }
    };

    erkennerRef.current = er;
    return () => { try { er.stop(); } catch {} };
  }, [value]); // value als Dep damit Closure aktuell bleibt

  function toggleDiktat() {
    const er = erkennerRef.current;
    if (!er) return;
    if (aktiv) {
      er._shouldRestart = false;
      er.stop();
      setAktiv(false);
      setInterim("");
    } else {
      er._shouldRestart = true;
      setAktiv(true);
      try { er.start(); } catch {}
    }
  }

  return (
    <div style={{ marginBottom:14 }}>
      {/* Label + Diktat-Button */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <Label>{label}</Label>
        {unterstuetzt && (
          <button onClick={toggleDiktat}
            style={{ background: aktiv ? "var(--red)" : "var(--border)",
              color: aktiv ? "#fff" : "var(--muted)",
              border: aktiv ? `1px solid ${'var(--red)'}` : `1px solid ${'var(--surface2)'}`,
              borderRadius:20, padding:"3px 10px", cursor:"pointer",
              fontSize:11, fontWeight: aktiv ? 700 : 400,
              display:"flex", alignItems:"center", gap:5,
              transition:"all 0.2s" }}>
            {aktiv ? (
              <>
                <span style={{ width:7, height:7, borderRadius:4,
                  background:"#fff", display:"inline-block",
                  animation:"blink 1s infinite" }} />
                Diktat stoppen
              </>
            ) : "🎤 Diktieren"}
          </button>
        )}
      </div>

      {/* Pulsierende Aufnahme-Anzeige */}
      {aktiv && (
        <div style={{ background:"#2E1A1A", borderRadius:8, padding:"8px 12px",
          marginBottom:6, display:"flex", alignItems:"center", gap:8,
          border:`1px solid ${'var(--red)'}44` }}>
          <div style={{ width:8, height:8, borderRadius:4, background: "var(--red)",
            flexShrink:0, animation:"blink 1s infinite" }} />
          <div style={{ flex:1 }}>
            {interim ? (
              <span style={{ color:"#FF9999", fontSize:12, fontStyle:"italic" }}>
                {interim}
              </span>
            ) : (
              <span style={{ color: "var(--muted)", fontSize:12 }}>Sprechen Sie jetzt…</span>
            )}
          </div>
        </div>
      )}

      {/* Textarea */}
      <textarea rows={rows} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={aktiv ? "Diktat läuft…" : "Tippen oder 🎤 Diktieren"}
        style={{ width:"100%", background: aktiv ? "#1A1A2E" : "var(--surface2)",
          color: "var(--text)",
          border:`1px solid ${aktiv ? "var(--red)"+"66" : "var(--border)"}`,
          borderRadius:8, padding:10, fontSize:13, resize:"none",
          boxSizing:"border-box", transition:"border-color 0.2s, background 0.2s" }} />

      <style>{`
        @keyframes blink {
          0%, 100% { opacity:1; }
          50%       { opacity:0.2; }
        }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAGEBUCH (mit Supabase + Foto-Upload + Diktat)
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// PDF EXPORT – Bautagebuch + Betonierprotokoll (via HTML→Print)
// ════════════════════════════════════════════════════════════════════════════

function buildBerichtHTML(bericht, projekt, eigeneFirma, wetter) {
  const datum = bericht.datum || new Date().toLocaleDateString("de-DE");
  const fotos = bericht.bilder || [];
  const logo  = eigeneFirma?.logo || null;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a1a; }
  .page { width:210mm; min-height:297mm; padding:15mm 18mm; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2.5px solid #F5C400; padding-bottom:10px; margin-bottom:16px; }
  .logo { width:60px; height:60px; object-fit:contain; }
  .logo-placeholder { width:60px; height:60px; background:#F5C400; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; }
  .firma-name { font-size:16pt; font-weight:bold; color:#1C2027; }
  .firma-sub { font-size:9pt; color:#666; margin-top:2px; }
  .doc-title { text-align:right; }
  .doc-title h1 { font-size:14pt; font-weight:bold; color:#1C2027; }
  .doc-title .datum { font-size:10pt; color:#666; margin-top:4px; }
  .section { margin-bottom:16px; }
  .section-title { font-size:10pt; font-weight:bold; color:#F5C400; text-transform:uppercase; letter-spacing:0.5px; border-left:3px solid #F5C400; padding-left:8px; margin-bottom:8px; }
  .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
  .field { background:#f8f8f8; border-radius:6px; padding:8px 10px; }
  .field-label { font-size:8pt; color:#888; text-transform:uppercase; letter-spacing:0.3px; }
  .field-value { font-size:11pt; font-weight:bold; margin-top:2px; }
  .wetter-ok { color:#2EAF6A; }
  .wetter-warn { color:#D94040; }
  .text-block { background:#f8f8f8; border-radius:6px; padding:10px 12px; font-size:11pt; line-height:1.6; min-height:40px; }
  .foto-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:8px; }
  .foto-item img { width:100%; aspect-ratio:4/3; object-fit:cover; border-radius:6px; }
  .foto-caption { font-size:8pt; color:#888; margin-top:3px; text-align:center; }
  .kolonne-row { display:flex; justify-content:space-between; padding:6px 10px; background:#f8f8f8; border-radius:5px; margin-bottom:4px; }
  .sig-box { border:1.5px solid #ccc; border-radius:6px; height:60px; margin-top:6px; position:relative; }
  .sig-label { position:absolute; bottom:6px; left:10px; font-size:8pt; color:#888; }
  .sig-date { position:absolute; bottom:6px; right:10px; font-size:8pt; color:#888; }
  .footer { border-top:1px solid #ddd; margin-top:20px; padding-top:8px; font-size:8pt; color:#aaa; display:flex; justify-content:space-between; }
  @media print { .page { padding:10mm 14mm; } }
</style>
</head>
<body>
<div class="page">

  <!-- KOPFZEILE -->
  <div class="header">
    <div style="display:flex;gap:14px;align-items:center;">
      ${logo
        ? `<img class="logo" src="${logo}" alt="Logo"/>`
        : `<div class="logo-placeholder">⚒</div>`}
      <div>
        <div class="firma-name">${eigeneFirma?.name || "Polaris"}</div>
        <div class="firma-sub">${eigeneFirma?.strasse || ""} · ${eigeneFirma?.plz || ""} ${eigeneFirma?.ort || ""}</div>
        <div class="firma-sub">${eigeneFirma?.telefon || ""} · ${eigeneFirma?.email || ""}</div>
      </div>
    </div>
    <div class="doc-title">
      <h1>Bautagebuch</h1>
      <div class="datum">${datum}</div>
      <div class="datum" style="margin-top:2px;font-weight:bold;">${projekt?.name || ""}</div>
      <div class="datum">${projekt?.projektnummer || ""}</div>
    </div>
  </div>

  <!-- STAMMDATEN -->
  <div class="section">
    <div class="section-title">Baustellendaten</div>
    <div class="grid-3">
      <div class="field"><div class="field-label">Baustelle</div><div class="field-value">${projekt?.name || "—"}</div></div>
      <div class="field"><div class="field-label">Bauleiter</div><div class="field-value">${projekt?.bauleiter || "—"}</div></div>
      <div class="field"><div class="field-label">Auftraggeber</div><div class="field-value">${projekt?.auftraggeber || "—"}</div></div>
    </div>
  </div>

  <!-- WETTER -->
  ${wetter ? `
  <div class="section">
    <div class="section-title">Witterungsverhältnisse</div>
    <div class="grid-3">
      <div class="field"><div class="field-label">Temperatur</div><div class="field-value">${wetter.temp}°C</div></div>
      <div class="field"><div class="field-label">Wind</div><div class="field-value">${wetter.wind} km/h</div></div>
      <div class="field"><div class="field-label">Niederschlag</div><div class="field-value">${wetter.rain} mm</div></div>
      <div class="field"><div class="field-label">Luftfeuchte</div><div class="field-value">${wetter.humidity}%</div></div>
      <div class="field"><div class="field-label">Betonierbarkeit</div>
        <div class="field-value ${wetter.temp >= 5 && wetter.wind <= 40 && wetter.rain <= 5 ? "wetter-ok" : "wetter-warn"}">
          ${wetter.temp >= 5 && wetter.wind <= 40 && wetter.rain <= 5 ? "✓ Möglich" : "⚠ Eingeschränkt"}
        </div>
      </div>
    </div>
  </div>` : ""}

  <!-- TÄTIGKEITEN -->
  <div class="section">
    <div class="section-title">Tätigkeiten</div>
    <div class="text-block">${bericht.taetigkeit || "—"}</div>
  </div>

  ${bericht.besonderheiten ? `
  <div class="section">
    <div class="section-title">Besonderheiten / Mängel</div>
    <div class="text-block">${bericht.besonderheiten}</div>
  </div>` : ""}

  ${bericht.material ? `
  <div class="section">
    <div class="section-title">Materiallieferungen</div>
    <div class="text-block">${bericht.material}</div>
  </div>` : ""}

  <!-- KOLONNEN & STUNDEN -->
  ${bericht.kolonnen && bericht.kolonnen.length > 0 ? `
  <div class="section">
    <div class="section-title">Personal &amp; Stunden</div>
    ${bericht.kolonnen.map(k => `
      <div class="kolonne-row">
        <span style="font-weight:bold;">${k.name}</span>
        <span>${k.mitarbeiter?.length || 0} Personen</span>
        <span style="font-weight:bold;">${k.stunden ? k.stunden.toFixed(1) + " h" : "—"}</span>
      </div>`).join("")}
    <div class="kolonne-row" style="background:#F5C400;margin-top:4px;">
      <span style="font-weight:bold;">Gesamt</span>
      <span>${bericht.arbeiter || 0} Personen</span>
      <span style="font-weight:bold;">${bericht.kolonnen.reduce((s,k) => s + (k.stunden || 0), 0).toFixed(1)} h</span>
    </div>
  </div>` : `
  <div class="section">
    <div class="section-title">Personal</div>
    <div class="grid-2">
      <div class="field"><div class="field-label">Arbeiter gesamt</div><div class="field-value">${bericht.arbeiter || 0}</div></div>
      <div class="field"><div class="field-label">Mängel</div><div class="field-value ${bericht.maengel > 0 ? "wetter-warn" : ""}">${bericht.maengel || 0}</div></div>
    </div>
  </div>`}

  <!-- FOTOS -->
  ${fotos.length > 0 ? `
  <div class="section">
    <div class="section-title">Fotodokumentation (${fotos.length} Fotos)</div>
    <div class="foto-grid">
      ${fotos.slice(0, 9).map((url, i) => `
        <div class="foto-item">
          <img src="${url}" alt="Foto ${i+1}"/>
          <div class="foto-caption">Foto ${i+1} · ${datum}</div>
        </div>`).join("")}
    </div>
  </div>` : ""}

  <!-- UNTERSCHRIFTEN -->
  <div class="section" style="margin-top:auto;page-break-inside:avoid;">
    <div class="section-title">Unterschriften</div>
    <div class="grid-2">
      <div>
        <div style="font-size:9pt;color:#666;margin-bottom:4px;">Polier</div>
        <div class="sig-box"><div class="sig-label">${eigeneFirma?.geschaeftsfuehrer || "Polier"}</div><div class="sig-date">${datum}</div></div>
      </div>
      <div>
        <div style="font-size:9pt;color:#666;margin-bottom:4px;">Bauleiter</div>
        <div class="sig-box"><div class="sig-label">${projekt?.bauleiter || "Bauleiter"}</div><div class="sig-date">${datum}</div></div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>Erstellt mit Polaris · ${new Date().toLocaleString("de-DE")}</span>
    <span>${eigeneFirma?.name || ""} · ${projekt?.projektnummer || ""}</span>
  </div>
</div>
</body></html>`;
}

function buildBetonprotokollHTML(feld, projekt, eigeneFirma, wetter) {
  const heute = new Date().toLocaleDateString("de-DE");
  const logo  = eigeneFirma?.logo || null;
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size:11pt; color:#1a1a1a; }
  .page { width:210mm; min-height:297mm; padding:15mm 18mm; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2.5px solid #F5C400; padding-bottom:10px; margin-bottom:16px; }
  .logo { width:55px; height:55px; object-fit:contain; }
  .logo-placeholder { width:55px; height:55px; background:#F5C400; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:22px; }
  .firma-name { font-size:14pt; font-weight:bold; }
  .section-title { font-size:10pt; font-weight:bold; color:#F5C400; text-transform:uppercase; letter-spacing:0.5px; border-left:3px solid #F5C400; padding-left:8px; margin:14px 0 8px; }
  .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px; }
  .grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:8px; }
  .field { background:#f8f8f8; border-radius:5px; padding:8px 10px; }
  .field-label { font-size:8pt; color:#888; text-transform:uppercase; }
  .field-value { font-size:12pt; font-weight:bold; margin-top:2px; }
  .timeline { border-left:3px solid #F5C400; padding-left:14px; margin:8px 0; }
  .timeline-item { margin-bottom:10px; }
  .timeline-time { font-size:9pt; color:#666; }
  .timeline-text { font-size:11pt; }
  .check-row { display:flex; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid #f0f0f0; }
  .check-box { width:16px; height:16px; border:1.5px solid #ccc; border-radius:3px; flex-shrink:0; }
  .sig-box { border:1.5px solid #ccc; border-radius:6px; height:55px; position:relative; margin-top:6px; }
  .sig-label { position:absolute; bottom:5px; left:8px; font-size:8pt; color:#888; }
  .ok { color:#2EAF6A; font-weight:bold; }
  .warn { color:#D94040; font-weight:bold; }
  .footer { border-top:1px solid #ddd; margin-top:16px; padding-top:6px; font-size:8pt; color:#aaa; display:flex; justify-content:space-between; }
  @media print { .page { padding:10mm 14mm; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div style="display:flex;gap:12px;align-items:center;">
      ${logo ? `<img class="logo" src="${logo}" alt="Logo"/>` : `<div class="logo-placeholder">⚒</div>`}
      <div>
        <div class="firma-name">${eigeneFirma?.name || "Polaris"}</div>
        <div style="font-size:9pt;color:#666;">${eigeneFirma?.strasse || ""} · ${eigeneFirma?.ort || ""}</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:14pt;font-weight:bold;">Betonierprotokoll</div>
      <div style="font-size:9pt;color:#666;margin-top:3px;">${heute}</div>
      <div style="font-size:9pt;font-weight:bold;">${projekt?.name || ""}</div>
    </div>
  </div>

  <div class="section-title">Betonfeld</div>
  <div class="grid-3">
    <div class="field"><div class="field-label">Feldbezeichnung</div><div class="field-value">${feld.name}</div></div>
    <div class="field"><div class="field-label">Fläche</div><div class="field-value">${feld.m2} m²</div></div>
    <div class="field"><div class="field-label">Status</div><div class="field-value">${feld.status}</div></div>
    <div class="field"><div class="field-label">Betonsorte</div><div class="field-value">${feld.betonsorte || "—"}</div></div>
    <div class="field"><div class="field-label">Bewehrung</div><div class="field-value" style="font-size:10pt;">${feld.bewehrung || "—"}</div></div>
    <div class="field"><div class="field-label">Festigkeit</div><div class="field-value ${(feld.festigkeit || 0) >= 95 ? "ok" : ""}">${feld.festigkeit ? feld.festigkeit + "%" : "Ausstehend"}</div></div>
  </div>

  ${wetter ? `
  <div class="section-title">Witterung bei Betonage</div>
  <div class="grid-3">
    <div class="field"><div class="field-label">Temperatur</div><div class="field-value">${wetter.temp}°C</div></div>
    <div class="field"><div class="field-label">Wind</div><div class="field-value">${wetter.wind} km/h</div></div>
    <div class="field"><div class="field-label">Niederschlag</div><div class="field-value">${wetter.rain} mm</div></div>
  </div>` : ""}

  <div class="section-title">Betonierablauf</div>
  <div class="timeline">
    ${["Beginn Betonage", "Lieferschein-Nr.", "Einbautemperatur", "Verdichtung", "Nachbehandlung begonnen", "Ende Betonage"].map(item => `
    <div class="timeline-item">
      <div class="timeline-time">___:___ Uhr</div>
      <div class="timeline-text">${item}: ___________________________</div>
    </div>`).join("")}
  </div>

  <div class="section-title">Freigabe-Checkliste</div>
  ${["Bewehrungsabnahme erfolgt", "Schalung geprüft und freigegeben", "Betonierplan genehmigt", "Wetterbedingungen geprüft", "Lieferschein vorhanden", "Verdichtungsprotokoll erstellt"].map(item => `
  <div class="check-row"><div class="check-box"></div><span>${item}</span></div>`).join("")}

  <div class="section-title">Unterschriften</div>
  <div class="grid-2">
    <div><div style="font-size:9pt;color:#666;margin-bottom:4px;">Polier / Verantwortlich</div>
    <div class="sig-box"><div class="sig-label">${eigeneFirma?.geschaeftsfuehrer || "Polier"} · ${heute}</div></div></div>
    <div><div style="font-size:9pt;color:#666;margin-bottom:4px;">Bauleiter / Freigabe</div>
    <div class="sig-box"><div class="sig-label">${projekt?.bauleiter || "Bauleiter"} · ${heute}</div></div></div>
  </div>

  <div class="footer">
    <span>Betonierprotokoll · Polaris · ${new Date().toLocaleString("de-DE")}</span>
    <span>${projekt?.projektnummer || ""}</span>
  </div>
</div>
</body></html>`;
}

function druckePDF(htmlContent, dateiname) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) { alert("Popup-Blocker aktiv — bitte Popups für diese Seite erlauben."); return; }
  win.document.write(htmlContent);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}

function PDFExportButton({ bericht, feld, projekt, eigeneFirma, wetter, kolonnen, typ = "bericht" }) {
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


// ════════════════════════════════════════════════════════════════════════════
// KI-TAGESBERICHT GENERATOR
// ════════════════════════════════════════════════════════════════════════════
async function generiereBerichtKI(diktat, projekt, kolonnen, wetter) {
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

function KIBerichtButton({ onGenerated, projekt, kolonnen, wetter }) {
  const [offen, setOffen]   = useState(false);
  const [diktat, setDiktat] = useState("");
  const [laden, setLaden]   = useState(false);
  const diktierRef = useRef(null);
  const [aufnahme, setAufnahme] = useState(false);

  function startDiktat() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Diktat nicht unterstützt auf diesem Gerät."); return; }
    if (!diktierRef.current) {
      const er = new SR();
      er.lang = "de-DE"; er.continuous = true; er.interimResults = false;
      er.onresult = e => {
        const t = Array.from(e.results).map(r => r[0].transcript).join(" ");
        setDiktat(t);
      };
      er.onend = () => setAufnahme(false);
      diktierRef.current = er;
    }
    if (aufnahme) { diktierRef.current.stop(); setAufnahme(false); }
    else { diktierRef.current.start(); setAufnahme(true); }
  }

  async function generieren() {
    if (!diktat.trim()) return;
    setLaden(true);
    try {
      const result = await generiereBerichtKI(diktat, projekt, kolonnen, wetter);
      onGenerated(result);
      setOffen(false);
      setDiktat("");
    } catch(e) {
      alert("KI-Generierung fehlgeschlagen. Bitte erneut versuchen.");
    }
    setLaden(false);
  }

  return (
    <>
      <button onClick={() => setOffen(true)}
        style={{ background: "var(--blue)", color:"#fff", border:"none", borderRadius:8,
          padding:"6px 14px", fontWeight:700, cursor:"pointer", fontSize:13,
          display:"flex", alignItems:"center", gap:6 }}>
        🤖 KI-Bericht
      </button>

      {offen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:500,
          display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ background: "var(--surface)", borderRadius:"16px 16px 0 0", padding:22,
            width:"100%", maxWidth:520 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:16 }}>🤖 KI-Tagesbericht</div>
              <button onClick={() => setOffen(false)}
                style={{ background:"none", border:"none", color: "var(--muted)", fontSize:22, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ color: "var(--muted)", fontSize:13, marginBottom:12 }}>
              Beschreibe kurz was heute auf der Baustelle passiert ist — die KI erstellt daraus einen vollständigen, professionellen Bericht.
            </div>

            {/* Diktat-Bereich */}
            <div style={{ position:"relative", marginBottom:14 }}>
              <textarea rows={5} value={diktat}
                onChange={e => setDiktat(e.target.value)}
                placeholder="z.B. Heute haben wir die Bodenplatte B1 fertig betoniert. Kolonne Huber war mit 4 Mann da. Nachmittags kam Regen, haben aufgehört. Bewehrung für C1 läuft gut..."
                style={{ width:"100%", background: aufnahme ? "#1A1A2E" : "var(--surface2)",
                  color: "var(--text)", border:`1px solid ${aufnahme ? "var(--red)" : "var(--border)"}`,
                  borderRadius:8, padding:"10px 12px", fontSize:13, resize:"none",
                  boxSizing:"border-box" }} />
              <button onClick={startDiktat}
                style={{ position:"absolute", bottom:10, right:10,
                  background: aufnahme ? "var(--red)" : "var(--border)", color: aufnahme ? "#fff" : "var(--muted)",
                  border:"none", borderRadius:20, padding:"4px 12px", cursor:"pointer", fontSize:12 }}>
                {aufnahme ? "⏹ Stopp" : "🎤 Diktieren"}
              </button>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setOffen(false)}
                style={{ flex:1, background: "var(--border)", color: "var(--muted)", border:"none",
                  borderRadius:10, padding:13, cursor:"pointer" }}>Abbrechen</button>
              <button onClick={generieren} disabled={!diktat.trim() || laden}
                style={{ flex:2, background: diktat.trim() && !laden ? "var(--yellow)" : "var(--border)",
                  color: diktat.trim() && !laden ? "#1C2027" : "var(--muted)",
                  border:"none", borderRadius:10, padding:13, fontWeight:700, cursor:"pointer", fontSize:15 }}>
                {laden ? "⏳ KI schreibt…" : "✨ Bericht generieren"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════════════
const PUSH_VAPID_PUBLIC = "BEl62iUYgUivxIkv69yViEuiBIa40Hi-GJVabpPADEaLJCO1a6-FqZ3mnpBcRjMsYCU7HoEaRLqMkqFbFfBRE";

async function pushBerechtigung() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

async function pushAbonnieren() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: PUSH_VAPID_PUBLIC,
    });
    console.log("[Push] Abonniert:", sub.endpoint);
    return sub;
  } catch(e) {
    console.warn("[Push] Fehler:", e);
    return null;
  }
}

function lokaleNotification(titel, text, tag) {
  if (Notification.permission !== "granted") return;
  new Notification(titel, {
    body:  text,
    icon:  "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    tag:   tag || "polier-pro",
    vibrate: [200, 100, 200],
  });
}

function usePushNotifications(projekte, eigeneFirma) {
  const [erlaubt, setErlaubt] = useState(Notification.permission === "granted");

  useEffect(() => {
    if (!erlaubt) return;
    const now = new Date();
    const stunde = now.getHours();

    // Morgens 6:30: Wetterbriefing
    if (stunde === 6) {
      const heute = projekte.filter(p => p.felder?.some(f => f.status === "in_progress"));
      if (heute.length > 0) {
        lokaleNotification("☀️ Guten Morgen!", `${heute.length} aktive Baustelle${heute.length > 1 ? "n" : ""} — Wetter checken!`, "morgen-wetter");
      }
    }

    // Prüfe verzögerte Felder
    const verzug = projekte.flatMap(p =>
      (p.felder || []).filter(f => f.status !== "done" && f.geplant && new Date(f.geplant) < now)
    );
    if (verzug.length > 0 && stunde === 7) {
      lokaleNotification("⚠️ Felder in Verzug", `${verzug.length} Feld${verzug.length > 1 ? "er" : ""} hinter dem Zeitplan!`, "verzug");
    }

    // Abends 17:00: Tagesbericht-Erinnerung
    if (stunde === 17) {
      const heute = new Date().toLocaleDateString("de-DE");
      const heuteBericht = projekte.some(p =>
        (p.berichte || []).some(b => b.datum === heute)
      );
      if (!heuteBericht) {
        lokaleNotification("📋 Tagesbericht fehlt", "Bitte noch den Tagesbericht für heute erfassen.", "tagesbericht");
      }
    }
  }, [erlaubt, projekte]);

  async function berechtigung() {
    const ok = await pushBerechtigung();
    setErlaubt(ok);
    if (ok) lokaleNotification("✅ Polaris", "Push-Benachrichtigungen aktiv!", "setup");
  }

  return { erlaubt, berechtigung };
}

function PushBanner({ erlaubt, berechtigung }) {
  if (erlaubt) return null;
  return (
    <div style={{ background: "var(--bbg)", borderRadius:12, padding:"12px 16px", marginBottom:12,
      border:`1.5px solid ${'var(--blue)'}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ color: "var(--text)", fontSize:13, fontWeight:700 }}>🔔 Benachrichtigungen aktivieren</div>
        <div style={{ color: "var(--muted)", fontSize:11 }}>Wetterwarnung, Verzug & Tagesbericht-Erinnerung</div>
      </div>
      <button onClick={berechtigung}
        style={{ background: "var(--blue)", color:"#fff", border:"none", borderRadius:8,
          padding:"6px 12px", cursor:"pointer", fontWeight:700, fontSize:12 }}>
        Aktivieren
      </button>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// OFFLINE SYNC – IndexedDB Queue
// ════════════════════════════════════════════════════════════════════════════
const IDB_NAME    = "polier-pro-offline";
const IDB_STORE   = "sync-queue";
const IDB_VERSION = 1;

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE, { autoIncrement: true });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function idbQueue(action, data) {
  const db    = await idbOpen();
  const tx    = db.transaction(IDB_STORE, "readwrite");
  const store = tx.objectStore(IDB_STORE);
  store.add({ action, data, ts: Date.now() });
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

async function idbDrainQueue() {
  const db    = await idbOpen();
  const tx    = db.transaction(IDB_STORE, "readwrite");
  const store = tx.objectStore(IDB_STORE);
  const all   = await new Promise((res, rej) => {
    const req = store.getAll(); req.onsuccess = () => res(req.result); req.onerror = rej;
  });
  const keys = await new Promise((res, rej) => {
    const req = store.getAllKeys(); req.onsuccess = () => res(req.result); req.onerror = rej;
  });

  let synced = 0;
  for (let i = 0; i < all.length; i++) {
    const item = all[i];
    try {
      if (item.action === "save-bericht") {
        await sbFetch("tagesberichte", { method:"POST", body: JSON.stringify(item.data) });
      } else if (item.action === "update-feld") {
        await sbFetch(`betonfelder?id=eq.${item.data.id}`, { method:"PATCH", body: JSON.stringify(item.data) });
      }
      store.delete(keys[i]);
      synced++;
    } catch(e) {
      console.warn("[Offline Sync] Fehler:", e);
    }
  }
  return synced;
}

function useOfflineSync(online, sbConnected) {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    idbOpen().then(db => {
      const tx    = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req   = store.count();
      req.onsuccess = () => setPending(req.result);
    }).catch(() => {});
  }, [online]);

  useEffect(() => {
    if (online && sbConnected && pending > 0) {
      setSyncing(true);
      idbDrainQueue().then(n => {
        setPending(p => Math.max(0, p - n));
        setSyncing(false);
        if (n > 0) lokaleNotification("✅ Synchronisiert", `${n} Eintrag${n > 1 ? "e" : ""} mit Supabase synchronisiert.`, "sync");
      });
    }
  }, [online, sbConnected]);

  async function speichereOffline(action, data) {
    await idbQueue(action, data);
    setPending(p => p + 1);
  }

  return { pending, syncing, speichereOffline };
}

function OfflineSyncBanner({ pending, syncing, online }) {
  if (online && pending === 0 && !syncing) return null;
  return (
    <div style={{ background: syncing ? "var(--gbg)" : pending > 0 ? "#FFF3CC" : "var(--surface2)",
      borderRadius:10, padding:"8px 14px", marginBottom:10,
      border:`1px solid ${syncing ? "var(--green)" : pending > 0 ? "var(--yellow)" : "var(--surface2)"}`,
      display:"flex", alignItems:"center", gap:10 }}>
      <span style={{ fontSize:16 }}>{syncing ? "🔄" : pending > 0 ? "📴" : "✅"}</span>
      <div>
        <div style={{ color: syncing ? "var(--green)" : pending > 0 ? "var(--yellow)" : "var(--text)", fontWeight:700, fontSize:12 }}>
          {syncing ? "Synchronisiere…" : pending > 0 ? `${pending} Einträge offline gespeichert` : "Alles synchronisiert"}
        </div>
        {pending > 0 && !syncing && (
          <div style={{ color: "var(--muted)", fontSize:10 }}>Werden synchronisiert sobald wieder online</div>
        )}
      </div>
    </div>
  );
}

function TagesbuchView({ berichte, setBerichte, sbConnected, projekt, eigeneFirma, kolonnen, offlineSpeichern, aufgaben, setAufgaben }) {
  const [open,       setOpen]       = useState(false);
  const [detail,     setDetail]     = useState(null);
  const [form,       setForm]       = useState({ taetigkeit:"", besonderheiten:"", material:"", arbeiter:0, maengel:0 });
  const [bilder,     setBilder]     = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [wetter,     setWetter]     = useState(null);
  const fileRef = useRef(null);

  // Wetter für PDF laden
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=48.137&longitude=11.576&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=Europe%2FBerlin")
      .then(r => r.json()).then(d => {
        const c = d.current;
        setWetter({ temp: Math.round(c.temperature_2m), wind: Math.round(c.wind_speed_10m), rain: c.precipitation, humidity: c.relative_humidity_2m });
      }).catch(() => {});
  }, []);

  function handleKIGenerated(result) {
    setForm(p => ({ ...p,
      taetigkeit:    result.taetigkeit    || p.taetigkeit,
      besonderheiten:result.besonderheiten|| p.besonderheiten,
      material:      result.material      || p.material,
    }));
    setOpen(true);
  }

  function handleBilderWahl(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setBilder(prev => [...prev, {
          dataUrl: ev.target.result,
          name:    file.name,
          typ:     file.type,
          groesse: (file.size / 1024).toFixed(0) + " KB",
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = ""; // Reset damit gleiche Datei erneut wählbar
  }

  function bildEntfernen(i) {
    setBilder(prev => prev.filter((_, idx) => idx !== i));
  }

  async function uploadBildSupabase(bild, berichtId) {
    if (!sbConnected) return bild.dataUrl; // Fallback: lokal als dataUrl
    try {
      const base64 = bild.dataUrl.split(",")[1];
      const ext    = bild.typ.split("/")[1] || "jpg";
      const pfad   = `tagesberichte/${berichtId}/${Date.now()}.${ext}`;
      // Supabase Storage Upload
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/bautagebuch/${pfad}`, {
        method: "POST",
        headers: {
          "apikey":        SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type":  bild.typ,
        },
        body: Uint8Array.from(atob(base64), c => c.charCodeAt(0)),
      });
      if (!res.ok) return bild.dataUrl;
      return `${SUPABASE_URL}/storage/v1/object/public/bautagebuch/${pfad}`;
    } catch {
      return bild.dataUrl;
    }
  }

  async function saveBericht() {
    setUploading(bilder.length > 0);
    const berichtId = Date.now();
    const bildUrls = await Promise.all(bilder.map(b => uploadBildSupabase(b, berichtId)));
    const wetterStr = wetter ? `${wetter.temp}°C · ${wetter.wind}km/h Wind · ${wetter.rain}mm Regen` : "—";

    const nb = {
      id:             berichtId,
      datum:          new Date().toLocaleDateString("de-DE"),
      datumRaw:       new Date().toISOString().slice(0,10),
      wetter:         wetterStr,
      wetterData:     wetter,
      arbeiter:       Number(form.arbeiter) || 0,
      taetigkeit:     form.taetigkeit,
      besonderheiten: form.besonderheiten,
      material:       form.material,
      maengel:        Number(form.maengel) || 0,
      bilder:         bildUrls,
    };
    setBerichte(prev => [nb, ...prev]);

    const berichtData = { ...form, datum: new Date().toISOString().slice(0,10), bilder: JSON.stringify(bildUrls), wetter: wetterStr };
    if (sbConnected) {
      await sbFetch("tagesberichte", { method:"POST", body: JSON.stringify(berichtData) });
    } else if (offlineSpeichern) {
      await offlineSpeichern("save-bericht", berichtData);
    }
    setUploading(false);
    setOpen(false);
    setForm({ taetigkeit:"", besonderheiten:"", material:"", arbeiter:0, maengel:0 });
    setBilder([]);
  }

  function resetForm() {
    setOpen(false);
    setForm({ taetigkeit:"", besonderheiten:"", material:"", arbeiter:0, maengel:0 });
    setBilder([]);
  }

  return (
    <div>
      <SupabaseStatus connected={sbConnected} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ color: "var(--text)", fontWeight:700 }}>Bautagebuch</div>
        <div style={{ display:"flex", gap:8 }}>
          <KIBerichtButton onGenerated={handleKIGenerated} projekt={projekt} kolonnen={kolonnen} wetter={wetter} />
          <button onClick={() => setOpen(true)}
            style={{ background: "var(--yellow)", color:"#1C2027", border:"none",
              borderRadius:8, padding:"6px 14px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
            + Bericht
          </button>
        </div>
      </div>

      {/* Berichtsliste */}
      {berichte.map((b, i) => (
        <div key={i} onClick={() => setDetail(b)}
          style={{ background:"var(--surface)", borderRadius:14, padding:"16px 18px", marginBottom:12,
            borderLeft:`4px solid ${'var(--yellow)'}`, cursor:"pointer",
            boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, alignItems:"flex-start" }}>
            <div style={{ color: "var(--text)", fontWeight:600 }}>{b.datum}</div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }} onClick={e => e.stopPropagation()}>
              <PDFExportButton bericht={b} projekt={projekt} eigeneFirma={eigeneFirma} wetter={b.wetterData || wetter} kolonnen={kolonnen} typ="bericht" />
              {b.bilder?.length > 0 && (
                <div style={{ background: "var(--blue)"+"33", color: "var(--blue)", fontSize:10, padding:"2px 7px", borderRadius:10 }}>
                  📷 {b.bilder.length}
                </div>
              )}
            </div>
          </div>
          <div style={{ color: "var(--muted)", fontSize:11, marginBottom:4 }}>{b.wetter} · {b.arbeiter} Arbeiter</div>
          <div style={{ color: "var(--text2)", fontSize:13 }}>{b.taetigkeit}</div>
          {b.maengel > 0 && <div style={{ color: "var(--orange)", fontSize:12, marginTop:6 }}>⚠️ {b.maengel} Mängel</div>}
          {b.bilder?.length > 0 && (
            <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
              {b.bilder.slice(0,4).map((url, j) => (
                <img key={j} src={url} alt="" style={{ width:56, height:56, borderRadius:6, objectFit:"cover", border:`1px solid ${'var(--border)'}` }} />
              ))}
              {b.bilder.length > 4 && (
                <div style={{ width:56, height:56, borderRadius:6, background: "var(--border)", display:"flex", alignItems:"center", justifyContent:"center", color: "var(--muted)", fontSize:12, fontWeight:700 }}>
                  +{b.bilder.length - 4}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* ── Detail-Ansicht ── */}
      {detail && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:300,
          overflowY:"auto" }}>
          <div style={{ background: "var(--surface)", minHeight:"100vh", maxWidth:520, margin:"0 auto", padding:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:16 }}>📋 {detail.datum}</div>
              <button onClick={() => setDetail(null)}
                style={{ background: "var(--border)", border:"none", color: "var(--text)",
                  borderRadius:8, padding:"6px 14px", cursor:"pointer" }}>✕ Schließen</button>
            </div>

            {/* Meta */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
              {[
                ["Wetter",    detail.wetter],
                ["Arbeiter",  detail.arbeiter],
                ["Mängel",    detail.maengel || 0],
                ["Fotos",     detail.bilder?.length || 0],
              ].map(([k,v]) => (
                <div key={k} style={{ background: "var(--border)", borderRadius:8, padding:"10px 12px" }}>
                  <div style={{ color: "var(--muted)", fontSize:10 }}>{k}</div>
                  <div style={{ color: "var(--text)", fontWeight:700, fontSize:16 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Textfelder */}
            {[
              ["Tätigkeiten",            detail.taetigkeit],
              ["Besonderheiten / Mängel", detail.besonderheiten],
              ["Materiallieferungen",    detail.material],
            ].filter(([,v]) => v).map(([k,v]) => (
              <div key={k} style={{ marginBottom:14 }}>
                <div style={{ color: "var(--muted)", fontSize:11, marginBottom:4 }}>{k}</div>
                <div style={{ background: "var(--border)", borderRadius:8, padding:"10px 12px",
                  color: "var(--text2)", fontSize:13, lineHeight:1.5 }}>{v}</div>
              </div>
            ))}

            {/* Bilder Galerie */}
            {detail.bilder?.length > 0 && (
              <div>
                <div style={{ color: "var(--muted)", fontSize:11, marginBottom:8 }}>
                  FOTOS ({detail.bilder.length})
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {detail.bilder.map((url, i) => (
                    <img key={i} src={url} alt={`Foto ${i+1}`}
                      onClick={() => window.open(url, "_blank")}
                      style={{ width:"100%", aspectRatio:"4/3", objectFit:"cover",
                        borderRadius:10, cursor:"pointer",
                        border:`1px solid ${'var(--border)'}` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Neuer Bericht Modal ── */}
      {open && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:200,
          display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ background: "var(--surface)", borderRadius:"16px 16px 0 0", padding:22,
            width:"100%", maxWidth:520, maxHeight:"92vh", overflowY:"auto" }}>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:16 }}>
                📋 Tagesbericht – {new Date().toLocaleDateString("de-DE")}
              </div>
              <button onClick={resetForm}
                style={{ background:"none", border:"none", color: "var(--muted)", fontSize:22, cursor:"pointer" }}>✕</button>
            </div>

            {/* Zahlenfelder */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <Label>Arbeiter heute</Label>
                <input type="number" value={form.arbeiter||""}
                  onChange={e => setForm(p=>({...p, arbeiter:e.target.value}))}
                  placeholder="0" style={inputStyle()} />
              </div>
              <div>
                <Label>Mängel</Label>
                <input type="number" value={form.maengel||""}
                  onChange={e => setForm(p=>({...p, maengel:e.target.value}))}
                  placeholder="0" style={inputStyle()} />
              </div>
            </div>

            {/* Textfelder mit Diktierfunktion */}
            {[
              ["Tätigkeiten",             "taetigkeit",    4],
              ["Besonderheiten / Mängel", "besonderheiten",3],
              ["Materiallieferungen",     "material",      2],
            ].map(([label, key, rows]) => (
              <DiktierFeld
                key={key}
                label={label}
                value={form[key]}
                rows={rows}
                onChange={val => setForm(p => ({ ...p, [key]: val }))}
              />
            ))}

            {/* ── Foto Upload ── */}
            <div style={{ marginBottom:18 }}>
              <Label>Fotos ({bilder.length})</Label>
              <input ref={fileRef} type="file" accept="image/*" multiple capture="environment"
                style={{ display:"none" }} onChange={handleBilderWahl} />

              {/* Upload-Button */}
              <div style={{ display:"flex", gap:8, marginTop:6, marginBottom:10 }}>
                <button onClick={() => { fileRef.current.removeAttribute("capture"); fileRef.current.click(); }}
                  style={{ flex:1, background: "var(--border)", color: "var(--text)",
                    border:`1px dashed ${'var(--muted)'}`, borderRadius:10, padding:"10px 0",
                    cursor:"pointer", fontSize:13 }}>
                  📁 Galerie
                </button>
                <button onClick={() => { fileRef.current.setAttribute("capture","environment"); fileRef.current.click(); }}
                  style={{ flex:1, background: "var(--border)", color: "var(--text)",
                    border:`1px dashed ${'var(--muted)'}`, borderRadius:10, padding:"10px 0",
                    cursor:"pointer", fontSize:13 }}>
                  📷 Kamera
                </button>
              </div>

              {/* Vorschau */}
              {bilder.length > 0 && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                  {bilder.map((b, i) => (
                    <div key={i} style={{ position:"relative" }}>
                      <img src={b.dataUrl} alt=""
                        style={{ width:"100%", aspectRatio:"1", objectFit:"cover",
                          borderRadius:8, display:"block" }} />
                      {/* Löschen-Button */}
                      <button onClick={() => bildEntfernen(i)}
                        style={{ position:"absolute", top:4, right:4,
                          background:"rgba(0,0,0,0.65)", border:"none",
                          color:"#fff", borderRadius:12, width:22, height:22,
                          cursor:"pointer", fontSize:12, display:"flex",
                          alignItems:"center", justifyContent:"center", padding:0 }}>
                        ✕
                      </button>
                      <div style={{ color: "var(--muted)", fontSize:9, marginTop:2,
                        textAlign:"center", overflow:"hidden", textOverflow:"ellipsis",
                        whiteSpace:"nowrap" }}>{b.groesse}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Speichern */}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={resetForm}
                style={{ flex:1, background: "var(--border)", color: "var(--muted)",
                  border:"none", borderRadius:8, padding:13, cursor:"pointer" }}>
                Abbrechen
              </button>
              <button onClick={saveBericht} disabled={uploading}
                style={{ flex:2, background: uploading ? "var(--border)" : "var(--yellow)",
                  color: uploading ? "var(--muted)" : "#1C2027",
                  border:"none", borderRadius:8, padding:13, fontWeight:700,
                  cursor: uploading ? "default" : "pointer", fontSize:15 }}>
                {uploading ? "⏳ Bilder werden hochgeladen…"
                  : sbConnected ? "💾 Speichern & Sync" : "💾 Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
function DashboardView({ felder, kolonnen, sbConnected }) {
  const totalM2  = felder.reduce((s,f) => s + f.m2, 0);
  const doneM2   = felder.filter(f => f.status === "done").reduce((s,f) => s + f.m2, 0);
  const totalMann= kolonnen.reduce((s,k) => s + (k.mitarbeiter?.length || k.mitglieder || 0), 0);
  const offen    = felder.filter(f => f.status !== "done").length;
  const delayed  = felder.filter(f => f.status !== "done" && new Date(f.geplant) < new Date("2025-06-22")).length;

  return (
    <div>
      <WeatherView compact />
      <PushBanner erlaubt={push?.erlaubt} berechtigung={push?.berechtigung} />
      <OfflineSyncBanner pending={offline?.pending} syncing={offline?.syncing} online={!pwa?.offline} />
      <SupabaseStatus connected={sbConnected} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {[
          { l:"m² betoniert", v:`${doneM2}/${totalM2}`, u:"m²", col: "var(--green)" },
          { l:"Mann heute",   v:totalMann,               u:"",   col: "var(--yellow)"  },
          { l:"Felder offen", v:offen,                   u:"",   col: "var(--muted)" },
          { l:"Verzug",       v:delayed,                 u:"",   col: delayed > 0 ? "var(--red)" : "var(--green)" },
        ].map(k => (
          <div key={k.l} style={{ background: "var(--surface)", borderRadius:10, padding:"14px 16px", borderBottom:`3px solid ${k.col}` }}>
            <div style={{ color: "var(--muted)", fontSize:11, textTransform:"uppercase", letterSpacing:0.8 }}>{k.l}</div>
            <div style={{ color: "var(--text)", fontSize:24, fontWeight:800 }}>{k.v}<span style={{ fontSize:12, fontWeight:400, marginLeft:2 }}>{k.u}</span></div>
          </div>
        ))}
      </div>
      <div style={{ color: "var(--text)", fontWeight:700, marginBottom:10 }}>Aktive Kolonnen</div>
      {kolonnen.map(k => (
        <div key={k.id} style={{ background: "var(--surface)", borderRadius:8, padding:"10px 14px", marginBottom:8,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color: "var(--text)", fontSize:13, fontWeight:600 }}>{k.name}</div>
            <div style={{ color: "var(--muted)", fontSize:12 }}>{k.einsatz}</div>
          </div>
          <div style={{ color: "var(--yellow)", fontSize:13, fontWeight:700 }}>👷 {k.mitglieder}</div>
        </div>
      ))}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// MANUELLER EDITOR – Raster-Generator + Einzelfeld + Abhängigkeiten
// ════════════════════════════════════════════════════════════════════════════
const PRAEFIX_OPTIONEN = ["A","B","C","D","E","F"];

// ─── Projekttyp-Konfiguration ────────────────────────────────────────────────
// Gewerk-Definitionen für Hochbau-Ausbau
const HOCHBAU_GEWERKE = {
  rohbau: {
    label: "Rohbau / Beton",
    icon: "🏗️",
    einheitLabel: "Betonfeld",
    einheitenPl: "Felder",
    feldTypen: ["Fundament", "Bodenplatte", "Wand", "Stütze", "Decke", "Treppe", "Balkon", "Fertigteil"],
    bewehrung: ["BSt 500, Ø8, 20cm", "BSt 500, Ø10, 15cm", "BSt 500, Ø12, 15cm", "BSt 500, Ø14, 12cm", "BSt 500, Ø16, 10cm", "Keine / Unbewehrt"],
    extraFelder: [
      { key: "betonsorte", label: "Betonsorte", type: "select", optionen: ["C20/25 XC1", "C25/30 XC2", "C30/37 XC3", "C35/45 XC4", "Sonstige"] },
      { key: "festigkeit", label: "Festigkeit (%)", type: "number", placeholder: "0–100" },
    ],
    namePlaceholder: "z.B. A1 – Bodenplatte Nord",
    fortschrittLabel: "Felder betoniert",
    betonCheck: true,
  },
  elektro: {
    label: "Elektroinstallation",
    icon: "⚡",
    einheitLabel: "Bereich",
    einheitenPl: "Bereiche",
    feldTypen: ["Unterverteilung", "Leitungsverlegung", "Steckdosen / Schalter", "Beleuchtung", "Kabeltrasse", "Hausanschluss", "Zähleranlage", "Blitzschutz", "Photovoltaik-Anbindung"],
    bewehrung: [],
    extraFelder: [
      { key: "elektro_phase", label: "Installationsphase", type: "select", optionen: ["Vorinstallation (Leerrohre)", "Rohinstallation (Kabel)", "Endinstallation", "Prüfung / Abnahme", "Abgenommen"] },
      { key: "stromkreise", label: "Stromkreise (Anz.)", type: "number", placeholder: "0" },
      { key: "norm", label: "Norm / Prüfung", type: "select", optionen: ["VDE 0100 ausstehend", "VDE 0100 geprüft", "E-Check bestanden", "Brandschutz geprüft"] },
    ],
    namePlaceholder: "z.B. EG – Wohnbereich West",
    fortschrittLabel: "Bereiche abgenommen",
    betonCheck: false,
  },
  sanitaer: {
    label: "Sanitärinstallation",
    icon: "🚿",
    einheitLabel: "Einheit",
    einheitenPl: "Einheiten",
    feldTypen: ["Trinkwasser kalt", "Trinkwasser warm", "Abwasser", "Regenwasser", "Badezimmer", "Küche", "WC", "Technikraum", "Außenzapfstelle"],
    bewehrung: [],
    extraFelder: [
      { key: "sanitaer_phase", label: "Installationsphase", type: "select", optionen: ["Vorinstallation (Schlitze/Kernbohrungen)", "Rohinstallation (Leitungen)", "Endinstallation (Armaturen)", "Druckprüfung", "Abgenommen"] },
      { key: "druckprobe", label: "Druckprobe", type: "select", optionen: ["Ausstehend", "Bestanden", "Nicht bestanden", "Nicht erforderlich"] },
      { key: "daemmung", label: "Rohrdämmung", type: "select", optionen: ["Keine", "Ausstehend", "Teilweise", "Vollständig"] },
    ],
    namePlaceholder: "z.B. OG – Bad Nordseite",
    fortschrittLabel: "Einheiten abgenommen",
    betonCheck: false,
  },
  heizung: {
    label: "Heizung / HLKS",
    icon: "🔥",
    einheitLabel: "Bereich",
    einheitenPl: "Bereiche",
    feldTypen: ["Heizkessel / Wärmepumpe", "Verteilung / Verteiler", "Heizkörper", "Fußbodenheizung", "Lüftungsanlage", "Kälteanlage", "Solar-Thermie", "Übergabestation"],
    bewehrung: [],
    extraFelder: [
      { key: "heizung_typ", label: "Heizsystem", type: "select", optionen: ["Gas-Brennwert", "Wärmepumpe Luft", "Wärmepumpe Erde", "Pellet", "Fernwärme", "Elektro", "Hybrid"] },
      { key: "heizung_phase", label: "Montagephase", type: "select", optionen: ["Rohinstallation", "Endmontage", "Befüllung / Entlüftung", "Inbetriebnahme", "Abgenommen"] },
      { key: "druckprobe", label: "Druckprobe", type: "select", optionen: ["Ausstehend", "Bestanden", "Nicht bestanden"] },
    ],
    namePlaceholder: "z.B. Heizzentrale UG",
    fortschrittLabel: "Bereiche in Betrieb",
    betonCheck: false,
  },
  estrich: {
    label: "Estrich",
    icon: "🪨",
    einheitLabel: "Fläche",
    einheitenPl: "Flächen",
    feldTypen: ["Zementestrich", "Anhydritestrich", "Trockenestrich", "Heizestrich (FBH)", "Gefälleestrich", "Industrieestrich"],
    bewehrung: ["Keine", "Estrichdrahtgitter 50×50", "Glasfasergewebe", "Stahlnadeln / PP-Fasern"],
    extraFelder: [
      { key: "estrich_typ", label: "Estrichart", type: "select", optionen: ["Zementestrich CT", "Anhydritestrich CA", "Trockenestrich", "Gussasphalt", "Kunstharzestrich"] },
      { key: "schichtdicke", label: "Schichtdicke (mm)", type: "number", placeholder: "z.B. 60" },
      { key: "trockenzeit", label: "Trocknungszeit (Tage)", type: "number", placeholder: "z.B. 28" },
      { key: "belegreife", label: "Belegreife", type: "select", optionen: ["Ausstehend", "Gemessen – nicht belegreif", "Belegreif", "Belegt"] },
    ],
    namePlaceholder: "z.B. EG – Wohnbereich (85m²)",
    fortschrittLabel: "Flächen belegreif",
    betonCheck: false,
  },
  innenausbau: {
    label: "Innenausbau / Trockenbau",
    icon: "🪚",
    einheitLabel: "Bereich",
    einheitenPl: "Bereiche",
    feldTypen: ["Trennwand GK", "Unterdecke", "Vorsatzschale", "Bekleidung", "Brandschutzwand", "Schachtverkleidung", "Fensterbänke", "Türen / Zargen"],
    bewehrung: [],
    extraFelder: [
      { key: "ausbau_phase", label: "Phase", type: "select", optionen: ["Planung", "Ständerwerk", "Beplankung 1. Lage", "Beplankung 2. Lage", "Verspachtelung", "Fertig"] },
      { key: "brandschutz", label: "Brandschutz", type: "select", optionen: ["Nicht erforderlich", "F30 ausstehend", "F30 abgenommen", "F60 ausstehend", "F60 abgenommen", "F90 abgenommen"] },
    ],
    namePlaceholder: "z.B. OG Flur – Trennwände",
    fortschrittLabel: "Bereiche fertig",
    betonCheck: false,
  },
  fliesen: {
    label: "Fliesen / Beläge",
    icon: "🟫",
    einheitLabel: "Fläche",
    einheitenPl: "Flächen",
    feldTypen: ["Bodenfliesen", "Wandfliesen", "Außenfliesen", "Naturstein", "Parkett", "Laminat", "Teppich", "Vinyl / LVT"],
    bewehrung: [],
    extraFelder: [
      { key: "belag_material", label: "Material", type: "text", placeholder: "z.B. Feinsteinzeug 60×60" },
      { key: "verlegung", label: "Verlegemuster", type: "select", optionen: ["Reihenverband", "Versatz 1/3", "Versatz 1/2", "Diagonal", "Fischgrät", "Freies Muster"] },
      { key: "belag_phase", label: "Status", type: "select", optionen: ["Untergrund vorbereiten", "Fliesenarbeiten", "Verfugung", "Abgenommen"] },
    ],
    namePlaceholder: "z.B. EG Bad – Boden (12m²)",
    fortschrittLabel: "Flächen verlegt",
    betonCheck: false,
  },
};

const PROJEKTTYPEN = {
  hochbau: {
    label: "Hausbau / Hochbau",
    icon: "🏠",
    einheitLabel: "Position",
    einheitenPl: "Positionen",
    feldTypen: Object.values(HOCHBAU_GEWERKE).flatMap(g => g.feldTypen),
    bewehrung: HOCHBAU_GEWERKE.rohbau.bewehrung,
    betonsorte: ["C20/25 XC1", "C25/30 XC2", "C30/37 XC3", "C35/45 XC4", "Sonstige"],
    gewerke: HOCHBAU_GEWERKE,
    extraFelder: [
      { key: "gewerk", label: "Gewerk", type: "select",
        optionen: Object.entries(HOCHBAU_GEWERKE).map(([k,g]) => `${g.icon} ${g.label}`) },
    ],
    namePlaceholder: "z.B. EG – Bodenplatte / Bad Nord",
    fortschrittLabel: "Positionen fertig",
  },
  tiefgarage: {
    label: "Tiefgarage / Parkdeck",
    icon: "🅿️",
    einheitLabel: "Abschnitt",
    einheitenPl: "Abschnitte",
    feldTypen: ["Bodenplatte", "Wand", "Stütze", "Decke", "Rampe", "Widerlager", "Entwässerung"],
    bewehrung: ["BSt 500, Ø10, 15cm", "BSt 500, Ø12, 15cm", "BSt 500, Ø14, 12cm", "BSt 500, Ø16, 10cm", "BSt 500, Ø20, 10cm", "Doppelkopfanker"],
    betonsorte: ["C25/30 XC2 WU", "C30/37 XC3 WU", "C35/45 XC4 WU", "C30/37 XF1", "Sonstige"],
    extraFelder: [],
    namePlaceholder: "z.B. TG-A1 – Ebene -1 West",
    fortschrittLabel: "Abschnitte fertig",
  },
  tiefbau: {
    label: "Tiefbau / Straße",
    icon: "🛣️",
    einheitLabel: "Abschnitt",
    einheitenPl: "Abschnitte",
    feldTypen: ["Fahrbahn", "Gehweg", "Randstreifen", "Bordstein", "Entwässerungsrinne", "Kreuzungsbereich", "Brückenkappe"],
    bewehrung: ["Bewehrungsmatte Q188", "Bewehrungsmatte Q257", "Bewehrungsmatte Q335", "Bewehrungsmatte Q524", "BSt 500, Ø12, 15cm", "Unbewehrt / Magerbeton"],
    betonsorte: ["C30/37 XF4", "C35/45 XF4", "C40/50 XF4 XM", "C30/37 XF2", "Magerbeton C8/10", "Sonstige"],
    extraFelder: [],
    namePlaceholder: "z.B. FA-001 – Fahrbahn km 0+000",
    fortschrittLabel: "Abschnitte betoniert",
  },
  dach: {
    label: "Dach",
    icon: "🏚️",
    einheitLabel: "Fläche",
    einheitenPl: "Flächen",
    feldTypen: ["Hauptfläche", "Gaube", "Traufe", "First", "Ortgang", "Kehle", "Dachflächenfenster", "Kaminanschluss"],
    bewehrung: ["Nicht zutreffend"],
    betonsorte: ["Nicht zutreffend"],
    extraFelder: [
      { key: "material",     label: "Dachmaterial",      type: "select", optionen: ["Dachziegel Ton", "Dachziegel Beton", "Bitumenschindeln", "Stehfalzblech", "Trapezblech", "Gründach", "Flachdach EPDM"] },
      { key: "eingedeckt_m2", label: "Eingedeckt (m²)", type: "number", placeholder: "0" },
      { key: "daemmung",     label: "Dämmung",            type: "select", optionen: ["Keine", "Zwischensparren", "Aufsparren", "Untersparren", "Vollsparren"] },
    ],
    namePlaceholder: "z.B. Nordseite – Hauptfläche",
    fortschrittLabel: "Flächen eingedeckt",
  },
  pv: {
    label: "PV-Anlage",
    icon: "☀️",
    einheitLabel: "Modul-Reihe",
    einheitenPl: "Reihen",
    feldTypen: ["Modulreihe", "Wechselrichter", "DC-Verkabelung", "AC-Verkabelung", "Einspeisepunkt", "Montagegestell", "Erdung"],
    bewehrung: ["Nicht zutreffend"],
    betonsorte: ["Nicht zutreffend"],
    extraFelder: [
      { key: "module_anzahl",  label: "Module (Stk.)",     type: "number", placeholder: "0" },
      { key: "kwp",            label: "Leistung (kWp)",    type: "number", placeholder: "0.0" },
      { key: "elektro_status", label: "Elektroinstallation", type: "select", optionen: ["Ausstehend", "In Arbeit", "Abgeschlossen", "Abgenommen"] },
      { key: "modul_typ",      label: "Modultyp",           type: "text",   placeholder: "z.B. Jinko 440W" },
    ],
    namePlaceholder: "z.B. Reihe A – Südseite (12 Module)",
    fortschrittLabel: "Reihen installiert",
  },
};

function typConfig(typ) {
  return PROJEKTTYPEN[typ] || PROJEKTTYPEN.hochbau;
}


function leererFeld(id, name, m2, geplant) {
  return { id, name, m2: m2||0, geplant: geplant||"", dauer_tage:1, betonsorte:"C25/30 XC2", bewehrung:"BSt 500, Ø12, 15cm", abhaengigkeiten:[], status:"planned", festigkeit:null, betoniert:null };
}

function RasterGenerator({ onGenerate }) {
  const [zeilen,  setZeilen]  = useState(2);
  const [spalten, setSpalten] = useState(3);
  const [praefix, setPraefix] = useState("A");
  const [m2,      setM2]      = useState(80);
  const [geplant, setGeplant] = useState("2025-07-01");
  const [schema,  setSchema]  = useState("alpha"); // alpha | num

  const vorschau = [];
  for (let z = 0; z < zeilen; z++) {
    for (let s = 0; s < spalten; s++) {
      const nr = schema === "alpha"
        ? `${PRAEFIX_OPTIONEN[z]||z+1}${s+1}`
        : `${praefix}${z * spalten + s + 1}`;
      vorschau.push(nr);
    }
  }

  function generate() {
    const felder = vorschau.map((name, i) => leererFeld(Date.now()+i, name, m2, geplant));
    onGenerate(felder);
  }

  return (
    <div style={{ background: "var(--surface)", borderRadius:14, padding:18, marginBottom:16 }}>
      <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:15, marginBottom:14 }}>🔲 Raster generieren</div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
        {/* Zeilen */}
        <div>
          <Label>Zeilen</Label>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <StepBtn onClick={() => setZeilen(z => Math.max(1,z-1))}>−</StepBtn>
            <span style={{ color: "var(--text)", fontWeight:700, fontSize:20, minWidth:24, textAlign:"center" }}>{zeilen}</span>
            <StepBtn onClick={() => setZeilen(z => Math.min(10,z+1))}>+</StepBtn>
          </div>
        </div>
        {/* Spalten */}
        <div>
          <Label>Spalten</Label>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <StepBtn onClick={() => setSpalten(s => Math.max(1,s-1))}>−</StepBtn>
            <span style={{ color: "var(--text)", fontWeight:700, fontSize:20, minWidth:24, textAlign:"center" }}>{spalten}</span>
            <StepBtn onClick={() => setSpalten(s => Math.min(12,s+1))}>+</StepBtn>
          </div>
        </div>
        {/* m² */}
        <div>
          <Label>Standard m² / Feld</Label>
          <input type="number" value={m2} onChange={e => setM2(+e.target.value)}
            style={inputStyle()} />
        </div>
        {/* Startdatum */}
        <div>
          <Label>Starttermin</Label>
          <input type="date" value={geplant} onChange={e => setGeplant(e.target.value)}
            style={inputStyle()} />
        </div>
      </div>

      {/* Nummernschema */}
      <div style={{ marginBottom:14 }}>
        <Label>Nummernschema</Label>
        <div style={{ display:"flex", gap:8 }}>
          {[["alpha","A1, B2, C3…"],["num","Präfix + lfd. Nr."]].map(([v,l]) => (
            <button key={v} onClick={() => setSchema(v)}
              style={{ flex:1, background: schema===v ? "var(--yellow)" : "var(--surface2)",
                color: schema===v ? "#1C2027" : "var(--muted)",
                border:"none", borderRadius:8, padding:"8px 0", cursor:"pointer", fontSize:12, fontWeight: schema===v ? 700 : 400 }}>
              {l}
            </button>
          ))}
        </div>
        {schema === "num" && (
          <div style={{ marginTop:8 }}>
            <Label>Präfix</Label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {PRAEFIX_OPTIONEN.map(p => (
                <button key={p} onClick={() => setPraefix(p)}
                  style={{ background: praefix===p ? "var(--yellow)" : "var(--surface2)", color: praefix===p ? "#1C2027" : "var(--muted)",
                    border:"none", borderRadius:6, padding:"4px 12px", cursor:"pointer", fontWeight:700 }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vorschau-Raster */}
      <div style={{ marginBottom:14 }}>
        <Label>Vorschau ({zeilen * spalten} Felder)</Label>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${spalten}, 1fr)`, gap:4 }}>
          {vorschau.map((name, i) => (
            <div key={i} style={{ background: "var(--border)", borderRadius:6, padding:"6px 4px", textAlign:"center",
              color: "var(--text2)", fontSize:11, fontWeight:600, border:`1px solid ${'var(--surface2)'}` }}>
              {name}
            </div>
          ))}
        </div>
      </div>

      <button onClick={generate}
        style={{ width:"100%", background: "var(--yellow)", color:"#1C2027", border:"none",
          borderRadius:10, padding:13, fontWeight:700, cursor:"pointer", fontSize:15 }}>
        ✅ {zeilen * spalten} Felder erstellen
      </button>
    </div>
  );
}

function FeldEditor({ feld, allFelder, onSave, onDelete, onClose, projektTyp, projSubs=[] }) {
  const [f, setF] = useState({ ...feld });
  const cfg = typConfig(projektTyp);

  // For Hochbau: derive active Gewerk config from selected gewerk field
  const aktivGewerk = projektTyp === "hochbau" && f.gewerk
    ? Object.values(HOCHBAU_GEWERKE).find(g => f.gewerk.includes(g.label))
    : null;
  const aktivCfg = aktivGewerk || cfg;

  function toggleAbh(id) {
    setF(prev => ({
      ...prev,
      abhaengigkeiten: prev.abhaengigkeiten.includes(id)
        ? prev.abhaengigkeiten.filter(x => x !== id)
        : [...prev.abhaengigkeiten, id],
    }));
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", backdropFilter:"blur(4px)", zIndex:300,
      display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background: "var(--surface)", borderRadius:"16px 16px 0 0", padding:20,
        width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:16 }}>
            {feld.id ? "✏️ Position bearbeiten" : "➕ Neue Position"}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color: "var(--muted)", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        {/* Gewerk-Auswahl (nur Hochbau) */}
        {projektTyp === "hochbau" && (
          <div style={{ marginBottom:16 }}>
            <Label>Gewerk *</Label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginTop:6 }}>
              {Object.values(HOCHBAU_GEWERKE).map(g => {
                const aktiv = f.gewerk?.includes(g.label);
                return (
                  <div key={g.label} onClick={() => setF(p => ({ ...p, gewerk: `${g.icon} ${g.label}`, bewehrung:"", name: p.name || "" }))}
                    style={{ background: aktiv ? "var(--surface2)" : "var(--border)",
                      border:`2px solid ${aktiv ? "var(--yellow)" : "transparent"}`,
                      borderRadius:9, padding:"8px 10px", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ fontSize:18 }}>{g.icon}</span>
                    <span style={{ color: aktiv ? "var(--text)" : "var(--muted)", fontSize:11, fontWeight: aktiv ? 700 : 400 }}>{g.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Feldname */}
        <div style={{ marginBottom:12 }}>
          <Label>{cfg.einheitLabel}name / Nummer *</Label>
          {/* Schnellauswahl Feldtyp */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:6 }}>
            {aktivCfg.feldTypen.map(t => (
              <button key={t} onClick={() => setF(p=>({...p, name: f.name ? f.name : t}))}
                style={{ background: "var(--border)", color: "var(--muted)", border:"none", borderRadius:6,
                  padding:"4px 9px", cursor:"pointer", fontSize:11 }}>{t}</button>
            ))}
          </div>
          <input value={f.name} onChange={e => setF(p=>({...p,name:e.target.value}))}
            placeholder={cfg.namePlaceholder} style={inputStyle()} />
        </div>

        {/* m² + Dauer */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <div>
            <Label>Fläche (m²) *</Label>
            <input type="number" value={f.m2||""} onChange={e => setF(p=>({...p,m2:+e.target.value}))}
              placeholder="120" style={inputStyle()} />
          </div>
          <div>
            <Label>Dauer (Tage)</Label>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
              <StepBtn onClick={() => setF(p=>({...p,dauer_tage:Math.max(1,p.dauer_tage-1)}))}>−</StepBtn>
              <span style={{ color: "var(--text)", fontWeight:700, fontSize:18, minWidth:20, textAlign:"center" }}>{f.dauer_tage}</span>
              <StepBtn onClick={() => setF(p=>({...p,dauer_tage:p.dauer_tage+1}))}>+</StepBtn>
            </div>
          </div>
        </div>

        {/* Termin */}
        <div style={{ marginBottom:12 }}>
          <Label>{aktivCfg.betonCheck === false ? "Geplanter Termin" : "Betoniertermin"}</Label>
          <input type="date" value={f.geplant||""} onChange={e => setF(p=>({...p,geplant:e.target.value}))}
            style={inputStyle()} />
        </div>

        {/* Typ-spezifische Extrafelder (Dach, PV) */}
        {(aktivCfg.extraFelder||[]).map(ef => (
          <div key={ef.key} style={{ marginBottom:12 }}>
            <Label>{ef.label}</Label>
            {ef.type === "select" ? (
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:6 }}>
                {ef.optionen.map(o => (
                  <button key={o} onClick={() => setF(p=>({...p,[ef.key]:o}))}
                    style={{ background: f[ef.key]===o ? "var(--blue)" : "var(--border)",
                      color: f[ef.key]===o ? "#fff" : "var(--muted)",
                      border:"none", borderRadius:7, padding:"5px 9px", cursor:"pointer", fontSize:11 }}>
                    {o}
                  </button>
                ))}
              </div>
            ) : (
              <input type={ef.type} value={f[ef.key]||""} onChange={e => setF(p=>({...p,[ef.key]:e.target.value}))}
                placeholder={ef.placeholder||""} style={inputStyle()} />
            )}
          </div>
        ))}

        {/* Bewehrung – nur bei Beton-Typen */}
        {(aktivCfg.bewehrung||[]).length > 0 && !aktivCfg.bewehrung?.[0]?.startsWith("Nicht") && (
        <div style={{ marginBottom:12 }}>
          <Label>Bewehrung</Label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:6 }}>
            {(aktivCfg.bewehrung||[]).map(o => (
              <button key={o} onClick={() => setF(p=>({...p,bewehrung:o}))}
                style={{ background: f.bewehrung===o ? "var(--blue)" : "var(--border)",
                  color: f.bewehrung===o ? "#fff" : "var(--muted)",
                  border:"none", borderRadius:7, padding:"5px 10px", cursor:"pointer", fontSize:11 }}>
                {o}
              </button>
            ))}
          </div>
          <input value={f.bewehrung||""} onChange={e => setF(p=>({...p,bewehrung:e.target.value}))}
            placeholder="Oder eigene Eingabe…" style={inputStyle()} />
        </div>
        )}

        {/* Sub-Zuweisung auf Feldebene */}
        {projSubs.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <Label>🏢 Subunternehmer für dieses Feld</Label>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:6 }}>
              {projSubs.map(s => {
                const aktiv = (f.subIds||[]).includes(s.id);
                return (
                  <div key={s.id} onClick={() => setF(p => ({
                    ...p, subIds: aktiv
                      ? (p.subIds||[]).filter(x=>x!==s.id)
                      : [...(p.subIds||[]), s.id]
                  }))}
                    style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                      background: aktiv ? "#1A2040" : "var(--surface2)",
                      border:`1.5px solid ${aktiv ? "var(--blue)" : "var(--border)"}`,
                      borderRadius:9, padding:"9px 12px", cursor:"pointer" }}>
                    <div>
                      <div style={{ color: "var(--text)", fontSize:13, fontWeight: aktiv ? 700 : 400 }}>{s.name}</div>
                      <div style={{ display:"flex", gap:6, marginTop:2 }}>
                        {s.gewerke.map(k => {
                          const g = ALLE_GEWERKE.find(x=>x.key===k);
                          return g ? <span key={k} style={{ color: "var(--muted)", fontSize:10 }}>{g.icon} {g.label}</span> : null;
                        })}
                        {s.stundensatz > 0 && <span style={{ color: "var(--muted)", fontSize:10 }}>· {s.stundensatz}€/Std.</span>}
                      </div>
                    </div>
                    <div style={{ fontSize:18 }}>{aktiv ? "🔵" : "⚪"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Abhängigkeiten */}
        {allFelder.filter(x => x.id !== f.id).length > 0 && (
          <div style={{ marginBottom:16 }}>
            <Label>🔗 Abhängigkeiten – muss fertig sein vor diesem Feld</Label>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:6 }}>
              {allFelder.filter(x => x.id !== f.id).map(x => {
                const active = f.abhaengigkeiten.includes(x.id);
                return (
                  <div key={x.id} onClick={() => toggleAbh(x.id)}
                    style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                      background: active ? "#1A2A3A" : "var(--surface2)",
                      border:`1.5px solid ${active ? "var(--blue)" : "var(--border)"}`,
                      borderRadius:9, padding:"9px 12px", cursor:"pointer" }}>
                    <div>
                      <div style={{ color: "var(--text)", fontSize:13, fontWeight: active ? 700 : 400 }}>{x.name}</div>
                      <div style={{ color: "var(--muted)", fontSize:11 }}>{x.m2} m² · {x.status}</div>
                    </div>
                    <div style={{ fontSize:18 }}>{active ? "🔵" : "⚪"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display:"flex", gap:10 }}>
          {feld.id && (
            <button onClick={() => onDelete(f.id)}
              style={{ background:"#2E1A1A", color: "var(--red)", border:`1px solid ${'var(--red)'}`,
                borderRadius:10, padding:"12px 16px", cursor:"pointer", fontSize:13 }}>
              🗑️
            </button>
          )}
          <button onClick={onClose}
            style={{ flex:1, background: "var(--border)", color: "var(--muted)", border:"none", borderRadius:10, padding:13, cursor:"pointer" }}>
            Abbrechen
          </button>
          <button onClick={() => onSave(f)} disabled={!f.name || !f.m2}
            style={{ flex:2, background: f.name && f.m2 ? "var(--yellow)" : "var(--border)",
              color: f.name && f.m2 ? "#1C2027" : "var(--muted)",
              border:"none", borderRadius:10, padding:13, fontWeight:700, cursor:"pointer", fontSize:15 }}>
            💾 Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

function EditorView({ felder, setFelder, projektTyp }) {
  const cfg = typConfig(projektTyp);
  const [showRaster, setShowRaster] = useState(false);
  const [editFeld,   setEditFeld]   = useState(null); // null | {} (neu) | {…} (bestehend)
  const [filter,     setFilter]     = useState("all");

  function handleGenerate(neuFelder) {
    setFelder(prev => {
      const maxId = prev.reduce((m,f) => Math.max(m,f.id), 0);
      return [...prev, ...neuFelder.map((f,i) => ({ ...f, id: maxId+i+1 }))];
    });
    setShowRaster(false);
  }

  function handleSave(f) {
    setFelder(prev => prev.some(x => x.id===f.id)
      ? prev.map(x => x.id===f.id ? f : x)
      : [...prev, { ...f, id: Date.now() }]
    );
    setEditFeld(null);
  }

  function handleDelete(id) {
    setFelder(prev => prev
      .filter(f => f.id !== id)
      .map(f => ({ ...f, abhaengigkeiten: (f.abhaengigkeiten||[]).filter(x => x !== id) }))
    );
    setEditFeld(null);
  }

  const filtered = filter==="all" ? felder : felder.filter(f => f.status===filter);

  return (
    <div>
      {/* Aktionsleiste */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <button onClick={() => setShowRaster(s => !s)}
          style={{ flex:1, background: showRaster ? "var(--yellow)" : "var(--surface)",
            color: showRaster ? "#1C2027" : "var(--text)", border:`1px solid ${showRaster ? "var(--yellow)" : "var(--border)"}`,
            borderRadius:10, padding:"10px 0", cursor:"pointer", fontWeight:700, fontSize:13 }}>
          🔲 Raster
        </button>
        <button onClick={() => setEditFeld({ name:"", m2:0, geplant:"", dauer_tage:1, bewehrung:"", abhaengigkeiten:[], status:"planned" })}
          style={{ flex:1, background: "var(--surface)", color: "var(--text)", border:`1px solid ${'var(--border)'}`,
            borderRadius:10, padding:"10px 0", cursor:"pointer", fontWeight:700, fontSize:13 }}>
          ➕ {cfg.einheitLabel}
        </button>
      </div>

      {/* Raster-Generator */}
      {showRaster && <RasterGenerator onGenerate={handleGenerate} />}

      {/* Filter */}
      <div style={{ display:"flex", gap:6, marginBottom:12, overflowX:"auto" }}>
        {[["all","Alle"],["planned","Geplant"],["in_progress","Aktiv"],["done","Fertig"],["blocked","Blockiert"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ background: filter===v ? "var(--yellow)" : "var(--surface)", color: filter===v ? "#1C2027" : "var(--muted)",
              border:"none", borderRadius:20, padding:"5px 12px", cursor:"pointer", fontSize:12,
              fontWeight: filter===v ? 700 : 400, whiteSpace:"nowrap" }}>
            {l} {v==="all" ? `(${felder.length})` : `(${felder.filter(f=>f.status===v).length})`}
          </button>
        ))}
      </div>

      {/* Feldliste */}
      {filtered.length === 0 ? (
        <div style={{ background: "var(--surface)", borderRadius:12, padding:32, textAlign:"center" }}>
          <div style={{ fontSize:36 }}>🏗️</div>
          <div style={{ color: "var(--muted)", marginTop:10 }}>Noch keine Felder angelegt.<br/>Raster generieren oder Einzelfeld hinzufügen.</div>
        </div>
      ) : filtered.map(f => {
        const abh = (f.abhaengigkeiten||[]).map(id => felder.find(x=>x.id===id)?.name).filter(Boolean);
        const abhNichtFertig = (f.abhaengigkeiten||[]).some(id => felder.find(x=>x.id===id)?.status !== "done");
        return (
          <div key={f.id} onClick={() => setEditFeld(f)}
            style={{ background: "var(--surface)", borderRadius:11, padding:"13px 15px", marginBottom:9,
              border:`2px solid ${abhNichtFertig && f.status==="planned" ? "var(--orange)" : STATUS_COLOR[f.status]}`,
              cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ color: "var(--text)", fontWeight:700, fontSize:14 }}>{f.name}</span>
                  <span style={{ background: STATUS_COLOR[f.status], color:"#fff", fontSize:9,
                    padding:"2px 7px", borderRadius:20 }}>
                    {STATUS_LABEL[f.status]?.split(" ")[1]}
                  </span>
                </div>
                <div style={{ display:"flex", gap:10, marginTop:5, flexWrap:"wrap" }}>
                  {f.m2 > 0 && <Chip icon="📐" label={`${f.m2} m²`} />}
                  {f.geplant && <Chip icon="📅" label={f.geplant} />}
                  {f.dauer_tage > 1 && <Chip icon="⏱️" label={`${f.dauer_tage} Tage`} />}
                </div>
                {f.bewehrung && <div style={{ color: "var(--muted)", fontSize:11, marginTop:5 }}>🔩 {f.bewehrung}</div>}
                {abh.length > 0 && (
                  <div style={{ marginTop:6, display:"flex", gap:5, flexWrap:"wrap" }}>
                    <span style={{ color: "var(--muted)", fontSize:11 }}>🔗</span>
                    {abh.map((n,i) => (
                      <span key={i} style={{ background: abhNichtFertig ? "#2E1A1A" : "#1A2E1A",
                        color: abhNichtFertig ? "var(--orange)" : "var(--green)",
                        fontSize:10, padding:"2px 7px", borderRadius:10 }}>{n}</span>
                    ))}
                    {abhNichtFertig && <span style={{ color: "var(--orange)", fontSize:10 }}>⚠️ Vorgänger nicht fertig</span>}
                  </div>
                )}
              </div>
              <div style={{ color: "var(--muted)", fontSize:18, marginLeft:8 }}>›</div>
            </div>
          </div>
        );
      })}

      {/* Editor Modal */}
      {editFeld !== null && (
        <FeldEditor
          feld={editFeld}
          allFelder={felder}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditFeld(null)}
          projektTyp={projektTyp}
          projSubs={projSubs}
        />
      )}
    </div>
  );
}

// ─── Shared UI Helpers ───────────────────────────────────────────────────────
function Label({ children }) {
  return <div style={{ color: "var(--muted)", fontSize:12, marginBottom:5, fontWeight:600, letterSpacing:0.3 }}>{children}</div>;
}
function StepBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width:44, height:44, background: "var(--surface2)", color: "var(--text)",
      border:`1.5px solid ${'var(--border)'}`, borderRadius:10, cursor:"pointer", fontSize:20, fontWeight:700,
      display:"flex", alignItems:"center", justifyContent:"center",
      boxShadow:"0 1px 3px rgba(0,0,0,0.08)" }}>{children}</button>
  );
}
function inputStyle() {
  return { width:"100%", background: "var(--surface)", color: "var(--text)",
    border:`1.5px solid ${'var(--border)'}`, borderRadius:10,
    padding:"13px 14px", fontSize:15, boxSizing:"border-box", marginTop:4,
    boxShadow:"0 1px 3px rgba(0,0,0,0.06)" };
}


// ════════════════════════════════════════════════════════════════════════════
// 123ERFASST ZEITERFASSUNG
// ════════════════════════════════════════════════════════════════════════════

// Proxy-URL — zeigt auf deine Supabase Edge Function
const ERFASST_PROXY = "https://DEIN-PROJEKT.supabase.co/functions/v1/erfasst-proxy";

async function erfasstQuery(query, variables = {}) {
  try {
    const res = await fetch(ERFASST_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message || "GraphQL Fehler");
    return data.data;
  } catch (e) {
    throw e;
  }
}

// GraphQL Queries
const Q_PERSONS = `
  query {
    persons(filter: { isDeleted: { eq: false } }) {
      nodes {
        ident
        firstname
        lastname
        formattedName
        employee { staffNumber }
      }
    }
  }
`;

const Q_TIMES = `
  query GetTimes($from: DateTime!, $to: DateTime!, $projectIdent: Ident) {
    hoursBlocks(
      filter: {
        date: { gte: $from, lte: $to }
        projectIdent: { eq: $projectIdent }
      }
      orderBy: { date: ASC }
    ) {
      nodes {
        ident
        date
        hours
        minutes
        person {
          ident
          formattedName
        }
        project {
          ident
          name
        }
        activity {
          name
          abbreviation
        }
        note
      }
      totalCount
    }
  }
`;

const Q_PROJECTS = `
  query {
    projects(filter: { isDeleted: { eq: false } }) {
      nodes {
        ident
        name
        number
        endDate
      }
    }
  }
`;

function ZeiterfassungView({ projekt }) {
  const [status,      setStatus]      = useState("idle"); // idle | loading | ok | error | unconfigured
  const [fehler,      setFehler]      = useState("");
  const [zeitdaten,   setZeitdaten]   = useState([]);
  const [personen,    setPersonen]    = useState([]);
  const [projekte123, setProjekte123] = useState([]);
  const [linkedId,    setLinkedId]    = useState(projekt?.erfasstIdent || null);
  const [vonDatum,    setVonDatum]    = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0,10);
  });
  const [bisDatum,    setBisDatum]    = useState(new Date().toISOString().slice(0,10));
  const [personFilter,setPersonFilter]= useState("alle");
  const [screen,      setScreen]      = useState("zeiten"); // zeiten | verknuepfen

  const konfiguriert = !ERFASST_PROXY.includes("DEIN-PROJEKT");

  useEffect(() => {
    if (!konfiguriert) { setStatus("unconfigured"); return; }
    if (screen === "verknuepfen") ladeProjects();
    else if (linkedId) ladeZeiten();
  }, [screen, linkedId, vonDatum, bisDatum]);

  async function ladeZeiten() {
    setStatus("loading");
    try {
      const data = await erfasstQuery(Q_TIMES, {
        from:         vonDatum + "T00:00:00",
        to:           bisDatum + "T23:59:59",
        projectIdent: linkedId,
      });
      setZeitdaten(data?.hoursBlocks?.nodes || []);
      setStatus("ok");
    } catch(e) {
      setFehler(e.message); setStatus("error");
    }
  }

  async function ladeProjects() {
    setStatus("loading");
    try {
      const data = await erfasstQuery(Q_PROJECTS);
      setProjekte123(data?.projects?.nodes || []);
      setStatus("ok");
    } catch(e) {
      setFehler(e.message); setStatus("error");
    }
  }

  // Stunden summieren
  function toH(h, m) { return (h||0) + (m||0)/60; }
  const totalStd = zeitdaten.reduce((s,z) => s + toH(z.hours, z.minutes), 0);

  // Gruppierung nach Person
  const nachPerson = {};
  zeitdaten.forEach(z => {
    const key = z.person?.formattedName || "Unbekannt";
    if (!nachPerson[key]) nachPerson[key] = { name: key, eintraege: [], total: 0 };
    nachPerson[key].eintraege.push(z);
    nachPerson[key].total += toH(z.hours, z.minutes);
  });

  const gefiltert = personFilter === "alle"
    ? zeitdaten
    : zeitdaten.filter(z => z.person?.formattedName === personFilter);

  // ── Unconfigured ──
  if (status === "unconfigured") return (
    <div style={{ background: "var(--surface)", borderRadius:14, padding:24 }}>
      <div style={{ fontSize:36, textAlign:"center", marginBottom:12 }}>⏱️</div>
      <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:16, marginBottom:10 }}>123erfasst Anbindung</div>
      <div style={{ color: "var(--muted)", fontSize:13, marginBottom:20, lineHeight:1.6 }}>
        Um Zeiterfassungsdaten zu laden, muss die Supabase Edge Function konfiguriert werden.
      </div>
      <div style={{ background: "var(--border)", borderRadius:10, padding:14, marginBottom:16 }}>
        <div style={{ color: "var(--text)", fontSize:12, fontWeight:700, marginBottom:8 }}>Setup (einmalig):</div>
        {[
          ["1.", "Supabase Edge Function deployen:", "supabase functions deploy erfasst-proxy"],
          ["2.", "API-Key setzen:", "supabase secrets set ERFASST_API_KEY=<key>"],
          ["3.", "Server setzen:", "supabase secrets set ERFASST_SERVER=<firma.123erfasst.de>"],
          ["4.", "Proxy-URL in polier-app.jsx eintragen:", "ERFASST_PROXY = 'https://...'"],
        ].map(([nr, label, code]) => (
          <div key={nr} style={{ marginBottom:10 }}>
            <div style={{ color: "var(--muted)", fontSize:11 }}>{nr} {label}</div>
            <div style={{ background: "var(--surface)", borderRadius:6, padding:"5px 10px", marginTop:3,
              color: "var(--yellow)", fontSize:11, fontFamily:"monospace" }}>{code}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ color: "var(--text)", fontWeight:700, fontSize:15 }}>⏱️ Zeiterfassung</div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => setScreen(s => s==="zeiten" ? "verknuepfen" : "zeiten")}
            style={{ background: screen==="verknuepfen" ? "var(--yellow)" : "var(--border)",
              color: screen==="verknuepfen" ? "#1C2027" : "var(--muted)",
              border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12 }}>
            🔗 Projekt verknüpfen
          </button>
          {screen==="zeiten" && linkedId && (
            <button onClick={ladeZeiten}
              style={{ background: "var(--border)", color: "var(--text)", border:"none",
                borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12 }}>
              🔄
            </button>
          )}
        </div>
      </div>

      {/* Projekt-Verknüpfung */}
      {screen === "verknuepfen" && (
        <div>
          <div style={{ color: "var(--muted)", fontSize:13, marginBottom:14 }}>
            Wähle das entsprechende Projekt in 123erfasst — Zeitbuchungen werden dann hier angezeigt.
          </div>
          {status === "loading" ? (
            <div style={{ textAlign:"center", color: "var(--muted)", padding:32 }}>⏳ Lade Projekte…</div>
          ) : status === "error" ? (
            <div style={{ background:"#2E1A1A", borderRadius:10, padding:14, color: "var(--red)" }}>{fehler}</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              <div onClick={() => { setLinkedId(null); setScreen("zeiten"); }}
                style={{ background: !linkedId ? "var(--surface2)" : "var(--border)",
                  border:`1.5px solid ${!linkedId ? "var(--yellow)" : "transparent"}`,
                  borderRadius:9, padding:"10px 14px", cursor:"pointer" }}>
                <div style={{ color: "var(--muted)", fontSize:12 }}>Keine Verknüpfung</div>
              </div>
              {projekte123.map(p => (
                <div key={p.ident} onClick={() => { setLinkedId(p.ident); setScreen("zeiten"); }}
                  style={{ background: linkedId===p.ident ? "var(--surface2)" : "var(--border)",
                    border:`1.5px solid ${linkedId===p.ident ? "var(--yellow)" : "transparent"}`,
                    borderRadius:9, padding:"10px 14px", cursor:"pointer" }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <div style={{ color: "var(--text)", fontWeight: linkedId===p.ident ? 700 : 400 }}>{p.name}</div>
                    {linkedId===p.ident && <span style={{ color: "var(--yellow)" }}>✓</span>}
                  </div>
                  {p.number && <div style={{ color: "var(--muted)", fontSize:11, marginTop:2 }}>Nr. {p.number}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Zeiterfassung Ansicht */}
      {screen === "zeiten" && (
        <>
          {!linkedId ? (
            <div style={{ background: "var(--surface)", borderRadius:12, padding:28, textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🔗</div>
              <div style={{ color: "var(--muted)", fontSize:13 }}>
                Noch kein 123erfasst-Projekt verknüpft.
              </div>
              <button onClick={() => setScreen("verknuepfen")}
                style={{ background: "var(--yellow)", color:"#1C2027", border:"none", borderRadius:10,
                  padding:"11px 22px", fontWeight:700, cursor:"pointer", marginTop:14 }}>
                Jetzt verknüpfen
              </button>
            </div>
          ) : (
            <>
              {/* Datumsfilter */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                <div>
                  <Label>Von</Label>
                  <input type="date" value={vonDatum} onChange={e => setVonDatum(e.target.value)}
                    style={inputStyle()} />
                </div>
                <div>
                  <Label>Bis</Label>
                  <input type="date" value={bisDatum} onChange={e => setBisDatum(e.target.value)}
                    style={inputStyle()} />
                </div>
              </div>

              {status === "loading" && (
                <div style={{ textAlign:"center", color: "var(--muted)", padding:32 }}>⏳ Lade Zeitdaten…</div>
              )}

              {status === "error" && (
                <div style={{ background:"#2E1A1A", borderRadius:10, padding:14, color: "var(--red)", marginBottom:12 }}>
                  ❌ {fehler}
                </div>
              )}

              {status === "ok" && (
                <>
                  {/* KPI Leiste */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
                    {[
                      ["Stunden gesamt", totalStd.toFixed(1)+"h", "var(--yellow)"],
                      ["Einträge",       zeitdaten.length,         "var(--muted)"],
                      ["Mitarbeiter",    Object.keys(nachPerson).length, "var(--green)"],
                    ].map(([l,v,col]) => (
                      <div key={l} style={{ background: "var(--surface)", borderRadius:10, padding:"11px 12px",
                        borderBottom:`3px solid ${col}` }}>
                        <div style={{ color: "var(--muted)", fontSize:10 }}>{l}</div>
                        <div style={{ color: "var(--text)", fontWeight:800, fontSize:20 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Personen-Zusammenfassung */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ color: "var(--muted)", fontSize:11, marginBottom:8 }}>NACH MITARBEITER</div>
                    <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
                      <FilterBtn active={personFilter==="alle"} onClick={() => setPersonFilter("alle")}>
                        Alle
                      </FilterBtn>
                      {Object.values(nachPerson).map(p => (
                        <FilterBtn key={p.name} active={personFilter===p.name}
                          onClick={() => setPersonFilter(p.name)}>
                          {p.name.split(" ").pop()} · {p.total.toFixed(1)}h
                        </FilterBtn>
                      ))}
                    </div>
                  </div>

                  {/* Stunden-Balken pro Person */}
                  {personFilter === "alle" && Object.values(nachPerson).length > 0 && (
                    <div style={{ background: "var(--surface)", borderRadius:12, padding:14, marginBottom:14 }}>
                      {Object.values(nachPerson)
                        .sort((a,b) => b.total - a.total)
                        .map(p => {
                          const pct = totalStd > 0 ? (p.total / totalStd) * 100 : 0;
                          return (
                            <div key={p.name} style={{ marginBottom:10 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                                <div style={{ color: "var(--text)", fontSize:12 }}>{p.name}</div>
                                <div style={{ color: "var(--yellow)", fontSize:12, fontWeight:700 }}>{p.total.toFixed(1)}h</div>
                              </div>
                              <div style={{ background: "var(--border)", borderRadius:4, height:6 }}>
                                <div style={{ background: "var(--yellow)", width:`${pct}%`, height:"100%", borderRadius:4 }} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Einzelbuchungen */}
                  {gefiltert.length === 0 ? (
                    <div style={{ background: "var(--surface)", borderRadius:10, padding:24, textAlign:"center", color: "var(--muted)" }}>
                      Keine Buchungen im gewählten Zeitraum
                    </div>
                  ) : gefiltert.map((z, i) => (
                    <div key={i} style={{ background: "var(--surface)", borderRadius:10, padding:"12px 14px",
                      marginBottom:8, borderLeft:`3px solid ${'var(--blue)'}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <div style={{ color: "var(--text)", fontWeight:600, fontSize:13 }}>
                          {z.person?.formattedName || "—"}
                        </div>
                        <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:13 }}>
                          {z.hours > 0 || z.minutes > 0
                            ? `${z.hours || 0}h ${z.minutes > 0 ? z.minutes+"min" : ""}`
                            : "—"}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                        <span style={{ color: "var(--muted)", fontSize:11 }}>
                          📅 {new Date(z.date).toLocaleDateString("de-DE")}
                        </span>
                        {z.activity?.name && (
                          <span style={{ color: "var(--muted)", fontSize:11 }}>🔧 {z.activity.name}</span>
                        )}
                      </div>
                      {z.note && (
                        <div style={{ color: "var(--muted)", fontSize:11, marginTop:5, fontStyle:"italic" }}>
                          💬 {z.note}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// KI-SCANNER – Betonfeld-Karte fotografieren & auslesen
// ════════════════════════════════════════════════════════════════════════════
const SCAN_PROMPT = `Du bist ein Spezialist für Bauwesen und liest gedruckte Betonfeld-Karten aus.
Analysiere das Bild und extrahiere ALLE erkennbaren Informationen.

Antworte NUR mit einem JSON-Objekt, ohne Markdown-Backticks, ohne Erklärungen:
{
  "felder": [
    {
      "name": "Feldname oder Nummer z.B. A1 oder B2 – Bodenplatte Nord",
      "m2": 120,
      "geplant": "2025-06-25",
      "dauer_tage": 1,
      "betonsorte": "C25/30 XC2",
      "bewehrung": "BSt 500, Ø12, 15cm Raster",
      "bemerkung": "Sonstige Hinweise vom Formular",
      "status": "planned"
    }
  ],
  "konfidenz": 0.92,
  "hinweise": "Was war auf dem Formular schwer lesbar oder unklar"
}

Regeln:
- Mehrere Felder auf einer Karte → mehrere Einträge im Array
- Datum immer als YYYY-MM-DD, falls nicht erkennbar: null
- m2 als Zahl ohne Einheit
- dauer_tage schätzen aus Fläche falls nicht angegeben (bis 80m²=1, bis 200m²=2, sonst 3)
- status immer "planned" für neue Karten
- konfidenz zwischen 0 und 1
- Falls kein Betonfeld-Formular erkennbar: { "felder": [], "konfidenz": 0, "hinweise": "Kein Betonfeld-Formular erkannt" }`;

async function scanBetonkarte(imageBase64, mediaType) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text",  text: SCAN_PROMPT },
        ],
      }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.find(b => b.type === "text")?.text || "{}";
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { felder: [], konfidenz: 0, hinweise: "Antwort konnte nicht geparst werden: " + raw.slice(0,100) };
  }
}

function ScannerView({ onFelderImport }) {
  const fileRef     = useRef(null);
  const [phase, setPhase]       = useState("idle"); // idle | preview | scanning | result | error
  const [imgSrc, setImgSrc]     = useState(null);
  const [imgB64, setImgB64]     = useState(null);
  const [imgType, setImgType]   = useState(null);
  const [result, setResult]     = useState(null);
  const [selected, setSelected] = useState({});
  const [imported, setImported] = useState(false);

  function handleFile(file) {
    if (!file) return;
    setImported(false);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      setImgSrc(dataUrl);
      setImgType(file.type || "image/jpeg");
      // Extract base64
      const b64 = dataUrl.split(",")[1];
      setImgB64(b64);
      setPhase("preview");
    };
    reader.readAsDataURL(file);
  }

  async function doScan() {
    setPhase("scanning");
    try {
      const res = await scanBetonkarte(imgB64, imgType);
      setResult(res);
      // Pre-select all
      const sel = {};
      res.felder.forEach((_, i) => sel[i] = true);
      setSelected(sel);
      setPhase("result");
    } catch (e) {
      setPhase("error");
    }
  }

  function doImport() {
    const toImport = result.felder
      .filter((_, i) => selected[i])
      .map((f, i) => ({ ...f, id: Date.now() + i, festigkeit: null, betoniert: null }));
    onFelderImport(toImport);
    setImported(true);
  }

  function reset() {
    setPhase("idle"); setImgSrc(null); setImgB64(null);
    setResult(null); setSelected({}); setImported(false);
  }

  const konfidenzColor = (k) => k >= 0.85 ? "var(--green)" : k >= 0.6 ? "var(--yellow)" : "var(--red)";
  const konfidenzLabel = (k) => k >= 0.85 ? "Hoch" : k >= 0.6 ? "Mittel" : "Niedrig";

  return (
    <div>
      <div style={{ color: "var(--text)", fontWeight:700, fontSize:16, marginBottom:4 }}>📷 Betonkarten-Scanner</div>
      <div style={{ color: "var(--muted)", fontSize:13, marginBottom:18 }}>
        Foto eines gedruckten Betonfeld-Formulars hochladen — KI liest alle Felder automatisch aus.
      </div>

      {/* IDLE */}
      {phase === "idle" && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            style={{ display:"none" }} onChange={e => handleFile(e.target.files[0])} />
          <div onClick={() => fileRef.current.click()}
            style={{ border:`2px dashed ${'var(--yellow)'}`, borderRadius:20, padding:"48px 20px",
              textAlign:"center", cursor:"pointer", background:"#FFFBEB",
              boxShadow:"inset 0 2px 8px rgba(245,196,0,0.1)" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📷</div>
            <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:16 }}>Betonfeld-Karte aufnehmen</div>
            <div style={{ color: "var(--muted)", fontSize:13, marginTop:6 }}>Tippen zum Fotografieren oder Bild hochladen</div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:12 }}>
            <button onClick={() => fileRef.current.click()}
              style={{ flex:1, background: "var(--surface2)", color: "var(--text)", border:`1px solid ${'var(--border)'}`,
                borderRadius:10, padding:12, cursor:"pointer", fontSize:13 }}>
              📁 Aus Galerie wählen
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {phase === "preview" && (
        <div>
          <img src={imgSrc} alt="Betonkarte" style={{ width:"100%", borderRadius:12, marginBottom:14, maxHeight:320, objectFit:"contain", background: "var(--surface)" }} />
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={reset} style={{ flex:1, background: "var(--border)", color: "var(--muted)", border:"none", borderRadius:10, padding:13, cursor:"pointer" }}>
              ✕ Neu
            </button>
            <button onClick={doScan} style={{ flex:2, background: "var(--yellow)", color:"#1C2027", border:"none", borderRadius:10, padding:13, fontWeight:700, cursor:"pointer", fontSize:15 }}>
              🔍 Jetzt auslesen
            </button>
          </div>
        </div>
      )}

      {/* SCANNING */}
      {phase === "scanning" && (
        <div style={{ textAlign:"center", padding:"40px 20px" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🤖</div>
          <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:16, marginBottom:8 }}>KI analysiert Betonkarte…</div>
          <div style={{ color: "var(--muted)", fontSize:13 }}>Feldname, m², Bewehrungsplan und Termine werden erkannt</div>
          <div style={{ marginTop:24, display:"flex", justifyContent:"center", gap:6 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width:8, height:8, borderRadius:4, background: "var(--yellow)",
                animation:`pulse 1.2s ${i*0.3}s infinite`, opacity:0.8 }} />
            ))}
          </div>
          <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(1.4);opacity:1} }`}</style>
        </div>
      )}

      {/* ERROR */}
      {phase === "error" && (
        <div style={{ background:"#2E1A1A", borderRadius:12, padding:24, textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>❌</div>
          <div style={{ color: "var(--red)", fontWeight:700, marginBottom:8 }}>Scan fehlgeschlagen</div>
          <div style={{ color: "var(--muted)", fontSize:13, marginBottom:16 }}>Bitte Bild prüfen und nochmals versuchen.</div>
          <button onClick={reset} style={{ background: "var(--border)", color: "var(--text)", border:"none", borderRadius:10, padding:"10px 24px", cursor:"pointer" }}>
            Nochmals versuchen
          </button>
        </div>
      )}

      {/* RESULT */}
      {phase === "result" && result && (
        <div>
          {/* Bild klein */}
          <img src={imgSrc} alt="Betonkarte" style={{ width:"100%", borderRadius:10, marginBottom:14, maxHeight:160, objectFit:"contain", background: "var(--surface)" }} />

          {/* Konfidenz */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            background: "var(--surface)", borderRadius:10, padding:"10px 14px", marginBottom:12 }}>
            <div>
              <div style={{ color: "var(--muted)", fontSize:11 }}>KI-Erkennungssicherheit</div>
              <div style={{ color: konfidenzColor(result.konfidenz), fontWeight:700, fontSize:15 }}>
                {konfidenzLabel(result.konfidenz)} · {Math.round(result.konfidenz * 100)}%
              </div>
            </div>
            <div style={{ width:48, height:48, borderRadius:24,
              background: `conic-gradient(${konfidenzColor(result.konfidenz)} ${result.konfidenz*360}deg, ${'var(--border)'} 0deg)`,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:36, height:36, borderRadius:18, background: "var(--surface)",
                display:"flex", alignItems:"center", justifyContent:"center",
                color: konfidenzColor(result.konfidenz), fontSize:11, fontWeight:700 }}>
                {Math.round(result.konfidenz*100)}%
              </div>
            </div>
          </div>

          {/* Hinweise */}
          {result.hinweise && (
            <div style={{ background:"#2A2A1A", borderRadius:8, padding:"8px 12px", marginBottom:12, color:"#FFD966", fontSize:12 }}>
              💬 {result.hinweise}
            </div>
          )}

          {/* Felder */}
          {result.felder.length === 0 ? (
            <div style={{ background: "var(--surface)", borderRadius:12, padding:24, textAlign:"center" }}>
              <div style={{ fontSize:32 }}>🤷</div>
              <div style={{ color: "var(--muted)", marginTop:8 }}>Kein Betonfeld-Formular erkannt.<br/>Bitte ein klareres Foto versuchen.</div>
            </div>
          ) : (
            <>
              <div style={{ color: "var(--text)", fontWeight:700, marginBottom:10 }}>
                {result.felder.length} Feld{result.felder.length > 1 ? "er" : ""} erkannt — auswählen zum Importieren:
              </div>
              {result.felder.map((f, i) => (
                <div key={i} onClick={() => setSelected(p => ({ ...p, [i]: !p[i] }))}
                  style={{ background: selected[i] ? "var(--surface2)" : "var(--surface)",
                    border:`2px solid ${selected[i] ? "var(--yellow)" : "var(--border)"}`,
                    borderRadius:12, padding:"14px 16px", marginBottom:10, cursor:"pointer" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ color: "var(--text)", fontWeight:700, fontSize:14 }}>{f.name}</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:8 }}>
                        {f.m2 && <Chip icon="📐" label={`${f.m2} m²`} />}
                        {f.geplant && <Chip icon="📅" label={f.geplant} />}
                        {f.dauer_tage && <Chip icon="⏱️" label={`${f.dauer_tage} Tag(e)`} />}
                        {f.betonsorte && <Chip icon="🧱" label={f.betonsorte} />}
                      </div>
                      {f.bewehrung && (
                        <div style={{ color: "var(--muted)", fontSize:11, marginTop:8 }}>🔩 {f.bewehrung}</div>
                      )}
                      {f.bemerkung && (
                        <div style={{ color: "var(--muted)", fontSize:11, marginTop:4 }}>📝 {f.bemerkung}</div>
                      )}
                    </div>
                    <div style={{ marginLeft:12, fontSize:22 }}>{selected[i] ? "✅" : "⬜"}</div>
                  </div>
                </div>
              ))}

              {imported ? (
                <div style={{ background:"#1A3A28", borderRadius:12, padding:16, textAlign:"center" }}>
                  <div style={{ color: "var(--green)", fontWeight:700, fontSize:15 }}>✅ Erfolgreich importiert!</div>
                  <div style={{ color: "var(--muted)", fontSize:13, marginTop:4 }}>Felder sind jetzt in der Felderliste und im Gantt-Plan sichtbar.</div>
                  <button onClick={reset} style={{ background: "var(--border)", color: "var(--text)", border:"none",
                    borderRadius:10, padding:"10px 20px", marginTop:14, cursor:"pointer" }}>
                    Weitere Karte scannen
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", gap:10, marginTop:4 }}>
                  <button onClick={reset} style={{ flex:1, background: "var(--border)", color: "var(--muted)",
                    border:"none", borderRadius:10, padding:13, cursor:"pointer" }}>
                    ✕ Verwerfen
                  </button>
                  <button onClick={doImport}
                    disabled={Object.values(selected).every(v => !v)}
                    style={{ flex:2, background: Object.values(selected).some(v=>v) ? "var(--yellow)" : "var(--border)",
                      color: Object.values(selected).some(v=>v) ? "#1C2027" : "var(--muted)",
                      border:"none", borderRadius:10, padding:13, fontWeight:700, cursor:"pointer", fontSize:15 }}>
                    ✅ {Object.values(selected).filter(Boolean).length} Feld{Object.values(selected).filter(Boolean).length !== 1 ? "er" : ""} importieren
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ icon, label }) {
  return (
    <div style={{ background: "var(--surface2)", borderRadius:20, padding:"5px 10px", display:"flex", gap:5, alignItems:"center",
      border:`1px solid ${'var(--border)'}` }}>
      <span style={{ fontSize:12 }}>{icon}</span>
      <span style={{ color: "var(--text)"Med, fontSize:12, fontWeight:500 }}>{label}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PROJEKT-VERWALTUNG
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// FIRMEN & SUBUNTERNEHMER
// ════════════════════════════════════════════════════════════════════════════

// Alle verfügbaren Gewerke (union aus allen Projekttypen)
const ALLE_GEWERKE = [
  { key:"rohbau",       label:"Rohbau / Beton",           icon:"🏗️" },
  { key:"elektro",      label:"Elektroinstallation",       icon:"⚡" },
  { key:"sanitaer",     label:"Sanitärinstallation",       icon:"🚿" },
  { key:"heizung",      label:"Heizung / HLKS",            icon:"🔥" },
  { key:"estrich",      label:"Estrich",                   icon:"🪨" },
  { key:"innenausbau",  label:"Innenausbau / Trockenbau",  icon:"🪚" },
  { key:"fliesen",      label:"Fliesen / Beläge",          icon:"🟫" },
  { key:"tiefbau",      label:"Tiefbau / Straße",          icon:"🛣️" },
  { key:"dach",         label:"Dach",                      icon:"🏚️" },
  { key:"pv",           label:"PV-Anlage",                 icon:"☀️" },
  { key:"maler",        label:"Maler / Putz",              icon:"🖌️" },
  { key:"schreiner",    label:"Schreiner / Fenster",       icon:"🪟" },
  { key:"abbruch",      label:"Abbruch / Rückbau",         icon:"⛏️" },
  { key:"vermessung",   label:"Vermessung",                icon:"📐" },
  { key:"garten",       label:"Garten / Außenanlagen",     icon:"🌿" },
];

const MOCK_EIGENE_FIRMA = {
  name:         "Bauunternehmen Koeven GmbH",
  strasse:      "Musterstraße 12",
  plz:          "80331",
  ort:          "München",
  telefon:      "+49 89 123456",
  email:        "info@koeven-bau.de",
  geschaeftsfuehrer: "Luca Koeven",
  steuernummer: "123/456/78900",
  gewerke:      ["rohbau","elektro","sanitaer","heizung","estrich"],
};

const MOCK_SUBS = [
  { id:1, name:"Elektro Huber GmbH",     gewerke:["elektro"],          kontakt:"Thomas Huber",   telefon:"+49 89 111222", email:"huber@elektro.de",  status:"aktiv", stundensatz:85 },
  { id:2, name:"Sanitär Meier KG",       gewerke:["sanitaer","heizung"],kontakt:"Klaus Meier",    telefon:"+49 89 333444", email:"meier@sanitaer.de", status:"aktiv", stundensatz:75 },
  { id:3, name:"Estrich Schmidt",        gewerke:["estrich"],           kontakt:"Hans Schmidt",   telefon:"+49 89 555666", email:"schmidt@estrich.de",status:"aktiv", stundensatz:55 },
  { id:4, name:"Dach & Fach Wagner AG",  gewerke:["dach"],              kontakt:"Maria Wagner",   telefon:"+49 89 777888", email:"wagner@dach.de",    status:"inaktiv",stundensatz:90 },
];

function FirmenView({ owneFirma, setEigeneFirma, subs, setSubs, onOnboardingReset }) {
  const [screen, setScreen]     = useState("home"); // home | eigene | subs | subEdit
  const [editSub, setEditSub]   = useState(null);
  const [editOwn, setEditOwn]   = useState(false);
  const [tmpFirma, setTmpFirma] = useState(owneFirma);

  return (
    <div>
      {/* Home */}
      {screen === "home" && (
        <>
          {/* Eigene Firma Karte */}
          <div onClick={() => { setTmpFirma({...owneFirma}); setScreen("eigene"); }}
            style={{ background: "var(--surface)", borderRadius:14, padding:"16px 18px", marginBottom:14,
              border:`2px solid ${'var(--yellow)'}`, cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ color: "var(--muted)", fontSize:11, marginBottom:2 }}>🏢 Eigenes Unternehmen</div>
                <div style={{ color: "var(--text)", fontWeight:700, fontSize:16 }}>{owneFirma.name || "Firma hinterlegen"}</div>
                {owneFirma.ort && <div style={{ color: "var(--muted)", fontSize:12, marginTop:2 }}>📍 {owneFirma.plz} {owneFirma.ort}</div>}
                {owneFirma.gewerke?.length > 0 && (
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:8 }}>
                    {owneFirma.gewerke.map(k => {
                      const g = ALLE_GEWERKE.find(x=>x.key===k);
                      return g ? <Chip key={k} icon={g.icon} label={g.label} /> : null;
                    })}
                  </div>
                )}
              </div>
              <div style={{ color: "var(--muted)", fontSize:22 }}>›</div>
            </div>
          </div>

          {/* Subunternehmer */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ color: "var(--text)", fontWeight:700 }}>Subunternehmer ({subs.length})</div>
            <button onClick={() => { setEditSub({ id:null, name:"", gewerke:[], kontakt:"", telefon:"", email:"", status:"aktiv", stundensatz:0 }); setScreen("subEdit"); }}
              style={{ background: "var(--yellow)", color:"#1C2027", border:"none", borderRadius:9,
                padding:"7px 14px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
              + Sub
            </button>
          </div>

          {subs.length === 0 ? (
            <div style={{ background: "var(--surface)", borderRadius:12, padding:24, textAlign:"center" }}>
              <div style={{ fontSize:32 }}>🏢</div>
              <div style={{ color: "var(--muted)", marginTop:8 }}>Noch keine Subunternehmer angelegt.</div>
            </div>
          ) : subs.map(s => (
            <div key={s.id} onClick={() => { setEditSub({...s}); setScreen("subEdit"); }}
              style={{ background: "var(--surface)", borderRadius:11, padding:"13px 15px", marginBottom:9,
                border:`1.5px solid ${s.status==="aktiv" ? "var(--border)" : "var(--red)"}`, cursor:"pointer" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ color: "var(--text)", fontWeight:700 }}>{s.name}</div>
                    <div style={{ background: s.status==="aktiv" ? "var(--green)" : "var(--red)",
                      color:"#fff", fontSize:9, padding:"2px 7px", borderRadius:20 }}>
                      {s.status}
                    </div>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize:12, marginTop:3 }}>👤 {s.kontakt} · 📞 {s.telefon}</div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:7 }}>
                    {s.gewerke.map(k => {
                      const g = ALLE_GEWERKE.find(x=>x.key===k);
                      return g ? <Chip key={k} icon={g.icon} label={g.label} /> : null;
                    })}
                  </div>
                  {s.stundensatz > 0 && (
                    <div style={{ color: "var(--muted)", fontSize:11, marginTop:5 }}>💶 {s.stundensatz} €/Std.</div>
                  )}
                </div>
                <div style={{ color: "var(--muted)", fontSize:18 }}>›</div>
              </div>
            </div>
          ))}

          {/* Onboarding zurücksetzen */}
          {onOnboardingReset && (
            <div style={{ marginTop:24, borderTop:`1px solid ${'var(--border)'}`, paddingTop:16 }}>
              <button onClick={() => {
                  if (window.confirm("Onboarding zurücksetzen? Die App startet beim nächsten Laden neu mit dem Einrichtungsassistenten.")) {
                    localStorage.removeItem(ONBOARDING_KEY);
                    onOnboardingReset();
                  }
                }}
                style={{ width:"100%", background: "var(--border)", color: "var(--muted)",
                  border:`1px solid ${'var(--border)'}`, borderRadius:10, padding:12,
                  cursor:"pointer", fontSize:13 }}>
                🔄 Einrichtungsassistent erneut starten
              </button>
            </div>
          )}
        </>
      )}

      {/* Eigene Firma bearbeiten */}
      {screen === "eigene" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <button onClick={() => setScreen("home")}
              style={{ background: "var(--border)", border:"none", color: "var(--text)", borderRadius:8,
                padding:"6px 10px", cursor:"pointer", fontSize:16 }}>‹</button>
            <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:16 }}>🏢 Eigenes Unternehmen</div>
          </div>

          {[
            ["Firmenname",          "name",              "Bauunternehmen GmbH"],
            ["Geschäftsführer",     "geschaeftsfuehrer", "Max Mustermann"],
            ["Straße + Nr.",        "strasse",           "Musterstraße 12"],
            ["PLZ",                 "plz",               "80331"],
            ["Ort",                 "ort",               "München"],
            ["Telefon",             "telefon",           "+49 89 123456"],
            ["E-Mail",              "email",             "info@firma.de"],
            ["Steuernummer",        "steuernummer",      "123/456/78900"],
          ].map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom:12 }}>
              <Label>{label}</Label>
              <input value={tmpFirma[key]||""} onChange={e => setTmpFirma(p=>({...p,[key]:e.target.value}))}
                placeholder={ph} style={inputStyle()} />
            </div>
          ))}

          {/* Gewerke */}
          <div style={{ marginBottom:20 }}>
            <Label>Ausgeführte Gewerke</Label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginTop:8 }}>
              {ALLE_GEWERKE.map(g => {
                const aktiv = (tmpFirma.gewerke||[]).includes(g.key);
                return (
                  <div key={g.key} onClick={() => setTmpFirma(p => ({
                    ...p, gewerke: aktiv
                      ? p.gewerke.filter(x=>x!==g.key)
                      : [...(p.gewerke||[]), g.key]
                  }))}
                    style={{ background: aktiv ? "var(--surface2)" : "var(--border)",
                      border:`2px solid ${aktiv ? "var(--yellow)" : "transparent"}`,
                      borderRadius:9, padding:"8px 10px", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ fontSize:16 }}>{g.icon}</span>
                    <span style={{ color: aktiv ? "var(--text)" : "var(--muted)", fontSize:11, fontWeight: aktiv ? 700 : 400 }}>{g.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={() => { setEigeneFirma(tmpFirma); setScreen("home"); }}
            style={{ width:"100%", background: "var(--yellow)", color:"#1C2027", border:"none",
              borderRadius:10, padding:14, fontWeight:700, cursor:"pointer", fontSize:15 }}>
            💾 Speichern
          </button>
        </div>
      )}

      {/* Sub bearbeiten / anlegen */}
      {screen === "subEdit" && editSub && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <button onClick={() => setScreen("home")}
              style={{ background: "var(--border)", border:"none", color: "var(--text)", borderRadius:8,
                padding:"6px 10px", cursor:"pointer", fontSize:16 }}>‹</button>
            <div style={{ color: "var(--yellow)", fontWeight:700, fontSize:16 }}>
              {editSub.id ? "✏️ Subunternehmer" : "➕ Neuer Subunternehmer"}
            </div>
          </div>

          {[
            ["Firmenname *",     "name",     "Elektro Huber GmbH"],
            ["Ansprechpartner",  "kontakt",  "Max Mustermann"],
            ["Telefon",          "telefon",  "+49 89 123456"],
            ["E-Mail",           "email",    "info@firma.de"],
          ].map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom:12 }}>
              <Label>{label}</Label>
              <input value={editSub[key]||""} onChange={e => setEditSub(p=>({...p,[key]:e.target.value}))}
                placeholder={ph} style={inputStyle()} />
            </div>
          ))}

          <div style={{ marginBottom:12 }}>
            <Label>Stundensatz (€)</Label>
            <input type="number" value={editSub.stundensatz||""} onChange={e => setEditSub(p=>({...p,stundensatz:+e.target.value}))}
              placeholder="85" style={inputStyle()} />
          </div>

          {/* Status */}
          <div style={{ marginBottom:16 }}>
            <Label>Status</Label>
            <div style={{ display:"flex", gap:8, marginTop:6 }}>
              {["aktiv","inaktiv","gesperrt"].map(s => (
                <button key={s} onClick={() => setEditSub(p=>({...p,status:s}))}
                  style={{ flex:1, background: editSub.status===s ? "var(--yellow)" : "var(--border)",
                    color: editSub.status===s ? "#1C2027" : "var(--muted)",
                    border:"none", borderRadius:8, padding:10, cursor:"pointer",
                    fontWeight: editSub.status===s ? 700 : 400, fontSize:12 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Gewerke des Subs */}
          <div style={{ marginBottom:20 }}>
            <Label>Gewerke dieses Subunternehmers</Label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginTop:8 }}>
              {ALLE_GEWERKE.map(g => {
                const aktiv = (editSub.gewerke||[]).includes(g.key);
                return (
                  <div key={g.key} onClick={() => setEditSub(p => ({
                    ...p, gewerke: aktiv
                      ? p.gewerke.filter(x=>x!==g.key)
                      : [...(p.gewerke||[]), g.key]
                  }))}
                    style={{ background: aktiv ? "var(--surface2)" : "var(--border)",
                      border:`2px solid ${aktiv ? "var(--blue)" : "transparent"}`,
                      borderRadius:9, padding:"8px 10px", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ fontSize:16 }}>{g.icon}</span>
                    <span style={{ color: aktiv ? "var(--text)" : "var(--muted)", fontSize:11, fontWeight: aktiv ? 700 : 400 }}>{g.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            {editSub.id && (
              <button onClick={() => { setSubs(prev => prev.filter(s=>s.id!==editSub.id)); setScreen("home"); }}
                style={{ background:"#2E1A1A", color: "var(--red)", border:`1px solid ${'var(--red)'}`,
                  borderRadius:10, padding:"12px 16px", cursor:"pointer" }}>🗑️</button>
            )}
            <button onClick={() => setScreen("home")}
              style={{ flex:1, background: "var(--border)", color: "var(--muted)", border:"none", borderRadius:10, padding:13, cursor:"pointer" }}>
              Abbrechen
            </button>
            <button disabled={!editSub.name} onClick={() => {
                if (editSub.id) {
                  setSubs(prev => prev.map(s => s.id===editSub.id ? editSub : s));
                } else {
                  setSubs(prev => [...prev, { ...editSub, id: Date.now() }]);
                }
                setScreen("home");
              }}
              style={{ flex:2, background: editSub.name ? "var(--yellow)" : "var(--border)",
                color: editSub.name ? "#1C2027" : "var(--muted)",
                border:"none", borderRadius:10, padding:13, fontWeight:700, cursor:"pointer", fontSize:15 }}>
              💾 Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Zuweisung pro Projekt ────────────────────────────────────────────────
function SubZuweisungBadge({ subId, subs }) {
  const sub = subs.find(s => s.id === subId);
  if (!sub) return null;
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:5,
      background: "var(--border)", borderRadius:8, padding:"3px 8px", fontSize:11 }}>
      <span>🏢</span>
      <span style={{ color: "var(--blue)" }}>{sub.name}</span>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// PWA – Install Banner + Online/Offline Status + Update Banner
// ════════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════════
// SAAS – Registrierung, Einladung, Plan-Guard
// ════════════════════════════════════════════════════════════════════════════

const PLAN_CONFIG = {
  trial:   { label:"Testversion",  preis:"kostenlos · 14 Tage", farbe:"#64748B", icon:"⏱️" },
  starter: { label:"Starter",      preis:"49 € / Monat",        farbe:"#2563EB", icon:"🚀" },
  pro:     { label:"Pro",          preis:"99 € / Monat",        farbe:"#F5C400", icon:"⚡" },
};

// ─── Registrierungs-Screen ────────────────────────────────────────────────
function RegistrierungScreen({ auth, onZurueck }) {
  const [schritt,     setSchritt]     = useState(0); // 0=Konto 1=Firma 2=Fertig
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [firmaName,   setFirmaName]   = useState("");
  const [laden,       setLaden]       = useState(false);
  const [fehler,      setFehler]      = useState("");

  async function kontoAnlegen() {
    if (!email || !password || password.length < 8) {
      setFehler("Passwort muss mindestens 8 Zeichen haben."); return;
    }
    setLaden(true); setFehler("");
    // Supabase Sign Up
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.error) { setFehler(data.error.message || data.msg); setLaden(false); return; }
    setSchritt(1);
    setLaden(false);
  }

  async function firmaAnlegen() {
    if (!firmaName.trim()) { setFehler("Firmenname ist Pflicht."); return; }
    setLaden(true); setFehler("");

    // Erst einloggen
    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const session = await loginRes.json();
    if (!session.access_token) { setFehler("Login fehlgeschlagen."); setLaden(false); return; }

    // Firma registrieren via RPC
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/firma_registrieren`, {
      method: "POST",
      headers: {
        "apikey":        SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        p_user_id:    session.user?.id,
        p_firma_name: firmaName,
        p_email:      email,
      }),
    });

    if (rpcRes.ok) {
      localStorage.setItem("polaris-session", JSON.stringify(session));
      setSchritt(2);
    } else {
      setFehler("Firma konnte nicht angelegt werden.");
    }
    setLaden(false);
  }

  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"24px 20px",
      fontFamily:"'Segoe UI', system-ui, sans-serif" }}>

      {/* Logo */}
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ fontWeight:900, fontSize:28, letterSpacing:-1.5,
          color:"var(--text)" }}>
          <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
        </div>
        <div style={{ fontSize:10, color:"var(--muted)", fontWeight:600,
          letterSpacing:3, textTransform:"uppercase", marginTop:2 }}>
          Baustellenmanagement
        </div>
      </div>

      {/* Fortschritt */}
      <div style={{ display:"flex", gap:8, marginBottom:24, alignItems:"center" }}>
        {["Konto", "Firma", "Fertig"].map((s, i) => (
          <div key={s} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:14,
              background: i < schritt ? "var(--green)"
                : i === schritt ? "var(--yellow)" : "var(--surface2)",
              border: `2px solid ${i <= schritt ? (i < schritt ? "var(--green)" : "var(--yellow)") : "var(--border)"}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:12, fontWeight:700,
              color: i < schritt ? "#fff" : i === schritt ? "#1a1200" : "var(--muted)" }}>
              {i < schritt ? "✓" : i + 1}
            </div>
            <span style={{ fontSize:12, color: i === schritt ? "var(--text)" : "var(--muted)",
              fontWeight: i === schritt ? 700 : 400 }}>{s}</span>
            {i < 2 && <div style={{ width:24, height:1, background:"var(--border)" }} />}
          </div>
        ))}
      </div>

      <div style={{ background:"var(--surface)", borderRadius:20, padding:28,
        width:"100%", maxWidth:400, border:"1.5px solid var(--border)" }}>

        {fehler && (
          <div style={{ background:"var(--rbg)", color:"var(--red)",
            borderRadius:10, padding:"10px 14px", marginBottom:16,
            fontSize:13, border:"1px solid var(--red)" }}>
            ❌ {fehler}
          </div>
        )}

        {/* Schritt 0: Konto */}
        {schritt === 0 && (
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:"var(--text)",
              marginBottom:4 }}>Konto erstellen</div>
            <div style={{ color:"var(--muted)", fontSize:13, marginBottom:20 }}>
              14 Tage kostenlos testen — keine Kreditkarte nötig.
            </div>
            <div style={{ marginBottom:14 }}>
              <Label>E-Mail</Label>
              <input type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="chef@bauunternehmen.de"
                style={inputStyle()} />
            </div>
            <div style={{ marginBottom:20 }}>
              <Label>Passwort (min. 8 Zeichen)</Label>
              <input type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle()} />
            </div>
            <button onClick={kontoAnlegen} disabled={laden}
              style={{ width:"100%", background:"var(--yellow)", color:"#1a1200",
                border:"none", borderRadius:12, padding:15, fontWeight:800,
                fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
              {laden ? "⏳ Wird angelegt…" : "Konto erstellen →"}
            </button>
            <div style={{ textAlign:"center", marginTop:16 }}>
              <span style={{ color:"var(--muted)", fontSize:13 }}>
                Bereits registriert?{" "}
              </span>
              <button onClick={onZurueck}
                style={{ background:"none", border:"none", color:"var(--blue)",
                  cursor:"pointer", fontSize:13, fontWeight:600,
                  fontFamily:"inherit" }}>
                Anmelden
              </button>
            </div>
          </div>
        )}

        {/* Schritt 1: Firma */}
        {schritt === 1 && (
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:"var(--text)",
              marginBottom:4 }}>Dein Unternehmen</div>
            <div style={{ color:"var(--muted)", fontSize:13, marginBottom:20 }}>
              Wie heißt dein Bauunternehmen?
            </div>
            <div style={{ marginBottom:20 }}>
              <Label>Firmenname *</Label>
              <input value={firmaName}
                onChange={e => setFirmaName(e.target.value)}
                placeholder="Koeven Bau GmbH"
                style={inputStyle()} />
            </div>

            {/* Plan Auswahl */}
            <Label>Plan (nach Testphase)</Label>
            <div style={{ display:"flex", flexDirection:"column", gap:8,
              marginTop:6, marginBottom:20 }}>
              {Object.entries(PLAN_CONFIG).map(([key, p]) => (
                <div key={key} style={{ background:"var(--surface2)",
                  borderRadius:12, padding:"12px 16px",
                  border:`1.5px solid ${key === "starter" ? "var(--blue)" : "var(--border)"}`,
                  display:"flex", justifyContent:"space-between",
                  alignItems:"center" }}>
                  <div>
                    <div style={{ color:"var(--text)", fontWeight:700,
                      fontSize:13 }}>{p.icon} {p.label}</div>
                    <div style={{ color:"var(--muted)", fontSize:11 }}>
                      {key === "trial" ? "Automatisch aktiv" : p.preis}
                    </div>
                  </div>
                  {key === "starter" && (
                    <div style={{ background:"var(--bbg)", color:"var(--blue)",
                      borderRadius:20, padding:"2px 8px", fontSize:10,
                      fontWeight:700 }}>Empfohlen</div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={firmaAnlegen} disabled={laden || !firmaName.trim()}
              style={{ width:"100%",
                background: firmaName.trim() ? "var(--yellow)" : "var(--surface2)",
                color: firmaName.trim() ? "#1a1200" : "var(--muted)",
                border:"none", borderRadius:12, padding:15, fontWeight:800,
                fontSize:15, cursor: firmaName.trim() ? "pointer" : "default",
                fontFamily:"inherit" }}>
              {laden ? "⏳ Wird eingerichtet…" : "Polaris einrichten 🚀"}
            </button>
          </div>
        )}

        {/* Schritt 2: Fertig */}
        {schritt === 2 && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🎉</div>
            <div style={{ fontWeight:800, fontSize:20, color:"var(--green)",
              marginBottom:8 }}>Willkommen bei Polaris!</div>
            <div style={{ color:"var(--text2)", fontSize:14, lineHeight:1.6,
              marginBottom:24 }}>
              Dein Unternehmen <strong>{firmaName}</strong> wurde eingerichtet.
              Du hast 14 Tage kostenlos zum Testen.
            </div>
            <button onClick={() => window.location.reload()}
              style={{ width:"100%", background:"var(--yellow)", color:"#1a1200",
                border:"none", borderRadius:12, padding:15, fontWeight:800,
                fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
              Los geht's →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Einladungs-Screen ────────────────────────────────────────────────────
function EinladungScreen({ token, onErfolg }) {
  const [einladung,  setEinladung]  = useState(null);
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [laden,      setLaden]      = useState(true);
  const [fehler,     setFehler]     = useState("");
  const [schritt,    setSchritt]    = useState(0); // 0=laden 1=registrieren 2=fertig

  useEffect(() => { pruefeToken(); }, [token]);

  async function pruefeToken() {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/einladungen?token=eq.${token}&select=*,firmen(name,logo_url)`,
      { headers: { "apikey": SUPABASE_ANON_KEY } }
    );
    const data = await res.json();
    if (data?.[0]) {
      setEinladung(data[0]);
      setEmail(data[0].email || "");
      setSchritt(1);
    } else {
      setFehler("Diese Einladung ist ungültig oder abgelaufen.");
    }
    setLaden(false);
  }

  async function registrierenUndEinloesen() {
    if (!email || !password || password.length < 6) {
      setFehler("Bitte E-Mail und Passwort eingeben (min. 6 Zeichen)."); return;
    }
    setLaden(true); setFehler("");

    // Registrieren
    const signRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const signData = await signRes.json();

    // Falls schon registriert: einloggen
    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const session = await loginRes.json();
    if (!session.access_token) {
      setFehler("Anmeldung fehlgeschlagen. Passwort korrekt?");
      setLaden(false); return;
    }

    // Einladung einlösen
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/einladung_einloesen`, {
      method: "POST",
      headers: {
        "apikey":        SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ p_token: token, p_user_id: session.user?.id }),
    });
    const result = await rpcRes.json();

    if (result.ok) {
      localStorage.setItem("polaris-session", JSON.stringify(session));
      setSchritt(2);
      setTimeout(() => onErfolg?.(), 2000);
    } else {
      setFehler(result.fehler || "Einladung konnte nicht eingelöst werden.");
    }
    setLaden(false);
  }

  if (laden && schritt === 0) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      minHeight:"100vh", background:"var(--bg)", color:"var(--muted)",
      fontFamily:"inherit" }}>
      ⏳ Einladung wird geprüft…
    </div>
  );

  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"24px 20px",
      fontFamily:"'Segoe UI', system-ui, sans-serif" }}>

      <div style={{ fontWeight:900, fontSize:24, letterSpacing:-1,
        color:"var(--text)", marginBottom:24, textAlign:"center" }}>
        <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
      </div>

      <div style={{ background:"var(--surface)", borderRadius:20, padding:28,
        width:"100%", maxWidth:400, border:"1.5px solid var(--border)" }}>

        {fehler && (
          <div style={{ background:"var(--rbg)", color:"var(--red)",
            borderRadius:10, padding:"10px 14px", marginBottom:16,
            fontSize:13, border:"1px solid var(--red)" }}>
            ❌ {fehler}
          </div>
        )}

        {schritt === 1 && einladung && (
          <div>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:40, marginBottom:8 }}>👋</div>
              <div style={{ fontWeight:800, fontSize:18, color:"var(--text)" }}>
                Du wurdest eingeladen!
              </div>
              <div style={{ color:"var(--text2)", fontSize:13, marginTop:6 }}>
                Tritt <strong>{einladung.firmen?.name}</strong> als{" "}
                <strong>{ROLLEN[einladung.rolle]?.label}</strong> bei.
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <Label>E-Mail</Label>
              <input type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="deine@email.de" style={inputStyle()} />
            </div>
            <div style={{ marginBottom:20 }}>
              <Label>Passwort wählen</Label>
              <input type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" style={inputStyle()} />
            </div>
            <button onClick={registrierenUndEinloesen} disabled={laden}
              style={{ width:"100%", background:"var(--yellow)", color:"#1a1200",
                border:"none", borderRadius:12, padding:15, fontWeight:800,
                fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
              {laden ? "⏳…" : "Einladung annehmen →"}
            </button>
          </div>
        )}

        {schritt === 2 && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
            <div style={{ fontWeight:800, fontSize:18, color:"var(--green)" }}>
              Willkommen im Team!
            </div>
            <div style={{ color:"var(--muted)", fontSize:13, marginTop:8 }}>
              Du wirst weitergeleitet…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Einladungs-Generator (für Admins) ───────────────────────────────────
function EinladungGenerieren({ session, firmaId, kolonnen }) {
  const [rolle,      setRolle]      = useState("facharbeiter");
  const [kolonneId,  setKolonneId]  = useState("");
  const [email,      setEmail]      = useState("");
  const [tage,       setTage]       = useState(7);
  const [link,       setLink]       = useState("");
  const [laden,      setLaden]      = useState(false);

  async function generieren() {
    setLaden(true);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/einladungen`, {
      method: "POST",
      headers: {
        "apikey":        SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${session?.access_token}`,
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
      },
      body: JSON.stringify({
        firma_id:     firmaId,
        rolle,
        kolonne_id:   kolonneId || null,
        email:        email || null,
        läuft_ab_at:  new Date(Date.now() + tage * 86400000).toISOString(),
        max_nutzungen: 1,
      }),
    });
    const data = await res.json();
    if (data?.[0]?.token) {
      const baseUrl = window.location.origin;
      setLink(`${baseUrl}?einladung=${data[0].token}`);
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

// ─── Plan Guard – zeigt Upgrade-Screen wenn Limit erreicht ───────────────
function PlanGuard({ firma, kinder, ressource }) {
  if (!firma) return kinder;

  const trial_abgelaufen = firma.plan === "trial" &&
    firma.trial_ends_at && new Date(firma.trial_ends_at) < new Date();
  const abo_inaktiv = firma.plan_status === "cancelled" ||
    firma.plan_status === "expired";

  if (!trial_abgelaufen && !abo_inaktiv) return kinder;

  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:24,
      fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <div style={{ fontWeight:800, fontSize:22, color:"var(--text)",
        marginBottom:8, textAlign:"center" }}>
        {trial_abgelaufen ? "Testphase abgelaufen" : "Abo inaktiv"}
      </div>
      <div style={{ color:"var(--text2)", fontSize:14, textAlign:"center",
        maxWidth:320, marginBottom:28, lineHeight:1.6 }}>
        {trial_abgelaufen
          ? "Deine 14-tägige Testphase ist beendet. Wähle einen Plan um weiterzumachen."
          : "Dein Abo ist nicht mehr aktiv. Bitte erneuere dein Abonnement."}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10,
        width:"100%", maxWidth:340 }}>
        {[
          { key:"starter", label:"Starter",  preis:"49 €/Monat", features:"5 Projekte, 10 Nutzer" },
          { key:"pro",     label:"Pro",       preis:"99 €/Monat", features:"20 Projekte, 50 Nutzer, API" },
        ].map(p => (
          <div key={p.key} style={{ background:"var(--surface)", borderRadius:14,
            padding:"16px 20px", border:`2px solid ${p.key === "pro" ? "var(--yellow)" : "var(--border)"}` }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:6 }}>
              <div style={{ fontWeight:800, fontSize:16, color:"var(--text)" }}>
                {p.label}
              </div>
              <div style={{ fontWeight:700, color:"var(--yellow)" }}>{p.preis}</div>
            </div>
            <div style={{ color:"var(--muted)", fontSize:12, marginBottom:12 }}>
              {p.features}
            </div>
            <button
              onClick={() => window.open("https://polaris.app/billing", "_blank")}
              style={{ width:"100%",
                background: p.key === "pro" ? "var(--yellow)" : "var(--surface2)",
                color: p.key === "pro" ? "#1a1200" : "var(--text)",
                border:"none", borderRadius:10, padding:12, fontWeight:700,
                cursor:"pointer", fontFamily:"inherit" }}>
              {p.key === "pro" ? "⚡ Pro wählen" : "Starter wählen"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// THEME – Dark/Light Mode
// ════════════════════════════════════════════════════════════════════════════
function useTheme() {
  const [dark, setDark] = useState(() =>
    localStorage.getItem("polaris-theme") === "dark" ||
    (!localStorage.getItem("polaris-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "";
    localStorage.setItem("polaris-theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}

function ThemeToggle({ dark, toggle }) {
  return (
    <button onClick={toggle} title={dark ? "Hellmodus" : "Dunkelmodus"}
      style={{ width:36, height:36, borderRadius:10, background:"var(--surface2)",
        border:"1.5px solid var(--border2)", cursor:"pointer", fontSize:17,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
      {dark ? "☀️" : "🌙"}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ONBOARDING
// ════════════════════════════════════════════════════════════════════════════
const ONBOARDING_KEY = "polier_pro_onboarding_done";

function OnboardingFlow({ onComplete }) {
  const [schritt, setSchritt] = useState(0);
  const [firma, setFirma] = useState({
    name:"", strasse:"", plz:"", ort:"", telefon:"", email:"",
    geschaeftsfuehrer:"", steuernummer:"", gewerke:[], logo:null,
  });
  const [ersterPolier, setErsterPolier] = useState({ name:"", telefon:"", email:"" });
  const logoRef = useRef(null);

  const SCHRITTE = [
    { label:"Willkommen", icon:"★" },
    { label:"Firma",      icon:"🏢" },
    { label:"Gewerke",    icon:"🔧" },
    { label:"Team",       icon:"👷" },
    { label:"Fertig",     icon:"🎉" },
  ];

  function handleLogoWahl(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setFirma(p => ({ ...p, logo: ev.target.result }));
    reader.readAsDataURL(file);
  }

  function toggleGewerk(key) {
    setFirma(p => ({
      ...p,
      gewerke: p.gewerke.includes(key)
        ? p.gewerke.filter(x => x !== key)
        : [...p.gewerke, key],
    }));
  }

  function abschliessen() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    onComplete(firma, ersterPolier);
  }

  const weiterOk = [
    true,
    firma.name.trim().length > 0,
    firma.gewerke.length > 0,
    true,
    true,
  ][schritt];

  const pct = Math.round(((schritt + 1) / SCHRITTE.length) * 100);

  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh",
      fontFamily:"'Segoe UI', system-ui, sans-serif",
      display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ background:"var(--surface)", padding:"16px 20px 14px",
        borderBottom:"3px solid var(--yellow)",
        boxShadow:"0 2px 8px rgba(0,0,0,0.08)", flexShrink:0 }}>
        {/* Logo + Schritt */}
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:14 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:20, letterSpacing:-1,
              color:"var(--text)", lineHeight:1 }}>
              <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
            </div>
            <div style={{ fontSize:10, color:"var(--muted)", fontWeight:600,
              letterSpacing:2, textTransform:"uppercase", marginTop:2 }}>
              Einrichtung
            </div>
          </div>
          <div style={{ color:"var(--muted)", fontSize:12, fontWeight:600 }}>
            {schritt + 1} / {SCHRITTE.length}
          </div>
        </div>

        {/* Fortschrittsbalken */}
        <div style={{ background:"var(--surface2)", borderRadius:6, height:6,
          overflow:"hidden", marginBottom:10,
          border:"1px solid var(--border)" }}>
          <div style={{ height:"100%", background:"var(--yellow)", borderRadius:6,
            width:`${pct}%`, transition:"width 0.4s ease" }} />
        </div>

        {/* Schritt-Indikatoren */}
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          {SCHRITTE.map((s, i) => (
            <div key={i} style={{ display:"flex", flexDirection:"column",
              alignItems:"center", gap:3 }}>
              <div style={{ width:28, height:28, borderRadius:14,
                background: i < schritt ? "var(--green)"
                  : i === schritt ? "var(--yellow)" : "var(--surface2)",
                border: i === schritt ? "2px solid var(--yellow)"
                  : i < schritt ? "2px solid var(--green)" : "2px solid var(--border)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:12, fontWeight:700,
                color: i <= schritt ? (i < schritt ? "#fff" : "#1a1200") : "var(--muted)",
                transition:"all 0.3s" }}>
                {i < schritt ? "✓" : s.icon}
              </div>
              <div style={{ fontSize:9, fontWeight: i === schritt ? 700 : 400,
                color: i === schritt ? "var(--text)" : "var(--muted)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"28px 20px 120px" }}>

        {/* ── Schritt 0: Willkommen ── */}
        {schritt === 0 && (
          <div style={{ textAlign:"center", paddingTop:24 }}>
            <div style={{ fontSize:80, marginBottom:8, lineHeight:1 }}>★</div>
            <div style={{ fontWeight:900, fontSize:32, letterSpacing:-2,
              color:"var(--text)", marginBottom:4 }}>
              <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
            </div>
            <div style={{ fontSize:11, color:"var(--muted)", fontWeight:600,
              letterSpacing:3, textTransform:"uppercase", marginBottom:24 }}>
              Baustellenmanagement
            </div>
            <div style={{ color:"var(--text2)", fontSize:15, lineHeight:1.7,
              maxWidth:320, margin:"0 auto 32px" }}>
              Die App für Poliere im Hoch- und Tiefbau.
              Wir richten alles in 4 Schritten für dich ein.
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10,
              maxWidth:320, margin:"0 auto" }}>
              {[
                ["🏗️", "Betonfelder & Rasterplanung"],
                ["👷", "Kolonnen & GPS-Zeiterfassung"],
                ["📋", "Bautagebuch mit Fotos & KI"],
                ["🌤️", "Wetterbasierter Betoncheck"],
                ["📄", "PDF-Export VOB-konform"],
              ].map(([icon, text]) => (
                <div key={text} style={{ display:"flex", alignItems:"center",
                  gap:14, background:"var(--surface)", borderRadius:14,
                  padding:"14px 18px", border:"1.5px solid var(--border)",
                  textAlign:"left" }}>
                  <span style={{ fontSize:24, flexShrink:0 }}>{icon}</span>
                  <span style={{ color:"var(--text2)", fontSize:14,
                    fontWeight:500 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Schritt 1: Firma ── */}
        {schritt === 1 && (
          <div>
            <div style={{ fontWeight:800, fontSize:22, color:"var(--text)",
              marginBottom:4 }}>🏢 Dein Unternehmen</div>
            <div style={{ color:"var(--muted)", fontSize:13, marginBottom:24,
              lineHeight:1.5 }}>
              Diese Daten erscheinen auf PDFs und im Bautagebuch.
            </div>

            {/* Logo */}
            <div style={{ marginBottom:24, textAlign:"center" }}>
              <input ref={logoRef} type="file" accept="image/*"
                style={{ display:"none" }} onChange={handleLogoWahl} />
              <div onClick={() => logoRef.current.click()}
                style={{ width:96, height:96, borderRadius:48,
                  margin:"0 auto 10px",
                  background: firma.logo ? "transparent" : "var(--ybg)",
                  border:`2px dashed var(--yellow)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", overflow:"hidden", transition:"all 0.2s" }}>
                {firma.logo
                  ? <img src={firma.logo} alt="Logo"
                      style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : <span style={{ fontSize:36 }}>🏢</span>}
              </div>
              <div style={{ color:"var(--muted)", fontSize:11, fontWeight:600 }}>
                Logo tippen zum Hochladen
              </div>
            </div>

            {[
              ["Firmenname *",    "name",              "Bauunternehmen GmbH"],
              ["Geschäftsführer", "geschaeftsfuehrer", "Max Mustermann"],
              ["Straße + Nr.",   "strasse",            "Musterstraße 12"],
              ["PLZ",            "plz",                "80331"],
              ["Ort",            "ort",                "München"],
              ["Telefon",        "telefon",            "+49 89 123456"],
              ["E-Mail",         "email",              "info@firma.de"],
              ["Steuernummer",   "steuernummer",       "123/456/78900"],
            ].map(([label, key, ph]) => (
              <div key={key} style={{ marginBottom:14 }}>
                <Label>{label}</Label>
                <input value={firma[key]||""}
                  onChange={e => setFirma(p=>({...p,[key]:e.target.value}))}
                  placeholder={ph} style={inputStyle()} />
              </div>
            ))}
          </div>
        )}

        {/* ── Schritt 2: Gewerke ── */}
        {schritt === 2 && (
          <div>
            <div style={{ fontWeight:800, fontSize:22, color:"var(--text)",
              marginBottom:4 }}>🔧 Eure Gewerke</div>
            <div style={{ color:"var(--muted)", fontSize:13, marginBottom:20,
              lineHeight:1.5 }}>
              Welche Gewerke führt dein Unternehmen aus?
              Das bestimmt die verfügbaren Felder und Checklisten.
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {ALLE_GEWERKE.map(g => {
                const aktiv = firma.gewerke.includes(g.key);
                return (
                  <div key={g.key} onClick={() => toggleGewerk(g.key)}
                    style={{ background: aktiv ? "var(--ybg)" : "var(--surface)",
                      border:`2px solid ${aktiv ? "var(--yellow)" : "var(--border)"}`,
                      borderRadius:14, padding:"13px 12px", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:10,
                      transition:"all 0.15s" }}>
                    <span style={{ fontSize:20 }}>{g.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ color: aktiv ? "var(--text)" : "var(--text2)",
                        fontSize:11, fontWeight: aktiv ? 700 : 400,
                        lineHeight:1.3 }}>{g.label}</div>
                    </div>
                    {aktiv && (
                      <div style={{ width:20, height:20, borderRadius:10,
                        background:"var(--yellow)", display:"flex",
                        alignItems:"center", justifyContent:"center",
                        fontSize:11, fontWeight:800, color:"#1a1200",
                        flexShrink:0 }}>✓</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign:"center", marginTop:14,
              color:"var(--muted)", fontSize:12 }}>
              {firma.gewerke.length} Gewerk{firma.gewerke.length !== 1 ? "e" : ""} ausgewählt
            </div>
          </div>
        )}

        {/* ── Schritt 3: Erster Polier ── */}
        {schritt === 3 && (
          <div>
            <div style={{ fontWeight:800, fontSize:22, color:"var(--text)",
              marginBottom:4 }}>👷 Erster Polier</div>
            <div style={{ color:"var(--muted)", fontSize:13, marginBottom:24,
              lineHeight:1.5 }}>
              Wer nutzt die App als erstes? Weitere Nutzer kannst du
              später im Unternehmen-Bereich hinzufügen.
            </div>
            <div style={{ background:"var(--surface)", borderRadius:16,
              padding:20, marginBottom:16,
              border:"1.5px solid var(--border)" }}>
              {[
                ["Name *",  "name",    "Thomas Huber"],
                ["Telefon", "telefon", "+49 89 123456"],
                ["E-Mail",  "email",   "huber@firma.de"],
              ].map(([label, key, ph]) => (
                <div key={key} style={{ marginBottom:14 }}>
                  <Label>{label}</Label>
                  <input value={ersterPolier[key]||""}
                    onChange={e => setErsterPolier(p=>({...p,[key]:e.target.value}))}
                    placeholder={ph} style={inputStyle()} />
                </div>
              ))}
            </div>
            <div style={{ background:"var(--bbg)", borderRadius:12,
              padding:"12px 16px", display:"flex", gap:12, alignItems:"flex-start",
              border:"1px solid var(--blue)" }}>
              <span style={{ fontSize:18, flexShrink:0 }}>ℹ️</span>
              <span style={{ color:"var(--blue)", fontSize:12, lineHeight:1.5 }}>
                Dieser Schritt ist optional. Du kannst Nutzer auch direkt
                über Supabase Auth anlegen und die Rolle in der App zuweisen.
              </span>
            </div>
          </div>
        )}

        {/* ── Schritt 4: Fertig ── */}
        {schritt === 4 && (
          <div style={{ textAlign:"center", paddingTop:24 }}>
            <div style={{ fontSize:72, marginBottom:16, lineHeight:1 }}>🎉</div>
            <div style={{ fontWeight:900, fontSize:28, color:"var(--green)",
              marginBottom:8 }}>Alles bereit!</div>
            <div style={{ color:"var(--text2)", fontSize:14, lineHeight:1.7,
              maxWidth:300, margin:"0 auto 28px" }}>
              Polaris ist eingerichtet. Du kannst jetzt deine
              erste Baustelle anlegen.
            </div>

            {/* Zusammenfassung */}
            <div style={{ background:"var(--surface)", borderRadius:16,
              padding:20, textAlign:"left", marginBottom:20,
              border:"1.5px solid var(--border)" }}>
              <div style={{ color:"var(--muted)", fontSize:11, fontWeight:700,
                textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>
                Deine Einstellungen
              </div>
              <div style={{ display:"flex", gap:14, alignItems:"center",
                marginBottom:14 }}>
                {firma.logo
                  ? <img src={firma.logo} style={{ width:48, height:48,
                      borderRadius:24, objectFit:"cover",
                      border:"2px solid var(--yellow)" }} />
                  : <div style={{ width:48, height:48, borderRadius:24,
                      background:"var(--ybg)", border:"2px solid var(--yellow)",
                      display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:22, flexShrink:0 }}>🏢</div>}
                <div>
                  <div style={{ color:"var(--text)", fontWeight:800,
                    fontSize:15 }}>{firma.name || "—"}</div>
                  <div style={{ color:"var(--muted)", fontSize:12 }}>
                    {[firma.plz, firma.ort].filter(Boolean).join(" ")}
                  </div>
                </div>
              </div>
              {firma.gewerke.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {firma.gewerke.map(k => {
                    const g = ALLE_GEWERKE.find(x=>x.key===k);
                    return g ? (
                      <div key={k} style={{ background:"var(--surface2)",
                        borderRadius:20, padding:"4px 10px", fontSize:11,
                        color:"var(--text2)", fontWeight:600,
                        border:"1px solid var(--border)" }}>
                        {g.icon} {g.label}
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              {ersterPolier.name && (
                <div style={{ marginTop:12, padding:"10px 14px",
                  background:"var(--surface2)", borderRadius:10,
                  color:"var(--text2)", fontSize:12 }}>
                  👷 {ersterPolier.name}
                  {ersterPolier.telefon && ` · ${ersterPolier.telefon}`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0,
        background:"var(--surface)", padding:"14px 20px",
        borderTop:"1px solid var(--border)",
        boxShadow:"0 -4px 16px rgba(0,0,0,0.08)",
        display:"flex", gap:10,
        paddingBottom:"calc(14px + env(safe-area-inset-bottom))" }}>
        {schritt > 0 && schritt < 4 && (
          <button onClick={() => setSchritt(s => s-1)}
            style={{ flex:1, background:"var(--surface2)",
              color:"var(--text2)",
              border:"1.5px solid var(--border)", borderRadius:12,
              padding:14, cursor:"pointer", fontSize:14,
              fontWeight:600, fontFamily:"inherit" }}>
            ← Zurück
          </button>
        )}
        {schritt === 3 && (
          <button onClick={() => setSchritt(4)}
            style={{ flex:1, background:"var(--surface2)",
              color:"var(--muted)",
              border:"1.5px solid var(--border)", borderRadius:12,
              padding:14, cursor:"pointer", fontSize:13,
              fontFamily:"inherit" }}>
            Überspringen
          </button>
        )}
        {schritt < 4 ? (
          <button onClick={() => setSchritt(s => s+1)}
            disabled={!weiterOk}
            style={{ flex:2, background: weiterOk ? "var(--yellow)" : "var(--surface2)",
              color: weiterOk ? "#1a1200" : "var(--muted)",
              border:"none", borderRadius:12, padding:16,
              fontWeight:800, cursor: weiterOk ? "pointer" : "default",
              fontSize:16, fontFamily:"inherit",
              transition:"all 0.2s" }}>
            {schritt === 0 ? "Los geht's →" : "Weiter →"}
          </button>
        ) : (
          <button onClick={abschliessen}
            style={{ flex:1, background:"var(--green)", color:"#fff",
              border:"none", borderRadius:12, padding:16, fontWeight:800,
              cursor:"pointer", fontSize:16, fontFamily:"inherit" }}>
            🚀 Erste Baustelle anlegen
          </button>
        )}
      </div>
    </div>
  );
}


function usePWA() {
  const [installierbar,  setInstallierbar]  = useState(false);
  const [installiert,    setInstalliert]    = useState(false);
  const [updateVerfügbar,setUpdateVerfügbar]= useState(false);
  const [offline,        setOffline]        = useState(!navigator.onLine);

  useEffect(() => {
    const onInstallable = () => setInstallierbar(true);
    const onInstalled   = () => { setInstallierbar(false); setInstalliert(true); };
    const onUpdate      = () => setUpdateVerfügbar(true);
    const onOnline      = () => setOffline(false);
    const onOffline     = () => setOffline(true);

    window.addEventListener("pwa-installable",       onInstallable);
    window.addEventListener("pwa-installed",         onInstalled);
    window.addEventListener("pwa-update-available",  onUpdate);
    window.addEventListener("pwa-online",            onOnline);
    window.addEventListener("pwa-offline",           onOffline);

    return () => {
      window.removeEventListener("pwa-installable",      onInstallable);
      window.removeEventListener("pwa-installed",        onInstalled);
      window.removeEventListener("pwa-update-available", onUpdate);
      window.removeEventListener("pwa-online",           onOnline);
      window.removeEventListener("pwa-offline",          onOffline);
    };
  }, []);

  async function installieren() {
    const ok = await window.pwaInstall?.();
    if (ok) setInstalliert(true);
  }

  function updateAnwenden() {
    window.location.reload();
  }

  return { installierbar, installiert, updateVerfügbar, offline, installieren, updateAnwenden };
}

function PWABanner({ pwa }) {
  if (!pwa.installierbar && !pwa.updateVerfügbar && !pwa.offline) return null;
  return (
    <div style={{ position:"fixed", bottom:72, left:8, right:8, zIndex:999,
      display:"flex", flexDirection:"column", gap:6 }}>

      {/* Offline-Banner */}
      {pwa.offline && (
        <div style={{ background:"#2E1A1A", borderRadius:12, padding:"10px 14px",
          display:"flex", alignItems:"center", gap:10,
          border:`1px solid ${'var(--red)'}`, boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize:18 }}>📵</span>
          <div style={{ flex:1 }}>
            <div style={{ color: "var(--red)", fontWeight:700, fontSize:13 }}>Offline</div>
            <div style={{ color: "var(--muted)", fontSize:11 }}>Änderungen werden gespeichert und synchronisiert sobald du wieder online bist.</div>
          </div>
        </div>
      )}

      {/* Update-Banner */}
      {pwa.updateVerfügbar && (
        <div style={{ background:"#1A2A1A", borderRadius:12, padding:"10px 14px",
          display:"flex", alignItems:"center", gap:10,
          border:`1px solid ${'var(--green)'}`, boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize:18 }}>🔄</span>
          <div style={{ flex:1 }}>
            <div style={{ color: "var(--green)", fontWeight:700, fontSize:13 }}>Update verfügbar</div>
            <div style={{ color: "var(--muted)", fontSize:11 }}>Neue Version von Polaris bereit.</div>
          </div>
          <button onClick={pwa.updateAnwenden}
            style={{ background: "var(--green)", color:"#fff", border:"none",
              borderRadius:8, padding:"6px 12px", cursor:"pointer", fontWeight:700, fontSize:12 }}>
            Jetzt
          </button>
        </div>
      )}

      {/* Install-Banner */}
      {pwa.installierbar && !pwa.installiert && (
        <div style={{ background: "var(--surface)", borderRadius:12, padding:"12px 14px",
          display:"flex", alignItems:"center", gap:10,
          border:`1px solid ${'var(--yellow)'}`, boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize:22 }}>⚒️</span>
          <div style={{ flex:1 }}>
            <div style={{ color: "var(--text)", fontWeight:700, fontSize:13 }}>Polaris installieren</div>
            <div style={{ color: "var(--muted)", fontSize:11 }}>Zum Homescreen hinzufügen – funktioniert auch offline.</div>
          </div>
          <button onClick={pwa.installieren}
            style={{ background: "var(--yellow)", color:"#1C2027", border:"none",
              borderRadius:8, padding:"7px 12px", cursor:"pointer", fontWeight:700, fontSize:12 }}>
            Installieren
          </button>
        </div>
      )}
    </div>
  );
}



// ════════════════════════════════════════════════════════════════════════════
// AUTH & ROLLEN SYSTEM
// ════════════════════════════════════════════════════════════════════════════

const ROLLEN = {
  administrator: {
    label: "Administrator",
    icon: "🔑",
    farbe: "#7C3AED",
    tabs: ["dashboard","felder","gantt","editor","scanner","wetter","kolonnen","tagebuch","zeiten","firmen"],
    kannBearbeiten: true,
    kannNutzerVerwalten: true,
    siehtAlleProjekte: true,
  },
  bauleiter: {
    label: "Bauleiter",
    icon: "📋",
    farbe: "#2563EB",
    tabs: ["dashboard","felder","gantt","wetter","kolonnen","tagebuch","zeiten"],
    kannBearbeiten: false,
    kannNutzerVerwalten: false,
    siehtAlleProjekte: true,
  },
  polier: {
    label: "Polier",
    icon: "⚒️",
    farbe: "#F5C400",
    tabs: ["dashboard","felder","gantt","editor","scanner","wetter","kolonnen","tagebuch","zeiten"],
    kannBearbeiten: true,
    kannNutzerVerwalten: false,
    siehtAlleProjekte: false,
  },
  vorarbeiter: {
    label: "Vorarbeiter",
    icon: "👷",
    farbe: "#EA580C",
    tabs: ["dashboard","felder","kolonnen","tagebuch","stempeln"],
    kannBearbeiten: true,
    kannNutzerVerwalten: false,
    siehtAlleProjekte: false,
  },
  facharbeiter: {
    label: "Facharbeiter",
    icon: "🔨",
    farbe: "#64748B",
    tabs: ["stempeln"],
    kannBearbeiten: false,
    kannNutzerVerwalten: false,
    siehtAlleProjekte: false,
  },
};

// ─── Supabase Auth Helpers ────────────────────────────────────────────────
async function sbSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function sbSignOut(token) {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` },
  });
}

async function sbGetProfile(token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profile?select=*&limit=1`, {
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`,
    },
  });
  const data = await res.json();
  return data?.[0] || null;
}

// ─── Auth Hook ────────────────────────────────────────────────────────────
function useAuth() {
  const [session, setSession]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("polaris-session") || "null"); } catch { return null; }
  });
  const [profil,  setProfil]    = useState(null);
  const [loading, setLoading]   = useState(false);
  const [fehler,  setFehler]    = useState("");

  useEffect(() => {
    if (session?.access_token) {
      sbGetProfile(session.access_token).then(p => {
        if (p) setProfil(p);
        else { localStorage.removeItem("polaris-session"); setSession(null); }
      });
    }
  }, [session?.access_token]);

  async function anmelden(email, password) {
    setLoading(true); setFehler("");
    const data = await sbSignIn(email, password);
    if (data.access_token) {
      localStorage.setItem("polaris-session", JSON.stringify(data));
      setSession(data);
    } else {
      setFehler(data.error_description || data.msg || "Anmeldung fehlgeschlagen");
    }
    setLoading(false);
  }

  async function abmelden() {
    if (session?.access_token) await sbSignOut(session.access_token);
    localStorage.removeItem("polaris-session");
    setSession(null); setProfil(null);
  }

  const rolle = profil?.rolle || null;
  const rolleConfig = rolle ? ROLLEN[rolle] : null;

  // Fallback: wenn Supabase nicht konfiguriert → Demo-Modus
  const supabaseKonfiguriert = !SUPABASE_URL.includes("DEIN");

  return { session, profil, rolle, rolleConfig, loading, fehler,
    anmelden, abmelden, supabaseKonfiguriert };
}

// ─── Login Screen ─────────────────────────────────────────────────────────
function LoginScreen({ auth, onDemoLogin, onRegistrieren }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);

  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh", display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"24px 20px", fontFamily:"'Segoe UI', system-ui, sans-serif" }}>

      {/* Logo */}
      <div style={{ textAlign:"center", marginBottom:40 }}>
        <div style={{ fontSize:56, marginBottom:12 }}>★</div>
        <div style={{ fontWeight:900, fontSize:32, letterSpacing:-2, color:"var(--text)" }}>
          <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
        </div>
        <div style={{ fontSize:12, color:"var(--muted)", fontWeight:600,
          letterSpacing:3, textTransform:"uppercase", marginTop:4 }}>
          Baustellenmanagement
        </div>
      </div>

      {/* Login Card */}
      <div style={{ background:"var(--surface)", borderRadius:20, padding:28,
        width:"100%", maxWidth:380, border:"1.5px solid var(--border)",
        boxShadow:"0 8px 32px rgba(0,0,0,0.12)" }}>
        <div style={{ color:"var(--text)", fontWeight:800, fontSize:18,
          marginBottom:20 }}>Anmelden</div>

        {auth.fehler && (
          <div style={{ background:"var(--rbg)", color:"var(--red)",
            borderRadius:10, padding:"10px 14px", marginBottom:16,
            fontSize:13, border:"1px solid var(--red)" }}>
            ❌ {auth.fehler}
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <Label>E-Mail</Label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="name@firma.de" style={inputStyle()}
            onKeyDown={e => e.key==="Enter" && auth.anmelden(email, password)} />
        </div>

        <div style={{ marginBottom:20 }}>
          <Label>Passwort</Label>
          <div style={{ position:"relative" }}>
            <input type={showPw ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" style={{ ...inputStyle(), paddingRight:44 }}
              onKeyDown={e => e.key==="Enter" && auth.anmelden(email, password)} />
            <button onClick={() => setShowPw(p=>!p)}
              style={{ position:"absolute", right:12, top:"50%",
                transform:"translateY(-50%)", background:"none", border:"none",
                cursor:"pointer", fontSize:16, color:"var(--muted)" }}>
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <button onClick={() => auth.anmelden(email, password)}
          disabled={auth.loading || !email || !password}
          style={{ width:"100%", background: email && password ? "var(--yellow)" : "var(--surface2)",
            color: email && password ? "#1a1200" : "var(--muted)",
            border:"none", borderRadius:12, padding:16, fontWeight:800,
            fontSize:16, cursor: email && password ? "pointer" : "default",
            fontFamily:"inherit" }}>
          {auth.loading ? "⏳ Anmelden…" : "Anmelden →"}
        </button>

        {/* Demo-Modus wenn Supabase nicht konfiguriert */}
        {!auth.supabaseKonfiguriert && (
          <div style={{ marginTop:20, borderTop:"1px solid var(--border)", paddingTop:16 }}>
            <div style={{ color:"var(--muted)", fontSize:12, marginBottom:10, textAlign:"center" }}>
              Supabase nicht konfiguriert — Demo-Modus:
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {Object.entries(ROLLEN).map(([key, r]) => (
                <button key={key} onClick={() => onDemoLogin(key)}
                  style={{ background:"var(--surface2)", color:"var(--text)",
                    border:"1.5px solid var(--border)", borderRadius:10,
                    padding:"8px 10px", cursor:"pointer", fontFamily:"inherit",
                    fontSize:11, fontWeight:700, textAlign:"left" }}>
                  {r.icon} {r.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop:20, fontSize:12, color:"var(--muted)", textAlign:"center" }}>
        Zugangsdaten beim Administrator anfragen
      </div>
    </div>
  );
}

// ─── Rollen Badge ─────────────────────────────────────────────────────────
function RollenBadge({ rolle }) {
  const r = ROLLEN[rolle];
  if (!r) return null;
  return (
    <div style={{ background:"var(--surface2)", color:"var(--text2)",
      border:"1px solid var(--border)", borderRadius:20,
      padding:"3px 10px", fontSize:11, fontWeight:700,
      display:"flex", alignItems:"center", gap:5 }}>
      <span>{r.icon}</span>
      <span>{r.label}</span>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// GPS STEMPELUHR
// ════════════════════════════════════════════════════════════════════════════

async function getGPSPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS nicht verfügbar"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude,
        genauigkeit: Math.round(pos.coords.accuracy) }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "de" } }
    );
    const data = await res.json();
    const a = data.address || {};
    return [a.road, a.house_number, a.city || a.town || a.village]
      .filter(Boolean).join(" ");
  } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
}

function StempeluhrView({ profil, projekte, session }) {
  const [status,      setStatus]      = useState("aus");   // aus | ein | pause
  const [aktiveBuchung, setAktiveBuchung] = useState(null);
  const [gps,         setGPS]         = useState(null);
  const [gpsLaden,    setGPSLaden]    = useState(false);
  const [gpsError,    setGPSError]    = useState("");
  const [jetzt,       setJetzt]       = useState(new Date());
  const [buchungen,   setBuchungen]   = useState([]);
  const [aktivProjekt,setAktivProjekt]= useState(projekte[0]?.id || null);
  const [notiz,       setNotiz]       = useState("");

  // Uhr aktualisieren
  useEffect(() => {
    const t = setInterval(() => setJetzt(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Heutige Buchungen laden
  useEffect(() => {
    ladeBuchungen();
  }, []);

  async function ladeBuchungen() {
    if (!session?.access_token) return;
    const heute = new Date().toISOString().slice(0,10);
    const data = await sbFetch(
      `zeitbuchungen?profil_id=eq.${profil.id}&eingestempelt_at=gte.${heute}T00:00:00&order=eingestempelt_at.desc`,
      { headers: { "Authorization": `Bearer ${session.access_token}` } }
    );
    if (data) {
      setBuchungen(data);
      const aktive = data.find(b => b.status === "aktiv" || b.status === "pause");
      if (aktive) {
        setAktiveBuchung(aktive);
        setStatus(aktive.status);
      }
    }
  }

  async function holeGPS() {
    setGPSLaden(true); setGPSError("");
    try {
      const pos = await getGPSPosition();
      const adresse = await reverseGeocode(pos.lat, pos.lng);
      const result = { ...pos, adresse };
      setGPS(result);
      return result;
    } catch(e) {
      setGPSError("GPS nicht verfügbar — bitte Standort aktivieren");
      return null;
    } finally { setGPSLaden(false); }
  }

  async function einstempeln() {
    const pos = await holeGPS();
    const buchung = {
      profil_id:        profil.id,
      projekt_id:       aktivProjekt,
      kolonne_id:       profil.kolonne_id || null,
      eingestempelt_at: new Date().toISOString(),
      ein_lat:          pos?.lat,
      ein_lng:          pos?.lng,
      ein_adresse:      pos?.adresse || null,
      status:           "aktiv",
      notiz:            notiz || null,
    };

    if (session?.access_token) {
      const data = await sbFetch("zeitbuchungen", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify(buchung),
      });
      if (data?.[0]) { setAktiveBuchung(data[0]); }
    } else {
      // Demo-Modus: lokal
      const demo = { ...buchung, id: Date.now() };
      setAktiveBuchung(demo);
      setBuchungen(prev => [demo, ...prev]);
    }
    setStatus("ein");
  }

  async function pauseStart() {
    if (!aktiveBuchung) return;
    const update = { pause_start_at: new Date().toISOString(), status: "pause" };
    if (session?.access_token) {
      await sbFetch(`zeitbuchungen?id=eq.${aktiveBuchung.id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify(update),
      });
    }
    setAktiveBuchung(prev => ({ ...prev, ...update }));
    setStatus("pause");
  }

  async function pauseEnde() {
    if (!aktiveBuchung) return;
    const update = { pause_ende_at: new Date().toISOString(), status: "aktiv" };
    if (session?.access_token) {
      await sbFetch(`zeitbuchungen?id=eq.${aktiveBuchung.id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify(update),
      });
    }
    setAktiveBuchung(prev => ({ ...prev, ...update }));
    setStatus("ein");
  }

  async function ausstempeln() {
    const pos = await holeGPS();
    if (!aktiveBuchung) return;

    const ein  = new Date(aktiveBuchung.eingestempelt_at);
    const aus  = new Date();
    const pauseMin = aktiveBuchung.pause_start_at && aktiveBuchung.pause_ende_at
      ? Math.round((new Date(aktiveBuchung.pause_ende_at) - new Date(aktiveBuchung.pause_start_at)) / 60000)
      : 0;
    const nettoMin = Math.round((aus - ein) / 60000) - pauseMin;

    const update = {
      ausgestempelt_at: aus.toISOString(),
      aus_lat:          pos?.lat,
      aus_lng:          pos?.lng,
      aus_adresse:      pos?.adresse || null,
      netto_minuten:    nettoMin,
      status:           "abgeschlossen",
    };

    if (session?.access_token) {
      await sbFetch(`zeitbuchungen?id=eq.${aktiveBuchung.id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify(update),
      });
    }
    setAktiveBuchung(null);
    setStatus("aus");
    await ladeBuchungen();
  }

  // Laufzeit berechnen
  const laufzeit = aktiveBuchung && status !== "aus"
    ? Math.round((jetzt - new Date(aktiveBuchung.eingestempelt_at)) / 60000)
    : 0;
  const laufzeitStr = `${Math.floor(laufzeit/60)}h ${(laufzeit%60).toString().padStart(2,"0")}min`;

  const STATUS_FARBE = { aus: "var(--muted)", ein: "var(--green)", pause: "var(--yellow)" };
  const STATUS_BG    = { aus: "var(--surface2)", ein: "var(--gbg)", pause: "var(--ybg)" };

  return (
    <div>
      {/* Uhr */}
      <div style={{ background:"var(--surface)", borderRadius:20, padding:24,
        marginBottom:16, textAlign:"center", border:"1.5px solid var(--border)",
        boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)",
          textTransform:"uppercase", letterSpacing:2, marginBottom:8 }}>
          {jetzt.toLocaleDateString("de-DE", { weekday:"long", day:"2-digit", month:"long" })}
        </div>
        <div style={{ fontSize:52, fontWeight:900, color:"var(--text)",
          letterSpacing:-2, fontVariantNumeric:"tabular-nums" }}>
          {jetzt.toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" })}
          <span style={{ fontSize:28, color:"var(--muted)" }}>
            :{jetzt.getSeconds().toString().padStart(2,"0")}
          </span>
        </div>

        {/* Status */}
        <div style={{ display:"inline-flex", alignItems:"center", gap:8,
          background: STATUS_BG[status], borderRadius:20, padding:"8px 16px",
          marginTop:12, border:`1.5px solid ${STATUS_FARBE[status]}` }}>
          <div style={{ width:8, height:8, borderRadius:4,
            background: STATUS_FARBE[status],
            animation: status === "ein" ? "pulse 2s infinite" : "none" }} />
          <span style={{ fontSize:13, fontWeight:800, color: STATUS_FARBE[status] }}>
            { status === "aus"   ? "Nicht eingestempelt"
            : status === "ein"   ? `Eingestempelt · ${laufzeitStr}`
            : `Pause · ${laufzeitStr}` }
          </span>
        </div>

        {/* GPS Position */}
        {gps && (
          <div style={{ marginTop:10, fontSize:11, color:"var(--muted)" }}>
            📍 {gps.adresse} · ±{gps.genauigkeit}m
          </div>
        )}
        {gpsError && (
          <div style={{ marginTop:8, fontSize:11, color:"var(--red)" }}>{gpsError}</div>
        )}
      </div>

      {/* Projekt Auswahl */}
      {status === "aus" && (
        <>
          <div style={{ marginBottom:12 }}>
            <Label>Projekt</Label>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:6 }}>
              {projekte.map(p => (
                <button key={p.id} onClick={() => setAktivProjekt(p.id)}
                  style={{ background: aktivProjekt===p.id ? "var(--ybg)" : "var(--surface)",
                    color:"var(--text)", border:`2px solid ${aktivProjekt===p.id ? "var(--yellow)" : "var(--border)"}`,
                    borderRadius:12, padding:"12px 16px", cursor:"pointer",
                    fontFamily:"inherit", textAlign:"left", fontWeight: aktivProjekt===p.id ? 700 : 400 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:4, background:p.farbe }} />
                    <span style={{ fontSize:13 }}>{p.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <Label>Notiz (optional)</Label>
            <input value={notiz} onChange={e => setNotiz(e.target.value)}
              placeholder="z.B. Bewehrungsarbeiten B1" style={inputStyle()} />
          </div>
        </>
      )}

      {/* Aktive Buchung Info */}
      {aktiveBuchung && status !== "aus" && (
        <div style={{ background:"var(--surface)", borderRadius:14, padding:16,
          marginBottom:16, border:"1.5px solid var(--border)" }}>
          <div style={{ color:"var(--muted)", fontSize:11, marginBottom:4 }}>Aktuelle Buchung</div>
          <div style={{ color:"var(--text)", fontSize:13, fontWeight:600 }}>
            {projekte.find(p=>p.id===aktiveBuchung.projekt_id)?.name || "—"}
          </div>
          {aktiveBuchung.ein_adresse && (
            <div style={{ color:"var(--muted)", fontSize:11, marginTop:4 }}>
              📍 Eingestempelt: {aktiveBuchung.ein_adresse}
            </div>
          )}
          {aktiveBuchung.notiz && (
            <div style={{ color:"var(--muted)", fontSize:11, marginTop:2 }}>
              💬 {aktiveBuchung.notiz}
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        {status === "aus" && (
          <button onClick={einstempeln} disabled={gpsLaden || !aktivProjekt}
            style={{ flex:1, background:"var(--green)", color:"#fff",
              border:"none", borderRadius:14, padding:18, fontWeight:900,
              fontSize:18, cursor:"pointer", fontFamily:"inherit",
              opacity: gpsLaden || !aktivProjekt ? 0.6 : 1 }}>
            {gpsLaden ? "📍 GPS…" : "▶ Einstempeln"}
          </button>
        )}
        {status === "ein" && (
          <>
            <button onClick={pauseStart}
              style={{ flex:1, background:"var(--ybg)", color:"var(--ydark)",
                border:"2px solid var(--yellow)", borderRadius:14, padding:16,
                fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
              ⏸ Pause
            </button>
            <button onClick={ausstempeln} disabled={gpsLaden}
              style={{ flex:1, background:"var(--red)", color:"#fff",
                border:"none", borderRadius:14, padding:16, fontWeight:900,
                fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
              {gpsLaden ? "📍…" : "⏹ Ausstempeln"}
            </button>
          </>
        )}
        {status === "pause" && (
          <button onClick={pauseEnde}
            style={{ flex:1, background:"var(--yellow)", color:"#1a1200",
              border:"none", borderRadius:14, padding:18, fontWeight:900,
              fontSize:18, cursor:"pointer", fontFamily:"inherit" }}>
            ▶ Weiterarbeiten
          </button>
        )}
      </div>

      {/* Heutige Buchungen */}
      {buchungen.filter(b=>b.status==="abgeschlossen").length > 0 && (
        <div>
          <div style={{ color:"var(--text)", fontWeight:700, fontSize:14, marginBottom:10 }}>
            Heute abgeschlossen
          </div>
          {buchungen.filter(b=>b.status==="abgeschlossen").map(b => (
            <div key={b.id} style={{ background:"var(--surface)", borderRadius:12,
              padding:"12px 14px", marginBottom:8, border:"1.5px solid var(--border)" }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:12, color:"var(--text2)" }}>
                    {new Date(b.eingestempelt_at).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}
                    {" → "}
                    {b.ausgestempelt_at ? new Date(b.ausgestempelt_at).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) : "—"}
                  </div>
                  {b.ein_adresse && <div style={{ fontSize:10, color:"var(--muted)", marginTop:2 }}>📍 {b.ein_adresse}</div>}
                </div>
                <div style={{ fontWeight:800, color:"var(--text)", fontSize:14 }}>
                  {b.netto_minuten ? `${Math.floor(b.netto_minuten/60)}h ${b.netto_minuten%60}min` : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.6;transform:scale(1.3)}
        }
      `}</style>
    </div>
  );
}

// ─── Nutzerverwaltung (nur Administrator) ─────────────────────────────────
function NutzerVerwaltungView({ session }) {
  const [nutzer,    setNutzer]    = useState([]);
  const [laden,     setLaden]     = useState(true);
  const [neuForm,   setNeuForm]   = useState(false);
  const [form,      setForm]      = useState({ email:"", vorname:"", nachname:"", rolle:"facharbeiter", telefon:"" });

  useEffect(() => { ladeNutzer(); }, []);

  async function ladeNutzer() {
    setLaden(true);
    const data = await sbFetch("profile?select=*&order=created_at.desc", {
      headers: { "Authorization": `Bearer ${session?.access_token}` }
    });
    if (data) setNutzer(data);
    setLaden(false);
  }

  async function nutzerAnlegen() {
    alert("Nutzer-Erstellung: In Supabase Dashboard → Auth → Users → Invite user anlegen. Dann Rolle in der profile-Tabelle setzen.");
  }

  async function rolleAendern(id, neueRolle) {
    await sbFetch(`profile?id=eq.${id}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ rolle: neueRolle }),
    });
    setNutzer(prev => prev.map(n => n.id === id ? { ...n, rolle: neueRolle } : n));
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ color:"var(--text)", fontWeight:700, fontSize:15 }}>Nutzerverwaltung</div>
      </div>
      <EinladungGenerieren session={session} firmaId={null} kolonnen={[]} />

      {laden ? (
        <div style={{ textAlign:"center", color:"var(--muted)", padding:32 }}>⏳ Laden…</div>
      ) : nutzer.map(n => (
        <div key={n.id} style={{ background:"var(--surface)", borderRadius:12,
          padding:"14px 16px", marginBottom:10, border:"1.5px solid var(--border)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ color:"var(--text)", fontWeight:700, fontSize:14 }}>
                {n.vorname} {n.nachname}
              </div>
              {n.telefon && <div style={{ color:"var(--muted)", fontSize:12 }}>📞 {n.telefon}</div>}
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <div style={{ width:8, height:8, borderRadius:4,
                background: n.aktiv ? "var(--green)" : "var(--muted)" }} />
              <select value={n.rolle || "facharbeiter"}
                onChange={e => rolleAendern(n.id, e.target.value)}
                style={{ background:"var(--surface2)", color:"var(--text)",
                  border:"1px solid var(--border)", borderRadius:8,
                  padding:"4px 8px", fontSize:12, cursor:"pointer" }}>
                {Object.entries(ROLLEN).map(([k,r]) => (
                  <option key={k} value={k}>{r.icon} {r.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// AKTENREGISTER – Projekt-Schnellwechsel
// ════════════════════════════════════════════════════════════════════════════
function Aktenregister({ projekte, aktivId, onSelect, onNeu }) {
  return (
    <div style={{ background:"var(--surface)", borderBottom:"3px solid var(--yellow)",
      flexShrink:0 }}>
      <div style={{ display:"flex", overflowX:"auto", padding:"0 12px",
        scrollbarWidth:"none", msOverflowStyle:"none" }}>
        {projekte.map((p, i) => {
          const eltern  = p.felder.filter(f => !f.parentId);
          const done    = eltern.filter(f => f.status === "done").length;
          const total   = eltern.length;
          const pct     = total > 0 ? Math.round(done/total*100) : 0;
          const aktiv   = p.id === aktivId;
          return (
            <div key={p.id} style={{ display:"flex", alignItems:"stretch" }}>
              {i > 0 && (
                <div style={{ width:1, background:"var(--border)", margin:"8px 0",
                  flexShrink:0 }} />
              )}
              <button onClick={() => onSelect(p.id)}
                style={{ flexShrink:0, padding:"10px 14px 0", cursor:"pointer",
                  background:"none", border:"none", borderBottom:`3px solid ${aktiv ? "var(--yellow)" : "transparent"}`,
                  marginBottom:-3, display:"flex", flexDirection:"column",
                  alignItems:"flex-start", gap:2, transition:"all 0.15s",
                  fontFamily:"inherit" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:7, height:7, borderRadius:4, background:p.farbe, flexShrink:0 }} />
                  <span style={{ fontSize:12, fontWeight:700,
                    color: aktiv ? "var(--text)" : "var(--muted)",
                    whiteSpace:"nowrap" }}>
                    {p.name.split(" ").slice(0,2).join(" ")}
                  </span>
                </div>
                <span style={{ fontSize:10, color: aktiv ? "var(--text2)" : "var(--muted)",
                  paddingBottom:8, whiteSpace:"nowrap" }}>
                  {pct}% · {PROJEKTTYPEN[p.typ]?.icon || "🏗️"}
                </span>
              </button>
            </div>
          );
        })}
        {/* + Neue Baustelle */}
        <div style={{ width:1, background:"var(--border)", margin:"8px 0", flexShrink:0 }} />
        <button onClick={onNeu}
          style={{ flexShrink:0, padding:"10px 16px 14px", cursor:"pointer",
            background:"none", border:"none", color:"var(--muted)", fontSize:20,
            fontFamily:"inherit", lineHeight:1 }}>
          ＋
        </button>
      </div>
    </div>
  );
}

// ─── Projekt Info Strip ───────────────────────────────────────────────────────
function ProjektInfoStrip({ projekt }) {
  if (!projekt) return null;
  const eltern = projekt.felder.filter(f => !f.parentId);
  const done   = eltern.filter(f => f.status === "done").length;
  const total  = eltern.length;
  const pct    = total > 0 ? Math.round(done/total*100) : 0;
  return (
    <div style={{ background:"var(--surface2)", borderBottom:"1px solid var(--border)",
      padding:"7px 16px", display:"flex", justifyContent:"space-between",
      alignItems:"center", flexShrink:0 }}>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)" }}>
          {projekt.projektnummer} · {PROJEKTTYPEN[projekt.typ]?.label || projekt.typ}
        </div>
        <div style={{ fontSize:11, color:"var(--text2)", marginTop:1 }}>
          👤 {projekt.bauleiter}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
        <div style={{ width:64, height:5, background:"var(--border2)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:projekt.farbe, borderRadius:3,
            transition:"width 0.4s" }} />
        </div>
        <span style={{ fontSize:11, fontWeight:800, color:"var(--text)" }}>{pct}%</span>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// AUFGABEN-SYSTEM (ersetzt Betonfelder als eigenständigen Tab)
// Typen: beton | schalung | bewehrung | abdichtung | estrich | allgemein | mangel
// ════════════════════════════════════════════════════════════════════════════

const AUFGABEN_TYPEN = {
  beton:      { label:"Betonage",    icon:"🏗️", farbe:"#F5C400" },
  schalung:   { label:"Schalung",    icon:"🪵",  farbe:"#C2410C" },
  bewehrung:  { label:"Bewehrung",   icon:"🔩",  farbe:"#4A9EE0" },
  abdichtung: { label:"Abdichtung",  icon:"💧",  farbe:"#0891B2" },
  estrich:    { label:"Estrich",     icon:"🪣",  farbe:"#7C3AED" },
  allgemein:  { label:"Allgemein",   icon:"📋",  farbe:"#64748B" },
  mangel:     { label:"Mangel",      icon:"⚠️",  farbe:"#DC2626" },
};

const AUFGABEN_STATUS = {
  offen:         { label:"Offen",       icon:"○",  farbe:"#64748B", bg:"var(--surface2)" },
  in_arbeit:     { label:"In Arbeit",   icon:"◑",  farbe:"#F5C400", bg:"var(--ybg)" },
  abgeschlossen: { label:"Fertig",      icon:"●",  farbe:"#15803D", bg:"var(--gbg)" },
  blockiert:     { label:"Blockiert",   icon:"✕",  farbe:"#DC2626", bg:"var(--rbg)" },
};

const AUFGABEN_PRIO = {
  niedrig:  { label:"Niedrig",  icon:"↓", farbe:"#64748B" },
  mittel:   { label:"Mittel",   icon:"→", farbe:"#F5C400" },
  hoch:     { label:"Hoch",     icon:"↑", farbe:"#EA580C" },
  kritisch: { label:"Kritisch", icon:"‼", farbe:"#DC2626" },
};

function leereAufgabe() {
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

// ─── Aufgaben-Karte ───────────────────────────────────────────────────────────
function AufgabenKarte({ aufgabe, onClick, kolonnen }) {
  const typ    = AUFGABEN_TYPEN[aufgabe.typ]    || AUFGABEN_TYPEN.allgemein;
  const status = AUFGABEN_STATUS[aufgabe.status] || AUFGABEN_STATUS.offen;
  const prio   = AUFGABEN_PRIO[aufgabe.prioritaet] || AUFGABEN_PRIO.mittel;
  const ueberfaellig = aufgabe.faellig_am &&
    new Date(aufgabe.faellig_am) < new Date() &&
    aufgabe.status !== "abgeschlossen";

  return (
    <div onClick={onClick}
      style={{ background:"var(--surface)", borderRadius:14, padding:"14px 16px",
        marginBottom:10, cursor:"pointer",
        borderLeft:`4px solid ${typ.farbe}`,
        border:`1.5px solid var(--border)`,
        borderLeftWidth:4, borderLeftColor:typ.farbe,
        boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:6 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
            <span style={{ fontSize:14 }}>{typ.icon}</span>
            <span style={{ color:"var(--text)", fontWeight:700, fontSize:14 }}>
              {aufgabe.titel || "Unbenannte Aufgabe"}
            </span>
          </div>
          {aufgabe.beschreibung && (
            <div style={{ color:"var(--muted)", fontSize:12, lineHeight:1.4,
              overflow:"hidden", display:"-webkit-box",
              WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
              {aufgabe.beschreibung}
            </div>
          )}
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end",
          gap:4, marginLeft:8, flexShrink:0 }}>
          <div style={{ background:status.bg, color:status.farbe,
            borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>
            {status.icon} {status.label}
          </div>
          <div style={{ color:prio.farbe, fontSize:10, fontWeight:700 }}>
            {prio.icon} {prio.label}
          </div>
        </div>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        {aufgabe.faellig_am && (
          <div style={{ color: ueberfaellig ? "var(--red)" : "var(--muted)",
            fontSize:11, fontWeight: ueberfaellig ? 700 : 400 }}>
            📅 {new Date(aufgabe.faellig_am).toLocaleDateString("de-DE")}
            {ueberfaellig && " · Überfällig!"}
          </div>
        )}
        {aufgabe.zustaendig && (
          <div style={{ color:"var(--muted)", fontSize:11 }}>👤 {aufgabe.zustaendig}</div>
        )}
        {aufgabe.m2 > 0 && (
          <div style={{ color:"var(--muted)", fontSize:11 }}>📐 {aufgabe.m2} m²</div>
        )}
        {aufgabe.fotos?.length > 0 && (
          <div style={{ color:"var(--blue)", fontSize:11 }}>📷 {aufgabe.fotos.length}</div>
        )}
        {aufgabe.ist_mangel && (
          <div style={{ background:"var(--rbg)", color:"var(--red)",
            borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>
            ⚠️ Mangel
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Aufgaben-Formular ────────────────────────────────────────────────────────
function AufgabenFormular({ initial, kolonnen, onSave, onClose }) {
  const [a,       setA]       = useState(initial || leereAufgabe());
  const [bilder,  setBilder]  = useState([]);
  const [planMode,setPlanMode]= useState(false);
  const fileRef               = useRef(null);
  const planRef               = useRef(null);

  function handleBild(e) {
    Array.from(e.target.files).forEach(file => {
      const r = new FileReader();
      r.onload = ev => setA(p => ({ ...p, fotos:[...p.fotos, ev.target.result] }));
      r.readAsDataURL(file);
    });
  }

  function handlePlanKlick(e) {
    if (!planRef.current || !planMode) return;
    const rect = planRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
    const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
    setA(p => ({ ...p, plan_x:Number(x), plan_y:Number(y) }));
    setPlanMode(false);
  }

  const valid = a.titel.trim().length > 0;

  return (
    <div style={{ position:"fixed", inset:0,
      background:"rgba(15,23,42,0.7)", backdropFilter:"blur(4px)",
      zIndex:500, display:"flex", alignItems:"flex-end",
      justifyContent:"center" }}>
      <div style={{ background:"var(--surface)", borderRadius:"20px 20px 0 0",
        padding:22, width:"100%", maxWidth:520,
        maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 -4px 30px rgba(0,0,0,0.15)" }}>

        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:18 }}>
          <div style={{ color:"var(--yellow)", fontWeight:700, fontSize:17 }}>
            {initial ? "✏️ Aufgabe bearbeiten" : "➕ Neue Aufgabe"}
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:"var(--muted)",
              fontSize:24, cursor:"pointer" }}>✕</button>
        </div>

        {/* Typ */}
        <div style={{ marginBottom:14 }}>
          <Label>Aufgabentyp</Label>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
            {Object.entries(AUFGABEN_TYPEN).map(([key, t]) => (
              <button key={key} onClick={() => setA(p=>({...p, typ:key,
                ist_mangel:key==="mangel"}))}
                style={{ background: a.typ===key ? t.farbe+"22" : "var(--surface2)",
                  border:`1.5px solid ${a.typ===key ? t.farbe : "var(--border)"}`,
                  borderRadius:20, padding:"6px 12px", cursor:"pointer",
                  fontSize:12, fontWeight: a.typ===key ? 700 : 400,
                  color: a.typ===key ? t.farbe : "var(--muted)",
                  fontFamily:"inherit" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Titel */}
        <div style={{ marginBottom:13 }}>
          <Label>Titel *</Label>
          <input value={a.titel} onChange={e=>setA(p=>({...p,titel:e.target.value}))}
            placeholder="z.B. Bodenplatte B1 betonieren" style={inputStyle()} />
        </div>

        {/* Status + Priorität */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:13 }}>
          <div>
            <Label>Status</Label>
            <select value={a.status} onChange={e=>setA(p=>({...p,status:e.target.value}))}
              style={{ ...inputStyle(), padding:"11px 12px" }}>
              {Object.entries(AUFGABEN_STATUS).map(([k,s]) => (
                <option key={k} value={k}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Priorität</Label>
            <select value={a.prioritaet} onChange={e=>setA(p=>({...p,prioritaet:e.target.value}))}
              style={{ ...inputStyle(), padding:"11px 12px" }}>
              {Object.entries(AUFGABEN_PRIO).map(([k,s]) => (
                <option key={k} value={k}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Zuständig + Fällig */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:13 }}>
          <div>
            <Label>Zuständig</Label>
            <select value={a.zustaendig} onChange={e=>setA(p=>({...p,zustaendig:e.target.value}))}
              style={{ ...inputStyle(), padding:"11px 12px" }}>
              <option value="">— auswählen —</option>
              {kolonnen.map(k => (
                <option key={k.id} value={k.name}>{k.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Fällig am</Label>
            <input type="date" value={a.faellig_am}
              onChange={e=>setA(p=>({...p,faellig_am:e.target.value}))}
              style={{ ...inputStyle(), padding:"11px 12px" }} />
          </div>
        </div>

        {/* Beschreibung */}
        <div style={{ marginBottom:13 }}>
          <Label>Beschreibung</Label>
          <textarea rows={3} value={a.beschreibung}
            onChange={e=>setA(p=>({...p,beschreibung:e.target.value}))}
            placeholder="Details zur Aufgabe…"
            style={{ width:"100%", background:"var(--surface2)", color:"var(--text)",
              border:"1.5px solid var(--border)", borderRadius:10, padding:10,
              fontSize:13, resize:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
        </div>

        {/* Beton-spezifisch */}
        {a.typ === "beton" && (
          <div style={{ background:"var(--ybg)", borderRadius:12, padding:14,
            marginBottom:14, border:"1px solid var(--yellow)" }}>
            <div style={{ color:"var(--ydark)", fontWeight:700, fontSize:12,
              marginBottom:10 }}>🏗️ Betonage-Details</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div>
                <Label>Fläche (m²)</Label>
                <input type="number" value={a.m2||""}
                  onChange={e=>setA(p=>({...p,m2:Number(e.target.value)}))}
                  placeholder="0" style={inputStyle()} />
              </div>
              <div>
                <Label>Betonsorte</Label>
                <input value={a.betonsorte||""}
                  onChange={e=>setA(p=>({...p,betonsorte:e.target.value}))}
                  placeholder="C25/30" style={inputStyle()} />
              </div>
            </div>
          </div>
        )}

        {/* Mangel-spezifisch */}
        {a.ist_mangel && (
          <div style={{ background:"var(--rbg)", borderRadius:12, padding:14,
            marginBottom:14, border:"1px solid var(--red)" }}>
            <div style={{ color:"var(--red)", fontWeight:700, fontSize:12,
              marginBottom:10 }}>⚠️ Mangel-Details</div>
            <div style={{ marginBottom:10 }}>
              <Label>Verursacher / Gewerk</Label>
              <input value={a.mangel_verursacher||""}
                onChange={e=>setA(p=>({...p,mangel_verursacher:e.target.value}))}
                placeholder="z.B. Elektriker, Maler…" style={inputStyle()} />
            </div>
            {/* Planverortung */}
            {a.plan_bild_url ? (
              <div>
                <Label>Planverortung</Label>
                <div ref={planRef} onClick={handlePlanKlick}
                  style={{ position:"relative", borderRadius:10, overflow:"hidden",
                    cursor: planMode ? "crosshair" : "default",
                    border:"2px solid var(--red)", marginTop:6 }}>
                  <img src={a.plan_bild_url} alt="Plan"
                    style={{ width:"100%", display:"block" }} />
                  {a.plan_x !== null && a.plan_y !== null && (
                    <div style={{ position:"absolute",
                      left:`${a.plan_x}%`, top:`${a.plan_y}%`,
                      transform:"translate(-50%,-50%)",
                      width:24, height:24, borderRadius:12,
                      background:"var(--red)", border:"2px solid #fff",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:12, color:"#fff", fontWeight:700 }}>!</div>
                  )}
                  {planMode && (
                    <div style={{ position:"absolute", inset:0,
                      background:"rgba(220,38,38,0.1)",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <div style={{ color:"var(--red)", fontWeight:700,
                        background:"var(--surface)", borderRadius:8,
                        padding:"6px 12px", fontSize:12 }}>
                        Auf Plan tippen zum Verorten
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => setPlanMode(true)}
                  style={{ marginTop:8, background:"var(--red)", color:"#fff",
                    border:"none", borderRadius:8, padding:"6px 14px",
                    cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
                  📍 {a.plan_x ? "Neu verorten" : "Auf Plan verorten"}
                </button>
              </div>
            ) : (
              <div>
                <Label>Grundriss hochladen (optional)</Label>
                <input type="file" accept="image/*"
                  onChange={e => {
                    const f = e.target.files[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = ev => setA(p=>({...p,plan_bild_url:ev.target.result}));
                    r.readAsDataURL(f);
                  }}
                  style={{ marginTop:6, fontSize:12, color:"var(--muted)" }} />
              </div>
            )}
          </div>
        )}

        {/* Fotos */}
        <div style={{ marginBottom:16 }}>
          <Label>Fotos ({a.fotos?.length || 0})</Label>
          <input ref={fileRef} type="file" accept="image/*" multiple
            style={{ display:"none" }} onChange={handleBild} />
          <button onClick={() => fileRef.current.click()}
            style={{ background:"var(--surface2)", color:"var(--muted)",
              border:"1.5px dashed var(--border)", borderRadius:10,
              padding:"8px 16px", cursor:"pointer", fontSize:12,
              fontFamily:"inherit", marginTop:6 }}>
            📷 Fotos hinzufügen
          </button>
          {a.fotos?.length > 0 && (
            <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
              {a.fotos.map((url, i) => (
                <div key={i} style={{ position:"relative" }}>
                  <img src={url} alt="" style={{ width:56, height:56,
                    borderRadius:8, objectFit:"cover" }} />
                  <button onClick={() => setA(p=>({...p,
                    fotos:p.fotos.filter((_,j)=>j!==i)}))}
                    style={{ position:"absolute", top:-4, right:-4,
                      width:18, height:18, borderRadius:9,
                      background:"var(--red)", color:"#fff", border:"none",
                      cursor:"pointer", fontSize:10, padding:0 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, background:"var(--surface2)", color:"var(--muted)",
              border:"1.5px solid var(--border)", borderRadius:12, padding:14,
              cursor:"pointer", fontFamily:"inherit" }}>Abbrechen</button>
          <button onClick={() => valid && onSave(a)} disabled={!valid}
            style={{ flex:2, background: valid ? "var(--yellow)" : "var(--surface2)",
              color: valid ? "#1a1200" : "var(--muted)",
              border:"none", borderRadius:12, padding:14, fontWeight:800,
              cursor: valid ? "pointer" : "default", fontSize:15,
              fontFamily:"inherit" }}>
            💾 Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Aufgaben-View (Haupt-Tab) ────────────────────────────────────────────────
function AufgabenView({ aufgaben, setAufgaben, kolonnen, sbConnected }) {
  const [ansicht,     setAnsicht]     = useState("liste");  // liste | kanban
  const [filter,      setFilter]      = useState("alle");
  const [neuAufgabe,  setNeuAufgabe]  = useState(false);
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
        <button onClick={() => setNeuAufgabe(true)}
          style={{ background:"var(--yellow)", color:"#1a1200", border:"none",
            borderRadius:10, padding:"8px 14px", fontWeight:700,
            cursor:"pointer", fontSize:13, fontFamily:"inherit",
            flexShrink:0, marginLeft:8 }}>
          + Aufgabe
        </button>
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
              <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
              <div>Keine Aufgaben gefunden</div>
            </div>
          )}
          {gefiltert.map(a => (
            <AufgabenKarte key={a.id} aufgabe={a} kolonnen={kolonnen}
              onClick={() => setEditAufgabe(a)} />
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
                  <div key={a.id} onClick={() => setEditAufgabe(a)}
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

      {(neuAufgabe || editAufgabe) && (
        <AufgabenFormular
          initial={editAufgabe}
          kolonnen={kolonnen}
          onSave={handleSave}
          onClose={() => { setNeuAufgabe(false); setEditAufgabe(null); }}
        />
      )}
    </div>
  );
}

// ─── Mängel-View ──────────────────────────────────────────────────────────────
function MaengelView({ aufgaben, setAufgaben, kolonnen }) {
  const maengel = aufgaben.filter(a => a.ist_mangel);
  const [neuMangel, setNeuMangel] = useState(false);
  const [edit,      setEdit]      = useState(null);

  function handleSave(a) {
    const mitMangel = { ...a, ist_mangel:true, typ:"mangel" };
    if (edit) {
      setAufgaben(prev => prev.map(x => x.id===mitMangel.id ? mitMangel : x));
    } else {
      setAufgaben(prev => [mitMangel, ...prev]);
    }
    setNeuMangel(false); setEdit(null);
  }

  const offen     = maengel.filter(m=>m.status!=="abgeschlossen").length;
  const behoben   = maengel.filter(m=>m.status==="abgeschlossen").length;

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
        gap:8, marginBottom:16 }}>
        {[
          ["Gesamt",    maengel.length, "var(--muted)"],
          ["Offen",     offen,          "var(--red)"],
          ["Behoben",   behoben,        "var(--green)"],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:"var(--surface)", borderRadius:12,
            padding:"12px 14px", border:"1.5px solid var(--border)",
            position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0,
              height:3, background:c }} />
            <div style={{ color:"var(--muted)", fontSize:10, fontWeight:700,
              textTransform:"uppercase", marginBottom:4 }}>{l}</div>
            <div style={{ color:"var(--text)", fontWeight:900, fontSize:22 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:12 }}>
        <div style={{ color:"var(--text)", fontWeight:700, fontSize:15 }}>
          Mängelliste
        </div>
        <button onClick={() => setNeuMangel(true)}
          style={{ background:"var(--red)", color:"#fff", border:"none",
            borderRadius:10, padding:"8px 14px", fontWeight:700,
            cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
          + Mangel
        </button>
      </div>

      {maengel.length === 0 && (
        <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--muted)" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
          <div style={{ fontWeight:700, color:"var(--text)", marginBottom:4 }}>
            Keine Mängel erfasst
          </div>
        </div>
      )}

      {maengel.map(m => (
        <div key={m.id} onClick={() => setEdit(m)}
          style={{ background:"var(--surface)", borderRadius:14,
            padding:"14px 16px", marginBottom:10, cursor:"pointer",
            borderLeft:"4px solid var(--red)",
            border:"1.5px solid var(--border)",
            borderLeftWidth:4, borderLeftColor:"var(--red)" }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"flex-start", marginBottom:6 }}>
            <div style={{ flex:1 }}>
              <div style={{ color:"var(--text)", fontWeight:700, fontSize:14 }}>
                {m.titel}
              </div>
              {m.mangel_verursacher && (
                <div style={{ color:"var(--muted)", fontSize:11, marginTop:2 }}>
                  🔧 {m.mangel_verursacher}
                </div>
              )}
              {m.beschreibung && (
                <div style={{ color:"var(--text2)", fontSize:12, marginTop:4,
                  lineHeight:1.4 }}>{m.beschreibung}</div>
              )}
            </div>
            <div style={{ background: AUFGABEN_STATUS[m.status]?.bg,
              color: AUFGABEN_STATUS[m.status]?.farbe,
              borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700,
              marginLeft:8, flexShrink:0 }}>
              {AUFGABEN_STATUS[m.status]?.label}
            </div>
          </div>

          {/* Plan-Preview */}
          {m.plan_bild_url && m.plan_x !== null && (
            <div style={{ position:"relative", borderRadius:8, overflow:"hidden",
              height:80, marginTop:8 }}>
              <img src={m.plan_bild_url} alt="Plan"
                style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              <div style={{ position:"absolute",
                left:`${m.plan_x}%`, top:`${m.plan_y}%`,
                transform:"translate(-50%,-50%)",
                width:20, height:20, borderRadius:10,
                background:"var(--red)", border:"2px solid #fff",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:10, color:"#fff", fontWeight:700 }}>!</div>
            </div>
          )}

          {/* Fotos */}
          {m.fotos?.length > 0 && (
            <div style={{ display:"flex", gap:5, marginTop:8 }}>
              {m.fotos.slice(0,3).map((url,i) => (
                <img key={i} src={url} alt="" style={{ width:44, height:44,
                  borderRadius:6, objectFit:"cover" }} />
              ))}
              {m.fotos.length > 3 && (
                <div style={{ width:44, height:44, borderRadius:6,
                  background:"var(--surface2)", display:"flex",
                  alignItems:"center", justifyContent:"center",
                  color:"var(--muted)", fontSize:11, fontWeight:700 }}>
                  +{m.fotos.length-3}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {(neuMangel || edit) && (
        <AufgabenFormular
          initial={edit ? edit : { ...leereAufgabe(), typ:"mangel", ist_mangel:true }}
          kolonnen={kolonnen}
          onSave={handleSave}
          onClose={() => { setNeuMangel(false); setEdit(null); }}
        />
      )}
    </div>
  );
}

// ─── Kommunikation-View ───────────────────────────────────────────────────────
function KommunikationView({ aufgaben, setAufgaben, aktiveProfil }) {
  const [ausgewählt, setAusgewählt] = useState(null);
  const [neuerText,  setNeuerText]  = useState("");

  // Alle Kommentare aus allen Aufgaben zusammenführen
  const alleKommentare = aufgaben
    .flatMap(a => (a.kommentare||[]).map(k => ({ ...k, aufgabe_titel:a.titel, aufgabe_id:a.id })))
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  function kommentarSenden(aufgabeId) {
    if (!neuerText.trim()) return;
    const neuerKommentar = {
      id:         Date.now(),
      text:       neuerText,
      autor:      aktiveProfil?.vorname || "Ich",
      created_at: new Date().toISOString(),
    };
    setAufgaben(prev => prev.map(a =>
      a.id === aufgabeId
        ? { ...a, kommentare:[...(a.kommentare||[]), neuerKommentar] }
        : a
    ));
    setNeuerText("");
  }

  return (
    <div>
      <div style={{ color:"var(--text)", fontWeight:700, fontSize:15, marginBottom:14 }}>
        💬 Kommunikation
      </div>

      {/* Aufgabe auswählen */}
      <div style={{ marginBottom:16 }}>
        <Label>Aufgabe kommentieren</Label>
        <select value={ausgewählt||""} onChange={e=>setAusgewählt(Number(e.target.value))}
          style={{ ...inputStyle(), marginTop:6, padding:"11px 12px" }}>
          <option value="">— Aufgabe wählen —</option>
          {aufgaben.map(a => (
            <option key={a.id} value={a.id}>
              {AUFGABEN_TYPEN[a.typ]?.icon} {a.titel}
            </option>
          ))}
        </select>
        {ausgewählt && (
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <input value={neuerText}
              onChange={e=>setNeuerText(e.target.value)}
              placeholder="Kommentar schreiben…"
              onKeyDown={e=>e.key==="Enter"&&kommentarSenden(ausgewählt)}
              style={{ ...inputStyle(), flex:1 }} />
            <button onClick={() => kommentarSenden(ausgewählt)}
              style={{ background:"var(--yellow)", color:"#1a1200",
                border:"none", borderRadius:10, padding:"0 16px",
                cursor:"pointer", fontWeight:700, fontFamily:"inherit",
                flexShrink:0 }}>↑</button>
          </div>
        )}
      </div>

      {/* Alle Kommentare */}
      {alleKommentare.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--muted)" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>💬</div>
          <div>Noch keine Kommentare</div>
        </div>
      ) : alleKommentare.map(k => (
        <div key={k.id} style={{ background:"var(--surface)", borderRadius:12,
          padding:"12px 14px", marginBottom:8,
          border:"1.5px solid var(--border)" }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"flex-start", marginBottom:4 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ width:28, height:28, borderRadius:14,
                background:"var(--ybg)", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:11, fontWeight:800,
                color:"var(--ydark)", flexShrink:0 }}>
                {k.autor?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <div style={{ color:"var(--text)", fontWeight:700, fontSize:13 }}>
                  {k.autor}
                </div>
                <div style={{ color:"var(--muted)", fontSize:10 }}>
                  📋 {k.aufgabe_titel}
                </div>
              </div>
            </div>
            <div style={{ color:"var(--muted)", fontSize:10 }}>
              {new Date(k.created_at).toLocaleString("de-DE",{
                day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"
              })}
            </div>
          </div>
          <div style={{ color:"var(--text2)", fontSize:13, lineHeight:1.5,
            paddingLeft:36 }}>{k.text}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Kosten-View ──────────────────────────────────────────────────────────────
function KostenView({ projekt, aufgaben, kolonnen, zeitbuchungen }) {
  const [budgetPos, setBudgetPos] = useState(projekt?.budget_positionen || [
    { id:1, bezeichnung:"Betonarbeiten",    budget:0, einheit:"m²" },
    { id:2, bezeichnung:"Schalung",         budget:0, einheit:"m²" },
    { id:3, bezeichnung:"Bewehrung",        budget:0, einheit:"t"  },
    { id:4, bezeichnung:"Sonstige Arbeit",  budget:0, einheit:"h"  },
    { id:5, bezeichnung:"Material",         budget:0, einheit:"€"  },
  ]);
  const [editPos, setEditPos] = useState(null);
  const [stundensatz, setStundensatz] = useState(55); // €/h Default

  // Ist-Kosten aus Zeitbuchungen berechnen
  const stundenGesamt = (zeitbuchungen||[])
    .filter(z => z.status === "abgeschlossen")
    .reduce((s,z) => s + (z.netto_minuten||0)/60, 0);

  const istArbeit = stundenGesamt * stundensatz;
  const budgetGesamt = budgetPos.reduce((s,p) => s + (p.budget||0), 0);
  const istGesamt = istArbeit; // Materialkosten kämen dazu
  const restBudget = budgetGesamt - istGesamt;
  const auslastung = budgetGesamt > 0
    ? Math.min(Math.round(istGesamt/budgetGesamt*100), 100) : 0;

  return (
    <div>
      {/* Übersicht */}
      <div style={{ background:"var(--surface)", borderRadius:16, padding:18,
        marginBottom:16, border:"1.5px solid var(--border)" }}>
        <div style={{ color:"var(--text)", fontWeight:700, fontSize:15,
          marginBottom:14 }}>💰 Kostenübersicht</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10,
          marginBottom:14 }}>
          {[
            ["Budget gesamt",  `${budgetGesamt.toLocaleString("de-DE")} €`, "var(--text)"],
            ["Ist bisher",     `${istGesamt.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,".").replace(".",",")} €`, auslastung>80?"var(--red)":"var(--green)"],
            ["Rest-Budget",    `${restBudget.toFixed(0)} €`, restBudget<0?"var(--red)":"var(--green)"],
            ["Stunden",        `${stundenGesamt.toFixed(1)} h`, "var(--blue)"],
          ].map(([l,v,c]) => (
            <div key={l} style={{ background:"var(--surface2)", borderRadius:12,
              padding:"12px 14px", border:"1px solid var(--border)" }}>
              <div style={{ color:"var(--muted)", fontSize:10, fontWeight:700,
                textTransform:"uppercase", marginBottom:4 }}>{l}</div>
              <div style={{ color:c, fontWeight:900, fontSize:18 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Fortschrittsbalken */}
        <div style={{ marginBottom:4 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            fontSize:11, color:"var(--muted)", marginBottom:4 }}>
            <span>Budget-Auslastung</span>
            <span style={{ fontWeight:700,
              color: auslastung>90 ? "var(--red)" : "var(--text)" }}>
              {auslastung}%
            </span>
          </div>
          <div style={{ background:"var(--surface2)", borderRadius:6,
            height:10, overflow:"hidden",
            border:"1px solid var(--border)" }}>
            <div style={{ height:"100%", borderRadius:6,
              background: auslastung>90 ? "var(--red)"
                : auslastung>70 ? "var(--orange)" : "var(--green)",
              width:`${auslastung}%`, transition:"width 0.5s" }} />
          </div>
        </div>
      </div>

      {/* Stundensatz */}
      <div style={{ background:"var(--surface)", borderRadius:12, padding:14,
        marginBottom:14, border:"1.5px solid var(--border)" }}>
        <Label>Stundensatz (€/h)</Label>
        <input type="number" value={stundensatz}
          onChange={e=>setStundensatz(Number(e.target.value))}
          style={{ ...inputStyle(), marginTop:6 }} />
        <div style={{ color:"var(--muted)", fontSize:11, marginTop:4 }}>
          Basis für Ist-Kostenberechnung aus GPS-Zeiterfassung
        </div>
      </div>

      {/* Budget-Positionen */}
      <div style={{ color:"var(--text)", fontWeight:700, fontSize:14,
        marginBottom:10 }}>Budget-Positionen</div>
      {budgetPos.map((pos,i) => (
        <div key={pos.id} style={{ background:"var(--surface)", borderRadius:12,
          padding:"14px 16px", marginBottom:8,
          border:"1.5px solid var(--border)" }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:6 }}>
            <div style={{ color:"var(--text)", fontWeight:600, fontSize:13 }}>
              {pos.bezeichnung}
            </div>
            <div style={{ color:"var(--yellow)", fontWeight:800, fontSize:14 }}>
              {(pos.budget||0).toLocaleString("de-DE")} €
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input type="number" value={pos.budget||""}
              onChange={e => setBudgetPos(prev => prev.map((p,j) =>
                j===i ? { ...p, budget:Number(e.target.value) } : p))}
              placeholder="0"
              style={{ flex:1, ...inputStyle(), padding:"8px 10px", fontSize:12 }} />
            <div style={{ color:"var(--muted)", fontSize:12, padding:"8px 0",
              flexShrink:0 }}>{pos.einheit}</div>
          </div>
        </div>
      ))}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// USP 1: KI-TAGESABSCHLUSS
// Diktat → KI generiert Bericht + Aufgaben + Mängel automatisch
// ════════════════════════════════════════════════════════════════════════════

async function kiTagesabschluss(diktat, projekt, kolonnen, wetter) {
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

function KITagesabschlussButton({ projekt, kolonnen, wetter, onErgebnis }) {
  const [offen,    setOffen]    = useState(false);
  const [diktat,   setDiktat]   = useState("");
  const [laden,    setLaden]    = useState(false);
  const [ergebnis, setErgebnis] = useState(null);
  const [aufnahme, setAufnahme] = useState(false);
  const srRef = useRef(null);

  function startDiktat() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (!srRef.current) {
      const er = new SR();
      er.lang = "de-DE"; er.continuous = true; er.interimResults = false;
      er.onresult = e => {
        const t = Array.from(e.results).map(r=>r[0].transcript).join(" ");
        setDiktat(t);
      };
      er.onend = () => setAufnahme(false);
      srRef.current = er;
    }
    if (aufnahme) { srRef.current.stop(); setAufnahme(false); }
    else { srRef.current.start(); setAufnahme(true); }
  }

  async function analysieren() {
    if (!diktat.trim()) return;
    setLaden(true);
    const result = await kiTagesabschluss(diktat, projekt, kolonnen, wetter);
    setErgebnis(result);
    setLaden(false);
  }

  function uebernehmen() {
    onErgebnis(ergebnis);
    setOffen(false);
    setDiktat("");
    setErgebnis(null);
  }

  return (
    <>
      <button onClick={() => setOffen(true)}
        style={{ background:"var(--yellow)", color:"#1a1200", border:"none",
          borderRadius:12, padding:"10px 18px", fontWeight:800, cursor:"pointer",
          fontSize:14, fontFamily:"inherit", display:"flex",
          alignItems:"center", gap:8 }}>
        🤖 KI-Tagesabschluss
      </button>

      {offen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.8)",
          backdropFilter:"blur(4px)", zIndex:600,
          display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ background:"var(--surface)", borderRadius:"20px 20px 0 0",
            padding:22, width:"100%", maxWidth:520, maxHeight:"92vh",
            overflowY:"auto", boxShadow:"0 -4px 30px rgba(0,0,0,0.2)" }}>

            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:17, color:"var(--text)" }}>
                🤖 KI-Tagesabschluss
              </div>
              <button onClick={() => { setOffen(false); setErgebnis(null); }}
                style={{ background:"none", border:"none", color:"var(--muted)",
                  fontSize:24, cursor:"pointer" }}>✕</button>
            </div>

            {!ergebnis ? (
              <>
                <div style={{ color:"var(--text2)", fontSize:13, marginBottom:14,
                  lineHeight:1.6 }}>
                  Beschreibe kurz was heute auf der Baustelle passiert ist.
                  Die KI erstellt automatisch den Tagesbericht, neue Aufgaben und Mängel.
                </div>

                <div style={{ position:"relative", marginBottom:14 }}>
                  <textarea rows={6} value={diktat}
                    onChange={e=>setDiktat(e.target.value)}
                    placeholder='z.B. "Heute Bodenplatte B1 fertig betoniert, 8 Mann, Kolonne Huber. Elektriker hat Schalung beschädigt, muss morgen repariert werden. Bewehrung C1 fange ich morgen an..."'
                    style={{ width:"100%", background: aufnahme ? "#0f1f4a" : "var(--surface2)",
                      color:"var(--text)",
                      border:`1.5px solid ${aufnahme ? "var(--blue)" : "var(--border)"}`,
                      borderRadius:12, padding:12, fontSize:13, resize:"none",
                      boxSizing:"border-box", fontFamily:"inherit",
                      transition:"border-color 0.2s" }} />
                  <button onClick={startDiktat}
                    style={{ position:"absolute", bottom:10, right:10,
                      background: aufnahme ? "var(--red)" : "var(--surface)",
                      color: aufnahme ? "#fff" : "var(--muted)",
                      border:`1px solid ${aufnahme ? "var(--red)" : "var(--border)"}`,
                      borderRadius:20, padding:"4px 12px", cursor:"pointer",
                      fontSize:12, fontFamily:"inherit" }}>
                    {aufnahme ? "⏹ Stopp" : "🎤 Diktieren"}
                  </button>
                </div>

                <button onClick={analysieren}
                  disabled={!diktat.trim() || laden}
                  style={{ width:"100%",
                    background: diktat.trim() && !laden ? "var(--yellow)" : "var(--surface2)",
                    color: diktat.trim() && !laden ? "#1a1200" : "var(--muted)",
                    border:"none", borderRadius:12, padding:15, fontWeight:800,
                    fontSize:15, cursor: diktat.trim() ? "pointer" : "default",
                    fontFamily:"inherit" }}>
                  {laden ? "⏳ KI analysiert…" : "✨ Analysieren & Vorschlag erstellen"}
                </button>
              </>
            ) : (
              <>
                {/* Bericht-Vorschau */}
                <div style={{ background:"var(--gbg)", borderRadius:12, padding:14,
                  marginBottom:12, border:"1px solid var(--green)" }}>
                  <div style={{ color:"var(--green)", fontWeight:700, fontSize:12,
                    marginBottom:8 }}>📋 Tagesbericht</div>
                  <div style={{ color:"var(--text)", fontSize:13,
                    lineHeight:1.6 }}>{ergebnis.bericht?.taetigkeit}</div>
                  {ergebnis.bericht?.besonderheiten && (
                    <div style={{ color:"var(--text2)", fontSize:12,
                      marginTop:6 }}>⚠️ {ergebnis.bericht.besonderheiten}</div>
                  )}
                </div>

                {/* Neue Aufgaben */}
                {ergebnis.neue_aufgaben?.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ color:"var(--yellow)", fontWeight:700, fontSize:12,
                      marginBottom:8 }}>
                      ✅ {ergebnis.neue_aufgaben.length} neue Aufgaben erkannt
                    </div>
                    {ergebnis.neue_aufgaben.map((a,i) => (
                      <div key={i} style={{ background:"var(--ybg)", borderRadius:10,
                        padding:"8px 12px", marginBottom:6,
                        border:"1px solid var(--yellow)" }}>
                        <div style={{ color:"var(--text)", fontWeight:600, fontSize:12 }}>
                          {AUFGABEN_TYPEN[a.typ]?.icon} {a.titel}
                        </div>
                        <div style={{ color:"var(--muted)", fontSize:11 }}>
                          {AUFGABEN_PRIO[a.prioritaet]?.icon} {AUFGABEN_PRIO[a.prioritaet]?.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Neue Mängel */}
                {ergebnis.neue_maengel?.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ color:"var(--red)", fontWeight:700, fontSize:12,
                      marginBottom:8 }}>
                      ⚠️ {ergebnis.neue_maengel.length} Mängel erkannt
                    </div>
                    {ergebnis.neue_maengel.map((m,i) => (
                      <div key={i} style={{ background:"var(--rbg)", borderRadius:10,
                        padding:"8px 12px", marginBottom:6,
                        border:"1px solid var(--red)" }}>
                        <div style={{ color:"var(--red)", fontWeight:600, fontSize:12 }}>
                          {m.titel}
                        </div>
                        {m.mangel_verursacher && (
                          <div style={{ color:"var(--muted)", fontSize:11 }}>
                            🔧 {m.mangel_verursacher}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Wetter-Warnung */}
                {ergebnis.wetter_warnung && (
                  <div style={{ background:"var(--obg)", borderRadius:10, padding:12,
                    marginBottom:12, border:"1px solid var(--orange)" }}>
                    <div style={{ color:"var(--orange)", fontWeight:700, fontSize:12 }}>
                      🌧️ Wetter-Warnung
                    </div>
                    <div style={{ color:"var(--text)", fontSize:12, marginTop:4 }}>
                      {ergebnis.wetter_warnung}
                    </div>
                  </div>
                )}

                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={() => setErgebnis(null)}
                    style={{ flex:1, background:"var(--surface2)", color:"var(--muted)",
                      border:"1.5px solid var(--border)", borderRadius:12, padding:13,
                      cursor:"pointer", fontFamily:"inherit" }}>
                    ← Zurück
                  </button>
                  <button onClick={uebernehmen}
                    style={{ flex:2, background:"var(--green)", color:"#fff",
                      border:"none", borderRadius:12, padding:13, fontWeight:800,
                      cursor:"pointer", fontSize:15, fontFamily:"inherit" }}>
                    ✅ Alles übernehmen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// USP 3: DIGITALE UNTERSCHRIFT + REVISIONSSICHERER PDF-EXPORT
// ════════════════════════════════════════════════════════════════════════════

function UnterschriftPad({ label, onSave }) {
  const canvasRef  = useRef(null);
  const [zeichnen, setZeichnen] = useState(false);
  const [hatZeichen, setHatZeichen] = useState(false);
  const lastPos = useRef(null);

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    setZeichnen(true);
    lastPos.current = getPos(e);
  }
  function draw(e) {
    e.preventDefault();
    if (!zeichnen) return;
    const ctx  = canvasRef.current.getContext("2d");
    const pos  = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#0B1120";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.stroke();
    lastPos.current = pos;
    setHatZeichen(true);
  }
  function stop(e) { e.preventDefault(); setZeichnen(false); }

  function loeschen() {
    const canvas = canvasRef.current;
    canvasRef.current.getContext("2d").clearRect(0,0,canvas.width,canvas.height);
    setHatZeichen(false);
  }

  function speichern() {
    if (!hatZeichen) return;
    onSave(canvasRef.current.toDataURL("image/png"));
  }

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ color:"var(--muted)", fontSize:11, fontWeight:600,
        marginBottom:6 }}>{label}</div>
      <div style={{ position:"relative", border:"1.5px solid var(--border)",
        borderRadius:12, background:"#fff", overflow:"hidden" }}>
        <canvas ref={canvasRef} width={360} height={100}
          style={{ display:"block", width:"100%", touchAction:"none",
            cursor:"crosshair" }}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop} />
        {!hatZeichen && (
          <div style={{ position:"absolute", inset:0, display:"flex",
            alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <span style={{ color:"#ccc", fontSize:13 }}>Hier unterschreiben</span>
          </div>
        )}
      </div>
      <div style={{ display:"flex", gap:8, marginTop:6 }}>
        <button onClick={loeschen}
          style={{ background:"var(--surface2)", color:"var(--muted)",
            border:"1px solid var(--border)", borderRadius:8,
            padding:"5px 12px", cursor:"pointer", fontSize:12,
            fontFamily:"inherit" }}>
          Löschen
        </button>
        <button onClick={speichern} disabled={!hatZeichen}
          style={{ background: hatZeichen ? "var(--green)" : "var(--surface2)",
            color: hatZeichen ? "#fff" : "var(--muted)",
            border:"none", borderRadius:8, padding:"5px 14px",
            cursor: hatZeichen ? "pointer" : "default", fontSize:12,
            fontWeight:700, fontFamily:"inherit" }}>
          ✓ Übernehmen
        </button>
      </div>
    </div>
  );
}

function RevisionssichererExport({ bericht, projekt, eigeneFirma, wetter,
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
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.8)",
          backdropFilter:"blur(4px)", zIndex:600,
          display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
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


// ════════════════════════════════════════════════════════════════════════════
// ANGEBOTS-TOOL (Bauleiter + Administrator)
// ════════════════════════════════════════════════════════════════════════════

// ─── Admin: Einheitspreise & LV-Vorlagen ─────────────────────────────────
const DEFAULT_EINHEITSPREISE = [
  { id:1, gewerk:"Betonage",     einheit:"m²", preis:85,  beschreibung:"Beton C25/30 inkl. Einbau" },
  { id:2, gewerk:"Betonage",     einheit:"m³", preis:220, beschreibung:"Beton C30/37 inkl. Einbau" },
  { id:3, gewerk:"Schalung",     einheit:"m²", preis:35,  beschreibung:"Schaltafel stellen/abheben" },
  { id:4, gewerk:"Bewehrung",    einheit:"t",  preis:1200,beschreibung:"Betonstahl BSt 500 S" },
  { id:5, gewerk:"Abdichtung",   einheit:"m²", preis:45,  beschreibung:"Bitumenschweißbahn 2-lagig" },
  { id:6, gewerk:"Estrich",      einheit:"m²", preis:28,  beschreibung:"Zementestrich ZE 20, 6cm" },
  { id:7, gewerk:"Erdarbeiten",  einheit:"m³", preis:18,  beschreibung:"Aushub/Verfüllung" },
  { id:8, gewerk:"Allgemein",    einheit:"h",  preis:55,  beschreibung:"Stundenverrechnungssatz" },
];

const DEFAULT_LV_VORLAGEN = [
  {
    id:1, name:"Bodenplatte Standard", gewerk:"Betonage",
    positionen:[
      { bez:"Schalung stellen", einheit:"m²", menge:0, ep_id:3 },
      { bez:"Bewehrung verlegen", einheit:"t", menge:0, ep_id:4 },
      { bez:"Beton einbauen C25/30", einheit:"m²", menge:0, ep_id:1 },
    ]
  },
  {
    id:2, name:"Kellerabdichtung", gewerk:"Abdichtung",
    positionen:[
      { bez:"Abdichtung 2-lagig", einheit:"m²", menge:0, ep_id:5 },
      { bez:"Beton WU C30/37", einheit:"m³", menge:0, ep_id:2 },
    ]
  },
];

function AdminParameterView({ einheitspreise, setEinheitspreise, lvVorlagen, setLvVorlagen }) {
  const [aktiv,    setAktiv]    = useState("preise"); // preise | vorlagen
  const [neuPreis, setNeuPreis] = useState(null);
  const [neuVorlage,setNeuVorlage] = useState(null);
  const [editPreis, setEditPreis] = useState(null);

  function preisLoeschen(id) {
    setEinheitspreise(prev => prev.filter(p => p.id !== id));
  }

  function preisSpeichern(p) {
    if (p.id && einheitspreise.find(x=>x.id===p.id)) {
      setEinheitspreise(prev => prev.map(x => x.id===p.id ? p : x));
    } else {
      setEinheitspreise(prev => [...prev, { ...p, id:Date.now() }]);
    }
    setNeuPreis(null); setEditPreis(null);
  }

  return (
    <div>
      <div style={{ color:"var(--text)", fontWeight:700, fontSize:15, marginBottom:14 }}>
        ⚙️ Angebots-Parameter
      </div>

      {/* Tab-Toggle */}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {[["preise","💰 Einheitspreise"],["vorlagen","📋 LV-Vorlagen"]].map(([k,l]) => (
          <button key={k} onClick={() => setAktiv(k)}
            style={{ flex:1, background: aktiv===k ? "var(--yellow)" : "var(--surface2)",
              color: aktiv===k ? "#1a1200" : "var(--muted)",
              border:`1.5px solid ${aktiv===k ? "var(--yellow)" : "var(--border)"}`,
              borderRadius:10, padding:10, fontWeight: aktiv===k ? 700 : 400,
              cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>{l}</button>
        ))}
      </div>

      {/* EINHEITSPREISE */}
      {aktiv === "preise" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:10 }}>
            <div style={{ color:"var(--muted)", fontSize:12 }}>
              {einheitspreise.length} Positionen
            </div>
            <button onClick={() => setNeuPreis({ gewerk:"", einheit:"m²", preis:0, beschreibung:"" })}
              style={{ background:"var(--yellow)", color:"#1a1200", border:"none",
                borderRadius:10, padding:"7px 14px", fontWeight:700,
                cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
              + Position
            </button>
          </div>

          {einheitspreise.map(p => (
            <div key={p.id} style={{ background:"var(--surface)", borderRadius:12,
              padding:"12px 14px", marginBottom:8,
              border:"1.5px solid var(--border)" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ color:"var(--text)", fontWeight:700, fontSize:13 }}>
                    {p.gewerk} · {p.beschreibung}
                  </div>
                  <div style={{ color:"var(--muted)", fontSize:12, marginTop:2 }}>
                    {p.einheit} · {p.preis.toLocaleString("de-DE")} €/{p.einheit}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => setEditPreis(p)}
                    style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                      color:"var(--muted)", borderRadius:8, padding:"4px 10px",
                      cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>✏️</button>
                  <button onClick={() => preisLoeschen(p.id)}
                    style={{ background:"var(--rbg)", border:"1px solid var(--red)",
                      color:"var(--red)", borderRadius:8, padding:"4px 10px",
                      cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LV-VORLAGEN */}
      {aktiv === "vorlagen" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:10 }}>
            <div style={{ color:"var(--muted)", fontSize:12 }}>
              {lvVorlagen.length} Vorlagen
            </div>
            <button onClick={() => setNeuVorlage({ name:"", gewerk:"", positionen:[] })}
              style={{ background:"var(--yellow)", color:"#1a1200", border:"none",
                borderRadius:10, padding:"7px 14px", fontWeight:700,
                cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
              + Vorlage
            </button>
          </div>

          {lvVorlagen.map(v => (
            <div key={v.id} style={{ background:"var(--surface)", borderRadius:12,
              padding:"12px 14px", marginBottom:8,
              border:"1.5px solid var(--border)" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:6 }}>
                <div style={{ color:"var(--text)", fontWeight:700, fontSize:13 }}>
                  {v.name}
                </div>
                <button onClick={() => setLvVorlagen(prev => prev.filter(x=>x.id!==v.id))}
                  style={{ background:"var(--rbg)", border:"1px solid var(--red)",
                    color:"var(--red)", borderRadius:8, padding:"4px 10px",
                    cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>✕</button>
              </div>
              {v.positionen.map((pos,i) => (
                <div key={i} style={{ color:"var(--muted)", fontSize:11,
                  padding:"3px 0", borderBottom:"1px solid var(--border)" }}>
                  {pos.bez} · {pos.einheit}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Preis-Formular */}
      {(neuPreis || editPreis) && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.8)",
          backdropFilter:"blur(4px)", zIndex:600,
          display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ background:"var(--surface)", borderRadius:"20px 20px 0 0",
            padding:22, width:"100%", maxWidth:480 }}>
            <PreisFormular
              initial={editPreis || neuPreis}
              onSave={preisSpeichern}
              onClose={() => { setNeuPreis(null); setEditPreis(null); }}
            />
          </div>
        </div>
      )}

      {/* Vorlagen-Formular */}
      {neuVorlage && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.8)",
          backdropFilter:"blur(4px)", zIndex:600,
          display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ background:"var(--surface)", borderRadius:"20px 20px 0 0",
            padding:22, width:"100%", maxWidth:480, maxHeight:"80vh",
            overflowY:"auto" }}>
            <VorlageFormular
              initial={neuVorlage}
              einheitspreise={einheitspreise}
              onSave={v => { setLvVorlagen(prev=>[...prev,{...v,id:Date.now()}]); setNeuVorlage(null); }}
              onClose={() => setNeuVorlage(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PreisFormular({ initial, onSave, onClose }) {
  const [p, setP] = useState(initial || { gewerk:"", einheit:"m²", preis:0, beschreibung:"" });
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ color:"var(--yellow)", fontWeight:700, fontSize:16 }}>
          {initial?.id ? "✏️ Preis bearbeiten" : "➕ Neuer Einheitspreis"}
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none",
          color:"var(--muted)", fontSize:24, cursor:"pointer" }}>✕</button>
      </div>
      {[["Gewerk","gewerk","z.B. Betonage"],["Beschreibung","beschreibung","z.B. Beton C25/30 inkl. Einbau"]].map(([l,k,ph]) => (
        <div key={k} style={{ marginBottom:12 }}>
          <Label>{l}</Label>
          <input value={p[k]||""} onChange={e=>setP(x=>({...x,[k]:e.target.value}))}
            placeholder={ph} style={inputStyle()} />
        </div>
      ))}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        <div>
          <Label>Einheit</Label>
          <select value={p.einheit} onChange={e=>setP(x=>({...x,einheit:e.target.value}))}
            style={{ ...inputStyle(), padding:"11px 12px" }}>
            {["m²","m³","m","t","h","Stk","pau"].map(u=><option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <Label>Einheitspreis (€)</Label>
          <input type="number" value={p.preis||""} onChange={e=>setP(x=>({...x,preis:Number(e.target.value)}))}
            placeholder="0" style={inputStyle()} />
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onClose} style={{ flex:1, background:"var(--surface2)",
          color:"var(--muted)", border:"1.5px solid var(--border)", borderRadius:12,
          padding:13, cursor:"pointer", fontFamily:"inherit" }}>Abbrechen</button>
        <button onClick={() => p.gewerk && p.beschreibung && onSave(p)}
          style={{ flex:2, background:"var(--yellow)", color:"#1a1200",
            border:"none", borderRadius:12, padding:13, fontWeight:800,
            cursor:"pointer", fontFamily:"inherit" }}>💾 Speichern</button>
      </div>
    </div>
  );
}

function VorlageFormular({ initial, einheitspreise, onSave, onClose }) {
  const [v, setV] = useState(initial || { name:"", gewerk:"", positionen:[] });

  function addPosition() {
    setV(x => ({ ...x, positionen:[...x.positionen,
      { bez:"", einheit:"m²", menge:0, ep_id:null }] }));
  }
  function updatePos(i, key, val) {
    setV(x => ({ ...x, positionen:x.positionen.map((p,j) =>
      j===i ? { ...p, [key]:val } : p) }));
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ color:"var(--yellow)", fontWeight:700, fontSize:16 }}>📋 Neue LV-Vorlage</div>
        <button onClick={onClose} style={{ background:"none", border:"none",
          color:"var(--muted)", fontSize:24, cursor:"pointer" }}>✕</button>
      </div>
      <div style={{ marginBottom:12 }}>
        <Label>Vorlagenname</Label>
        <input value={v.name} onChange={e=>setV(x=>({...x,name:e.target.value}))}
          placeholder="z.B. Bodenplatte Standard" style={inputStyle()} />
      </div>
      <div style={{ marginBottom:16 }}>
        <Label>Gewerk</Label>
        <input value={v.gewerk} onChange={e=>setV(x=>({...x,gewerk:e.target.value}))}
          placeholder="z.B. Betonage" style={inputStyle()} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <Label>Positionen</Label>
        <button onClick={addPosition}
          style={{ background:"var(--surface2)", color:"var(--text)",
            border:"1px solid var(--border)", borderRadius:8, padding:"4px 10px",
            cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>+ Position</button>
      </div>
      {v.positionen.map((pos,i) => (
        <div key={i} style={{ background:"var(--surface2)", borderRadius:10,
          padding:10, marginBottom:8, border:"1px solid var(--border)" }}>
          <input value={pos.bez} onChange={e=>updatePos(i,"bez",e.target.value)}
            placeholder="Bezeichnung" style={{ ...inputStyle(), marginBottom:6 }} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            <select value={pos.einheit} onChange={e=>updatePos(i,"einheit",e.target.value)}
              style={{ ...inputStyle(), padding:"8px 10px", fontSize:12 }}>
              {["m²","m³","m","t","h","Stk","pau"].map(u=><option key={u}>{u}</option>)}
            </select>
            <select value={pos.ep_id||""} onChange={e=>updatePos(i,"ep_id",Number(e.target.value))}
              style={{ ...inputStyle(), padding:"8px 10px", fontSize:12 }}>
              <option value="">Kein EP</option>
              {einheitspreise.map(ep=>(
                <option key={ep.id} value={ep.id}>{ep.gewerk}: {ep.preis}€/{ep.einheit}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <button onClick={onClose} style={{ flex:1, background:"var(--surface2)",
          color:"var(--muted)", border:"1.5px solid var(--border)", borderRadius:12,
          padding:13, cursor:"pointer", fontFamily:"inherit" }}>Abbrechen</button>
        <button onClick={() => v.name && onSave(v)}
          style={{ flex:2, background:"var(--yellow)", color:"#1a1200",
            border:"none", borderRadius:12, padding:13, fontWeight:800,
            cursor:"pointer", fontFamily:"inherit" }}>💾 Vorlage speichern</button>
      </div>
    </div>
  );
}

// ─── Bauleiter: Angebots-View ─────────────────────────────────────────────
function AngebotView({ projekt, aufgaben, einheitspreise, lvVorlagen, eigeneFirma }) {
  const [angebote,    setAngebote]    = useState([]);
  const [aktAngebot,  setAktAngebot]  = useState(null);
  const [neuAngebot,  setNeuAngebot]  = useState(false);

  function neuesAngebot() {
    const a = {
      id:           Date.now(),
      titel:        `Angebot ${new Date().toLocaleDateString("de-DE")}`,
      empfaenger:   projekt?.auftraggeber || "",
      datum:        new Date().toISOString().slice(0,10),
      gueltig_bis:  new Date(Date.now()+30*864e5).toISOString().slice(0,10),
      positionen:   [],
      rabatt:       0,
      mwst:         19,
      status:       "entwurf",
    };
    setAngebote(prev=>[a,...prev]);
    setAktAngebot(a);
  }

  if (aktAngebot) {
    return <AngebotEditor
      angebot={aktAngebot}
      onSave={a => { setAngebote(prev=>prev.map(x=>x.id===a.id?a:x)); setAktAngebot(a); }}
      onClose={() => setAktAngebot(null)}
      aufgaben={aufgaben}
      einheitspreise={einheitspreise}
      lvVorlagen={lvVorlagen}
      projekt={projekt}
      eigeneFirma={eigeneFirma}
    />;
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:14 }}>
        <div style={{ color:"var(--text)", fontWeight:700, fontSize:15 }}>
          📄 Angebote
        </div>
        <button onClick={neuesAngebot}
          style={{ background:"var(--yellow)", color:"#1a1200", border:"none",
            borderRadius:10, padding:"8px 16px", fontWeight:700,
            cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
          + Angebot
        </button>
      </div>

      {angebote.length === 0 && (
        <div style={{ textAlign:"center", padding:"48px 20px", color:"var(--muted)" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📄</div>
          <div style={{ fontWeight:700, color:"var(--text)", marginBottom:6 }}>
            Noch keine Angebote
          </div>
          <div style={{ fontSize:13 }}>
            Erstelle ein Angebot aus Aufgaben oder LV-Vorlagen.
          </div>
        </div>
      )}

      {angebote.map(a => {
        const netto   = a.positionen.reduce((s,p)=>s+(p.menge||0)*(p.ep||0),0);
        const gesamt  = netto * (1 - (a.rabatt||0)/100) * (1 + (a.mwst||19)/100);
        const STATUS  = { entwurf:"📝 Entwurf", versendet:"📤 Versendet",
          angenommen:"✅ Angenommen", abgelehnt:"❌ Abgelehnt" };
        return (
          <div key={a.id} onClick={() => setAktAngebot(a)}
            style={{ background:"var(--surface)", borderRadius:14,
              padding:"16px 18px", marginBottom:10, cursor:"pointer",
              border:"1.5px solid var(--border)",
              boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"flex-start" }}>
              <div>
                <div style={{ color:"var(--text)", fontWeight:700, fontSize:14 }}>
                  {a.titel}
                </div>
                <div style={{ color:"var(--muted)", fontSize:12, marginTop:2 }}>
                  {a.empfaenger} · {new Date(a.datum).toLocaleDateString("de-DE")}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:"var(--yellow)", fontWeight:800, fontSize:16 }}>
                  {gesamt.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €
                </div>
                <div style={{ color:"var(--muted)", fontSize:11, marginTop:2 }}>
                  {STATUS[a.status] || a.status}
                </div>
              </div>
            </div>
            <div style={{ color:"var(--muted)", fontSize:12, marginTop:6 }}>
              {a.positionen.length} Position{a.positionen.length!==1?"en":""}
              · Gültig bis {new Date(a.gueltig_bis).toLocaleDateString("de-DE")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Angebots-Editor ─────────────────────────────────────────────────────────
function AngebotEditor({ angebot, onSave, onClose, aufgaben, einheitspreise, lvVorlagen, projekt, eigeneFirma }) {
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
    const csv = rows.map(r => r.map(v => `"${v}"`).join(";")).join("
");
    const blob = new Blob(["﻿"+csv], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = ("Angebot_"+a.titel.replace(/ /g,"_")+".csv");
    link.click(); URL.revokeObjectURL(url);
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

      {/* Vorlage Modal */}
      {vonVorlage && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.8)",
          zIndex:700, display:"flex", alignItems:"flex-end",
          justifyContent:"center" }}>
          <div style={{ background:"var(--surface)", borderRadius:"20px 20px 0 0",
            padding:22, width:"100%", maxWidth:480, maxHeight:"70vh",
            overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:14 }}>
              <div style={{ color:"var(--yellow)", fontWeight:700, fontSize:16 }}>
                📋 LV-Vorlage laden
              </div>
              <button onClick={() => setVonVorlage(false)}
                style={{ background:"none", border:"none", color:"var(--muted)",
                  fontSize:24, cursor:"pointer" }}>✕</button>
            </div>
            {lvVorlagen.length === 0 && (
              <div style={{ color:"var(--muted)", textAlign:"center", padding:24 }}>
                Keine Vorlagen vorhanden · Administrator anlegen lassen
              </div>
            )}
            {lvVorlagen.map(v => (
              <div key={v.id} onClick={() => vorlageLaden(v)}
                style={{ background:"var(--surface2)", borderRadius:12,
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
      )}

      {/* Aufgaben Modal */}
      {vonAufgabe && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.8)",
          zIndex:700, display:"flex", alignItems:"flex-end",
          justifyContent:"center" }}>
          <div style={{ background:"var(--surface)", borderRadius:"20px 20px 0 0",
            padding:22, width:"100%", maxWidth:480, maxHeight:"70vh",
            overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:14 }}>
              <div style={{ color:"var(--green)", fontWeight:700, fontSize:16 }}>
                ✅ Aus Aufgaben importieren
              </div>
              <button onClick={() => setVonAufgabe(false)}
                style={{ background:"none", border:"none", color:"var(--muted)",
                  fontSize:24, cursor:"pointer" }}>✕</button>
            </div>
            {aufgaben.length === 0 && (
              <div style={{ color:"var(--muted)", textAlign:"center", padding:24 }}>
                Keine Aufgaben vorhanden
              </div>
            )}
            {aufgaben.map(aufg => (
              <div key={aufg.id} onClick={() => aufgabeImportieren(aufg)}
                style={{ background:"var(--surface2)", borderRadius:12,
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
      )}
    </div>
  );
}

const MOCK_PROJEKTE = [
  {
    id: 1,
    name: "Neubau Wohnanlage Nord",
    adresse: "Hauptstraße 22, 80331 München",
    projektnummer: "PRJ-2025-001",
    bauleiter: "Thomas Huber",
    auftraggeber: "Stadtbau München GmbH",
    typ: "hochbau",
    farbe: "#F5C400",
    felder: MOCK_FELDER,
    kolonnen: MOCK_KOLONNEN,
    berichte: MOCK_BERICHTE,
  },
  {
    id: 2,
    name: "Tiefgarage Westpark",
    adresse: "Westparkstraße 8, 81373 München",
    projektnummer: "PRJ-2025-002",
    bauleiter: "Maria Schmidt",
    auftraggeber: "Immobilien AG Bayern",
    typ: "tiefgarage",
    farbe: "#4A9EE0",
    felder: [
      { id:101, name:"TG-A1 – Rampe",       status:"done",     m2:65,  geplant:"2025-05-20", betoniert:"2025-05-20", dauer_tage:1, festigkeit:100, abhaengigkeiten:[] },
      { id:102, name:"TG-B1 – Ebene 1",     status:"in_progress", m2:420, geplant:"2025-06-15", betoniert:null, dauer_tage:3, festigkeit:null, abhaengigkeiten:[101] },
      { id:103, name:"TG-B2 – Ebene 2",     status:"planned",  m2:420, geplant:"2025-07-05", betoniert:null, dauer_tage:3, festigkeit:null, abhaengigkeiten:[102] },
    ],
    kolonnen: [
      { id:11, name:"Kolonne Wagner", vorarbeiter:"Günter Wagner", einsatz:"TG-B1 – Ebene 1", stunden:8, mitarbeiter:[ {id:1101,name:"Günter Wagner",rolle:"Vorarbeiter",erfasstIdent:null},{id:1102,name:"Daniel Klein",rolle:"Facharbeiter",erfasstIdent:null},{id:1103,name:"Emil Roth",rolle:"Facharbeiter",erfasstIdent:null},{id:1104,name:"Niko Braun",rolle:"Facharbeiter",erfasstIdent:null},{id:1105,name:"Sven Wolff",rolle:"Helfer",erfasstIdent:null},{id:1106,name:"Tim Kruse",rolle:"Helfer",erfasstIdent:null} ] },
      { id:12, name:"Kolonne Bauer", vorarbeiter:"Anna Bauer", einsatz:"Schalung TG-B2", stunden:7, mitarbeiter:[ {id:1201,name:"Anna Bauer",rolle:"Vorarbeiter",erfasstIdent:null},{id:1202,name:"Tom Lehmann",rolle:"Facharbeiter",erfasstIdent:null},{id:1203,name:"Sara Kaya",rolle:"Facharbeiter",erfasstIdent:null},{id:1204,name:"Marc Stein",rolle:"Helfer",erfasstIdent:null} ] },
    ],
    berichte: [
      { id:11, datum:"22.06.2025", wetter:"☀️ 14°C", arbeiter:10, taetigkeit:"Betonage TG-B1 Ebene 1 in vollem Gange. 180m² fertig.", maengel:0 },
    ],
  },
  {
    id: 3,
    name: "Brücke B13 Instandsetzung",
    adresse: "B13, km 42.3, 85221 Dachau",
    projektnummer: "PRJ-2025-003",
    bauleiter: "Klaus Weber",
    auftraggeber: "Staatl. Bauamt Dachau",
    typ: "hochbau",
    farbe: "#2EAF6A",
    felder: [
      { id:201, name:"Widerlager West",  status:"done",    m2:28, geplant:"2025-06-01", betoniert:"2025-06-01", dauer_tage:1, festigkeit:100, abhaengigkeiten:[] },
      { id:202, name:"Widerlager Ost",   status:"planned", m2:28, geplant:"2025-06-28", betoniert:null,         dauer_tage:1, festigkeit:null, abhaengigkeiten:[201] },
      { id:203, name:"Überbau Feld 1",   status:"planned", m2:85, geplant:"2025-07-15", betoniert:null,         dauer_tage:2, festigkeit:null, abhaengigkeiten:[201,202] },
    ],
    kolonnen: [
      { id:21, name:"Kolonne Müller", vorarbeiter:"Karl Müller", einsatz:"Schalung Widerlager Ost", stunden:8, mitarbeiter:[ {id:2101,name:"Karl Müller",rolle:"Vorarbeiter",erfasstIdent:null},{id:2102,name:"Ben Hartmann",rolle:"Facharbeiter",erfasstIdent:null},{id:2103,name:"Joe Lange",rolle:"Facharbeiter",erfasstIdent:null},{id:2104,name:"Nico Franke",rolle:"Facharbeiter",erfasstIdent:null},{id:2105,name:"Paul Werner",rolle:"Helfer",erfasstIdent:null} ] },
    ],
    berichte: [],
  },
];

function leerProjekt() {
  return { id: Date.now(), name:"", adresse:"", projektnummer:"", bauleiter:"", auftraggeber:"",
    typ: "hochbau",
    farbe: ["#F5C400","#4A9EE0","#2EAF6A","#C45C2A","#9B59B6"][Math.floor(Math.random()*5)],
    felder:[], kolonnen:[], berichte:[] };
}

// ─── Projekt-Liste (Startscreen) ─────────────────────────────────────────────
function ProjektListe({ projekte, onSelect, onNeu }) {
  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh", fontFamily:"'Segoe UI', system-ui, sans-serif", color:"var(--text)" }}>
      {/* Header */}
      <div style={{ background: "var(--surface)", padding:"18px 18px 14px", borderBottom:`2px solid ${'var(--yellow)'}` }}>
        <div style={{ color: "var(--yellow)", fontWeight:800, fontSize:22, letterSpacing:-0.5 }}>★ POLARIS</div>
        <div style={{ color: "var(--muted)", fontSize:12, marginTop:2 }}>Baustellenmanagement</div>
      </div>

      <div style={{ padding:"20px 16px 100px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ color: "var(--text)", fontWeight:700, fontSize:16 }}>Meine Baustellen</div>
          <div style={{ background: "var(--surface)", color: "var(--muted)", fontSize:12, padding:"4px 10px", borderRadius:20 }}>
            {projekte.length} Projekte
          </div>
        </div>

        {projekte.map(p => {
          const done  = p.felder.filter(f=>f.status==="done").length;
          const total = p.felder.length;
          const pct   = total > 0 ? Math.round(done/total*100) : 0;
          const delayed = p.felder.filter(f=>f.status!=="done" && f.geplant && new Date(f.geplant)<new Date()).length;
          return (
            <div key={p.id} onClick={() => onSelect(p.id)}
              style={{ background: "var(--surface)", borderRadius:14, padding:"16px 18px", marginBottom:12,
                border:`2px solid ${'var(--border)'}`, cursor:"pointer",
                borderLeft:`4px solid ${p.farbe}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ color: "var(--text)", fontWeight:700, fontSize:15 }}>{p.name}</div>
                  <div style={{ color: "var(--muted)", fontSize:12, marginTop:3 }}>📍 {p.adresse}</div>
                  <div style={{ display:"flex", gap:10, marginTop:6, flexWrap:"wrap" }}>
                    <Chip icon={PROJEKTTYPEN[p.typ]?.icon||"🏗️"} label={PROJEKTTYPEN[p.typ]?.label||p.typ} />
                    <Chip icon="🔢" label={p.projektnummer} />
                    <Chip icon="👤" label={p.bauleiter} />
                  </div>
                </div>
                <div style={{ color: "var(--muted)", fontSize:22, marginLeft:10 }}>›</div>
              </div>
              {/* Progress */}
              {total > 0 && (
                <div style={{ marginTop:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <div style={{ color: "var(--muted)", fontSize:11 }}>{done}/{total} {PROJEKTTYPEN[p.typ]?.fortschrittLabel||"Felder fertig"}</div>
                    <div style={{ display:"flex", gap:8 }}>
                      {delayed > 0 && <div style={{ color: "var(--red)", fontSize:11 }}>⚠️ {delayed} Verzug</div>}
                      <div style={{ color: p.farbe, fontSize:11, fontWeight:700 }}>{pct}%</div>
                    </div>
                  </div>
                  <div style={{ background: "var(--border)", borderRadius:4, height:6 }}>
                    <div style={{ background: p.farbe, width:`${pct}%`, height:"100%", borderRadius:4, transition:"width 0.5s" }} />
                  </div>
                </div>
              )}
              {total === 0 && (
                <div style={{ color: "var(--muted)", fontSize:12, marginTop:8 }}>Noch keine Betonfelder angelegt</div>
              )}
            </div>
          );
        })}

        {/* Neues Projekt */}
        <div onClick={onNeu}
          style={{ border:`2px dashed ${'var(--yellow)'}`, borderRadius:14, padding:"20px",
            textAlign:"center", cursor:"pointer", background: "var(--surface)", marginTop:4 }}>
          <div style={{ fontSize:28 }}>➕</div>
          <div style={{ color: "var(--yellow)", fontWeight:700, marginTop:6 }}>Neue Baustelle anlegen</div>
        </div>
      </div>
    </div>
  );
}

// ─── Neues Projekt Formular ──────────────────────────────────────────────────
function ProjektFormular({ initial, onSave, onClose, subs = [] }) {
  const [p, setP] = useState(initial || leerProjekt());
  const FARBEN = ["#F5C400","#4A9EE0","#2EAF6A","#C45C2A","#9B59B6","#E84393"];
  const valid = p.name.trim().length > 0;

  function toggleSub(id) {
    setP(prev => ({
      ...prev,
      subIds: (prev.subIds||[]).includes(id)
        ? (prev.subIds||[]).filter(x=>x!==id)
        : [...(prev.subIds||[]), id]
    }));
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.7)",
      backdropFilter:"blur(4px)", zIndex:500,
      display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:"var(--surface)", borderRadius:"20px 20px 0 0", padding:22,
        width:"100%", maxWidth:520, maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 -4px 30px rgba(0,0,0,0.15)" }}>

        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:18 }}>
          <div style={{ color:"var(--yellow)", fontWeight:700, fontSize:17 }}>
            {initial?.name ? "✏️ Baustelle bearbeiten" : "➕ Neue Baustelle"}
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:"var(--muted)",
              fontSize:24, cursor:"pointer" }}>✕</button>
        </div>

        {/* Projekttyp */}
        <div style={{ marginBottom:18 }}>
          <Label>Projekttyp *</Label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:6 }}>
            {Object.entries(PROJEKTTYPEN).map(([key, cfg]) => (
              <div key={key} onClick={() => setP(prev=>({...prev, typ:key}))}
                style={{ background: p.typ===key ? "var(--ybg)" : "var(--surface2)",
                  border:`2px solid ${p.typ===key ? "var(--yellow)" : "var(--border)"}`,
                  borderRadius:12, padding:"12px 12px", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:8,
                  transition:"all 0.15s" }}>
                <span style={{ fontSize:20 }}>{cfg.icon}</span>
                <span style={{ color: p.typ===key ? "var(--text)" : "var(--muted)",
                  fontSize:12, fontWeight: p.typ===key ? 700 : 400 }}>
                  {cfg.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {[
          ["Projektname *",  "name",          "Neubau Wohnanlage Nord"],
          ["Adresse",        "adresse",       "Musterstraße 1, 80331 München"],
          ["Projektnummer",  "projektnummer", "PRJ-2025-001"],
          ["Bauleiter",      "bauleiter",     "Max Mustermann"],
          ["Auftraggeber",   "auftraggeber",  "Muster GmbH"],
        ].map(([label, key, ph]) => (
          <div key={key} style={{ marginBottom:13 }}>
            <Label>{label}</Label>
            <input value={p[key]} onChange={e => setP(prev=>({...prev,[key]:e.target.value}))}
              placeholder={ph} style={inputStyle()} />
          </div>
        ))}

        {/* Farbe */}
        <div style={{ marginBottom:16 }}>
          <Label>Projektfarbe</Label>
          <div style={{ display:"flex", gap:10, marginTop:6 }}>
            {FARBEN.map(f => (
              <div key={f} onClick={() => setP(prev=>({...prev,farbe:f}))}
                style={{ width:36, height:36, borderRadius:18, background:f,
                  cursor:"pointer",
                  border:`3px solid ${p.farbe===f ? "var(--surface)" : "transparent"}`,
                  boxShadow: p.farbe===f ? `0 0 0 2px ${f}` : "none",
                  transition:"transform 0.15s",
                  transform: p.farbe===f ? "scale(1.2)" : "scale(1)" }} />
            ))}
          </div>
        </div>

        {/* Subunternehmer */}
        {subs.filter(s=>s.status==="aktiv").length > 0 && (
          <div style={{ marginBottom:20 }}>
            <Label>Subunternehmer zuweisen</Label>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:8 }}>
              {subs.filter(s=>s.status==="aktiv").map(s => {
                const aktiv = (p.subIds||[]).includes(s.id);
                return (
                  <div key={s.id} onClick={() => toggleSub(s.id)}
                    style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center",
                      background: aktiv ? "var(--bbg)" : "var(--surface2)",
                      border:`1.5px solid ${aktiv ? "var(--blue)" : "var(--border)"}`,
                      borderRadius:10, padding:"10px 12px", cursor:"pointer" }}>
                    <div>
                      <div style={{ color:"var(--text)", fontSize:13,
                        fontWeight: aktiv ? 700 : 400 }}>{s.name}</div>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:3 }}>
                        {(s.gewerke||[]).map(k => {
                          const g = ALLE_GEWERKE.find(x=>x.key===k);
                          return g ? (
                            <span key={k} style={{ color:"var(--muted)", fontSize:10 }}>
                              {g.icon} {g.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <div style={{ fontSize:16, color: aktiv ? "var(--blue)" : "var(--muted)" }}>
                      {aktiv ? "✓" : "○"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, background:"var(--surface2)", color:"var(--muted)",
              border:"1.5px solid var(--border)", borderRadius:12, padding:14,
              cursor:"pointer", fontFamily:"inherit" }}>
            Abbrechen
          </button>
          <button onClick={() => valid && onSave(p)} disabled={!valid}
            style={{ flex:2,
              background: valid ? "var(--yellow)" : "var(--surface2)",
              color: valid ? "#1a1200" : "var(--muted)",
              border:"none", borderRadius:12, padding:14, fontWeight:800,
              cursor: valid ? "pointer" : "default", fontSize:15,
              fontFamily:"inherit" }}>
            💾 Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Projekt-Header ──────────────────────────────────────────────────────────
function ProjektHeader({ projekt, onBack, onEdit, sbConnected }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div style={{ background:"var(--surface)", padding:"12px 16px",
      display:"flex", justifyContent:"space-between", alignItems:"center",
      borderBottom:`3px solid ${projekt.farbe}`, position:"sticky", top:0, zIndex:50,
      boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack}
          style={{ background:"var(--surface2)", border:"1.5px solid var(--border)",
            color:"var(--text)", borderRadius:10, padding:"8px 14px",
            cursor:"pointer", fontSize:18, fontWeight:700, fontFamily:"inherit" }}>‹</button>
        <div>
          <div style={{ color:"var(--text)", fontWeight:800, fontSize:14,
            maxWidth:180, overflow:"hidden", textOverflow:"ellipsis",
            whiteSpace:"nowrap" }}>{projekt.name}</div>
          <div style={{ color:"var(--muted)", fontSize:10 }}>
            {projekt.projektnummer} · {projekt.bauleiter}
          </div>
        </div>
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ background: sbConnected ? "var(--green)" : "var(--muted)",
          width:7, height:7, borderRadius:4 }} />
        <button onClick={() => setMenuOpen(true)}
          style={{ background:"var(--surface2)", border:"1px solid var(--border)",
            color:"var(--text)", borderRadius:8, padding:"6px 10px",
            cursor:"pointer", fontSize:16, fontFamily:"inherit" }}>⋯</button>
      </div>
      {menuOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:600 }}
          onClick={() => setMenuOpen(false)}>
          <div style={{ position:"absolute", top:56, right:14,
            background:"var(--surface)", borderRadius:14, padding:8,
            minWidth:200, border:"1.5px solid var(--border)",
            boxShadow:"0 8px 24px rgba(0,0,0,0.15)" }}
            onClick={e => e.stopPropagation()}>
            <MenuItem icon="✏️" label="Baustelle bearbeiten"
              onClick={() => { onEdit(); setMenuOpen(false); }} />
            <MenuItem icon={PROJEKTTYPEN[projekt.typ]?.icon||"🏗️"}
              label={PROJEKTTYPEN[projekt.typ]?.label||"Unbekannt"}
              onClick={() => setMenuOpen(false)} muted />
            <MenuItem icon="📋" label={`AG: ${projekt.auftraggeber}`}
              onClick={() => setMenuOpen(false)} muted />
            <MenuItem icon="📍" label={projekt.adresse}
              onClick={() => setMenuOpen(false)} muted small />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, muted, small }) {
  return (
    <div onClick={onClick}
      style={{ display:"flex", gap:10, alignItems:"center", padding:"11px 12px",
        borderRadius:10, cursor:"pointer" }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <span style={{ color: muted ? "var(--muted)" : "var(--text)",
        fontSize: small ? 11 : 13 }}>{label}</span>
    </div>
  );
}

// ROOT APP
// ════════════════════════════════════════════════════════════════════════════
export default function PolierApp() {
  const theme   = useTheme();
  const auth    = useAuth();
  const [projekte,      setProjekte]    = useState(MOCK_PROJEKTE);
  const [aktivId,       setAktivId]     = useState(null);
  const [tab,           setTab]         = useState("dashboard");
  const [sbConnected,   setSbConn]      = useState(false);
  const [neuProjekt,    setNeuProjekt]  = useState(false);
  const [editProjekt,   setEditProjekt] = useState(false);
  const [eigeneFirma,   setEigeneFirma] = useState(MOCK_EIGENE_FIRMA);
  const [subs,          setSubs]        = useState(MOCK_SUBS);
  const [homeTab,       setHomeTab]     = useState("projekte");
  const [aufgaben,      setAufgaben]    = useState([]);
  const [zeitbuchungen, setZeitbuchungen] = useState([]);
  const [einheitspreise,setEinheitspreise]= useState(DEFAULT_EINHEITSPREISE);
  const [lvVorlagen,    setLvVorlagen]    = useState(DEFAULT_LV_VORLAGEN);
  const pwa  = usePWA();
  const push = usePushNotifications(projekte, eigeneFirma);
  const offline = useOfflineSync(pwa.online === false ? false : true, sbConnected);

  // Onboarding: einmalig beim ersten Start
  const [onboardingDone, setOnboardingDone] = useState(
    () => !!localStorage.getItem(ONBOARDING_KEY)
  );

  const [zeigeRegistrierung, setZeigeRegistrierung] = useState(false);
  const [firma,              setFirma]              = useState(null);

  // Einladungs-Token aus URL erkennen
  const einladungsToken = new URLSearchParams(window.location.search).get("einladung");

  // Firma laden wenn eingeloggt
  useEffect(() => {
    if (auth.profil?.firma_id && auth.session?.access_token) {
      fetch(`${SUPABASE_URL}/rest/v1/firmen?id=eq.${auth.profil.firma_id}&select=*`, {
        headers: {
          "apikey":        SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${auth.session.access_token}`,
        },
      }).then(r => r.json()).then(d => { if (d?.[0]) setFirma(d[0]); });
    }
  }, [auth.profil?.firma_id]);

  // ── Demo-Rolle (ohne Supabase) ──
  const demoRolle = localStorage.getItem("polaris-demo-rolle");
  const aktiveProfil = auth.profil || (demoRolle ? {
    id: "demo", vorname: "Demo",
    nachname: ROLLEN[demoRolle]?.label || demoRolle,
    rolle: demoRolle, kolonne_id: demoRolle === "vorarbeiter" ? 1 : null,
  } : null);
  const aktiveRolle  = aktiveProfil?.rolle || null;
  const rolleConfig  = aktiveRolle ? ROLLEN[aktiveRolle] : null;

  // ── Einladungs-Screen ──
  if (einladungsToken && !aktiveProfil) {
    return <EinladungScreen
      token={einladungsToken}
      onErfolg={() => {
        window.history.replaceState({}, "", window.location.pathname);
        window.location.reload();
      }}
    />;
  }

  // ── Registrierungs-Screen ──
  if (zeigeRegistrierung) {
    return <RegistrierungScreen
      auth={auth}
      onZurueck={() => setZeigeRegistrierung(false)}
    />;
  }

  // ── Login Screen ──
  if (!aktiveProfil) {
    return <LoginScreen
      auth={auth}
      onDemoLogin={rolle => {
        localStorage.setItem("polaris-demo-rolle", rolle);
        window.location.reload();
      }}
      onRegistrieren={() => setZeigeRegistrierung(true)}
    />;
  }

  function abmelden() {
    localStorage.removeItem("polaris-demo-rolle");
    auth.abmelden?.();
    window.location.reload();
  }

  // ── Facharbeiter → nur Stempeluhr ──
  if (aktiveRolle === "facharbeiter") {
    return (
      <div style={{ background:"var(--bg)", minHeight:"100vh",
        fontFamily:"'Segoe UI', system-ui, sans-serif", color:"var(--text)" }}>
        <div style={{ background:"var(--surface)", padding:"14px 18px",
          borderBottom:"3px solid var(--yellow)", display:"flex",
          justifyContent:"space-between", alignItems:"center",
          boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
          <div>
            <div style={{ fontWeight:900, fontSize:18, letterSpacing:-1 }}>
              <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
            </div>
            <RollenBadge rolle={aktiveRolle} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <ThemeToggle dark={theme.dark} toggle={theme.toggle} />
            <button onClick={abmelden}
              style={{ background:"var(--surface2)", color:"var(--muted)",
                border:"1px solid var(--border)", borderRadius:8,
                padding:"6px 12px", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
              Abmelden
            </button>
          </div>
        </div>
        <div style={{ padding:"20px 16px" }}>
          <StempeluhrView profil={aktiveProfil} projekte={projekte} session={auth.session} />
        </div>
      </div>
    );
  }

  function handleOnboardingComplete(firma, ersterPolier) {
    setEigeneFirma(prev => ({ ...prev, ...firma }));
    setOnboardingDone(true);
    // Direkt das Neue-Baustelle-Formular öffnen
    setTimeout(() => setNeuProjekt(true), 100);
  }

  // Onboarding anzeigen wenn noch nicht abgeschlossen
  if (!onboardingDone) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  const projekt = projekte.find(p => p.id === aktivId) || null;

  // Projekt-Daten updaten
  function updateProjekt(id, changes) {
    setProjekte(prev => prev.map(p => p.id===id ? { ...p, ...changes } : p));
  }

  const felder    = projekt?.felder   || [];
  const berichte  = projekt?.berichte || [];
  const kolonnen  = projekt?.kolonnen || [];

  function setFelder(fn)   { updateProjekt(aktivId, { felder:   typeof fn==="function" ? fn(felder)   : fn }); }
  function setBerichte(fn) { updateProjekt(aktivId, { berichte: typeof fn==="function" ? fn(berichte) : fn }); }

  function handleFelderImport(newFelder) {
    setFelder(prev => {
      const maxId = prev.reduce((m,f)=>Math.max(m,f.id),0);
      return [...prev, ...newFelder.map((f,i)=>({...f, id:maxId+i+1}))];
    });
  }

  function handleSaveProjekt(p) {
    if (projekte.find(x=>x.id===p.id)) {
      setProjekte(prev => prev.map(x=>x.id===p.id ? p : x));
    } else {
      setProjekte(prev => [...prev, p]);
    }
    setNeuProjekt(false);
    setEditProjekt(false);
    if (!aktivId) setAktivId(p.id);
  }

  // Supabase
  useEffect(() => {
    if (SUPABASE_URL.includes("DEIN")) { setSbConn(false); return; }
    setSbConn(true);
  }, []);

  // ── Home Screen (Baustellen + Firmen) ──
  if (!aktivId) {
    return (
      <>
        <div style={{ background:"var(--bg)", minHeight:"100vh",
          fontFamily:"'Segoe UI', system-ui, sans-serif", color:"var(--text)" }}>

          {/* Header */}
          <div style={{ background:"var(--surface)", padding:"16px 18px 0",
            borderBottom:"2px solid var(--yellow)",
            boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontWeight:900, fontSize:20, letterSpacing:-1,
                  color:"var(--text)", lineHeight:1 }}>
                  <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
                </div>
                <div style={{ fontSize:10, color:"var(--muted)", fontWeight:600,
                  letterSpacing:2, textTransform:"uppercase", marginTop:2 }}>
                  Baustellenmanagement
                </div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <RollenBadge rolle={aktiveRolle} />
                <ThemeToggle dark={theme.dark} toggle={theme.toggle} />
                <button onClick={abmelden}
                  style={{ width:36, height:36, borderRadius:10,
                    background:"var(--surface2)", border:"1.5px solid var(--border2)",
                    cursor:"pointer", fontSize:14, display:"flex",
                    alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}
                  title="Abmelden">🚪</button>
              </div>
            </div>
            {/* Home Tabs */}
            <div style={{ display:"flex", gap:0 }}>
              {[["projekte","🏗️","Baustellen"],["firmen","🏢","Unternehmen"]].map(([id,icon,label]) => (
                <button key={id} onClick={() => setHomeTab(id)}
                  style={{ flex:1, background:"none", border:"none", cursor:"pointer",
                    padding:"10px 0 12px", fontFamily:"inherit",
                    borderBottom:`3px solid ${homeTab===id ? "var(--yellow)" : "transparent"}` }}>
                  <div style={{ fontSize:22 }}>{icon}</div>
                  <div style={{ color: homeTab===id ? "var(--text)" : "var(--muted)",
                    fontSize:12, marginTop:2,
                    fontWeight: homeTab===id ? 700 : 400 }}>{label}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding:"16px 14px 100px" }}>
            {homeTab === "projekte" && (
              <>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:14 }}>
                  <div style={{ color:"var(--text)", fontWeight:700, fontSize:15 }}>
                    Meine Baustellen
                  </div>
                  <div style={{ background:"var(--surface2)", color:"var(--muted)",
                    fontSize:12, padding:"4px 10px", borderRadius:20,
                    border:"1px solid var(--border)" }}>
                    {projekte.length} {projekte.length === 1 ? "Projekt" : "Projekte"}
                  </div>
                </div>

                {projekte.length === 0 && (
                  <div style={{ textAlign:"center", padding:"40px 20px",
                    color:"var(--muted)", fontSize:14 }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>🏗️</div>
                    <div style={{ fontWeight:700, color:"var(--text)", marginBottom:8 }}>
                      Noch keine Baustellen
                    </div>
                    <div>Leg deine erste Baustelle an um loszulegen.</div>
                  </div>
                )}

                {projekte.map(p => {
                  const eltern  = p.felder.filter(f=>!f.parentId);
                  const done    = eltern.filter(f=>f.status==="done").length;
                  const total   = eltern.length;
                  const pct     = total > 0 ? Math.round(done/total*100) : 0;
                  const delayed = eltern.filter(f=>f.status!=="done" && f.geplant && new Date(f.geplant)<new Date()).length;
                  const projSubs = subs.filter(s => (p.subIds||[]).includes(s.id));
                  return (
                    <div key={p.id} onClick={() => { setAktivId(p.id); setTab("dashboard"); }}
                      style={{ background:"var(--surface)", borderRadius:16,
                        padding:"18px 20px", marginBottom:14,
                        border:"1.5px solid var(--border)", cursor:"pointer",
                        borderLeft:`5px solid ${p.farbe}`,
                        boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"flex-start" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ color:"var(--text)", fontWeight:700,
                            fontSize:15 }}>{p.name}</div>
                          <div style={{ color:"var(--muted)", fontSize:12,
                            marginTop:2 }}>📍 {p.adresse}</div>
                          <div style={{ display:"flex", gap:8, marginTop:6,
                            flexWrap:"wrap" }}>
                            <Chip icon={PROJEKTTYPEN[p.typ]?.icon||"🏗️"} label={PROJEKTTYPEN[p.typ]?.label||p.typ} />
                            <Chip icon="🔢" label={p.projektnummer} />
                            <Chip icon="👤" label={p.bauleiter} />
                          </div>
                        </div>
                        <div style={{ color:"var(--muted)", fontSize:22,
                          marginLeft:8 }}>›</div>
                      </div>
                      {total > 0 && (
                        <div style={{ marginTop:12 }}>
                          <div style={{ display:"flex", justifyContent:"space-between",
                            marginBottom:4 }}>
                            <div style={{ color:"var(--muted)", fontSize:11 }}>
                              {done}/{total} {PROJEKTTYPEN[p.typ]?.fortschrittLabel||"fertig"}
                            </div>
                            <div style={{ display:"flex", gap:8 }}>
                              {delayed > 0 && (
                                <div style={{ color:"var(--red)", fontSize:11 }}>
                                  ⚠️ {delayed} Verzug
                                </div>
                              )}
                              <div style={{ color: p.farbe, fontSize:11,
                                fontWeight:700 }}>{pct}%</div>
                            </div>
                          </div>
                          <div style={{ background:"var(--surface2)", borderRadius:4,
                            height:6, border:"1px solid var(--border)" }}>
                            <div style={{ background: p.farbe, width:`${pct}%`,
                              height:"100%", borderRadius:4,
                              transition:"width 0.5s" }} />
                          </div>
                        </div>
                      )}
                      {total === 0 && (
                        <div style={{ color:"var(--muted)", fontSize:12,
                          marginTop:8 }}>Noch keine Felder angelegt</div>
                      )}
                    </div>
                  );
                })}

                {/* Neue Baustelle */}
                <div onClick={() => setNeuProjekt(true)}
                  style={{ border:"2px dashed var(--yellow)", borderRadius:16,
                    padding:"28px 24px", textAlign:"center", cursor:"pointer",
                    background:"var(--ybg)",
                    boxShadow:"0 2px 8px rgba(245,196,0,0.12)" }}>
                  <div style={{ fontSize:36 }}>➕</div>
                  <div style={{ color:"var(--ydark)", fontWeight:700,
                    marginTop:10, fontSize:15 }}>
                    Neue Baustelle anlegen
                  </div>
                </div>
              </>
            )}

            {homeTab === "firmen" && (
              <FirmenView
                owneFirma={eigeneFirma}
                setEigeneFirma={setEigeneFirma}
                subs={subs}
                setSubs={setSubs}
                onOnboardingReset={() => setOnboardingDone(false)}
              />
            )}
          </div>
        </div>

        {neuProjekt && (
          <ProjektFormular
            subs={subs}
            onSave={handleSaveProjekt}
            onClose={() => setNeuProjekt(false)}
          />
        )}
      </>
    );
  }

  // ── Baustellen-Ansicht ──
  // Rollenbasierte Tabs
  const ALLE_TABS = [
    { id:"dashboard",     icon:"📊",  label:"Übersicht",   rollen:["administrator","bauleiter","polier","vorarbeiter"] },
    { id:"aufgaben",      icon:"✅",  label:"Aufgaben",    rollen:["administrator","bauleiter","polier","vorarbeiter"] },
    { id:"maengel",       icon:"⚠️",  label:"Mängel",      rollen:["administrator","bauleiter","polier","vorarbeiter"] },
    { id:"gantt",         icon:"📅",  label:"Zeitplan",    rollen:["administrator","bauleiter","polier"] },
    { id:"kosten",        icon:"💰",  label:"Kosten",      rollen:["administrator","bauleiter","polier"] },
    { id:"scanner",       icon:"📷",  label:"Scanner",     rollen:["administrator","polier"] },
    { id:"wetter",        icon:"🌤️", label:"Wetter",      rollen:["administrator","bauleiter","polier","vorarbeiter"] },
    { id:"kolonnen",      icon:"👷",  label:"Kolonnen",    rollen:["administrator","bauleiter","polier","vorarbeiter"] },
    { id:"tagebuch",      icon:"📋",  label:"Tagebuch",    rollen:["administrator","polier","vorarbeiter"] },
    { id:"stempeln",      icon:"⏱️",  label:"Stempeln",    rollen:["administrator","polier","vorarbeiter","facharbeiter"] },
    { id:"angebot",       icon:"📄",  label:"Angebot",     rollen:["administrator","bauleiter","polier"] },
    { id:"admin_params",  icon:"⚙️",  label:"Parameter",   rollen:["administrator"] },
    { id:"nutzer",        icon:"👥",  label:"Nutzer",      rollen:["administrator"] },
  ];
  const TABS = ALLE_TABS.filter(t => !aktiveRolle || t.rollen.includes(aktiveRolle));

  return (
    <div style={{ background:"var(--bg)", minHeight:"100vh",
      fontFamily:"'Segoe UI', system-ui, sans-serif", color:"var(--text)" }}>

      {/* ── TOP BAR ── */}
      <div style={{ background:"var(--surface)", padding:"13px 16px 0",
        borderBottom:"1px solid var(--border)", position:"sticky", top:0, zIndex:60,
        boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:10 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:19, letterSpacing:-1,
              color:"var(--text)", lineHeight:1 }}>
              <span style={{ color:"var(--yellow)" }}>★</span> POLARIS
            </div>
            <div style={{ fontSize:10, color:"var(--muted)", fontWeight:600,
              letterSpacing:2, textTransform:"uppercase", marginTop:1 }}>
              Baustellenmanagement
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ width:8, height:8, borderRadius:4,
              background: sbConnected ? "var(--green)" : "var(--muted)" }} />
            <RollenBadge rolle={aktiveRolle} />
            <ThemeToggle dark={theme.dark} toggle={theme.toggle} />
            <button onClick={abmelden}
              style={{ width:36, height:36, borderRadius:10,
                background:"var(--surface2)", border:"1.5px solid var(--border2)",
                cursor:"pointer", fontSize:14, display:"flex",
                alignItems:"center", justifyContent:"center" }}
              title="Abmelden">
              🚪
            </button>
          </div>
        </div>

        {/* ── AKTENREGISTER ── */}
        <Aktenregister
          projekte={projekte}
          aktivId={aktivId}
          onSelect={id => { setAktivId(id); setTab("dashboard"); }}
          onNeu={() => setNeuProjekt(true)}
        />
      </div>

      {/* ── PROJEKT INFO STRIP ── */}
      <ProjektInfoStrip projekt={projekt} />

      {/* ── CONTENT ── */}
      <PlanGuard firma={firma} ressource="app">
      <div style={{ padding:"16px 14px 100px", background:"var(--bg)", minHeight:"100vh" }}>
        {tab === "dashboard" && <DashboardView felder={felder} kolonnen={kolonnen} sbConnected={sbConnected} />}
        {tab === "felder"    && <BetonfelderView felder={felder} setFelder={setFelder} sbConnected={sbConnected} projektTyp={projekt.typ} projSubs={subs.filter(s=>(projekt.subIds||[]).includes(s.id))} projekt={projekt} eigeneFirma={eigeneFirma} wetter={null} />}
        {tab === "gantt"     && <GanttView felder={felder} />}
        {tab === "editor"    && <EditorView felder={felder} setFelder={setFelder} projektTyp={projekt.typ} />}
        {tab === "scanner"   && <ScannerView onFelderImport={handleFelderImport} projektTyp={projekt.typ} />}
        {tab === "wetter"    && <WeatherView />}
        {tab === "kolonnen"  && <KolonnenView kolonnen={kolonnen} projekt={projekt} />}
        {tab === "tagebuch"  && <TagesbuchView
            berichte={berichte} setBerichte={setBerichte} sbConnected={sbConnected}
            projekt={projekt} eigeneFirma={eigeneFirma} kolonnen={kolonnen}
            offlineSpeichern={offline.speichereOffline}
            aufgaben={aufgaben} setAufgaben={setAufgaben}
          />}
        {tab === "aufgaben"      && <AufgabenView aufgaben={aufgaben} setAufgaben={setAufgaben} kolonnen={kolonnen} sbConnected={sbConnected} />}
        {tab === "maengel"       && <MaengelView aufgaben={aufgaben} setAufgaben={setAufgaben} kolonnen={kolonnen} />}
        {tab === "kosten"        && <KostenView projekt={projekt} aufgaben={aufgaben} kolonnen={kolonnen} zeitbuchungen={zeitbuchungen} />}
        {tab === "zeiten"        && <ZeiterfassungView projekt={projekt} />}
        {tab === "stempeln"      && <StempeluhrView profil={aktiveProfil} projekte={projekte} session={auth.session} />}
        {tab === "nutzer"        && <NutzerVerwaltungView session={auth.session} />}
      </div>
      </PlanGuard>

      {/* ── BOTTOM NAV ── */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0,
        background:"var(--surface)", borderTop:"2px solid var(--border)",
        display:"flex", zIndex:50,
        boxShadow:"0 -2px 12px rgba(0,0,0,0.10)",
        paddingBottom:"env(safe-area-inset-bottom)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, padding:"10px 0 12px", background:"none",
              border:"none", cursor:"pointer", fontFamily:"inherit",
              borderTop:`3px solid ${tab===t.id ? projekt.farbe : "transparent"}`,
              transition:"border-color 0.15s" }}>
            <div style={{ fontSize:20 }}>{t.icon}</div>
            <div style={{ color: tab===t.id ? projekt.farbe : "var(--muted)",
              fontSize:9, marginTop:2,
              fontWeight: tab===t.id ? 800 : 500 }}>{t.label}</div>
          </button>
        ))}
      </div>

      {editProjekt && (
        <ProjektFormular
          initial={projekt}
          subs={subs}
          onSave={handleSaveProjekt}
          onClose={() => setEditProjekt(false)}
        />
      )}
      {neuProjekt && (
        <ProjektFormular
          subs={subs}
          onSave={handleSaveProjekt}
          onClose={() => setNeuProjekt(false)}
        />
      )}
      <PWABanner pwa={pwa} />
    </div>
  );
}
