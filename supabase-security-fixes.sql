-- ═══════════════════════════════════════════════════════════════════════════
-- POLARIS – Sicherheits-Fixes (RLS-Härtung)
--
-- Einmalig NACH allen bisherigen Setup-Skripten ausführen:
-- supabase-setup.sql → supabase-auth-rollen.sql → supabase-saas.sql →
-- supabase-datenpersistenz.sql → (dieses Skript)
--
-- Behebt aus dem Code-Review vom 2026-08-18:
--
--  1) profile_update_own erlaubte jedem Nutzer, die eigene Zeile beliebig zu
--     ändern — inkl. rolle und firma_id. Damit konnte sich jeder Account zum
--     administrator hochstufen und sich per firma_id in eine fremde Firma
--     versetzen (vollständige Mandantentrennung ausgehebelt).
--  2) einladungen_token_lookup hatte keinerlei Einschränkung auf ein
--     konkretes Token — jeder unauthentifizierte Client konnte per SELECT
--     ALLE aktiven Einladungen aller Firmen abgreifen (Token-Harvesting →
--     Account-Übernahme in fremden Firmen).
--  3) Die "*_firma"-Policies aus supabase-datenpersistenz.sql erlaubten
--     jedem Firmenmitglied (auch facharbeiter), fremde Zeitbuchungen,
--     Aufgaben, Kolonnen und Tagesberichte zu ändern oder zu löschen —
--     nicht nur die eigenen. Das ist eine Regression gegenüber den
--     rollenbasierten Policies aus supabase-auth-rollen.sql.
--  4) netto_minuten (Lohn-relevant) wurde beim Ausstempeln ungeprüft vom
--     Client übernommen — beliebige/negative Werte waren direkt per
--     REST-API einschleusbar.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Privilegien-Eskalation über profile verhindern ────────────────────
-- Ein BEFORE-Trigger ist robuster als eine selbstreferenzielle WITH-CHECK-
-- Klausel auf derselben Tabelle: er sieht beim Update zuverlässig die Rolle
-- des Aufrufers *vor* der versuchten Änderung.
create or replace function profile_verhindere_privilegien_eskalation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ist_admin boolean;
begin
  if new.rolle is distinct from old.rolle or new.firma_id is distinct from old.firma_id then
    select (rolle = 'administrator') into v_ist_admin from profile where id = auth.uid();
    if not coalesce(v_ist_admin, false) then
      raise exception 'Nur Administratoren dürfen Rolle oder Firma ändern';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profile_verhindere_privilegien_eskalation_trg on profile;
create trigger profile_verhindere_privilegien_eskalation_trg
  before update on profile
  for each row execute function profile_verhindere_privilegien_eskalation();

-- profile_admin_all erlaubte Admins bisher, JEDE Firma zu verwalten statt nur
-- die eigene. Jetzt auf die eigene Firma beschränkt (der obige Trigger
-- verhindert zusätzlich, dass ein Admin sich selbst per firma_id-Änderung in
-- eine fremde Firma versetzt).
drop policy if exists "profile_admin_all" on profile;
create policy "profile_admin_all" on profile
  for all using (
    eigene_rolle() = 'administrator' and firma_id = eigene_firma_id()
  )
  with check (
    eigene_rolle() = 'administrator' and firma_id = eigene_firma_id()
  );

-- ─── 2. Einladungs-Token-Enumeration verhindern ───────────────────────────
-- Der anonyme Zugriff läuft künftig ausschließlich über diese
-- SECURITY DEFINER-Funktion, die genau einen Datensatz für ein exakt
-- bekanntes Token liefert — keine offene SELECT-Policy auf die Tabelle mehr.
drop policy if exists "einladungen_token_lookup" on einladungen;

