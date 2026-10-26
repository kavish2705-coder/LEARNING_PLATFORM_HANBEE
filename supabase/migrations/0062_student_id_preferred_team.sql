-- Student ID is set by the school, shown on the student's certificate, and
-- is never changed by the student. Preferred team name is the team a student
-- wants to be known by. Both are optional.

alter table profiles add column if not exists student_id text;
alter table profiles add column if not exists preferred_team_name text;

do $$ begin
  alter table profiles add constraint profiles_student_id_length check (student_id is null or char_length(student_id) <= 40);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table profiles add constraint profiles_preferred_team_length check (preferred_team_name is null or char_length(preferred_team_name) <= 60);
exception when duplicate_object then null; end $$;

create or replace function guard_student_id_write()
returns trigger as $$
begin
  if new.student_id is distinct from old.student_id
     and coalesce(current_setting('app.trusted_profile_write', true), '') <> 'true'
     and not is_manager() and not is_hanbee_staff() then
    raise exception 'only school staff, Hanbee staff or the manager may set a student ID';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists profiles_guard_student_id on profiles;
create trigger profiles_guard_student_id
  before update of student_id on profiles
  for each row execute function guard_student_id_write();
