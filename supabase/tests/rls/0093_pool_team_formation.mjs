import { connect } from "./_db.mjs";
// Pool-team creation + pool branches on invite_to_team, leave_team,
// team_chat_create (migration 0093). Independent ("road-kid") students can
// now form a team with each other; the school-team (org_id is not null)
// behavior of all three modified functions must stay exactly as it was in
// 0039.
const c = await connect();
const id = async e => (await c.query("select id from profiles where email=$1",[e])).rows[0].id;
const jamie = await id("jamie@hanbeelms.edu");
let pass=0, fail=0; const check=(n,ok,x="")=>{(ok?pass++:fail++);console.log(ok?"PASS":"FAIL",n,x)};
const asUser = async (u) => { await c.query("reset role"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:u,role:"authenticated"})]); };
const asAnon = async () => { await c.query("reset role"); await c.query("set local role anon"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:"anon"})]); };
const asOwner = async () => { await c.query("reset role"); await c.query("select set_config('request.jwt.claims','',true)"); };
const tryq = async (sql,p)=>{ await c.query("savepoint s"); try{const r=await c.query(sql,p); await c.query("release savepoint s"); return {r};}catch(e){await c.query("rollback to savepoint s"); return {e};} };
const one = async (sql,p) => (await c.query(sql,p)).rows[0];
const signup = async (email, meta) => { await asOwner(); const uid = (await one("select gen_random_uuid() u")).u;
  const r = await tryq("select test_support_signup($1,$2,$3::jsonb)",[uid,email,JSON.stringify(meta)]);
  if (r.e) throw new Error("signup failed "+email+": "+r.e.message); return uid; };
const schoolMeta = (name) => ({role:"school_staff", full_name:"Owner "+name, school_name:name, registration_no:"REG-"+name, official_email:"office93@x.test", guardian_consent:"true"});

// Issue a staff-only independent invite (migration 0092) and accept it, same
// as the pattern in 0092's own test.
const mkIndependent = async (email, name) => {
  await asUser(jamie);
  await c.query("select staff_create_independent_invite($1,$2)",[name,email]);
  await asOwner();
  const tok = (await one("select token t from invitations where email=$1 order by created_at desc limit 1",[email])).t;
  return await signup(email, {invite_token: tok, full_name: name});
};

await c.query("begin");

const pk1 = await mkIndependent("pk1@x.test","PK One");
const pk2 = await mkIndependent("pk2@x.test","PK Two");
const pk3 = await mkIndependent("pk3@x.test","PK Three");
const pk4 = await mkIndependent("pk4@x.test","PK Four");
const pk5 = await mkIndependent("pk5@x.test","PK Five");

await asOwner();
const poolTour = (await one("insert into tournaments (title,status,starts_at,ends_at,venue) values ('Pool93 Cup','upcoming',now()+interval '30 days',now()+interval '31 days','Arena') returning id")).id;
const schoolTour = (await one("insert into tournaments (title,status,starts_at,ends_at,venue,team_size) values ('School93 Cup','upcoming',now()+interval '30 days',now()+interval '31 days','Arena',2) returning id")).id;

// -----------------------------------------------------------------------
// Step 1: start_pool_team creates a team with captain_id set and a team
// chat containing exactly the captain.
// -----------------------------------------------------------------------
await asUser(pk1);
let r = await tryq("select start_pool_team($1,'Pool Rockets') t",[poolTour]);
check("an independent student starts a pool team", !r.e, r.e?.message);
const poolTeam1 = r.r?.rows[0]?.t;

await asOwner();
let tm = await one("select captain_id, org_id, status::text s from tournament_teams where id=$1",[poolTeam1]);
check("the team has captain_id set, org_id null, status draft", tm.captain_id===pk1 && tm.org_id===null && tm.s==="draft", JSON.stringify(tm));
let chat1 = await one("select id, org_id from conversations where team_id=$1",[poolTeam1]);
check("a team chat exists with no org_id", !!chat1 && chat1.org_id===null);
let parts1 = (await c.query("select user_id from conversation_participants where conversation_id=$1",[chat1.id])).rows;
check("the chat contains exactly the captain", parts1.length===1 && parts1[0].user_id===pk1, JSON.stringify(parts1));

// Regression guard: a solo (team-of-one) tournament entry must still get no
// chat at all (0039's documented exemption), since both it and a pool team
// share org_id is null.
await asUser(pk2);
r = await tryq("select create_solo_team($1) t",[poolTour]);
check("a solo entry is created", !r.e, r.e?.message);
const soloTeam = r.r?.rows[0]?.t;
await asOwner();
check("a solo entry still gets no chat", !(await one("select 1 x from conversations where team_id=$1",[soloTeam])));
// pk2 now has an active entry for poolTour (the solo team); undo it so pk2
// is free to join a pool team below.
await asUser(pk2); await c.query("select leave_team($1)",[soloTeam]);

// -----------------------------------------------------------------------
// Step 4: invite_to_team pool branch, plus unaffected behavior.
// -----------------------------------------------------------------------
await asUser(pk1);
r = await tryq("select invite_to_team($1,$2) i",[poolTeam1,pk2]);
check("the pool captain invites another independent student", !r.e, r.e?.message);
const poolInv = r.r?.rows[0]?.i;

r = await tryq("select invite_to_team($1,$2)",[poolTeam1,pk2]);
check("duplicate pool invitation refused", !!r.e, r.e?.message);