create or replace function einladung_pruefen(p_token text)
returns table(
  token           text,
  email           text,
  rolle           user_rolle,
  firma_id        int,
  kolonne_id      bigint,
  firma_name      text,
  firma_logo_url  text
)
language sql security definer set search_path = public as $$
  select e.token, e.email, e.rolle, e.firma_id, e.kolonne_id,
         f.name, f.logo_url
  from einladungen e
  join firmen f on f.id = e.firma_id
  where e.token = p_token
    and e.aktiv = true
    and e.läuft_ab_at > now()
    and (e.max_nutzungen is null or e.nutzungen < e.max_nutzungen);
$$;

grant execute on function einladung_pruefen(text) to anon, authenticated;

-- ─── 3. Schreibzugriff auf Firmendaten wieder rollenbasiert statt          ───
-- ─── "jeder in der Firma darf alles" einschränken                         ───
drop policy if exists "zeitbuchungen_firma" on zeitbuchungen;
create policy "zeitbuchungen_lesen" on zeitbuchungen
  for select using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
    and (profil_id = auth.uid() or eigene_rolle() in ('administrator','bauleiter','polier'))
  );
create policy "zeitbuchungen_stempeln" on zeitbuchungen
  for insert with check (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
    and profil_id = auth.uid()
  );
create policy "zeitbuchungen_eigene_aendern" on zeitbuchungen
  for update using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
    and (profil_id = auth.uid() or eigene_rolle() in ('administrator','polier'))
  );
create policy "zeitbuchungen_loeschen" on zeitbuchungen
  for delete using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
    and eigene_rolle() in ('administrator','polier')
  );

drop policy if exists "aufgaben_firma" on aufgaben;
create policy "aufgaben_lesen" on aufgaben
  for select using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
  );
create policy "aufgaben_schreiben" on aufgaben
  for insert with check (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
    and eigene_rolle() in ('administrator','polier','vorarbeiter')
  );
create policy "aufgaben_aendern" on aufgaben
  for update using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
    and eigene_rolle() in ('administrator','polier','vorarbeiter')
  );
create policy "aufgaben_loeschen" on aufgaben
  for delete using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
    and eigene_rolle() in ('administrator','polier')
  );

drop policy if exists "kolonnen_firma" on kolonnen;
create policy "kolonnen_lesen" on kolonnen
  for select using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
  );
create policy "kolonnen_schreiben" on kolonnen
  for all using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
    and eigene_rolle() in ('administrator','polier')
  );

drop policy if exists "tagesberichte_firma" on tagesberichte;
create policy "tagesberichte_lesen" on tagesberichte
  for select using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
  );
create policy "tagesberichte_schreiben" on tagesberichte
  for insert with check (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
    and eigene_rolle() in ('administrator','polier','vorarbeiter')
  );
create policy "tagesberichte_aendern" on tagesberichte
  for update using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
    and eigene_rolle() in ('administrator','polier','vorarbeiter')
  );
create policy "tagesberichte_loeschen" on tagesberichte
  for delete using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
    and eigene_rolle() in ('administrator','polier')
  );

-- ─── 4. netto_minuten serverseitig berechnen statt Client-Wert zu trauen ──
alter table zeitbuchungen
  drop constraint if exists zeitbuchungen_netto_minuten_check;
alter table zeitbuchungen
  add constraint zeitbuchungen_netto_minuten_check check (netto_minuten is null or netto_minuten >= 0);

create or replace function zeitbuchungen_netto_minuten_berechnen()
returns trigger language plpgsql as $$
begin
  if new.ausgestempelt_at is not null then
    new.netto_minuten := greatest(0,
      round(extract(epoch from (new.ausgestempelt_at - new.eingestempelt_at)) / 60)
      - coalesce(new.pause_minuten, 0)
    );
  else
    new.netto_minuten := null;
  end if;
  return new;
end;
$$;

drop trigger if exists zeitbuchungen_netto_minuten_trg on zeitbuchungen;
create trigger zeitbuchungen_netto_minuten_trg
  before insert or update on zeitbuchungen
  for each row execute function zeitbuchungen_netto_minuten_berechnen();
