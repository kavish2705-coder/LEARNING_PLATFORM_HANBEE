-- ==========================================
-- 1. SCHEMA & ENUM UPDATES
-- ==========================================

-- Create participation type enum if it doesn't exist
do $$ begin
    create type participation_type as enum ('solo', 'pool', 'school');
exception
    when duplicate_object then null;
end $$;

-- Add participation_type to tournament_teams
alter table tournament_teams
  add column if not exists participation_type participation_type not null default 'pool';

-- Ensure tournament team size is between 2 and 5 for pool/school teams
update tournaments
set team_size = 5
where team_size > 5;

alter table tournaments
  drop constraint if exists tournaments_team_size_check,
  add constraint tournaments_team_size_check check (team_size between 2 and 5);

comment on column tournaments.team_size is
  'Maximum number of members in a team for this tournament (2-5); teams may apply with fewer members.';


-- ==========================================
-- 2. CORE FUNCTIONS
-- ==========================================

-- List students eligible for pool teams (not locked in active entries)
create or replace function list_poolable_students(p_tournament_id uuid)
returns setof uuid as $$
begin
    return query
    select distinct s.id
    from students s
    where not exists (
        select 1 from tournament_team_members m
        join tournament_teams t on t.id = m.team_id
        where m.student_id = s.id
          and t.tournament_id = p_tournament_id
          and t.status not in ('withdrawn', 'rejected')
    );
end;
$$ language plpgsql security definer set search_path = public;


-- Create a solo team entry
create or replace function create_solo_team(p_tournament_id uuid)
returns uuid as $$
declare
    v_user_id uuid := auth.uid();
    v_team_id uuid;
begin
    if not exists (select 1 from tournaments where id = p_tournament_id and status = 'upcoming') then
        raise exception 'Tournament is not open for registration';
    end if;

    -- Check if student already has active participation
    if exists (
        select 1 from tournament_team_members m
        join tournament_teams t on t.id = m.team_id
        where m.student_id = v_user_id 
          and t.tournament_id = p_tournament_id
          and t.status not in ('withdrawn', 'rejected')
    ) then
        raise exception 'Student already has an active entry or team in this tournament';
    end if;

    insert into tournament_teams (tournament_id, captain_id, status, participation_type)
    values (p_tournament_id, v_user_id, 'draft', 'solo')
    returning id into v_team_id;

    insert into tournament_team_members (team_id, student_id)
    values (v_team_id, v_user_id);

    return v_team_id;
end;
$$ language plpgsql security definer set search_path = public;


-- Start a new pool team
create or replace function start_pool_team(p_tournament_id uuid)
returns uuid as $$
declare
    v_user_id uuid := auth.uid();
    v_team_id uuid;
begin
    if not exists (select 1 from tournaments where id = p_tournament_id and status = 'upcoming') then
        raise exception 'Tournament is not open for registration';
    end if;

    insert into tournament_teams (tournament_id, captain_id, status, participation_type)
    values (p_tournament_id, v_user_id, 'draft', 'pool')
    returning id into v_team_id;

    insert into tournament_team_members (team_id, student_id)
    values (v_team_id, v_user_id);

    return v_team_id;
end;
$$ language plpgsql security definer set search_path = public;


-- Invite a student to a pool team
create or replace function invite_to_team(p_team_id uuid, p_student_id uuid)
returns void as $$
declare
    t tournament_teams;
begin
    select * into t from tournament_teams where id = p_team_id for update;
    if t.id is null or t.captain_id is distinct from auth.uid() then
        raise exception 'Only the captain can invite members';
    end if;
    if t.participation_type <> 'pool' then
        raise exception 'Invitations are only allowed for pool teams';
    end if;

    insert into team_invitations (team_id, student_id, status)
    values (p_team_id, p_student_id, 'pending')
    on conflict (team_id, student_id) do update set status = 'pending';
end;
$$ language plpgsql security definer set search_path = public;


-- Respond to a team invitation (withdraws conflicting solo entries on acceptance)
create or replace function respond_team_invitation(p_invitation_id uuid, p_accept boolean)
returns void as $$
declare
    v_inv team_invitations;
    v_team tournament_teams;
    v_max_size int;
    v_current_count int;
