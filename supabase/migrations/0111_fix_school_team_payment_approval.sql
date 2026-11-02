-- Regression fix for 0110_payment_qr_and_reference.sql: apply_team() was
-- made to always require a payment_reference when payment is declared, but
-- it is called from two different places with two different meanings:
--   1. The student-facing solo-entry QR flow (team/page.tsx) -- this is
--      the one that actually got a QR + reference input built for it.
--   2. School staff approving a school team's payment on the team's
--      behalf (school/teams/page.tsx's approveTeamApplication, which
--      calls this same RPC with no reference argument at all) -- schools
--      pay by a different arrangement entirely (bank transfer/invoice,
--      not a per-student UPI QR) and that screen was never given a
--      reference field, so the new requirement broke it outright.
--
-- Fix: only require a reference for solo/independent entries (org_id is
-- null), where the QR+reference UI actually exists. School-team approval
-- keeps its original, unbroken behavior.

create or replace function apply_team(p_team uuid, p_payment_declared boolean, p_payment_reference text default null)
returns void as $$
declare
  t tournament_teams;
  v_size int;
  v_member_count int;
  v_ref text := nullif(trim(coalesce(p_payment_reference, '')), '');
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or not can_run_team(t) then raise exception 'not allowed'; end if;
  if t.status not in ('draft', 'proposed') then raise exception 'this team has already applied'; end if;
  if not exists (select 1 from tournaments where id = t.tournament_id and status = 'upcoming') then
    raise exception 'this tournament is not open for applications';
  end if;

  select team_size into v_size from tournaments where id = t.tournament_id;
  select count(*) into v_member_count from tournament_team_members where team_id = p_team;
  if v_member_count < 1 or v_member_count > v_size then
    raise exception 'a team must have between 1 and % players to apply', v_size;
  end if;

  if coalesce(p_payment_declared, false) and v_ref is null and t.org_id is null then
    raise exception 'enter the UPI transaction ID / UTR from your payment confirmation';
  end if;

  perform set_config('app.trusted_portal_write', 'true', true);
  update tournament_teams set
    status = case when coalesce(p_payment_declared, false) then 'payment_declared'::team_status else 'applied'::team_status end,
    payment_declared = coalesce(p_payment_declared, false),
    payment_reference = coalesce(v_ref, payment_reference)
  where id = p_team;
  perform set_config('app.trusted_portal_write', '', true);
  update team_invitations set status = 'cancelled', decided_at = now() where team_id = p_team and status = 'pending';
end;
$$ language plpgsql security definer set search_path = public;
