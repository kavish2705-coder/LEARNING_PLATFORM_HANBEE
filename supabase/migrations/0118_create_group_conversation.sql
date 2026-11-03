-- Closes the last item from the audit sweep: there was no way for anyone
-- (independent students especially, since they have no school/team to
-- auto-provision a group chat for them) to start a group conversation on
-- their own -- every group chat only ever existed as a side effect of
-- team formation (team_chat_create trigger) or a school roster
-- (chat_ensure_school_group). This adds a direct, user-initiated path.
--
-- Gated the same way chat_contacts() already is: every invited member
-- must have a non-null chat_relation_dir(creator, member) -- i.e. you can
-- only start a group with people you could already direct-message. No new
-- permission surface; this just lets the same allowed pairs organize into
-- a group instead of only 1:1.

create or replace function create_group_conversation(p_title text, p_member_ids uuid[])
returns uuid as $$
declare
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_conv uuid;
  v_member uuid;
  v_added int := 0;
begin
  if auth.uid() is null or not is_active_account() then
    raise exception 'not allowed';
  end if;
  if v_title is null or length(v_title) > 60 then
    raise exception 'give the group a name of up to 60 characters';
  end if;
  if p_member_ids is null or cardinality(p_member_ids) = 0 then
    raise exception 'add at least one other person to the group';
  end if;
  if cardinality(p_member_ids) > 30 then
    raise exception 'a group can have at most 30 other members';
  end if;

  foreach v_member in array p_member_ids loop
    if v_member <> auth.uid() and chat_relation_dir(auth.uid(), v_member) is null then
      raise exception 'you are not allowed to add this person to a group';
    end if;
  end loop;

  insert into conversations (kind, title, created_by)
  values ('group', v_title, auth.uid())
  returning id into v_conv;

  insert into conversation_participants (conversation_id, user_id, member_role)
  values (v_conv, auth.uid(), 'admin'::chat_member_role)
  on conflict do nothing;

  foreach v_member in array p_member_ids loop
    if v_member <> auth.uid() then
      insert into conversation_participants (conversation_id, user_id, member_role)
      values (v_conv, v_member, 'member'::chat_member_role)
      on conflict do nothing;
      v_added := v_added + 1;
    end if;
  end loop;

  perform chat_post_system(v_conv, auth.uid(), 'Group created');
  perform log_audit('create_group_conversation', 'conversation', v_conv, jsonb_build_object('member_count', v_added + 1));
  return v_conv;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function create_group_conversation(text, uuid[]) from public, anon;
grant execute on function create_group_conversation(text, uuid[]) to authenticated;
