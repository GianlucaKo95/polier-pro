# ⚒ Polier Pro

Baustellenmanagement für Poliere im Hoch- und Tiefbau — als Home Assistant Add-on.

## Features

- 🏗️ Betonfeld-Planer mit Raster-Generator und Unterfeldern
- 📅 Gantt-Zeitplan mit Verzugs-Erkennung
- 🌤️ Wetter-Integration (Open-Meteo) mit Betonierbarkeits-Check
- 👷 Kolonnen-Verwaltung mit Mitarbeiter-Liste
- ⏱️ 123erfasst Zeiterfassung (read-only)
- 📋 Bautagebuch mit Foto-Upload und Diktierfunktion
- 📷 Betonkarten-Scanner (KI-gestützt via Claude Vision)
- 🏢 Subunternehmer-Verwaltung
- 🏠 Projekttypen: Hochbau, Tiefgarage, Tiefbau, Dach, PV-Anlage
- 📱 PWA – installierbar, offline-fähig

---

## Installation als Home Assistant Add-on

### 1. Repository zu HA hinzufügen

In Home Assistant:
**Einstellungen → Add-ons → Add-on Store → ⋮ → Repositories**

URL eintragen:
```
https://github.com/GianlucaKo95/polier-pro
```

### 2. Add-on installieren

Im Add-on Store erscheint **Polier Pro** → Installieren → Starten.

### 3. Nginx Proxy Manager einrichten

| Feld            | Wert                        |
|-----------------|-----------------------------|
| Forward Hostname | `homeassistant.local`       |
| Forward Port     | `3000`                      |
| Domain          | `polier.koeven.dnshome.it`  |
| SSL             | Let's Encrypt aktivieren    |
| Websockets      | aktivieren                  |

---

## Lokale Entwicklung

```bash
git clone https://github.com/GianlucaKo95/polier-pro
cd polier-pro
npm install
npm run dev
# → http://localhost:3000
```

## Build

```bash
npm run build
# Output in /dist
```

## Supabase (optional)

Für Datenpersistenz und Foto-Upload:

```bash
# .env.local
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

SQL für Tabellen:
```sql
create table betonfelder (
  id serial primary key, name text, status text,
  m2 int, geplant date, betoniert date,
  dauer_tage int default 1, festigkeit int
);

create table tagesberichte (
  id serial primary key, datum date, arbeiter int,
  taetigkeit text, besonderheiten text,
  material text, maengel int default 0,
  bilder text
);
```

Storage Bucket: `bautagebuch` (public)

## 123erfasst Anbindung

```bash
supabase functions deploy erfasst-proxy
supabase secrets set ERFASST_API_KEY=<key>
supabase secrets set ERFASST_SERVER=<firma.123erfasst.de>
```

---

## Tech Stack

- React 18 + Vite
- Web Speech API (Diktat)
- Open-Meteo API (Wetter)
- Supabase (Auth, DB, Storage)
- Claude Vision API (Kartenscanner)
- 123erfasst GraphQL API (Zeiterfassung)
- Home Assistant Add-on / Docker
- nginx

## Lizenz

MIT © Luca Koeven
