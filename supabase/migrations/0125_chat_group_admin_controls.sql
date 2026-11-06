-- WhatsApp-style group admin controls for user-created groups.
--
-- Root cause fixed here: chat_can_manage() (0026) only ever returned true
-- for a manager/Hanbee staff, or for a school's auto-provisioned org
-- group. A user-created ad-hoc group (create_group_conversation, 0118) has
-- org_id = null, so its own creator -- despite being stored as
-- member_role = 'admin' -- could never pass chat_can_manage() and
-- therefore could never add/remove members, rename, or delete the group
-- they made. This adds the missing branch, plus the rename/delete/leave/
-- promote actions a real admin needs, scoped so the always-on school and
-- manager-provisioned groups stay system-managed (never deletable, never
-- renamable by a member).

create or replace function chat_can_manage(p_conv uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare c conversations;
begin
  if auth.uid() is null or not is_active_account() then return false; end if;
  select * into c from conversations where id = p_conv;
  if c.id is null or c.kind <> 'group' then return false; end if;
  if is_manager() or is_hanbee_staff() then return true; end if;
  if c.org_id is not null then
    return can_manage_org(c.org_id)
      and exists (select 1 from conversation_participants where conversation_id = p_conv and user_id = auth.uid() and member_role = 'admin');
  end if;
  -- Ad-hoc, user-created group: any of its own admins can manage it.
  return exists (select 1 from conversation_participants where conversation_id = p_conv and user_id = auth.uid() and member_role = 'admin');
end;
$$;

-- Rename a group. Allowed on any group chat_can_manage() already grants
-- management of (ad-hoc admin, school admin, manager/staff) -- renaming an
-- auto-provisioned school/manager group is no more dangerous than the
-- add/remove rights those roles already had over it.
create or replace function chat_rename_group(p_conversation_id uuid, p_title text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_old text;
begin
  if not chat_can_manage(p_conversation_id) then raise exception 'not allowed'; end if;
  if v_title is null or length(v_title) > 60 then
    raise exception 'give the group a name of up to 60 characters';
  end if;
  select title into v_old from conversations where id = p_conversation_id;
  update conversations set title = v_title where id = p_conversation_id;
  if v_old is distinct from v_title then
    perform chat_post_system(p_conversation_id, auth.uid(), 'Group renamed to "' || v_title || '"');
  end if;
  return true;
end;
$$;

-- Delete (disband) a group entirely -- messages and participant rows
-- cascade. Deliberately restricted to ad-hoc groups only (org_id is
-- null): deleting a school's or manager's auto-provisioned group would
-- just have it silently recreated by chat_ensure_school_group /
-- provision_manager_chats on the next membership change, which would be a
-- confusing, half-working "delete" -- so that case is refused outright
-- rather than offered and not really working.
create or replace function chat_delete_group(p_conversation_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare c conversations;
begin
  if not chat_can_manage(p_conversation_id) then raise exception 'not allowed'; end if;
  select * into c from conversations where id = p_conversation_id;
  if c.org_id is not null then
    raise exception 'this group is managed automatically and cannot be deleted';
  end if;
  delete from conversations where id = p_conversation_id;
  return true;
end;
$$;

-- Promote/demote a member within a group. Mirrors chat_remove_member's
-- "school owner always stays admin" guard, and additionally refuses to
-- leave a group with zero admins (so a group can never end up in a state
-- nobody can manage).
create or replace function chat_set_member_role(p_conversation_id uuid, p_user_id uuid, p_role chat_member_role) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  c conversations;
  v_name text;
  v_admin_count int;
  n int;
begin
  if not chat_can_manage(p_conversation_id) then raise exception 'not allowed'; end if;
  select * into c from conversations where id = p_conversation_id;
  if p_role = 'member' and exists (
    select 1 from organization_members m where m.org_id = c.org_id and m.user_id = p_user_id
      and m.status = 'active' and m.member_role = 'owner'
  ) then
    raise exception 'the school owner cannot be demoted in the school group';
  end if;
  if p_role = 'member' then
    select count(*) into v_admin_count from conversation_participants
      where conversation_id = p_conversation_id and member_role = 'admin' and user_id <> p_user_id;
    if v_admin_count = 0 then raise exception 'a group needs at least one admin'; end if;
  end if;
  update conversation_participants set member_role = p_role
    where conversation_id = p_conversation_id and user_id = p_user_id;
  get diagnostics n = row_count;
  if n > 0 then
    select full_name into v_name from profiles where id = p_user_id;
    perform chat_post_system(p_conversation_id, p_user_id,
      coalesce(v_name, 'Someone') || (case when p_role = 'admin' then ' is now an admin' else ' is no longer an admin' end));
  end if;
  return n > 0;
end;
$$;

-- Leave a group under your own steam (chat_remove_member requires
-- chat_can_manage, which a plain member of someone else's ad-hoc group --
-- or any non-admin -- never has; this needs no management right, only
-- membership). Reuses the "school owner can't leave the school group"
-- guard, and auto-promotes the longest-standing remaining member if
-- leaving would otherwise empty the group of admins.
create or replace function chat_leave_group(p_conversation_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  c conversations;
  v_name text;
  v_was_admin boolean;
  v_remaining_admins int;
  v_promote uuid;
  n int;
begin
  if auth.uid() is null or not is_active_account() then raise exception 'not allowed'; end if;
  select * into c from conversations where id = p_conversation_id and kind = 'group';
  if c.id is null then raise exception 'not a group conversation'; end if;
  if exists (select 1 from organization_members m where m.org_id = c.org_id and m.user_id = auth.uid()
             and m.status = 'active' and m.member_role = 'owner') then
    raise exception 'the school owner cannot leave the school group';
  end if;

  select member_role = 'admin' into v_was_admin from conversation_participants
    where conversation_id = p_conversation_id and user_id = auth.uid();

  delete from conversation_participants where conversation_id = p_conversation_id and user_id = auth.uid();
  get diagnostics n = row_count;
  if n = 0 then return false; end if;

  if v_was_admin then
    select count(*) into v_remaining_admins from conversation_participants
      where conversation_id = p_conversation_id and member_role = 'admin';
    if v_remaining_admins = 0 then
      select user_id into v_promote from conversation_participants
        where conversation_id = p_conversation_id order by joined_at asc limit 1;
      if v_promote is not null then
        update conversation_participants set member_role = 'admin'
          where conversation_id = p_conversation_id and user_id = v_promote;
        select full_name into v_name from profiles where id = v_promote;
        perform chat_post_system(p_conversation_id, v_promote, coalesce(v_name, 'Someone') || ' is now an admin');
      end if;
    end if;
  end if;

  select full_name into v_name from profiles where id = auth.uid();
  perform chat_post_system(p_conversation_id, auth.uid(), coalesce(v_name, 'Someone') || ' left');
  return true;
end;
$$;

revoke all on function chat_rename_group(uuid, text), chat_delete_group(uuid), chat_set_member_role(uuid, uuid, chat_member_role), chat_leave_group(uuid)
  from public, anon;
grant execute on function chat_rename_group(uuid, text), chat_delete_group(uuid), chat_set_member_role(uuid, uuid, chat_member_role), chat_leave_group(uuid)
  to authenticated;
