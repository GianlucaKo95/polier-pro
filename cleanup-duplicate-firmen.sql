-- ═══════════════════════════════════════════════════════════════════════════
-- BEREINIGUNG: Doppelt angelegte Firmen für denselben Nutzer entfernen
-- Einmalig ausführen NACHDEM supabase-saas.sql mit dem Fix aktualisiert wurde.
-- ═══════════════════════════════════════════════════════════════════════════

-- Schritt 1: Zeige alle Firmen die zu deinem Account gehören (zur Kontrolle)
-- Ersetze 'DEINE-USER-UUID' durch deine echte UUID aus Supabase → Authentication → Users
select f.id, f.name, f.created_at, f.plan
from firmen f
where f.id in (
  select firma_id from audit_log
  where profil_id = 'DEINE-USER-UUID' and aktion = 'firma.registriert'
)
order by f.created_at asc;

-- Schritt 2: Identifiziere die "richtige" Firma — meist die AKTUELLE,
-- auf die dein profile.firma_id gerade zeigt:
select p.firma_id as aktuelle_firma_id, f.name
from profile p
join firmen f on f.id = p.firma_id
where p.id = 'DEINE-USER-UUID';

-- Schritt 3a: Vor dem Löschen prüfen, ob in den Kandidaten-Firmen echte
-- Daten stecken (durch "on delete cascade" würden Projekte, Aufgaben,
-- Tagesberichte, Zeitbuchungen etc. dieser Firmen automatisch mitgelöscht).
-- IDs aus Schritt 1/2 eintragen und VOR dem eigentlichen Löschen ausführen:
-- select
--   f.id, f.name,
--   (select count(*) from projekte p where p.firma_id = f.id)      as projekte,
--   (select count(*) from profile pr where pr.firma_id = f.id)     as nutzer
-- from firmen f
-- where f.id in (2,3,4,5,6,7,8,9,10);
-- Zeigt eine der Kandidaten-Firmen projekte > 0 oder nutzer > 1 (mehr als
-- den eigenen Account), NICHT löschen ohne die Daten vorher zu migrieren.

-- Schritt 3b: Lösche die überzähligen Duplikate — nur IDs eintragen, die in
-- Schritt 3a mit 0 Projekten bestätigt wurden. In einer Transaktion, damit
-- bei einem Fehler oder falschen IDs mit ROLLBACK abgebrochen werden kann,
-- statt dass ein Tippfehler sofort und unwiderruflich Daten löscht:
--
-- begin;
-- delete from firmen where id in (2,3,4,5,6,7,8,9,10);
-- -- Ergebnis prüfen (Anzahl gelöschter Zeilen, ggf. erneut select aus
-- -- Schritt 1 laufen lassen) — erst dann:
-- commit;
-- -- Bei Zweifel stattdessen: rollback;
