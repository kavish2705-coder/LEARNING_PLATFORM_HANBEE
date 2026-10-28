-- Task 5 (independent-student-pool plan): pool chat. Independent
-- ("road-kid") students, invited solo by Hanbee staff (0092), currently
-- cannot message each other at all -- chat_relation_dir() has no branch
-- that matches a pair of org_id-null student profiles. This adds:
--   1. A chat_relation_dir() branch: two independent students (is_solo,
--      org_id null, account_status active) may message each other.
--      Additive only -- every existing branch is untouched, in the same
--      order, so no existing relation can change.
--   2. pool_chat_conversation_id(): a single, lazily-created group
--      conversation shared by every independent student (the "pool chat"
--      lobby), distinct from the private per-team chats team_chat_create
--      (0093) already makes.
--   3. chat_contacts(p_limit, p_offset): paginated, with defaults that
--      keep every existing caller (frontend, other RPCs) working exactly
--      as before -- p_limit defaults to a large-enough number that no
--      current caller would ever have hit it, and the default omits any
--      offset.

-- ---------------------------------------------------------------------------
-- 1. chat_relation_dir(): additive branch for two independent students.
--    Per 0092, is_solo can now only become true via the staff-invite-and-
--    accept path (guard_profile_self_escalation blocks self-escalation),
--    so is_solo = true + org_id is null + account_status = 'active' is a
--    reliable, staff-controlled signal for "independent/pool student" --
--    not a bare org_id is null check. The existing account_status='active'
--    guard for both pa/pb (lines near the top of this function, unchanged)
--    already covers the "deactivated independent student" exclusion; this
--    branch adds nothing weaker than that.
-- ---------------------------------------------------------------------------
create or replace function chat_relation_dir(a uuid, b uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  pa profiles;
  pb profiles;
  a_org uuid; a_mrole org_member_role;
  b_org uuid; b_mrole org_member_role;
begin
  if a is null or b is null or a = b then return null; end if;
  select * into pa from profiles where id = a and account_status = 'active';
  select * into pb from profiles where id = b and account_status = 'active';
  if pa.id is null or pb.id is null then return null; end if;
  -- Hanbee staff take part only once approved.
  if (pa.role = 'staff' and not pa.approved) or (pb.role = 'staff' and not pb.approved) then return null; end if;

  select m.org_id, m.member_role into a_org, a_mrole
    from organization_members m join organizations o on o.id = m.org_id and o.status = 'active'
    where m.user_id = a and m.status = 'active' limit 1;
  select m.org_id, m.member_role into b_org, b_mrole
    from organization_members m join organizations o on o.id = m.org_id and o.status = 'active'
    where m.user_id = b and m.status = 'active' limit 1;

  if pa.role = 'manager' then
    if pb.role = 'manager' then return 'manager'; end if;
    if pb.role = 'staff' then return 'hanbee_staff'; end if;
    if pb.role = 'school_staff' then
      if b_org is null then return null; end if;
      return case when b_mrole = 'owner' then 'school_owner' else 'school_staff' end;
    end if;
    return 'student';

  elsif pa.role = 'staff' then
    if pb.role = 'manager' then return 'manager'; end if;
    if pb.role = 'staff' then return 'hanbee_staff'; end if;
    if pb.role = 'school_staff' then
      if b_org is not null and b_mrole = 'owner' then return 'school_owner'; end if;
      return null;
    end if;
    if pb.role = 'student' and exists (
      select 1 from enrollments e
      join sections s on s.id = e.section_id
      join courses c on c.id = s.course_id
      where e.student_id = b and c.owner_id = a and e.status in ('active', 'completed')
    ) then return 'student'; end if;
    return null;

  elsif pa.role = 'school_staff' then
    if a_org is null then return null; end if;
    if pb.role = 'manager' then return 'manager'; end if;
    if pb.role = 'staff' then return 'hanbee_staff'; end if;
    if pb.role = 'school_staff' and b_org = a_org then return 'colleague'; end if;
    if pb.role = 'student' and b_org = a_org and b_mrole = 'student' then return 'student'; end if;
    return null;

  elsif pa.role = 'student' then
    if pb.role = 'school_staff' and a_org is not null and b_org = a_org and b_mrole in ('owner', 'staff') then
      return 'school_staff';
    end if;
    if pb.role = 'staff' and exists (
      select 1 from enrollments e
      join sections s on s.id = e.section_id
      join courses c on c.id = s.course_id
      where e.student_id = a and c.owner_id = b and e.status in ('active', 'completed')
    ) then return 'instructor'; end if;
    -- New: two independent (pool) students may message each other.
    -- is_solo is the staff-controlled signal (0092); org_id is null is
    -- asserted too since it is intrinsic to "independent". A school
    -- student (a_org is not null, is_solo false) never reaches here.
    if pa.is_solo and a_org is null and pb.role = 'student' and pb.is_solo and b_org is null then
      return 'pool_student';
    end if;
    return null;
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. pool_chat_conversation_id(): the one global pool-chat lobby. Lazily
--    created on first access by any active, independent student; every
--    later caller gets the same row (advisory lock + re-check avoids a
--    duplicate-insert race, same pattern as chat_find_or_create_direct).
--    Membership is managed here, not by start_conversation_with/
--    chat_relation_dir (those govern 2-person directs only) -- this is a
--    standing group conversation, like the per-school groups (0026).
-- ---------------------------------------------------------------------------
create or replace function pool_chat_conversation_id() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  p profiles;
  conv uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into p from profiles where id = me and account_status = 'active';
  if p.id is null or not p.is_solo or exists (
    select 1 from organization_members m where m.user_id = me and m.status = 'active'
  ) then
    raise exception 'not allowed';
  end if;

  perform pg_advisory_xact_lock(hashtext('pool_chat_conversation'));
  select id into conv from conversations where kind = 'group' and org_id is null and title = 'Independent Students';
  if conv is null then
    insert into conversations (kind, title, org_id, created_by) values ('group', 'Independent Students', null, me)
    returning id into conv;
  end if;

  if not exists (select 1 from conversation_participants where conversation_id = conv and user_id = me) then
    insert into conversation_participants (conversation_id, user_id) values (conv, me);
  end if;
  return conv;
end;
$$;

revoke all on function pool_chat_conversation_id() from public, anon;
grant execute on function pool_chat_conversation_id() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. chat_contacts(p_limit, p_offset): same candidate-pruning logic as
--    0082, additionally paginated. Defaults (p_limit = 10000, p_offset =
--    0) are large enough that no existing caller -- which always called
--    chat_contacts() with no arguments -- observes any behavior change;
--    they simply keep getting the full set, now subject to a (practically
--    unreachable) upper bound.
-- ---------------------------------------------------------------------------
-- create or replace cannot change a function's parameter list; drop the old
-- 0-arg signature first (its only caller is the one we're replacing below).
drop function if exists chat_contacts();

create or replace function chat_contacts(p_limit int default 10000, p_offset int default 0)
returns table (user_id uuid, full_name text, role user_role, relation text, org_name text)
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_r user_role;
  my_org uuid;
begin
  if me is null or not is_active_account() then return; end if;
  select p.role into my_r from profiles p where p.id = me;
  my_org := my_org_id();

  if my_r = 'manager' then
    return query
      select p.id, p.full_name, p.role, r.rel, o.name
      from profiles p
      cross join lateral (select chat_relation_dir(me, p.id) as rel) r
      left join lateral (
        select org.name from organization_members m join organizations org on org.id = m.org_id
        where m.user_id = p.id and m.status = 'active' and org.status = 'active' limit 1
      ) o on true
      where p.id <> me and r.rel is not null
      order by p.full_name
      limit p_limit offset p_offset;
    return;
  end if;

  return query
  with candidates as (
    select p.id from profiles p where p.role = 'manager' and p.account_status = 'active'
    union
    select p.id from profiles p where p.role = 'staff' and p.approved and p.account_status = 'active'
    union
    -- Hanbee staff reach every school's OWNER, across every active org --
    -- they aren't a member of any org themselves, so this is deliberately
    -- NOT scoped to my_org (unlike the own-org branch below, which only
    -- ever matches when the caller is actually in an org -- a staff
    -- caller's my_org is always null, so this one is the only way staff
    -- see any school_staff candidates at all).
    select m.user_id from organization_members m
      join organizations o on o.id = m.org_id and o.status = 'active'
      join profiles p on p.id = m.user_id and p.account_status = 'active'
      where m.status = 'active' and m.member_role = 'owner' and my_r = 'staff' and p.role = 'school_staff'
    union
    -- Own-org school_staff/owners: needed by BOTH school_staff callers
    -- (colleague relation, any member_role) and student callers (owner/
    -- staff relation, chat_relation_dir re-validates the member_role
    -- restriction for students) -- not gated to one caller role.
    select m.user_id from organization_members m
      join organizations o on o.id = m.org_id and o.status = 'active'
      join profiles p on p.id = m.user_id and p.account_status = 'active'
      where m.status = 'active' and my_org is not null and m.org_id = my_org and p.role = 'school_staff'
    union
    select m.user_id from organization_members m
      join organizations o on o.id = m.org_id and o.status = 'active'
      join profiles p on p.id = m.user_id and p.account_status = 'active'
      where m.status = 'active' and my_org is not null and m.org_id = my_org and p.role = 'student'
    union
    select distinct e.student_id from enrollments e
      join sections s on s.id = e.section_id
      join courses c on c.id = s.course_id
      join profiles p on p.id = e.student_id and p.account_status = 'active'
      where c.owner_id = me and e.status in ('active', 'completed')
    union
    -- Independent students: candidate pool is every other active, solo,
    -- org_id-null student -- small enough on its own merits (bounded to
    -- the pool, never the whole platform) and chat_relation_dir() still
    -- re-validates the pair below, same as every other branch here.
    select p2.id from profiles p2
      where p2.role = 'student' and p2.is_solo and p2.account_status = 'active'
        and my_r = 'student' and exists (select 1 from profiles me_p where me_p.id = me and me_p.is_solo)
        and not exists (select 1 from organization_members m2 where m2.user_id = p2.id and m2.status = 'active')
  )
  select p.id, p.full_name, p.role, r.rel, o.name
  from candidates cand
  join profiles p on p.id = cand.id
  cross join lateral (select chat_relation_dir(me, p.id) as rel) r
  left join lateral (
    select org.name from organization_members m join organizations org on org.id = m.org_id
    where m.user_id = p.id and m.status = 'active' and org.status = 'active' limit 1
  ) o on true
  where p.id <> me and r.rel is not null
  order by p.full_name
  limit p_limit offset p_offset;
end;
$$;

revoke all on function chat_contacts(int, int) from public, anon;
grant execute on function chat_contacts(int, int) to authenticated;
