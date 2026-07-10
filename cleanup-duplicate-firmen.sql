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

-- Schritt 3: Lösche die überzähligen Duplikate.
-- WICHTIG: Trage die IDs der Firmen ein, die NICHT deine aktuelle_firma_id
-- aus Schritt 2 sind, und die keine echten Projektdaten enthalten.
-- Beispiel (IDs anpassen!):
-- delete from firmen where id in (2,3,4,5,6,7,8,9,10);

-- Hinweis: Durch "on delete cascade" in den Foreign Keys werden zugehörige
-- Projekte, Aufgaben etc. dieser Firmen automatisch mitgelöscht. Vorher
-- unbedingt prüfen, ob in den zu löschenden Firmen echte Daten stecken.
