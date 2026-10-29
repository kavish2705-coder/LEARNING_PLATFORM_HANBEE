import { connect } from "./_db.mjs";
// Pool schema (migration 0091): team_join_requests shape/guarantees, student_has_active_team() helper.
const c = await connect();
const id = async e => (await c.query("select id from profiles where email=$1",[e])).rows[0].id;
const jamie=await id("jamie@hanbeelms.edu"), morgan=await id("morgan@hanbeelms.edu");
let pass=0, fail=0; const check=(n,ok,x="")=>{(ok?pass++:fail++);console.log(ok?"PASS":"FAIL",n,x)};
const asUser = async (u) => { await c.query("reset role"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:u,role:"authenticated"})]); };
const asAnon = async () => { await c.query("reset role"); await c.query("set local role anon"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:"anon"})]); };
const asOwner = async () => { await c.query("reset role"); await c.query("select set_config('request.jwt.claims','',true)"); };
const tryq = async (sql,p)=>{ await c.query("savepoint s"); try{const r=await c.query(sql,p); await c.query("release savepoint s"); return {r};}catch(e){await c.query("rollback to savepoint s"); return {e};} };
const one = async (sql,p) => (await c.query(sql,p)).rows[0];

await c.query("begin");
await asOwner();
const tour = (await one("insert into tournaments (title,status,starts_at,ends_at,venue) values ('T91 Cup','upcoming',now()+interval '30 days',now()+interval '31 days','Arena') returning id")).id;
// A solo (org_id null) team, so trg_team_chat_create / trg_enforce_team_slots do nothing on insert.
const team = (await one("insert into tournament_teams (tournament_id, org_id, name, created_by) values ($1,null,'Solo91',$2) returning id",[tour, jamie])).id;

// Step 1/4: the unique-pending partial index rejects a second pending request for the same (team_id, student_id).
let r = await tryq("insert into team_join_requests (team_id, student_id, status) values ($1,$2,'pending')",[team, morgan]);
check("first pending join request for a team/student succeeds", !r.e, r.e?.message);
r = await tryq("insert into team_join_requests (team_id, student_id, status) values ($1,$2,'pending')",[team, morgan]);
check("a second pending join request for the same team/student violates the unique index", !!r.e && /duplicate key|unique/i.test(r.e.message), r.e?.message);

// A non-pending request for the same pair is not blocked by the partial index.
r = await tryq("insert into team_join_requests (team_id, student_id, status) values ($1,$2,'declined')",[team, morgan]);
check("a declined request for the same team/student is not blocked by the partial index", !r.e, r.e?.message);

// student_has_active_team(): true once the student has a non-withdrawn membership row, false once the team withdraws.
await c.query("insert into tournament_team_members (team_id, tournament_id, student_id) values ($1,$2,$3)",[team, tour, morgan]);
check("student_has_active_team is true for a member of a draft team", (await one("select student_has_active_team($1,$2) v",[tour, morgan])).v === true);
await c.query("update tournament_teams set status = 'withdrawn' where id = $1",[team]);
check("student_has_active_team is false once the team is withdrawn", (await one("select student_has_active_team($1,$2) v",[tour, morgan])).v === false);
check("student_has_active_team is false for a student with no row at all", (await one("select student_has_active_team($1,$2) v",[tour, jamie])).v === false);

// RLS: select is gated by is_active_account() + (own request or team-visible); no client writes are granted at all.
await asAnon();
r = await tryq("select 1 from team_join_requests limit 1");
check("anonymous cannot read team_join_requests", !!r.e, r.e?.message);
r = await tryq("insert into team_join_requests (team_id, student_id, status) values ($1,$2,'pending')",[team, jamie]);
check("anonymous cannot insert into team_join_requests", !!r.e, r.e?.message);
await asUser(jamie);
r = await tryq("insert into team_join_requests (team_id, student_id, status) values ($1,$2,'pending')",[team, jamie]);
check("an authenticated user cannot insert into team_join_requests either (writes are RPC-only)", !!r.e, r.e?.message);
r = await tryq("update team_join_requests set status = 'cancelled' where team_id = $1",[team]);
check("an authenticated user cannot update team_join_requests", !!r.e, r.e?.message);
r = await tryq("delete from team_join_requests where team_id = $1",[team]);
check("an authenticated user cannot delete from team_join_requests", !!r.e, r.e?.message);

await c.query("rollback"); await asOwner();
check("all test rows rolled back", (await one("select count(*)::int n from tournaments where title='T91 Cup'")).n===0);
console.log(`${pass} passed, ${fail} failed`);
await c.end();
