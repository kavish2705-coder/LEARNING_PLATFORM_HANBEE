begin;

do $$
declare
  v_staff uuid;
  v_student uuid;
  v_other uuid;
  v_team uuid;
  v_tournament uuid;
  v_result_student uuid;
  v_result_tournament uuid;
  v_status jsonb;
  v_note text;
  v_items jsonb := jsonb_build_array(
    jsonb_build_object('key', 'chassis_bodywork', 'result', 'pass'),
    jsonb_build_object('key', 'wheels_tyres', 'result', 'fail', 'note', '0100 test failure'),
    jsonb_build_object('key', 'steering', 'result', 'pass'),
    jsonb_build_object('key', 'brakes', 'result', 'pass'),
    jsonb_build_object('key', 'battery', 'result', 'pass'),
    jsonb_build_object('key', 'wiring', 'result', 'pass'),
    jsonb_build_object('key', 'roster_compliance', 'result', 'pass'),
    jsonb_build_object('key', 'safety_equipment', 'result', 'pass')
  );
begin
  if not has_function_privilege('authenticated', 'public.get_my_team_registration_status(uuid)', 'execute') then
    raise exception 'authenticated cannot execute get_my_team_registration_status';
  end if;
  if not has_function_privilege('authenticated', 'public.decide_team(uuid,text,text)', 'execute') then
    raise exception 'authenticated cannot execute decide_team(uuid,text,text)';
  end if;

  select id into v_staff from public.profiles where role = 'staff' and approved and account_status = 'active' order by created_at limit 1;
  select t.id, t.tournament_id, m.student_id
  into v_team, v_tournament, v_student
  from public.tournament_teams t
  join public.tournament_team_members m on m.team_id = t.id
  join public.profiles p on p.id = m.student_id
  where p.role = 'student'
    and p.account_status = 'active'
    and t.status in ('applied', 'payment_declared')
  order by t.created_at desc
  limit 1;
  select p.id into v_other
  from public.profiles p
  where p.role = 'student'
    and p.account_status = 'active'
    and p.id <> v_student
    and not exists (
      select 1 from public.tournament_team_members member
      where member.team_id = v_team and member.student_id = p.id
    )
  order by p.created_at
  limit 1;

  if v_staff is null or v_student is null or v_other is null or v_tournament is null then
    raise exception 'required staging fixtures are missing';
  end if;

  if v_team is null then
    raise exception 'no applied/payment-declared student team fixture exists';
  end if;

  select member.student_id, race_result.tournament_id
  into v_result_student, v_result_tournament
  from public.tournament_race_results race_result
  join public.tournament_team_members member on member.team_id = race_result.team_id
  join public.profiles result_profile on result_profile.id = member.student_id
  where result_profile.role = 'student' and result_profile.account_status = 'active'
  limit 1;

  set local role authenticated;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_staff, 'role', 'authenticated')::text, true);

  perform public.submit_scrutineering_inspection(v_team, 'failed', v_items, '0100 failed inspection', null);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_student, 'role', 'authenticated')::text, true);
  select public.get_my_team_registration_status(v_tournament) into v_status;
  if v_status->'scrutineering'->>'status' <> 'failed' or not (v_status->'scrutineering'->'items' @> '[{"key":"wheels_tyres","result":"fail"}]'::jsonb) then
    raise exception 'student did not receive failed inspection details';
  end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  select jsonb_agg(jsonb_build_object('key', item->>'key', 'result', 'pass')) into v_items
  from jsonb_array_elements(v_items) item;
  perform public.submit_scrutineering_inspection(v_team, 'passed', v_items, '0100 passed inspection', null);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_student, 'role', 'authenticated')::text, true);
  select public.get_my_team_registration_status(v_tournament) into v_status;
  if v_status->'scrutineering'->>'status' <> 'passed' or (v_status->>'eligible')::boolean then
    raise exception 'student did not receive passed inspection or payment-gated eligibility';
  end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  perform public.decide_team(v_team, 'rejected', '0100 staging rollback note');

  select review_note into v_note from public.tournament_teams where id = v_team;
  if v_note <> '0100 staging rollback note' then
    raise exception 'review note was not persisted';
  end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_student, 'role', 'authenticated')::text, true);
  select public.get_my_team_registration_status(v_tournament) into v_status;
  if v_status->'team' is null or v_status->'team'->>'review_note' is distinct from '0100 staging rollback note' then
    raise exception 'student status did not return the review note';
  end if;
  if not (v_status ? 'race_results') or not (v_status ? 'scrutineering') then
    raise exception 'student status payload is incomplete';
  end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_other, 'role', 'authenticated')::text, true);
  select public.get_my_team_registration_status(v_tournament) into v_status;
  if v_status->'team'->>'id' = v_team::text or v_status->'team'->>'review_note' = '0100 staging rollback note' then
    raise exception 'student received another student team status';
  end if;

  if v_result_student is not null then
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_result_student, 'role', 'authenticated')::text, true);
    select public.get_my_team_registration_status(v_result_tournament) into v_status;
    if jsonb_array_length(v_status->'race_results') = 0 then
      raise exception 'student did not receive their published race result';
    end if;
  end if;
end;
$$;

rollback;
