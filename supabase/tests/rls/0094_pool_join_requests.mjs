import { connect } from "./_db.mjs";
// request_join_team / respond_join_request (migration 0094): the reverse
// direction of invite_to_team -- an independent student requests to join an
// existing pool team, and the captain accepts or declines.
const c = await connect();
const id = async e => (await c.query("select id from profiles where email=$1",[e])).rows[0].id;
const jamie = await id("jamie@hanbeelms.edu");
let pass=0, fail=0; const check=(n,ok,x="")=>{(ok?pass++:fail++);console.log(ok?"PASS":"FAIL",n,x)};
const asUser = async (u) => { await c.query("reset role"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:u,role:"authenticated"})]); };
const asOwner = async () => { await c.query("reset role"); await c.query("select set_config('request.jwt.claims','',true)"); };
const tryq = async (sql,p)=>{ await c.query("savepoint s"); try{const r=await c.query(sql,p); await c.query("release savepoint s"); return {r};}catch(e){await c.query("rollback to savepoint s"); return {e};} };
const one = async (sql,p) => (await c.query(sql,p)).rows[0];
const signup = async (email, meta) => { await asOwner(); const uid = (await one("select gen_random_uuid() u")).u;
  const r = await tryq("select test_support_signup($1,$2,$3::jsonb)",[uid,email,JSON.stringify(meta)]);
  if (r.e) throw new Error("signup failed "+email+": "+r.e.message); return uid; };

const mkIndependent = async (email, name) => {
  await asUser(jamie);
  await c.query("select staff_create_independent_invite($1,$2)",[name,email]);
  await asOwner();
  const tok = (await one("select token t from invitations where email=$1 order by created_at desc limit 1",[email])).t;
  return await signup(email, {invite_token: tok, full_name: name});
};

await c.query("begin");

const jr1 = await mkIndependent("jr1-94@x.test","JR One");
const jr2 = await mkIndependent("jr2-94@x.test","JR Two");
const jr3 = await mkIndependent("jr3-94@x.test","JR Three");
const jr4 = await mkIndependent("jr4-94@x.test","JR Four");
const jr5 = await mkIndependent("jr5-94@x.test","JR Five");

await asOwner();
const students = [jr1, jr2, jr3, jr4, jr5];
await c.query("update profiles set tournament_access='active' where id = any($1::uuid[])",[students]);
await c.query(
  "insert into driver_licenses (student_id, status, amount, payment_declared) select unnest($1::uuid[]), 'active', 1, true",
  [students],
);
const tour = (await one("insert into tournaments (title,status,starts_at,ends_at,venue) values ('Pool94 Cup','upcoming',now()+interval '30 days',now()+interval '31 days','Arena') returning id")).id;

// -----------------------------------------------------------------------
// Basic flow: jr1 starts a team, jr2 requests to join, jr1 (captain)
// accepts.
// -----------------------------------------------------------------------
await asUser(jr1);
let r = await tryq("select start_pool_team($1,'Join Rockets') t",[tour]);
check("jr1 starts a pool team", !r.e, r.e?.message);
const team1 = r.r?.rows[0]?.t;

await asUser(jr2);
r = await tryq("select request_join_team($1) i",[team1]);
check("jr2 requests to join the team", !r.e, r.e?.message);
const req2 = r.r?.rows[0]?.i;

// Step 1: a second request_join_team call for the same team/student while
// one is pending raises (unique-pending constraint).
r = await tryq("select request_join_team($1)",[team1]);
check("a second pending request for the same team/student is refused", !!r.e, r.e?.message);

r = await tryq("select request_join_team(gen_random_uuid())");
check("requesting a nonexistent team raises 'team not found'", !!r.e && /team not found/.test(r.e.message), r.e?.message);

await asUser(jr3);
r = await tryq("select respond_join_request($1,'accepted')",[req2]);
check("a non-captain cannot respond to someone else's join request", !!r.e, r.e?.message);

await asUser(jr1);
r = await tryq("select respond_join_request($1,'bogus')",[req2]);
check("an invalid decision value is refused", !!r.e, r.e?.message);

r = await tryq("select respond_join_request($1,'accepted')",[req2]);
check("the captain accepts jr2's join request", !r.e, r.e?.message);

