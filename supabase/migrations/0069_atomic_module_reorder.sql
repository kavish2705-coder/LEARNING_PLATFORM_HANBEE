-- The course editor's "move module up/down" did two sequential client-side
-- PATCH calls to swap sort_order between two rows. If the second call
-- failed after the first succeeded (network blip, or two staff editing the
-- same course at once), both modules could end up with the same
-- sort_order - silently wrong lesson order for students, no error shown.
-- Do the swap as one atomic RPC instead.

create or replace function reorder_module(p_module uuid, p_direction text)
returns void as $$
declare
  current_mod modules;
  swap_mod modules;
begin
  if not (is_manager() or is_hanbee_staff()) then
    raise exception 'only Hanbee staff may reorder course modules';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'direction must be up or down';
  end if;

  select * into current_mod from modules where id = p_module for update;
  if current_mod.id is null then raise exception 'module not found'; end if;

  if p_direction = 'up' then
    select * into swap_mod from modules
      where course_id = current_mod.course_id and sort_order < current_mod.sort_order
      order by sort_order desc limit 1 for update;
  else
    select * into swap_mod from modules
      where course_id = current_mod.course_id and sort_order > current_mod.sort_order
      order by sort_order asc limit 1 for update;
  end if;

  if swap_mod.id is null then
    -- Already at the top/bottom; nothing to do, not an error.
    return;
  end if;

  update modules set sort_order = swap_mod.sort_order where id = current_mod.id;
  update modules set sort_order = current_mod.sort_order where id = swap_mod.id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function reorder_module(uuid, text) from public, anon;
grant execute on function reorder_module(uuid, text) to authenticated;
