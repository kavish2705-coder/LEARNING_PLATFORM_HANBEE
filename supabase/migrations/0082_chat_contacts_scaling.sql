-- chat_contacts() scaling fix (flagged 2026-10-16 while reviewing the new
-- Solo/Group chat tabs). The previous version called chat_relation_dir()
-- once for EVERY row in `profiles`, platform-wide, with no pre-filter --
-- it only discarded the non-matches after computing them all. Harmless at
-- today's scale; would add real, linearly-growing latency to every chat
-- page load and every "start a conversation" click as the student count
-- grows, since nothing pruned candidates before the per-row check.
--
-- This restores the exact same final answer -- chat_relation_dir() still
-- runs and is still the sole source of truth for whether a pair may
-- actually message -- but only ever runs it against a small, indexed
-- candidate set instead of the whole platform:
--   - manager (at most one account, ever, per migration 0048): keeps the
--     full scan. A manager can legitimately reach almost everyone, so
--     there is no meaningful candidate set to prune, and there is only
--     ever one such caller.
--   - staff / school_staff / student: every relation chat_relation_dir can
--     return for these roles is bounded to a small, indexable set -- the
--     (at most one) manager, approved Hanbee staff, the caller's own
--     active org-mates, and (for Hanbee staff specifically) students
--     enrolled in a course the caller owns. Unioned together via the
--     existing indexes (organization_members(user_id) where status =
--     'active', organization_members(org_id, status), courses_owner_id_idx,
--     sections_course_id_idx, and enrollments' own unique(section_id,
--     student_id) constraint) instead of scanning every profile.
--     chat_relation_dir() is intentionally still called on every candidate
--     here -- this only narrows which rows reach it, it does not replace
--     or loosen the actual permission check.

create or replace function chat_contacts()
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
      order by p.full_name;
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
  order by p.full_name;
end;
$$;
