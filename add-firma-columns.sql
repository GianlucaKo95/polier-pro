-- ═══════════════════════════════════════════════════════════════════════════
-- Ergänzt fehlende Spalten in der firmen-Tabelle für vollständige
-- Firmendaten (Geschäftsführer, Gewerke) — bisher nur lokal im Browser
-- gespeichert und beim nächsten Login/Gerät verloren gegangen.
-- Sicher mehrfach ausführbar dank "if not exists".
-- ═══════════════════════════════════════════════════════════════════════════

alter table firmen add column if not exists geschaeftsfuehrer text;
alter table firmen add column if not exists gewerke text[] default '{}';
