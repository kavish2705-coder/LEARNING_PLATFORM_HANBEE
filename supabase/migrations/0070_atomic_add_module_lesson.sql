-- The course editor computed the next sort_order client-side
-- (max(existing) + 1) before inserting a new module or lesson. Two staff
-- adding to the same course/module within the same moment could both read
-- the same max and insert with the same sort_order - no crash, but
-- silently nondeterministic lesson order for students. Lock the parent row
-- and compute the next order server-side, in the same transaction as the
-- insert.

create or replace function add_module(p_course uuid, p_title text)
returns uuid as $$
declare
  v_id uuid;
  v_next int;
begin
  if not (is_manager() or is_hanbee_staff()) then
    raise exception 'only Hanbee staff may add course modules';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'module title is required';
  end if;

  -- Lock the course row so a concurrent add_module on the same course waits.
  perform 1 from courses where id = p_course for update;

  select coalesce(max(sort_order), -1) + 1 into v_next from modules where course_id = p_course;
  insert into modules (course_id, title, sort_order) values (p_course, trim(p_title), v_next) returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function add_lesson(
  p_module uuid,
  p_title text,
  p_content_type content_type,
  p_published boolean,
  p_youtube_id text,
  p_external_url text
)
returns uuid as $$
declare
  v_id uuid;
  v_next int;
begin
  if not (is_manager() or is_hanbee_staff()) then
    raise exception 'only Hanbee staff may add lessons';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'lesson title is required';
  end if;

  -- Lock the module row so a concurrent add_lesson on the same module waits.
  perform 1 from modules where id = p_module for update;

  select coalesce(max(sort_order), -1) + 1 into v_next from lessons where module_id = p_module;
  insert into lessons (module_id, title, content_type, published, youtube_id, external_url, sort_order)
  values (p_module, trim(p_title), p_content_type, p_published, p_youtube_id, coalesce(p_external_url, ''), v_next)
  returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function add_module(uuid, text) from public, anon;
grant execute on function add_module(uuid, text) to authenticated;
revoke all on function add_lesson(uuid, text, content_type, boolean, text, text) from public, anon;
grant execute on function add_lesson(uuid, text, content_type, boolean, text, text) to authenticated;
