-- Drag-and-drop reorder needs to move an item to an arbitrary position, not
-- just swap with a neighbor (reorder_module only swaps adjacent rows).
-- These RPCs take the full ordered id list from the client and reassign
-- sort_order = position in that list, atomically, after validating the
-- list is exactly the current set of rows for that parent (no silent drop
-- or duplicate of an id).

create or replace function set_module_order(p_course uuid, p_ordered_ids uuid[])
returns void as $$
declare
  v_count int;
begin
  if not (is_manager() or is_hanbee_staff()) then
    raise exception 'only Hanbee staff may reorder course modules';
  end if;

  perform 1 from modules where course_id = p_course for update;
  select count(*) into v_count from modules where course_id = p_course;
  if v_count <> array_length(p_ordered_ids, 1) then
    raise exception 'the given order does not match this course''s modules';
  end if;
  if exists (
    select 1 from unnest(p_ordered_ids) id
    where not exists (select 1 from modules m where m.id = id and m.course_id = p_course)
  ) then
    raise exception 'the given order contains a module that does not belong to this course';
  end if;

  update modules set sort_order = t.pos - 1
  from (select id, row_number() over () as pos from unnest(p_ordered_ids) as id) as t
  where modules.id = t.id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function set_lesson_order(p_module uuid, p_ordered_ids uuid[])
returns void as $$
declare
  v_count int;
begin
  if not (is_manager() or is_hanbee_staff()) then
    raise exception 'only Hanbee staff may reorder lessons';
  end if;

  perform 1 from lessons where module_id = p_module for update;
  select count(*) into v_count from lessons where module_id = p_module;
  if v_count <> array_length(p_ordered_ids, 1) then
    raise exception 'the given order does not match this module''s lessons';
  end if;
  if exists (
    select 1 from unnest(p_ordered_ids) id
    where not exists (select 1 from lessons l where l.id = id and l.module_id = p_module)
  ) then
    raise exception 'the given order contains a lesson that does not belong to this module';
  end if;

  update lessons set sort_order = t.pos - 1
  from (select id, row_number() over () as pos from unnest(p_ordered_ids) as id) as t
  where lessons.id = t.id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function set_module_order(uuid, uuid[]) from public, anon;
grant execute on function set_module_order(uuid, uuid[]) to authenticated;
revoke all on function set_lesson_order(uuid, uuid[]) from public, anon;
grant execute on function set_lesson_order(uuid, uuid[]) to authenticated;
