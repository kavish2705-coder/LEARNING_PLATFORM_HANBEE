-- Team size is the maximum roster capacity, not a required roster count.
-- School team slots continue to control how many entries a school may submit.

update tournaments
set team_size = 5
where team_size > 5;

alter table tournaments
  drop constraint if exists tournaments_team_size_check,
  add constraint tournaments_team_size_check check (team_size between 2 and 5);

comment on column tournaments.team_size is
  'Maximum number of members in a team for this tournament (2-5); teams may apply with fewer members.';

create or replace function submit_team(p_team uuid)
returns void as $$
declare
  t tournament_teams;
  v_size int;
  v_member_count int;
  v_conv uuid;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or t.org_id is null or t.captain_id is distinct from auth.uid() then
    raise exception 'only the captain can submit the team';
  end if;
  if t.status <> 'draft' then raise exception 'this team has already been submitted'; end if;
  if not exists (select 1 from tournaments where id = t.tournament_id and status = 'upcoming') then
    raise exception 'this tournament is not open for teams';
  end if;

  select team_size into v_size from tournaments where id = t.tournament_id;
  select count(*) into v_member_count from tournament_team_members where team_id = p_team;
  if v_member_count < 1 or v_member_count > v_size then
    raise exception 'a team must have between 1 and % players before it can be submitted', v_size;
  end if;

  perform set_config('app.trusted_portal_write', 'true', true);
  update tournament_teams set status = 'proposed', submitted_at = now(), staff_note = '' where id = p_team;
  perform set_config('app.trusted_portal_write', '', true);
  update team_invitations set status = 'cancelled', decided_at = now() where team_id = p_team and status = 'pending';
  select id into v_conv from conversations where team_id = p_team;
  if v_conv is not null then
    perform chat_post_system(v_conv, auth.uid(), 'Team submitted to the school staff for approval');
  end if;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function apply_team(p_team uuid, p_payment_declared boolean)
returns void as $$
declare
  t tournament_teams;
  v_size int;
  v_member_count int;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or not can_run_team(t) then raise exception 'not allowed'; end if;
  if t.status not in ('draft', 'proposed') then raise exception 'this team has already applied'; end if;
  if not exists (select 1 from tournaments where id = t.tournament_id and status = 'upcoming') then
    raise exception 'this tournament is not open for applications';
  end if;

  select team_size into v_size from tournaments where id = t.tournament_id;
  select count(*) into v_member_count from tournament_team_members where team_id = p_team;
  if v_member_count < 1 or v_member_count > v_size then
    raise exception 'a team must have between 1 and % players to apply', v_size;
  end if;

  perform set_config('app.trusted_portal_write', 'true', true);
  update tournament_teams set
    status = case when coalesce(p_payment_declared, false) then 'payment_declared'::team_status else 'applied'::team_status end,
    payment_declared = coalesce(p_payment_declared, false)
  where id = p_team;
  perform set_config('app.trusted_portal_write', '', true);
  update team_invitations set status = 'cancelled', decided_at = now() where team_id = p_team and status = 'pending';
end;
$$ language plpgsql security definer set search_path = public;
