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

  -- Serialize with add_module(), which locks the parent course row.
  perform 1 from courses where id = p_course for update;
  perform 1 from modules where course_id = p_course for update;
  select count(*) into v_count from modules where course_id = p_course;
  if v_count <> coalesce(cardinality(p_ordered_ids), 0)
    or (select count(distinct requested.id) from unnest(p_ordered_ids) as requested(id)) <> v_count then
    raise exception 'the given order does not match this course''s modules';
  end if;
  if exists (
    select 1 from unnest(p_ordered_ids) as requested(id)
    where not exists (select 1 from modules m where m.id = requested.id and m.course_id = p_course)
  ) then
    raise exception 'the given order contains a module that does not belong to this course';
  end if;

  update modules set sort_order = t.pos - 1
  from (select id, ordinality as pos
    from unnest(p_ordered_ids) with ordinality as requested(id, ordinality)) as t
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

  -- Serialize with add_lesson(), which locks the parent module row.
  perform 1 from modules where id = p_module for update;
  perform 1 from lessons where module_id = p_module for update;
  select count(*) into v_count from lessons where module_id = p_module;
  if v_count <> coalesce(cardinality(p_ordered_ids), 0)
    or (select count(distinct requested.id) from unnest(p_ordered_ids) as requested(id)) <> v_count then
    raise exception 'the given order does not match this module''s lessons';
  end if;
  if exists (
    select 1 from unnest(p_ordered_ids) as requested(id)
    where not exists (select 1 from lessons l where l.id = requested.id and l.module_id = p_module)
  ) then
    raise exception 'the given order contains a lesson that does not belong to this module';
  end if;

  update lessons set sort_order = t.pos - 1
  from (select id, ordinality as pos
    from unnest(p_ordered_ids) with ordinality as requested(id, ordinality)) as t
  where lessons.id = t.id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function set_module_order(uuid, uuid[]) from public, anon;
grant execute on function set_module_order(uuid, uuid[]) to authenticated;
revoke all on function set_lesson_order(uuid, uuid[]) from public, anon;
grant execute on function set_lesson_order(uuid, uuid[]) to authenticated;
