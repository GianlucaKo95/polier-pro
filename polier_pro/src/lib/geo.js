export const WMO_ICONS = {
  0:"☀️",1:"🌤️",2:"⛅",3:"☁️",
  45:"🌫️",48:"🌫️",
  51:"🌦️",53:"🌦️",55:"🌧️",
  61:"🌧️",63:"🌧️",65:"🌧️",
  71:"🌨️",73:"🌨️",75:"❄️",
  80:"🌦️",81:"🌧️",82:"⛈️",
  95:"⛈️",96:"⛈️",99:"⛈️",
};

export function wmoIcon(code) { return WMO_ICONS[code] || "🌡️"; }

export function betonCheck(w) {
  const warn = [];
  if (!w) return warn;
  if (w.temp < 5)    warn.push("🚫 Temperatur unter 5°C – Frostschutzmaßnahmen erforderlich");
  if (w.temp > 30)   warn.push("⚠️ Hitze über 30°C – Nachbehandlung intensivieren");
  if (w.wind > 40)   warn.push("🚫 Wind über 40 km/h – Betonage nicht empfohlen");
  if (w.rain > 5)    warn.push("🚫 Starkregen – Betonage stoppen");
  if (w.humidity>90) warn.push("⚠️ Sehr hohe Luftfeuchtigkeit");
  return warn;
}

export async function getGPSPosition() {
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

export async function reverseGeocode(lat, lng) {
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

export async function geocodePLZ(plz, ort = "") {
  if (!plz || !plz.trim()) return null;
  try {
    const params = new URLSearchParams({
      postalcode: plz.trim(),
      format: "json",
      limit: "1",
      countrycodes: "de,at,ch",
    });
    if (ort?.trim()) params.set("city", ort.trim());

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { "Accept-Language": "de" } }
    );
    const data = await res.json();
    if (data?.[0]) {
      return {
        lat:  parseFloat(data[0].lat),
        lon:  parseFloat(data[0].lon),
        name: ort?.trim() || data[0].display_name?.split(",")[0] || plz,
      };
    }
    return null;
  } catch { return null; }
}

export async function geocodeAdresse(adresse) {
  if (!adresse || !adresse.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(adresse)}&format=json&limit=1&countrycodes=de,at,ch`,
      { headers: { "Accept-Language": "de" } }
    );
    const data = await res.json();
    if (data?.[0]) {
      return {
        lat:  parseFloat(data[0].lat),
        lon:  parseFloat(data[0].lon),
        name: data[0].display_name?.split(",")[0] || adresse,
      };
    }
    return null;
  } catch { return null; }
}
