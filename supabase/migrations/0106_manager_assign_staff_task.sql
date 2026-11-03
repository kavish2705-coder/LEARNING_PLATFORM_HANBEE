-- Manager -> staff task assignment. staff_tasks' existing RLS policies
-- (0002_rls.sql) require staff_id = auth.uid() on both insert and update --
-- a plain policy check with no app.trusted_portal_write trigger gate, so a
-- manager has no way to create a task owned by a different staff member at
-- all: the manager tasks screen could only ever create tasks for the
-- manager's own account. This adds a SECURITY DEFINER RPC, which bypasses
-- RLS by running as the table owner (no trust-flag needed since this
-- table's policies don't check one).

create or replace function manager_assign_staff_task(
  p_staff uuid,
  p_title text,
  p_description text default '',
  p_priority text default 'medium',
  p_due_date date default null
)
returns uuid as $$
declare
  v_id uuid;
begin
  if not is_manager() then
    raise exception 'only the manager can assign a task to staff';
  end if;
  if p_priority not in ('low', 'medium', 'high') then
    raise exception 'priority must be low, medium, or high';
  end if;
  if length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'a task title is required';
  end if;
  if not exists (select 1 from profiles where id = p_staff and role = 'staff' and approved) then
    raise exception 'the selected staff member was not found';
  end if;

  insert into staff_tasks (staff_id, title, description, priority, due_date, status)
  values (p_staff, trim(p_title), coalesce(trim(p_description), ''), p_priority::task_priority, p_due_date, 'todo')
  returning id into v_id;

  perform log_audit('manager_assign_staff_task', 'staff_task', v_id, jsonb_build_object('staff_id', p_staff, 'title', p_title));
  perform create_notification(p_staff, 'task_assigned', 'New task assigned', trim(p_title), '/dashboard/hanbee/my-space');

  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function manager_assign_staff_task(uuid, text, text, text, date) from public, anon;
grant execute on function manager_assign_staff_task(uuid, text, text, text, date) to authenticated;
