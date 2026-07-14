import { useState, useEffect } from "react";
import { geocodePLZ, geocodeAdresse, wmoIcon, betonCheck } from "../lib/geo.js";

export function WeatherView({ compact = false, ort = null, plz = null, projektId = null }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loc, setLoc] = useState({ lat: 48.137, lon: 11.576, name: "München" });
  const [standortAufgeloest, setStandortAufgeloest] = useState(false);

  // PLZ ist eindeutig und daher die zuverlässigste Suchgrundlage —
  // Ortsnamen können mehrfach vorkommen (z.B. "Neustadt" >20x in
  // Deutschland). Ohne PLZ wird notfalls nur nach dem Ortsnamen gesucht.
  useEffect(() => {
    let abgebrochen = false;
    setStandortAufgeloest(false);

    if (!plz?.trim() && !ort?.trim()) {
      setStandortAufgeloest(true);
      return;
    }

    const suche = plz?.trim()
      ? geocodePLZ(plz, ort)
      : geocodeAdresse(ort); // Fallback: nur Ortsname ohne PLZ vorhanden

    suche.then(result => {
      if (abgebrochen) return;
      if (result) {
        setLoc({ lat: result.lat, lon: result.lon, name: ort || result.name });
      }
      // Bei fehlgeschlagenem Geocoding bleibt der bisherige/Default-Standort bestehen
      setStandortAufgeloest(true);
    });

    return () => { abgebrochen = true; };
  }, [plz, ort]);

  useEffect(() => {
    if (!standortAufgeloest) return; // erst Wetter laden wenn Standort feststeht
    fetchWeather(loc.lat, loc.lon);
  }, [loc.lat, loc.lon, standortAufgeloest]);

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
