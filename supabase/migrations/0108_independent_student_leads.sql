-- Independent student leads: backs the landing page's IndependentStudentModal.
-- Same shape as 0009_tournament_registrations.sql's anon-insertable
-- registration table -- a public lead form needs no login, so this is a
-- plain RLS insert policy, not a SECURITY DEFINER RPC (unlike the
-- staff-only invite-creation flow, which legitimately needs to stay gated).
--
-- This does NOT create an account or an invitation on its own. Creating an
-- account still requires staff judgment (same reason
-- staff_create_independent_invite is staff-only) -- this just gives staff
-- something real to review instead of a form that only logged to a
-- console. Staff convert a lead into a real invite via the existing
-- staff_create_independent_invite flow, then mark the lead converted.

create table independent_student_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null default '',
  location text not null default '',
  track text not null default '',
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'converted', 'dismissed')),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table independent_student_leads enable row level security;

create policy "anyone (including anonymous) can submit an independent student lead"
  on independent_student_leads for insert with check (
    length(trim(full_name)) > 0 and length(trim(email)) > 0
    and length(full_name) <= 200 and length(email) <= 320
    and length(phone) <= 40 and length(location) <= 120
    and length(track) <= 120 and length(message) <= 2000
  );
create policy "staff/manager read independent student leads"
  on independent_student_leads for select using (is_staff_or_manager());

-- Avoid the same visitor double-submitting (an accidental extra click, or a
-- retry after the earlier "always shows success" bug) from piling up
-- duplicate pending leads.
create unique index independent_student_leads_pending_email_idx
  on independent_student_leads (lower(email))
  where status = 'pending';

create or replace function dismiss_independent_student_lead(p_lead uuid)
returns void as $$
begin
  if not is_staff_or_manager() then
    raise exception 'only Hanbee staff and managers can review independent student leads';
  end if;
  update independent_student_leads
  set status = 'dismissed', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_lead and status = 'pending';
  if not found then
    raise exception 'this lead was not found or has already been reviewed';
  end if;
  perform log_audit('dismiss_independent_student_lead', 'independent_student_leads', p_lead, '{}'::jsonb);
end;
$$ language plpgsql security definer set search_path = public;

-- Called once staff has created the real invite from this lead (see
-- staff_create_independent_invite) -- keeps the lead's status honest
-- instead of leaving it "pending" forever after it's been acted on.
create or replace function mark_independent_student_lead_converted(p_lead uuid)
returns void as $$
begin
  if not is_staff_or_manager() then
    raise exception 'only Hanbee staff and managers can review independent student leads';
  end if;
  update independent_student_leads
  set status = 'converted', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_lead and status = 'pending';
  if not found then
    raise exception 'this lead was not found or has already been reviewed';
  end if;
  perform log_audit('mark_independent_student_lead_converted', 'independent_student_leads', p_lead, '{}'::jsonb);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function dismiss_independent_student_lead(uuid), mark_independent_student_lead_converted(uuid) from public, anon;
grant execute on function dismiss_independent_student_lead(uuid), mark_independent_student_lead_converted(uuid) to authenticated;
