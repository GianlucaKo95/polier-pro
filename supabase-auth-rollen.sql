-- ═══════════════════════════════════════════════════════════════════════════
-- POLARIS – Auth, Rollen & Zeiterfassung
-- Ausführen NACH supabase-setup.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. ROLLEN ────────────────────────────────────────────────────────────
create type user_rolle as enum (
  'administrator',
  'bauleiter',
  'polier',
  'vorarbeiter',
  'facharbeiter'
);

-- ─── 2. NUTZER-PROFIL (erweitert Supabase Auth) ───────────────────────────
create table if not exists profile (
  id              uuid primary key references auth.users(id) on delete cascade,
  vorname         text,
  nachname        text,
  telefon         text,
  rolle           user_rolle not null default 'facharbeiter',
  firma_id        int,                    -- Zuordnung zur eigenen Firma
  kolonne_id      int references kolonnen(id),  -- Vorarbeiter/Facharbeiter
  aktiv           boolean default true,
  pin             text,                   -- 4-stelliger PIN (gehashed)
  avatar_url      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Trigger: updated_at automatisch setzen
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profile_updated_at
  before update on profile
  for each row execute function update_updated_at();

-- ─── 3. PROJEKT-ZUGRIFFSRECHTE ────────────────────────────────────────────
-- Welcher Nutzer hat Zugriff auf welches Projekt
create table if not exists projekt_zugriff (
  id          serial primary key,
  profil_id   uuid references profile(id) on delete cascade,
  projekt_id  int  references projekte(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(profil_id, projekt_id)
);

-- ─── 4. ZEITERFASSUNG ─────────────────────────────────────────────────────
create table if not exists zeitbuchungen (
  id              serial primary key,
  profil_id       uuid references profile(id) on delete cascade,
  projekt_id      int  references projekte(id),
  kolonne_id      int  references kolonnen(id),
  feld_id         int  references betonfelder(id),

  -- Zeiten
  eingestempelt_at  timestamptz not null,
  ausgestempelt_at  timestamptz,
  pause_start_at    timestamptz,
  pause_ende_at     timestamptz,
  pause_minuten     int generated always as (
    extract(epoch from (pause_ende_at - pause_start_at)) / 60
  ) stored,
  netto_minuten     int,                  -- Wird beim Ausstempeln berechnet

  -- GPS
  ein_lat         numeric(10,7),
  ein_lng         numeric(10,7),
  ein_adresse     text,
  aus_lat         numeric(10,7),
  aus_lng         numeric(10,7),
  aus_adresse     text,

  -- Meta
  status          text default 'aktiv',   -- aktiv | pause | abgeschlossen
  notiz           text,
  created_at      timestamptz default now()
);

create index if not exists zeitbuchungen_profil_idx   on zeitbuchungen(profil_id);
create index if not exists zeitbuchungen_projekt_idx  on zeitbuchungen(projekt_id);
create index if not exists zeitbuchungen_datum_idx    on zeitbuchungen(eingestempelt_at desc);

-- ─── 5. VIEW: Tagesstunden pro Mitarbeiter ────────────────────────────────
create or replace view tagesstunden as
select
  z.profil_id,
  p.vorname || ' ' || p.nachname          as name,
  p.rolle,
  z.projekt_id,
  pr.name                                  as projekt_name,
  date(z.eingestempelt_at)                 as datum,
  count(*)                                 as buchungen,
  sum(z.netto_minuten)                     as minuten_gesamt,
  round(sum(z.netto_minuten)::numeric / 60, 2) as stunden_gesamt,
  min(z.eingestempelt_at)                  as erste_buchung,
  max(z.ausgestempelt_at)                  as letzte_buchung
from zeitbuchungen z
join profile p   on p.id = z.profil_id
join projekte pr on pr.id = z.projekt_id
where z.status = 'abgeschlossen'
group by z.profil_id, p.vorname, p.nachname, p.rolle,
         z.projekt_id, pr.name, date(z.eingestempelt_at);

-- ─── 6. RLS POLICIES ─────────────────────────────────────────────────────
alter table profile          enable row level security;
alter table projekt_zugriff  enable row level security;
alter table zeitbuchungen    enable row level security;

-- Helper: aktuelle Rolle des eingeloggten Nutzers
create or replace function eigene_rolle()
returns user_rolle language sql security definer as $$
  select rolle from profile where id = auth.uid();
$$;

-- Helper: hat Zugriff auf Projekt?
create or replace function hat_projekt_zugriff(pid int)
returns boolean language sql security definer as $$
  select exists (
    select 1 from projekt_zugriff
    where profil_id = auth.uid() and projekt_id = pid
  ) or eigene_rolle() in ('administrator', 'bauleiter');
$$;

-- Profile: jeder sieht nur sich selbst (außer Admin + Bauleiter)
create policy "profile_eigenes" on profile
  for select using (
    id = auth.uid() or
    eigene_rolle() in ('administrator', 'bauleiter', 'polier')
  );
create policy "profile_update_own" on profile
  for update using (id = auth.uid());
create policy "profile_admin_all" on profile
  for all using (eigene_rolle() = 'administrator');

-- Projekte: nur mit Zugriff
create policy "projekte_zugriff" on projekte
  for select using (hat_projekt_zugriff(id));
create policy "projekte_schreiben" on projekte
  for insert with check (eigene_rolle() in ('administrator','polier'));
create policy "projekte_bearbeiten" on projekte
  for update using (
    eigene_rolle() in ('administrator','polier') and hat_projekt_zugriff(id)
  );

-- Betonfelder: Lesen für alle mit Projektzugriff, Schreiben nur Polier+
create policy "felder_lesen" on betonfelder
  for select using (hat_projekt_zugriff(projekt_id));
create policy "felder_schreiben" on betonfelder
  for all using (
    eigene_rolle() in ('administrator','polier','vorarbeiter') and
    hat_projekt_zugriff(projekt_id)
  );

-- Zeitbuchungen: jeder sieht nur seine eigenen (Polier/Admin alle)
create policy "zeiten_eigen" on zeitbuchungen
  for select using (
    profil_id = auth.uid() or
    eigene_rolle() in ('administrator','bauleiter','polier')
  );
create policy "zeiten_stempeln" on zeitbuchungen
  for insert with check (profil_id = auth.uid());
create policy "zeiten_update_eigen" on zeitbuchungen
  for update using (profil_id = auth.uid());

-- Tagesberichte: Bauleiter nur lesen
create policy "berichte_lesen" on tagesberichte
  for select using (hat_projekt_zugriff(projekt_id));
create policy "berichte_schreiben" on tagesberichte
  for all using (
    eigene_rolle() in ('administrator','polier','vorarbeiter') and
    hat_projekt_zugriff(projekt_id)
  );

-- ─── 7. SEED: Erster Admin-Nutzer (nach Supabase Auth-Registrierung) ──────
-- Nach dem ersten Login ausführen und UUID ersetzen:
-- insert into profile (id, vorname, nachname, rolle)
-- values ('DEINE-AUTH-UUID', 'Luca', 'Koeven', 'administrator');