await asOwner();
check("jr2 is now a member of the team", !!(await one("select 1 x from tournament_team_members where team_id=$1 and student_id=$2",[team1,jr2])));
check("the join request is marked accepted", (await one("select status::text s from team_join_requests where id=$1",[req2])).s==="accepted");

r = await tryq("select respond_join_request($1,'accepted')",[req2]);
check("responding twice to the same request is refused", !!r.e, r.e?.message);

// -----------------------------------------------------------------------
// Step 2: accepting cancels the student's other pending invites and join
// requests for the same tournament. jr3 (never joined team1) is the
// student with a pending invite elsewhere; jr4 and jr5 captain the other
// teams so no one captains two teams at once.
// -----------------------------------------------------------------------
await asUser(jr4);
r = await tryq("select start_pool_team($1,'Join Comets') t",[tour]);
check("team2 (jr4 captain) created", !r.e, r.e?.message);
const team2 = r.r?.rows[0]?.t;
r = await tryq("select invite_to_team($1,$2) i",[team2, jr3]);
check("jr4 invites jr3 to team2", !r.e, r.e?.message);
const inv3 = r.r?.rows[0]?.i;

await asUser(jr5);
r = await tryq("select start_pool_team($1,'Join Nebulas') t",[tour]);
check("team5 (jr5 captain) created", !r.e, r.e?.message);
const team5 = r.r?.rows[0]?.t;

await asUser(jr3);
r = await tryq("select request_join_team($1) i",[team5]);
check("jr3 requests to join team5", !r.e, r.e?.message);
const req3 = r.r?.rows[0]?.i;

await asUser(jr5);
r = await tryq("select respond_join_request($1,'accepted')",[req3]);
check("jr5 accepts jr3's join request on team5", !r.e, r.e?.message);

await asOwner();
check("jr3's pending invite to team2 is cancelled on accept", (await one("select status::text s from team_invitations where id=$1",[inv3])).s==="cancelled");

// -----------------------------------------------------------------------
// decline path
// -----------------------------------------------------------------------
await asUser(jr2);
r = await tryq("select leave_team($1)",[team1]);
check("jr2 leaves team1 to be free for the decline scenario", !r.e, r.e?.message);
r = await tryq("select request_join_team($1) i",[team2]);
const reqDecline = r.r?.rows[0]?.i;

await asUser(jr4);
r = await tryq("select respond_join_request($1,'declined')",[reqDecline]);
check("the captain declines a join request", !r.e, r.e?.message);
await asOwner();
check("the declined request is marked declined", (await one("select status::text s from team_join_requests where id=$1",[reqDecline])).s==="declined");
check("jr2 was not added to team2", !(await one("select 1 x from tournament_team_members where team_id=$1 and student_id=$2",[team2,jr2])));

await c.query("rollback"); await asOwner();
check("all test rows rolled back", (await one("select count(*)::int n from profiles where email like 'jr%-94@x.test'")).n===0);

// -----------------------------------------------------------------------
// Step 3: the race. Two near-simultaneous respond_join_request accepts
// that would together exceed team_size must not both succeed.
//
// Simulation approach: team_join_requests rows and the student/team setup
// are created and COMMITTED (autocommit, outside any wrapping
// begin/rollback) through this harness's single connection, because a
// genuine race needs two independent Postgres backends with their own
// transactions contending for the same row lock, and two separate backends
// cannot see each other's uncommitted rows. Two fresh pg connections then
// each open their own transaction and call respond_join_request for a
// different pending request on the SAME team, racing to accept against a
// team_size of 2 (1 existing member/captain + 1 open spot, two candidates).
// Connection A's call is awaited to completion first so it reliably wins
// the race deterministically (it acquires and holds the `for update` lock,
// inserts, and commits); connection B's call is then sent and awaited --
// since B must itself take the same `for update` lock, and does so only
// after re-reading the now-current member count, this still genuinely
// exercises the lock-then-recheck path that protects against the real
// concurrent case. All setup rows are deleted explicitly afterward since
// nothing here is inside a rollback-able transaction.
// -----------------------------------------------------------------------
const raceJamie = jamie;
const mkIndependentCommitted = async (email, name) => {
  await asUser(raceJamie);
  await c.query("select staff_create_independent_invite($1,$2)",[name,email]);
  await asOwner();
  const tok = (await one("select token t from invitations where email=$1 order by created_at desc limit 1",[email])).t;
  const uid = (await one("select gen_random_uuid() u")).u;
  await c.query("select test_support_signup($1,$2,$3::jsonb)",[uid,email,JSON.stringify({invite_token: tok, full_name: name})]);
  return uid;
};

