-- The payment QR/UPI account stays global and staff-editable (so it can be
-- swapped if the account ever fails), but the entry fee amount genuinely
-- differs per tournament -- so that part belongs on the tournament itself,
-- set at create/edit time, not on the shared payment_settings singleton.

alter table tournaments add column if not exists entry_fee_amount numeric(10,2);
comment on column tournaments.entry_fee_amount is
  'Entry fee for this tournament, shown alongside the shared payment QR on the student payment-confirmation screen. Null means no amount has been set yet.';

create or replace function create_tournament(p_title text, p_description text, p_starts_at timestamptz, p_ends_at timestamptz, p_venue text, p_entry_fee_amount numeric default null)
returns uuid as $$
declare v_id uuid;
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'only Hanbee staff may create tournaments'; end if;
  if p_ends_at < p_starts_at then raise exception 'end must not be before start'; end if;
  if p_entry_fee_amount is not null and p_entry_fee_amount < 0 then raise exception 'entry fee cannot be negative'; end if;
  insert into tournaments (title, description, starts_at, ends_at, venue, created_by, entry_fee_amount)
  values (trim(p_title), coalesce(p_description, ''), p_starts_at, p_ends_at, coalesce(p_venue, ''), auth.uid(), p_entry_fee_amount)
  returning id into v_id;
  perform log_audit('create_tournament', 'tournament', v_id, jsonb_build_object('title', p_title));
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function update_tournament(p_id uuid, p_title text, p_description text, p_starts_at timestamptz, p_ends_at timestamptz, p_venue text, p_status tournament_status, p_entry_fee_amount numeric default null)
returns void as $$
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'only Hanbee staff may edit tournaments'; end if;
  if p_ends_at < p_starts_at then raise exception 'end must not be before start'; end if;
  if p_entry_fee_amount is not null and p_entry_fee_amount < 0 then raise exception 'entry fee cannot be negative'; end if;
  update tournaments set title = trim(p_title), description = coalesce(p_description, ''), starts_at = p_starts_at,
    ends_at = p_ends_at, venue = coalesce(p_venue, ''), status = p_status, entry_fee_amount = p_entry_fee_amount where id = p_id;
  if not found then raise exception 'tournament not found'; end if;
  perform log_audit('update_tournament', 'tournament', p_id, jsonb_build_object('status', p_status));
end;
$$ language plpgsql security definer set search_path = public;
