import { connect } from "./_db.mjs";
// Queue labeling + rejection notification verification (migration 0096):
// tournament_application_queue() labels a pool team 'Independent Entry' and
// a school team with its org name; decide_team('rejected') on a pool team
// notifies every current member, not just created_by. The school-team path
// and the 'verified' decision must be unaffected.
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

const schoolMeta = (name) => ({role:"school_staff", full_name:"Owner "+name, school_name:name, registration_no:"REG-"+name, official_email:"office96@x.test", guardian_consent:"true"});

await c.query("begin");

const pk1 = await mkIndependent("pk1-96@x.test", "PK One");
const pk2 = await mkIndependent("pk2-96@x.test", "PK Two");
const pk3 = await mkIndependent("pk3-96@x.test", "PK Three");

await asOwner();
const eligiblePoolStudents = [pk1,pk2,pk3];
await c.query("update profiles set tournament_access='active' where id = any($1::uuid[])",[eligiblePoolStudents]);
await c.query(
  "insert into driver_licenses (student_id,status,amount,payment_declared) select unnest($1::uuid[]),'active',1,true",
  [eligiblePoolStudents],
);
const tour = (await one("insert into tournaments (title,status,starts_at,ends_at,venue) values ('Pool96 Cup','upcoming',now()+interval '30 days',now()+interval '31 days','Arena') returning id")).id;

// -----------------------------------------------------------------------
// Step 1: participant_label -- pool team vs school team.
// -----------------------------------------------------------------------
await asUser(pk1);
let r = await tryq("select start_pool_team($1,'Pool Rockets 96') t",[tour]);
check("an independent student starts a pool team", !r.e, r.e?.message);
const poolTeam = r.r?.rows[0]?.t;
await c.query("select invite_to_team($1,$2) i",[poolTeam,pk2]);
let inv = (await one("select id from team_invitations where team_id=$1 and student_id=$2",[poolTeam,pk2])).id;
await asUser(pk2); await c.query("select respond_team_invitation($1,true)",[inv]);
await asUser(pk1); await c.query("select apply_team($1,false)",[poolTeam]);

await asOwner();
let poolStatus = (await one("select status::text s from tournament_teams where id=$1",[poolTeam])).s;
check("the pool team is now applied", poolStatus === "applied", poolStatus);

const ownerA = await signup("owner96@x.test", schoolMeta("S96"));
const orgA = (await one("select org_id from organization_members where user_id=$1",[ownerA])).org_id;
await asUser(jamie); await c.query("select verify_school($1)",[orgA]);
await asUser(ownerA); await c.query("select set_team_slots($1,$2,1)",[tour, orgA]);
await asUser(ownerA); await c.query("select * from invite_students($1,$2)",[orgA, ["s1-96@x.test"]]);
await asOwner();
const tokA = (await one("select join_token t from organizations where id=$1",[orgA])).t;
const S1 = await signup("s1-96@x.test",{join_token:tokA, full_name:"School Stu1 96"});
await asOwner();
await c.query("update profiles set tournament_access='active' where id=$1",[S1]);
await c.query(
  "insert into driver_licenses (student_id,status,amount,payment_declared) values ($1,'active',1,true)",
  [S1],
);
await asUser(S1);
r = await tryq("select student_start_team($1,'School Rockets 96') t",[tour]);
check("a school student starts a school team", !r.e, r.e?.message);
const schoolTeam = r.r?.rows[0]?.t;
await asUser(ownerA); await c.query("select apply_team($1,false)",[schoolTeam]);

await asUser(jamie);
let rows = (await c.query("select team_id, org_id, participant_label, team_name from tournament_application_queue()")).rows;
let poolRow = rows.find(x => x.team_id === poolTeam);
let schoolRow = rows.find(x => x.team_id === schoolTeam);
check("the pool team is labeled 'Independent Entry'", poolRow?.participant_label === "Independent Entry", JSON.stringify(poolRow));
check("the school team is labeled with its org name", schoolRow?.participant_label === "S96", JSON.stringify(schoolRow));

// -----------------------------------------------------------------------
// Step 2: decide_team('rejected') on a pool team notifies every member.
// -----------------------------------------------------------------------
await c.query("delete from notifications where user_id in ($1,$2)",[pk1,pk2]);
await asUser(jamie);
r = await tryq("select decide_team($1,'rejected',$2)",[poolTeam,"rls test rejection"]);
check("staff rejects the pool team", !r.e, r.e?.message);

await asOwner();
let n1 = (await one("select count(*)::int n from notifications where user_id=$1 and kind='team_rejected'",[pk1])).n;
let n2 = (await one("select count(*)::int n from notifications where user_id=$1 and kind='team_rejected'",[pk2])).n;
check("the pool team's creator (pk1) gets a rejection notification", n1 === 1, n1);
check("a non-creator pool member (pk2) also gets a rejection notification", n2 === 1, n2);
await asUser(jamie);
rows = (await c.query("select team_id, status from tournament_application_queue()")).rows;
check("reviewed pool entry remains visible in the staff queue", rows.some(x => x.team_id === poolTeam && x.status === "rejected"), JSON.stringify(rows));

// -----------------------------------------------------------------------
// Step 3: school team rejection is unaffected -- only created_by notified.
// -----------------------------------------------------------------------
await c.query("delete from notifications where user_id in ($1,$2)",[S1,ownerA]);
let schoolCreatedBy = (await one("select created_by from tournament_teams where id=$1",[schoolTeam])).created_by;
await asUser(jamie);
r = await tryq("select decide_team($1,'rejected',$2)",[schoolTeam,"rls test rejection"]);
check("staff rejects the school team", !r.e, r.e?.message);

await asOwner();
let total = (await one("select count(*)::int n from notifications where kind='team_rejected' and user_id = any($1)",[[S1,ownerA]])).n;
let createdByCount = (await one("select count(*)::int n from notifications where kind='team_rejected' and user_id=$1",[schoolCreatedBy])).n;
check("exactly one school-team rejection notification exists (created_by only, unchanged)", total === 1 && createdByCount === 1, `${total} total, ${createdByCount} to created_by`);

await c.query("rollback");
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
