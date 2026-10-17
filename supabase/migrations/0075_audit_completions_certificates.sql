-- S11 (docs/SECURITY_PLAN.md): record lesson/course completions and certificate issues.

create or replace function audit_lesson_completion() returns trigger as $$
declare
  v_course_id uuid;
begin
  select m.course_id into v_course_id
  from lessons l
  join modules m on m.id = l.module_id
  where l.id = new.lesson_id;

  insert into audit_log (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), 'lesson_completed', 'lesson', new.lesson_id,
          jsonb_build_object('enrollment_id', new.enrollment_id));

  if v_course_id is not null
     and exists (
       select 1
       from lessons l
       join modules m on m.id = l.module_id
       where m.course_id = v_course_id and l.published
     )
     and not exists (
       select 1
       from lessons l
       join modules m on m.id = l.module_id
       where m.course_id = v_course_id
         and l.published
         and not exists (
           select 1
           from lesson_completions lc
           where lc.enrollment_id = new.enrollment_id
             and lc.lesson_id = l.id
         )
     ) then
    insert into audit_log (actor_id, action, target_type, target_id, meta)
    values (auth.uid(), 'course_completed', 'course', v_course_id,
            jsonb_build_object('enrollment_id', new.enrollment_id));
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_audit_lesson_completion
  after insert on lesson_completions
  for each row execute function audit_lesson_completion();

create or replace function audit_certificate_issued() returns trigger as $$
begin
  insert into audit_log (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), 'certificate_issued', 'certificate', new.id,
          jsonb_build_object('user_id', new.user_id, 'course_title', new.course_title));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_audit_certificate_issued
  after insert on certificates
  for each row execute function audit_certificate_issued();
