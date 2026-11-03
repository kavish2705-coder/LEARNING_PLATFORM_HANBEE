-- Real bug reported live: a Hanbee staff member opened the tournament
-- review queue for a team stuck in 'applied' status (payment never
-- declared -- e.g. this specific team, "Ava Khan", was submitted 2026-10-29
-- via a path that never called apply_team with payment_declared = true)
-- and found "Verify" disabled with no way to unblock it except rejecting.
--
-- decide_team() already allows verifying straight from 'applied' at the DB
-- level (it only rejects status outside ('applied', 'payment_declared')) --
-- the "Verify" button being disabled until payment_declared = true is a
-- frontend-only safeguard (TournamentReviewQueue.tsx), there to stop staff
-- from approving an entry before payment is confirmed. That safeguard is
-- correct and should stay; what's missing is a way for staff to actually
-- record that payment was confirmed when the team itself can't do it --
-- a pool/solo entry that never went through the self-service QR+reference
-- flow, or an older entry from before that flow existed. School teams
-- already have this via approveTeamApplication (apply_team called by
-- school staff); this is the Hanbee-staff equivalent for everyone else.

create or replace function staff_mark_payment_received(p_team uuid, p_reference text default null)
returns void as $$
declare
  t tournament_teams;
  v_ref text := nullif(trim(coalesce(p_reference, '')), '');
begin
  if not (is_hanbee_staff() or is_manager()) then
    raise exception 'only Hanbee staff or a manager can mark payment received';
  end if;

  select * into t from tournament_teams where id = p_team for update;
  if t.id is null then raise exception 'team not found'; end if;
  if t.status <> 'applied' then
    raise exception 'this entry is not waiting on a payment declaration';
  end if;

  perform set_config('app.trusted_portal_write', 'true', true);
  update tournament_teams set
    status = 'payment_declared',
    payment_declared = true,
    payment_reference = coalesce(v_ref, payment_reference)
  where id = p_team;
  perform set_config('app.trusted_portal_write', '', true);

  perform log_audit('staff_mark_payment_received', 'tournament_team', p_team, jsonb_build_object('reference', v_ref));
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function staff_mark_payment_received(uuid, text) from public, anon;
grant execute on function staff_mark_payment_received(uuid, text) to authenticated;