begin
    select * into v_inv from team_invitations where id = p_invitation_id for update;
    if v_inv.id is null or v_inv.student_id is distinct from auth.uid() then
        raise exception 'Invitation not found or unauthorized';
    end if;

    select * into v_team from tournament_teams where id = v_inv.team_id;

    if p_accept then
        select team_size into v_max_size from tournaments where id = v_team.tournament_id;
        select count(*) into v_current_count from tournament_team_members where team_id = v_team.id;
        if v_current_count >= v_max_size then
            raise exception 'Team has reached maximum capacity of % members', v_max_size;
        end if;

        -- Automatically withdraw any existing solo/active entry for this student in this tournament
        update tournament_teams
        set status = 'withdrawn'
        where id in (
            select m.team_id from tournament_team_members m
            join tournament_teams t on t.id = m.team_id
            where m.student_id = auth.uid() 
              and t.tournament_id = v_team.tournament_id
              and t.id <> v_team.id
        );

        delete from tournament_team_members
        where student_id = auth.uid()
          and team_id in (
              select id from tournament_teams where tournament_id = v_team.tournament_id and id <> v_team.id
          );

        -- Add user to the pool team
        insert into tournament_team_members (team_id, student_id)
        values (v_team.id, auth.uid())
        on conflict do nothing;

        update team_invitations set status = 'accepted', decided_at = now() where id = p_invitation_id;
    else
        update team_invitations set status = 'declined', decided_at = now() where id = p_invitation_id;
    end if;
end;
$$ language plpgsql security definer set search_path = public;


-- Request to join a pool team
create or replace function request_join_team(p_team_id uuid)
returns void as $$
declare
    v_team tournament_teams;
    v_user_id uuid := auth.uid();
begin
    select * into v_team from tournament_teams where id = p_team_id;
    if v_team.id is null then raise exception 'Team not found'; end if;
    if v_team.participation_type <> 'pool' then
        raise exception 'Can only request to join pool teams';
    end if;

    insert into team_requests (team_id, student_id, status)
    values (p_team_id, v_user_id, 'pending')
    on conflict (team_id, student_id) do update set status = 'pending';
end;
$$ language plpgsql security definer set search_path = public;


-- Respond to a join request (withdraws conflicting solo entries on acceptance)
create or replace function respond_join_request(p_request_id uuid, p_accept boolean)
returns void as $$
declare
    v_req team_requests;
    v_team tournament_teams;
    v_max_size int;
    v_current_count int;
begin
    select * into v_req from team_requests where id = p_request_id for update;
    if v_req.id is null then raise exception 'Request not found'; end if;

    select * into v_team from tournament_teams where id = v_req.team_id;
    if v_team.captain_id is distinct from auth.uid() then
        raise exception 'Only the captain can respond to join requests';
    end if;

    if p_accept then
        select team_size into v_max_size from tournaments where id = v_team.tournament_id;
        select count(*) into v_current_count from tournament_team_members where team_id = v_team.id;
        if v_current_count >= v_max_size then
            raise exception 'Team has reached maximum capacity of % members', v_max_size;
        end if;

        -- Withdraw conflicting solo entries for the requesting student
        update tournament_teams
        set status = 'withdrawn'
        where id in (
            select m.team_id from tournament_team_members m
            join tournament_teams t on t.id = m.team_id
            where m.student_id = v_req.student_id 
              and t.tournament_id = v_team.tournament_id
              and t.id <> v_team.id
        );

        delete from tournament_team_members
        where student_id = v_req.student_id
          and team_id in (
              select id from tournament_teams where tournament_id = v_team.tournament_id and id <> v_team.id
          );

        insert into tournament_team_members (team_id, student_id)
        values (v_team.id, v_req.student_id)
        on conflict do nothing;

        update team_requests set status = 'accepted', decided_at = now() where id = p_request_id;
    else
        update team_requests set status = 'declined', decided_at = now() where id = p_request_id;
    end if;
end;
$$ language plpgsql security definer set search_path = public;


-- Leave a team (allows transition back to solo or joining another team)
create or replace function leave_team(p_team_id uuid)
returns void as $$
declare
    v_team tournament_teams;
    v_user_id uuid := auth.uid();
    v_member_count int;
begin
    select * into v_team from tournament_teams where id = p_team_id for update;
    if v_team.id is null then raise exception 'Team not found'; end if;

    if v_team.participation_type = 'solo' then
        update tournament_teams set status = 'withdrawn' where id = p_team_id;
        delete from tournament_team_members where team_id = p_team_id and student_id = v_user_id;
        return;
    end if;

    delete from tournament_team_members
    where team_id = p_team_id and student_id = v_user_id;

    select count(*) into v_member_count from tournament_team_members where team_id = p_team_id;
    if v_member_count = 0 then
        update tournament_teams set status = 'withdrawn' where id = p_team_id;
    elsif v_team.captain_id = v_user_id then
        select student_id into v_team.captain_id 
        from tournament_team_members 
        where team_id = p_team_id 
        limit 1;

        update tournament_teams 
        set captain_id = v_team.captain_id 
        where id = p_team_id;
    end if;
end;
$$ language plpgsql security definer set search_path = public;  