// This setup phase runs inside one explicit transaction that we COMMIT (not
// roll back) so the two separate connections below can see it -- `set
// local role`/`set_config(...,true)` only persists within a single
// transaction, so everything that depends on those claims (signup, team
// creation, join requests) must happen inside the same begin/commit.
await c.query("begin");
const rc = await mkIndependentCommitted("rc1-94@x.test","RC Captain");
const ra = await mkIndependentCommitted("ra1-94@x.test","RC CandA");
const rb = await mkIndependentCommitted("rb1-94@x.test","RC CandB");

await asOwner();
const raceTour = (await one("insert into tournaments (title,status,starts_at,ends_at,venue,team_size) values ('Race94 Cup','upcoming',now()+interval '30 days',now()+interval '31 days','Arena',2) returning id")).id;

await asUser(rc);
const raceTeam = (await one("select start_pool_team($1,'Race Team') t",[raceTour])).t;

await asUser(ra);
const reqA = (await one("select request_join_team($1) i",[raceTeam])).i;
await asUser(rb);
const reqB = (await one("select request_join_team($1) i",[raceTeam])).i;

await asOwner();
await c.query("commit");

const c1 = await connect();
const c2 = await connect();
const setClaims = async (conn, uid) => { await conn.query("set local role authenticated"); await conn.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:uid,role:"authenticated"})]); };

await c1.query("begin");
await setClaims(c1, rc);
await c1.query("select respond_join_request($1,'accepted')",[reqA]);

// c2 starts its own transaction and issues the competing accept while c1's
// transaction still holds the team row lock (c1 has not committed yet) --
// c2's query will block inside Postgres until c1 commits or rolls back.
await c2.query("begin");
await setClaims(c2, rc);
const c2promise = c2.query("select respond_join_request($1,'accepted')",[reqB]).then(() => ({ok:true})).catch(e => ({ok:false, e}));

// give c2 a moment to actually reach and block on the lock, then release it
await new Promise(res => setTimeout(res, 300));
await c1.query("commit");

const c2result = await c2promise;
if (c2result.ok) { await c2.query("commit"); } else { await c2.query("rollback").catch(()=>{}); }

check("connection A's accept succeeds", true); // c1 already committed without throwing
check("connection B's accept is refused once the team is full", !c2result.ok, c2result.e?.message);

await asOwner();
const raceMembers = (await one("select count(*)::int n from tournament_team_members where team_id=$1",[raceTeam])).n;
check("the race team ends with exactly team_size (2) members, never 3", raceMembers===2, "members="+raceMembers);

await c1.end();
await c2.end();

// Manual cleanup: these rows were committed outside any rollback-able
// transaction, so delete them explicitly. profiles/auth.users are
// deliberately left alone: start_pool_team/request_join_team/
// respond_join_request above all call log_audit(), and that's a real,
// committed audit_log row with actor_id = rc/ra/rb by the time we get
// here. audit_log_actor_id_fkey is ON DELETE SET NULL, but
// audit_log_immutable() (0037_backend_hardening.sql) blocks *any* change
// to audit_log, including that cascade -- so once these accounts have
// acted, deleting them is structurally impossible, by design (the same
// immutability a real compliance audit trail needs). Not a bug to work
// around; CI resets the whole local stack per run, so leftover rows here
// cost nothing.
await c.query("delete from tournament_team_members where team_id=$1",[raceTeam]);
await c.query("delete from team_join_requests where team_id=$1",[raceTeam]);
await c.query("delete from conversation_participants where conversation_id in (select id from conversations where team_id=$1)",[raceTeam]);
await c.query("delete from conversations where team_id=$1",[raceTeam]);
await c.query("delete from tournament_teams where id=$1",[raceTeam]);
await c.query("delete from tournaments where id=$1",[raceTour]);
await c.query("delete from organization_members where user_id in ($1,$2,$3)",[rc,ra,rb]);
await c.query("delete from invitations where email in ('rc1-94@x.test','ra1-94@x.test','rb1-94@x.test')");

check("race setup rows cleaned up", (await one("select count(*)::int n from tournament_teams where id=$1",[raceTeam])).n===0);

console.log(`${pass} passed, ${fail} failed`);
await c.end();
