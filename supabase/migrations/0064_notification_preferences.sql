-- Per-student on/off choice for each notification kind. A student who has
-- switched a kind off gets no notification of that kind. Missing rows mean on.

create table if not exists notification_preferences (
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table notification_preferences enable row level security;

drop policy if exists "a user reads their own notification preferences" on notification_preferences;
create policy "a user reads their own notification preferences"
  on notification_preferences for select
  using (user_id = auth.uid());

drop policy if exists "a user changes their own notification preferences" on notification_preferences;
create policy "a user changes their own notification preferences"
  on notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function create_notification(p_user uuid, p_kind text, p_title text, p_body text default null, p_link text default null)
returns void as $$
  insert into public.notifications (user_id, kind, title, body, link_to)
  select p_user, p_kind, p_title, p_body, p_link
  where p_user is not null
    and not exists (
      select 1 from public.notification_preferences np
      where np.user_id = p_user and np.kind = p_kind and np.enabled = false
    );
$$ language sql security definer set search_path = public;

revoke all on function create_notification(uuid, text, text, text, text) from public, anon, authenticated;
