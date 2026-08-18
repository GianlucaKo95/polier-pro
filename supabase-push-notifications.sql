-- ═══════════════════════════════════════════════════════════════════════════
-- POLARIS – Echte Push-Benachrichtigungen (Server-Push statt nur lokal)
--
-- Einmalig NACH allen bisherigen Setup-/Fix-Skripten ausführen. Voraussetzung
-- für die eigentliche Zustellung ist zusätzlich die Edge Function
-- polier_pro/supabase/functions/send-push-reminders/ (siehe deren
-- Kopfkommentar für Deploy-Schritte) sowie ein per pg_cron geplanter Aufruf
-- (Beispiel ganz unten in diesem Skript).
--
-- Hintergrund: `pushAbonnieren()` in src/lib/push.js war zuvor toter Code
-- (nirgends aufgerufen) und nutzte außerdem den öffentlich bekannten
-- Demo-VAPID-Key aus einem Google-Tutorial statt eines echten, für dieses
-- Projekt generierten Schlüssels — echter Push war also unter keinen
-- Umständen möglich. Diese Migration legt die Server-Seite dafür an.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Push-Subscriptions ─────────────────────────────────────────────────
create table if not exists push_subscriptions (
  id          bigint generated always as identity primary key,
  profil_id   uuid not null references profile(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth_key    text not null,
  created_at  timestamptz default now()
);
create index if not exists push_subscriptions_profil_idx on push_subscriptions(profil_id);

alter table push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_own" on push_subscriptions;
create policy "push_subscriptions_own" on push_subscriptions
  for all using (profil_id = auth.uid())
  with check (profil_id = auth.uid());
-- Kein SELECT für andere Rollen nötig: die Edge Function liest über den
-- service_role-Key, der RLS grundsätzlich umgeht.

-- ─── 2. Dedupe-Log für die geplanten Erinnerungen ─────────────────────────
-- Verhindert, dass ein alle-15-Minuten-Cron dieselbe Erinnerung mehrfach an
-- einem Tag verschickt.
create table if not exists push_reminder_log (
  id           bigint generated always as identity primary key,
  reminder_typ text not null,
  tag          date not null default current_date,
  unique (reminder_typ, tag)
);
alter table push_reminder_log enable row level security;
-- Bewusst keine Policies: nur der service_role-Key (Edge Function) darf
-- zugreifen, alle anderen Rollen werden von RLS ohne jede Policy abgewiesen.

-- ─── 3. Optional: Cron-Trigger direkt in Postgres statt extern ───────────
-- Falls die pg_cron- und pg_net-Extensions im Supabase-Projekt aktiviert
-- sind (Dashboard → Database → Extensions), kann der Aufruf der Edge
-- Function auch direkt aus Postgres geplant werden, alle 15 Minuten:
--
-- select cron.schedule(
--   'send-push-reminders',
--   '*/15 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://DEIN-PROJEKT.supabase.co/functions/v1/send-push-reminders',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || 'DEIN-SERVICE-ROLE-KEY',
--       'Content-Type', 'application/json'
--     )
--   );
--   $$
-- );
--
-- Alternative ohne pg_cron: Ein externer Scheduler (GitHub Actions Cron,
-- cron-job.org, o.ä.) der alle 15 Minuten einen HTTP-POST auf die
-- Function-URL mit demselben Authorization-Header schickt.