r = await tryq("select invite_to_team(gen_random_uuid(),$1)",[pk3]);
check("inviting into a nonexistent team still raises 'team not found'", !!r.e && /team not found/.test(r.e.message), r.e?.message);

await asUser(pk3);
r = await tryq("select invite_to_team($1,$2)",[poolTeam1,pk4]);
check("a non-captain independent student cannot invite into someone else's pool team", !!r.e, r.e?.message);

await asUser(pk2);
r = await tryq("select respond_team_invitation($1,true)",[poolInv]);
check("the invited independent student accepts", !r.e, r.e?.message);

// -----------------------------------------------------------------------
// School-team setup (unaffected org_id is not null path of all three
// functions, exercised through the ordinary school flow end to end).
// -----------------------------------------------------------------------
const ownerA = await signup("owner93@x.test", schoolMeta("S93"));
const orgA = (await one("select org_id from organization_members where user_id=$1",[ownerA])).org_id;
await asUser(jamie); await c.query("select verify_school($1)",[orgA]);
await asUser(ownerA); await c.query("select * from invite_students($1,$2)",[orgA, ["s1-93@x.test","s2-93@x.test"]]);
await asOwner();
const tokA = (await one("select join_token t from organizations where id=$1",[orgA])).t;
const S1 = await signup("s1-93@x.test",{join_token:tokA, full_name:"School Stu1"});
const S2 = await signup("s2-93@x.test",{join_token:tokA, full_name:"School Stu2"});
await asUser(ownerA); await c.query("select set_team_slots($1,$2,2)",[schoolTour,orgA]);

await asUser(S1);
r = await tryq("select student_start_team($1,'School Rockets') t",[schoolTour]);
check("a school student starts a school team (org_id is not null path unaffected)", !r.e, r.e?.message);
const schoolTeam = r.r?.rows[0]?.t;

r = await tryq("select invite_to_team($1,$2)",[schoolTeam, pk1]);
check("a school captain still cannot invite an independent student into a school team", !!r.e, r.e?.message);

r = await tryq("select invite_to_team($1,$2) i",[schoolTeam, S2]);
check("a school captain still invites a classmate", !r.e, r.e?.message);
const schoolInv = r.r?.rows[0]?.i;

await asUser(S2);
r = await tryq("select respond_team_invitation($1,true)",[schoolInv]);
check("the classmate accepts", !r.e, r.e?.message);

await asUser(S1);
r = await tryq("select submit_team($1)",[schoolTeam]);
check("the captain submits the full (2-player) school team", !r.e, r.e?.message);
await asOwner();
check("the school team is now proposed", (await one("select status::text s from tournament_teams where id=$1",[schoolTeam])).s==="proposed");

// -----------------------------------------------------------------------
// Step 2: a school team's leave_team behavior at 'proposed' is unchanged --
// still raises, exactly as a non-draft school team always has.
// -----------------------------------------------------------------------
await asUser(S1);
r = await tryq("select leave_team($1)",[schoolTeam]);
check("a school captain still cannot leave a proposed (non-draft) school team", !!r.e, r.e?.message);

// -----------------------------------------------------------------------
// Step 3: a pool team's leave_team succeeds at 'proposed' but raises at
// 'applied'.
// -----------------------------------------------------------------------
await asUser(pk3);
r = await tryq("select start_pool_team($1,'Pool Comets') t",[poolTour]);
check("another independent student starts a second pool team", !r.e, r.e?.message);
const poolTeam2 = r.r?.rows[0]?.t;
await c.query("select invite_to_team($1,$2) i",[poolTeam2, pk4]);
let inv4 = (await one("select id from team_invitations where team_id=$1 and student_id=$2",[poolTeam2,pk4])).id;
await c.query("select invite_to_team($1,$2) i",[poolTeam2, pk5]);
let inv5 = (await one("select id from team_invitations where team_id=$1 and student_id=$2",[poolTeam2,pk5])).id;
await asUser(pk4); await c.query("select respond_team_invitation($1,true)",[inv4]);
await asUser(pk5); await c.query("select respond_team_invitation($1,true)",[inv5]);
await asOwner();
check("the second pool team now has 3 members", (await one("select count(*)::int n from tournament_team_members where team_id=$1",[poolTeam2])).n===3);

// Force the team to 'proposed' directly (as the owner, outside any trusted
// function) purely to exercise leave_team's status branch -- a pool team
// has no submit_team/staff-approval path of its own to reach this status
// through the ordinary flow.
await c.query("update tournament_teams set status='proposed' where id=$1",[poolTeam2]);
await asUser(pk4);
r = await tryq("select leave_team($1)",[poolTeam2]);
check("a pool team member leaves successfully while the team is 'proposed'", !r.e, r.e?.message);

await asOwner();
await c.query("update tournament_teams set status='applied' where id=$1",[poolTeam2]);
await asUser(pk5);
r = await tryq("select leave_team($1)",[poolTeam2]);
check("a pool team member cannot leave once the team has 'applied'", !!r.e, r.e?.message);

await c.query("rollback"); await asOwner();
check("all test rows rolled back", (await one("select count(*)::int n from profiles where email like '%93@x.test' or email like 'pk%@x.test'")).n===0);
console.log(`${pass} passed, ${fail} failed`);
await c.end();
