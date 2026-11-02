-- Keep completed tournament entry decisions visible to Hanbee staff.
-- The existing queue contract already returns each entry's status; widening
-- the query lets the UI show verified/rejected entries without exposing
-- write access or making another decision possible.

create or replace function public.tournament_application_queue()
returns table(
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
  payment_reference text,
  submitted_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (is_active_account() and is_staff_or_manager()) then
    raise exception 'only Hanbee staff or a manager can review tournament entries';
  end if;

  return query
    select t.id, t.tournament_id, tr.title, t.name, t.org_id, o.name,
           case when t.org_id is null then 'Independent Entry' else o.name end,
           p.full_name,
           (select count(*) from tournament_team_members m where m.team_id = t.id),
           t.status::text, t.payment_declared, t.payment_reference, t.submitted_at
    from tournament_teams t
    join tournaments tr on tr.id = t.tournament_id
    left join organizations o on o.id = t.org_id
    left join profiles p on p.id = t.captain_id
    where t.status in ('applied', 'payment_declared', 'verified', 'rejected')
    order by
      case when t.status in ('applied', 'payment_declared') then 0 else 1 end,
      t.submitted_at desc nulls last,
      t.created_at desc;
end;
$$;
