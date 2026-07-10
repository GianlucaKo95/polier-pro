-- ═══════════════════════════════════════════════════════════════════════════
-- POLARIS – Echte Datenpersistenz für Projekte, Aufgaben, Kolonnen,
-- Bautagebuch-Berichte und Zeitbuchungen.
--
-- WICHTIG: Ersetzt die veralteten Tabellen aus supabase-setup.sql
-- (betonfelder, tagesberichte alte Struktur) — diese passten nicht mehr
-- zur aktuellen App (AufgabenView mit ist_mangel-Flag statt eigenem
-- Mängel-Modul, TagesbuchView mit anderen Feldnamen, etc).
--
-- Multi-Tenant: alle Tabellen haben firma_id + RLS analog zu firmen/profile.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. PROJEKTE (Baustellen) ─────────────────────────────────────────────
create table if not exists projekte (
  id              bigint generated always as identity primary key,
  firma_id        int not null references firmen(id) on delete cascade,
  name            text not null,
  adresse         text default '',
  plz             text default '',
  ort             text default '',
  projektnummer   text default '',
  bauleiter       text default '',
  auftraggeber    text default '',
  typ             text default 'hochbau',
  farbe           text default '#F5C400',
  archiviert      boolean default false,
  erstellt_von    uuid references profile(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists projekte_firma_idx on projekte(firma_id);

-- ─── 2. AUFGABEN (inkl. Mängel via ist_mangel-Flag, inkl. Betonfelder-Daten) ──
create table if not exists aufgaben (
  id              bigint generated always as identity primary key,
  projekt_id      bigint not null references projekte(id) on delete cascade,
  titel           text not null,
  typ             text default 'allgemein',
  status          text default 'offen',
  prioritaet      text default 'mittel',
  faellig_am      date,
  zustaendig      text default '',
  beschreibung    text default '',
  fotos           jsonb default '[]',
  ist_mangel      boolean default false,
  mangel_verursacher text default '',
  plan_x          numeric,
  plan_y          numeric,
  plan_bild_url   text,
  -- Betonfeld-spezifische Felder
  m2              numeric default 0,
  betonsorte      text default '',
  festigkeit      int,
  -- Kosten-Zuordnung
  budget_pos      text default '',
  kolonne_id      bigint,
  erstellt_von    uuid references profile(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists aufgaben_projekt_idx on aufgaben(projekt_id);
create index if not exists aufgaben_mangel_idx  on aufgaben(projekt_id, ist_mangel) where ist_mangel = true;

-- ─── 3. KOLONNEN ───────────────────────────────────────────────────────────
create table if not exists kolonnen (
  id              bigint generated always as identity primary key,
  projekt_id      bigint not null references projekte(id) on delete cascade,
  name            text not null,
  vorarbeiter     text default '',
  mitarbeiter     jsonb default '[]',  -- [{id, name}] — kein eigener Account pro Mitarbeiter nötig
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists kolonnen_projekt_idx on kolonnen(projekt_id);

-- ─── 4. TAGESBERICHTE (Bautagebuch) ────────────────────────────────────────
create table if not exists tagesberichte (
  id              bigint generated always as identity primary key,
  projekt_id      bigint not null references projekte(id) on delete cascade,
  datum           date not null default current_date,
  wetter          text default '',
  wetter_data     jsonb,
  arbeiter        int default 0,
  taetigkeit      text default '',
  besonderheiten  text default '',
  material        text default '',
  maengel_anzahl  int default 0,
  bilder          jsonb default '[]',
  ki_generiert    boolean default false,
  unterschrift_polier    text,  -- Base64 oder Storage-URL
  unterschrift_bauleiter text,
  dokument_id     text,         -- für RevisionssichererExport
  erstellt_von    uuid references profile(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists tagesberichte_projekt_idx on tagesberichte(projekt_id);
create index if not exists tagesberichte_datum_idx   on tagesberichte(projekt_id, datum desc);

-- ─── 5. ZEITBUCHUNGEN (Stempeluhr) ─────────────────────────────────────────
create table if not exists zeitbuchungen (
  id                bigint generated always as identity primary key,
  profil_id         uuid references profile(id),  -- null bei Sammelbuchung ohne Account
  projekt_id        bigint not null references projekte(id) on delete cascade,
  kolonne_id        bigint references kolonnen(id) on delete set null,
  eingestempelt_at  timestamptz not null,
  ausgestempelt_at  timestamptz,
  ein_lat           numeric,
  ein_lng           numeric,
  ein_adresse       text,
  aus_lat           numeric,
  aus_lng           numeric,
  aus_adresse       text,
  pause_minuten     int default 0,
  netto_minuten     int,
  status            text default 'aktiv',  -- aktiv | pause | abgeschlossen
  taetigkeit        text default '',
  notiz             text default '',
  created_at        timestamptz default now()
);
create index if not exists zeitbuchungen_profil_idx  on zeitbuchungen(profil_id);
create index if not exists zeitbuchungen_projekt_idx on zeitbuchungen(projekt_id);
create index if not exists zeitbuchungen_datum_idx   on zeitbuchungen(eingestempelt_at desc);

-- ─── RLS aktivieren ─────────────────────────────────────────────────────────
alter table projekte       enable row level security;
alter table aufgaben       enable row level security;
alter table kolonnen       enable row level security;
alter table tagesberichte  enable row level security;
alter table zeitbuchungen  enable row level security;

-- ─── RLS Policies: Zugriff nur innerhalb der eigenen Firma ────────────────
-- Nutzt die bereits vorhandenen Helper-Funktionen eigene_firma_id() und
-- eigene_rolle() aus supabase-auth-rollen.sql / supabase-saas.sql.

create policy "projekte_firma" on projekte
  for all using (firma_id = eigene_firma_id());

create policy "aufgaben_firma" on aufgaben
  for all using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
  );

create policy "kolonnen_firma" on kolonnen
  for all using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
  );

create policy "tagesberichte_firma" on tagesberichte
  for all using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
  );

create policy "zeitbuchungen_firma" on zeitbuchungen
  for all using (
    projekt_id in (select id from projekte where firma_id = eigene_firma_id())
  );

-- ─── Trigger: updated_at automatisch aktualisieren ────────────────────────
-- update_updated_at() existiert bereits aus supabase-saas.sql
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'projekte_updated_at') then
    create trigger projekte_updated_at before update on projekte
      for each row execute function update_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'aufgaben_updated_at') then
    create trigger aufgaben_updated_at before update on aufgaben
      for each row execute function update_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'kolonnen_updated_at') then
    create trigger kolonnen_updated_at before update on kolonnen
      for each row execute function update_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'tagesberichte_updated_at') then
    create trigger tagesberichte_updated_at before update on tagesberichte
      for each row execute function update_updated_at();
  end if;
end $$;
