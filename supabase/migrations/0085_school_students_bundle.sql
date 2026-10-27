-- Consolidates the Students page's 3 sequential round trips (org_id lookup,
-- then join_token + students + invitations in parallel) into one call.
-- Reuses the existing, already-tested school_students(p_org) query via
-- row_to_json rather than duplicating its logic.

create or replace function school_students_bundle()
returns jsonb as $$
declare
  v_org uuid := my_org_id();
begin
  if v_org is null then raise exception 'Your account is not linked to an active school.'; end if;
  return jsonb_build_object(
    'org_id', v_org,
    'join_token', (select o.join_token from organizations o where o.id = v_org),
    'students', coalesce((select jsonb_agg(row_to_json(s)) from school_students(v_org) s), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(row_to_json(i))
      from (
        select id, email, token, expires_at, accepted, revoked_at
        from invitations
        where org_id = v_org and role = 'student'
        order by created_at desc
      ) i
    ), '[]'::jsonb)
  );
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function school_students_bundle() from public, anon;
grant execute on function school_students_bundle() to authenticated;
