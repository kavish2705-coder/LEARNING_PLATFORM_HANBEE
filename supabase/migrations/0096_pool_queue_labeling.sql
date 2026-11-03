-- Task 6 (independent-student-pool plan): queue labeling + rejection
-- notification verification.
--
-- (1) tournament_application_queue() gains a participant_label column so
--     Hanbee staff can tell a pool (independent) entry apart from a school
--     team in the review queue: 'Independent Entry' when org_id is null,
--     else the org's name.
--
-- (2) decide_team('rejected'): a school team's rejection notification
--     already goes to t.created_by, who for a school team is always the
--     captain who built/submitted it on behalf of the school -- adequate
--     as-is, and left completely untouched here (same create_notification
--     call, same args, same place in the function).
--
--     A pool (org_id is null) team has no such single point of contact --
--     every member is an independent student who joined of their own
--     accord, so a rejection must reach all of them, not just whoever
--     happened to call start_pool_team(). This adds an additional
--     create_notification() call, only on the p_decision = 'rejected' and
--     t.org_id is null path, to every *other* current
--     tournament_team_members row (created_by already gets the existing
--     notification immediately above, unchanged, so this loop excludes
--     them to avoid a duplicate). The 'verified' decision and the
--     org_id is not null (school) path are untouched.

drop function if exists tournament_application_queue();

create or replace function tournament_application_queue()
returns table (
  team_id uuid,
  tournament_id uuid,
  tournament_title text,
  team_name text,
  org_id uuid,
  school_name text,
  participant_label text,
  captain_name text,
  member_count bigint,
  status text,
  payment_declared boolean,
  submitted_at timestamptz
) as $$
begin
  if not (is_active_account() and is_staff_or_manager()) then
    raise exception 'only Hanbee staff or a manager can review tournament entries';
  end if;
  return query
    select t.id, t.tournament_id, tr.title, t.name, t.org_id, o.name,
           case when t.org_id is null then 'Independent Entry' else o.name end,
           p.full_name,
           (select count(*) from tournament_team_members m where m.team_id = t.id),
           t.status::text, t.payment_declared, t.submitted_at
    from tournament_teams t
    join tournaments tr on tr.id = t.tournament_id
    left join organizations o on o.id = t.org_id
    left join profiles p on p.id = t.captain_id
    where t.status in ('applied', 'payment_declared')
    order by t.submitted_at nulls last, t.created_at;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function decide_team(p_team uuid, p_decision text)
returns void as $$
declare
  t tournament_teams;
  v_member record;
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'only Hanbee staff may decide on a team'; end if;
  if p_decision not in ('verified', 'rejected') then raise exception 'decision must be verified or rejected'; end if;
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null then raise exception 'team not found'; end if;
  if t.status not in ('applied', 'payment_declared') then raise exception 'only an applied team can be decided'; end if;
  perform set_config('app.trusted_portal_write', 'true', true);
  update tournament_teams set status = p_decision::team_status, decided_by = auth.uid(), decided_at = now() where id = p_team;
  perform set_config('app.trusted_portal_write', '', true);
  perform log_audit('decide_team', 'tournament_team', p_team, jsonb_build_object('decision', p_decision));
  perform create_notification(t.created_by,
    case when p_decision = 'verified' then 'team_verified' else 'team_rejected' end,
    case when p_decision = 'verified' then 'Your team has been verified' else 'Your team application was rejected' end,
    t.name, '/dashboard/team');
  -- Pool team rejection: every other current member also gets notified
  -- (not just created_by, who was already notified just above). School
  -- teams and the 'verified' decision are unaffected.
  if p_decision = 'rejected' and t.org_id is null then
    for v_member in
      select student_id from tournament_team_members where team_id = p_team and student_id is distinct from t.created_by
    loop
      perform create_notification(v_member.student_id, 'team_rejected',
        'Your team application was rejected', t.name, '/dashboard/team');
    end loop;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function tournament_application_queue() from public, anon;
grant execute on function tournament_application_queue() to authenticated;
