-- ═══════════════════════════════════════════════════════════════════════════
-- POLARIS SaaS – Multi-Tenant Schema
-- Ausführen NACH supabase-setup.sql und supabase-auth-rollen.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. FIRMEN (Tenants) ──────────────────────────────────────────────────
create table if not exists firmen (
  id              serial primary key,
  name            text not null,
  slug            text unique not null,     -- URL-freundlicher Name z.B. "koeven-bau"
  logo_url        text,
  adresse         text,
  plz             text,
  ort             text,
  telefon         text,
  email           text,
  steuernummer    text,

  -- Subscription
  plan            text not null default 'trial',  -- trial | starter | pro | enterprise
  plan_status     text not null default 'active', -- active | past_due | cancelled | expired
  trial_ends_at   timestamptz default (now() + interval '14 days'),
  plan_ends_at    timestamptz,

  -- Stripe
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,

  -- Limits je nach Plan
  max_projekte    int default 3,
  max_nutzer      int default 5,
  max_storage_gb  numeric(6,2) default 1.0,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger firmen_updated_at
  before update on firmen
  for each row execute function update_updated_at();

-- ─── 2. PLAN-DEFINITIONEN ─────────────────────────────────────────────────
create table if not exists plan_config (
  plan            text primary key,
  label           text,
  preis_monat     numeric(8,2),
  max_projekte    int,
  max_nutzer      int,
  max_storage_gb  numeric(6,2),
  features        jsonb default '[]'
);

insert into plan_config values
  ('trial',      'Testversion',  0,     3,   5,   1.0,  '["basis"]'),
  ('starter',    'Starter',      49,    5,   10,  5.0,  '["basis","pdf","ki"]'),
  ('pro',        'Pro',          99,    20,  50,  25.0, '["basis","pdf","ki","api","push"]'),
  ('enterprise', 'Enterprise',   null,  null,null, null, '["alle"]')
on conflict do nothing;

-- ─── 3. firma_id IN ALLE BESTEHENDEN TABELLEN ────────────────────────────
alter table projekte       add column if not exists firma_id int references firmen(id) on delete cascade;
alter table betonfelder    add column if not exists firma_id int references firmen(id) on delete cascade;
alter table tagesberichte  add column if not exists firma_id int references firmen(id) on delete cascade;
alter table kolonnen       add column if not exists firma_id int references firmen(id) on delete cascade;
alter table mitarbeiter    add column if not exists firma_id int references firmen(id) on delete cascade;
alter table subunternehmer add column if not exists firma_id int references firmen(id) on delete cascade;
alter table zeitbuchungen  add column if not exists firma_id int references firmen(id) on delete cascade;
alter table profile        add column if not exists firma_id int references firmen(id);

-- Indizes für Performance
create index if not exists projekte_firma_idx       on projekte(firma_id);
create index if not exists betonfelder_firma_idx    on betonfelder(firma_id);
create index if not exists tagesberichte_firma_idx  on tagesberichte(firma_id);
create index if not exists kolonnen_firma_idx       on kolonnen(firma_id);
create index if not exists zeitbuchungen_firma_idx  on zeitbuchungen(firma_id);

-- ─── 4. EINLADUNGEN ───────────────────────────────────────────────────────
create table if not exists einladungen (
  id              serial primary key,
  firma_id        int not null references firmen(id) on delete cascade,
  token           text unique not null default gen_random_uuid()::text,
  email           text,                    -- optional: vorausgefüllte E-Mail
  rolle           user_rolle not null default 'facharbeiter',
  kolonne_id      int references kolonnen(id),
  erstellt_von    uuid references profile(id),
  eingelöst_von   uuid references profile(id),
  eingelöst_at    timestamptz,
  läuft_ab_at     timestamptz default (now() + interval '7 days'),
  max_nutzungen   int default 1,           -- 1 = Einzeleinladung, null = unbegrenzt
  nutzungen       int default 0,
  aktiv           boolean default true,
  created_at      timestamptz default now()
);

create index if not exists einladungen_token_idx   on einladungen(token);
create index if not exists einladungen_firma_idx   on einladungen(firma_id);

-- ─── 5. AUDIT LOG ─────────────────────────────────────────────────────────
create table if not exists audit_log (
  id          bigserial primary key,
  firma_id    int references firmen(id),
  profil_id   uuid references profile(id),
  aktion      text not null,   -- z.B. "projekt.erstellt", "nutzer.eingeladen"
  objekt_typ  text,
  objekt_id   text,
  details     jsonb,
  ip_adresse  text,
  created_at  timestamptz default now()
);

create index if not exists audit_log_firma_idx on audit_log(firma_id, created_at desc);

-- ─── 6. HELPER FUNCTIONS ──────────────────────────────────────────────────

-- Gibt firma_id des eingeloggten Nutzers zurück
create or replace function eigene_firma_id()
returns int language sql security definer stable as $$
  select firma_id from profile where id = auth.uid();
$$;

-- Prüft ob Plan-Limit erreicht
create or replace function plan_limit_ok(ressource text)
returns boolean language plpgsql security definer as $$
declare
  f firmen%rowtype;
  anzahl int;
begin
  select * into f from firmen where id = eigene_firma_id();
  if not found then return false; end if;

  if ressource = 'projekte' then
    select count(*) into anzahl from projekte where firma_id = f.id;
    return f.max_projekte is null or anzahl < f.max_projekte;
  elsif ressource = 'nutzer' then
    select count(*) into anzahl from profile where firma_id = f.id and aktiv = true;
    return f.max_nutzer is null or anzahl < f.max_nutzer;
  end if;
  return true;
end;
$$;

-- ─── 7. RLS – MULTI-TENANT POLICIES ──────────────────────────────────────
-- Alle alten Policies droppen und neu setzen mit firma_id

-- Projekte
drop policy if exists "anon_all_projekte"      on projekte;
drop policy if exists "projekte_zugriff"        on projekte;
drop policy if exists "projekte_schreiben"      on projekte;
drop policy if exists "projekte_bearbeiten"     on projekte;

create policy "projekte_tenant" on projekte
  for all using (firma_id = eigene_firma_id())
  with check (firma_id = eigene_firma_id());

-- Betonfelder
drop policy if exists "anon_all_betonfelder"   on betonfelder;
drop policy if exists "felder_lesen"            on betonfelder;
drop policy if exists "felder_schreiben"        on betonfelder;

create policy "felder_tenant" on betonfelder
  for all using (firma_id = eigene_firma_id())
  with check (firma_id = eigene_firma_id());

-- Tagesberichte
drop policy if exists "anon_all_tagesberichte" on tagesberichte;
drop policy if exists "berichte_lesen"          on tagesberichte;
drop policy if exists "berichte_schreiben"      on tagesberichte;

create policy "berichte_tenant" on tagesberichte
  for all using (firma_id = eigene_firma_id())
  with check (firma_id = eigene_firma_id());

-- Kolonnen
drop policy if exists "anon_all_kolonnen"      on kolonnen;
create policy "kolonnen_tenant" on kolonnen
  for all using (firma_id = eigene_firma_id())
  with check (firma_id = eigene_firma_id());

-- Mitarbeiter
drop policy if exists "anon_all_mitarbeiter"   on mitarbeiter;
create policy "mitarbeiter_tenant" on mitarbeiter
  for all using (firma_id = eigene_firma_id())
  with check (firma_id = eigene_firma_id());

-- Zeitbuchungen
drop policy if exists "zeiten_eigen"           on zeitbuchungen;
drop policy if exists "zeiten_stempeln"        on zeitbuchungen;
drop policy if exists "zeiten_update_eigen"    on zeitbuchungen;

create policy "zeiten_tenant_lesen" on zeitbuchungen
  for select using (
    firma_id = eigene_firma_id() and (
      profil_id = auth.uid() or
      eigene_rolle() in ('administrator','bauleiter','polier')
    )
  );
create policy "zeiten_tenant_schreiben" on zeitbuchungen
  for insert with check (
    firma_id = eigene_firma_id() and profil_id = auth.uid()
  );
create policy "zeiten_tenant_update" on zeitbuchungen
  for update using (
    firma_id = eigene_firma_id() and profil_id = auth.uid()
  );

-- Firmen: jeder sieht nur seine eigene
alter table firmen enable row level security;
create policy "firmen_eigen" on firmen
  for select using (id = eigene_firma_id());
create policy "firmen_admin_update" on firmen
  for update using (
    id = eigene_firma_id() and eigene_rolle() = 'administrator'
  );

-- Einladungen
alter table einladungen enable row level security;
create policy "einladungen_admin" on einladungen
  for all using (
    firma_id = eigene_firma_id() and
    eigene_rolle() in ('administrator','polier')
  );
-- Token-Lookup ohne Auth (für Einladungsflow)
create policy "einladungen_token_lookup" on einladungen
  for select using (aktiv = true and läuft_ab_at > now());

-- ─── 8. STRIPE WEBHOOK HELPER ─────────────────────────────────────────────
-- Wird von Supabase Edge Function aufgerufen
create or replace function update_subscription(
  p_stripe_customer_id text,
  p_plan text,
  p_status text,
  p_ends_at timestamptz
) returns void language plpgsql security definer as $$
begin
  update firmen set
    plan = p_plan,
    plan_status = p_status,
    plan_ends_at = p_ends_at,
    max_projekte = (select max_projekte from plan_config where plan = p_plan),
    max_nutzer   = (select max_nutzer   from plan_config where plan = p_plan),
    updated_at   = now()
  where stripe_customer_id = p_stripe_customer_id;
end;
$$;

-- ─── 9. REGISTRIERUNGS-FLOW ───────────────────────────────────────────────
-- Wird von Edge Function nach Auth-Registrierung aufgerufen
create or replace function firma_registrieren(
  p_user_id    uuid,
  p_firma_name text,
  p_email      text
) returns int language plpgsql security definer as $$
declare
  v_firma_id int;
  v_slug     text;
begin
  -- Slug generieren
  v_slug := lower(regexp_replace(p_firma_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || floor(random()*9000+1000)::text;

  -- Firma anlegen
  insert into firmen (name, slug, email, plan, plan_status)
  values (p_firma_name, v_slug, p_email, 'trial', 'active')
  returning id into v_firma_id;

  -- Profil als Administrator anlegen
  insert into profile (id, rolle, firma_id)
  values (p_user_id, 'administrator', v_firma_id)
  on conflict (id) do update set
    rolle = 'administrator',
    firma_id = v_firma_id;

  -- Audit Log
  insert into audit_log (firma_id, profil_id, aktion, details)
  values (v_firma_id, p_user_id, 'firma.registriert',
    jsonb_build_object('firma_name', p_firma_name));

  return v_firma_id;
end;
$$;

-- ─── 10. EINLADUNGS-FLOW ──────────────────────────────────────────────────
create or replace function einladung_einloesen(
  p_token   text,
  p_user_id uuid
) returns jsonb language plpgsql security definer as $$
declare
  v_einladung einladungen%rowtype;
begin
  -- Token prüfen
  select * into v_einladung
  from einladungen
  where token = p_token
    and aktiv = true
    and läuft_ab_at > now()
    and (max_nutzungen is null or nutzungen < max_nutzungen);

  if not found then
    return jsonb_build_object('ok', false, 'fehler', 'Einladung ungültig oder abgelaufen');
  end if;

  -- Profil in Firma einschreiben
  insert into profile (id, rolle, firma_id, kolonne_id)
  values (p_user_id, v_einladung.rolle, v_einladung.firma_id, v_einladung.kolonne_id)
  on conflict (id) do update set
    rolle      = v_einladung.rolle,
    firma_id   = v_einladung.firma_id,
    kolonne_id = v_einladung.kolonne_id;

  -- Einladung als eingelöst markieren
  update einladungen set
    eingelöst_von = p_user_id,
    eingelöst_at  = now(),
    nutzungen     = nutzungen + 1,
    aktiv         = (max_nutzungen is null or nutzungen + 1 < max_nutzungen)
  where id = v_einladung.id;

  -- Audit Log
  insert into audit_log (firma_id, profil_id, aktion, details)
  values (v_einladung.firma_id, p_user_id, 'nutzer.eingeladen_eingeloest',
    jsonb_build_object('token', p_token, 'rolle', v_einladung.rolle));

  return jsonb_build_object(
    'ok', true,
    'firma_id', v_einladung.firma_id,
    'rolle', v_einladung.rolle
  );
end;
$$;
