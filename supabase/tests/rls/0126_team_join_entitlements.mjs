// Regression tests for migration 0126.
import { connect } from "./_db.mjs";

const c = await connect();
const id = async email => (await c.query("select id from profiles where email=$1", [email])).rows[0].id;
const jamie = await id("jamie@hanbeelms.edu");
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  (ok ? pass++ : fail++);
  console.log(ok ? "PASS" : "FAIL", name, detail);
};
const asUser = async userId => {
  await c.query("reset role");
  await c.query("set local role authenticated");
  await c.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: userId, role: "authenticated" })]);
};
const asOwner = async () => {
  await c.query("reset role");
  await c.query("select set_config('request.jwt.claims','',true)");
};
const tryq = async (sql, params = []) => {
  await c.query("savepoint s");
  try {
    const result = await c.query(sql, params);
    await c.query("release savepoint s");
    return { result };
  } catch (error) {
    await c.query("rollback to savepoint s");
    return { error };
  }
};
const one = async (sql, params = []) => (await c.query(sql, params)).rows[0];
const signup = async (email, name) => {
  await asUser(jamie);
  await c.query("select staff_create_independent_invite($1,$2)", [name, email]);
  await asOwner();
  const token = (await one("select token from invitations where email=$1 order by created_at desc limit 1", [email])).token;
  const userId = (await one("select gen_random_uuid() id")).id;
  const result = await tryq("select test_support_signup($1,$2,$3::jsonb)", [
    userId,
    email,
    JSON.stringify({ invite_token: token, full_name: name }),
  ]);
  if (result.error) throw new Error(`signup failed for ${email}: ${result.error.message}`);
  return userId;
};

await c.query("begin");

const captain1 = await signup("gate125-captain1@x.test", "Gate Captain One");
const requester = await signup("gate125-requester@x.test", "Gate Requester");
const captain2 = await signup("gate125-captain2@x.test", "Gate Captain Two");
const invitee = await signup("gate125-invitee@x.test", "Gate Invitee");
const users = [captain1, requester, captain2, invitee];

await asOwner();
await c.query("update profiles set tournament_access='active' where id = any($1::uuid[])", [users]);
await c.query(
  "insert into driver_licenses (student_id, status, amount, payment_declared) select unnest($1::uuid[]), 'active', 1, true",
  [users],
);
const tournament = (await one(
  "insert into tournaments (title,status,starts_at,ends_at,venue) values ('Entitlement Gate 125','upcoming',now()+interval '30 days',now()+interval '31 days','Arena') returning id",
)).id;

await asUser(captain1);
let result = await tryq("select start_pool_team($1,'Entitlement Team One') id", [tournament]);
check("eligible student can start a pool team", !result.error, result.error?.message);
const team1 = result.result?.rows[0]?.id;

await asOwner();
await c.query("update profiles set tournament_access='requested' where id=$1", [requester]);
await asUser(requester);
result = await tryq("select request_join_team($1)", [team1]);
check("student without tournament access cannot request to join", !!result.error, result.error?.message);
await asOwner();
await c.query("update profiles set tournament_access='active' where id=$1", [requester]);
await c.query("update driver_licenses set status='unpaid' where student_id=$1", [requester]);
await asUser(requester);
result = await tryq("select request_join_team($1)", [team1]);
check("student without an active license cannot request to join", !!result.error, result.error?.message);
await asOwner();
await c.query("update driver_licenses set status='active' where student_id=$1", [requester]);
await asUser(requester);
result = await tryq("select request_join_team($1) id", [team1]);
check("eligible student can request to join", !result.error, result.error?.message);
const requestId = result.result?.rows[0]?.id;

await asOwner();
await c.query("update profiles set tournament_access='requested' where id=$1", [requester]);
await asUser(captain1);
result = await tryq("select respond_join_request($1,'accepted')", [requestId]);
check("captain cannot accept a requester without tournament access", !!result.error, result.error?.message);
await asOwner();
await c.query("update profiles set tournament_access='active' where id=$1", [requester]);
await c.query("update driver_licenses set status='unpaid' where student_id=$1", [requester]);
await asUser(captain1);
result = await tryq("select respond_join_request($1,'accepted')", [requestId]);
check("captain cannot accept a requester without an active license", !!result.error, result.error?.message);
await asOwner();
await c.query("update driver_licenses set status='active' where student_id=$1", [requester]);
await asUser(captain1);
result = await tryq("select respond_join_request($1,'accepted')", [requestId]);
check("captain can accept an eligible requester", !result.error, result.error?.message);
await asOwner();
check("accepted requester is added to the team", !!(await one(
  "select 1 from tournament_team_members where team_id=$1 and student_id=$2",
  [team1, requester],
)));

await asUser(captain2);
result = await tryq("select start_pool_team($1,'Entitlement Team Two') id", [tournament]);
check("second eligible student can start a pool team", !result.error, result.error?.message);
const team2 = result.result?.rows[0]?.id;
result = await tryq("select invite_to_team($1,$2) id", [team2, invitee]);
check("captain can invite a student", !result.error, result.error?.message);
const invitationId = result.result?.rows[0]?.id;

await asOwner();
await c.query("update profiles set tournament_access='requested' where id=$1", [invitee]);
await asUser(invitee);
result = await tryq("select respond_team_invitation($1,true)", [invitationId]);
check("invitee without tournament access cannot accept", !!result.error, result.error?.message);
await asOwner();
await c.query("update profiles set tournament_access='active' where id=$1", [invitee]);
await c.query("update driver_licenses set status='unpaid' where student_id=$1", [invitee]);
await asUser(invitee);
result = await tryq("select respond_team_invitation($1,true)", [invitationId]);
check("invitee without an active license cannot accept", !!result.error, result.error?.message);
await asOwner();
await c.query("update driver_licenses set status='active' where student_id=$1", [invitee]);
await asUser(invitee);
result = await tryq("select respond_team_invitation($1,true)", [invitationId]);
check("eligible invitee can accept", !result.error, result.error?.message);
await asOwner();
check("accepted invitee is added to the team", !!(await one(
  "select 1 from tournament_team_members where team_id=$1 and student_id=$2",
  [team2, invitee],
)));

await c.query("rollback");
await asOwner();
check("all test-created accounts are rolled back", (await one(
  "select count(*)::int count from profiles where email like 'gate125-%@x.test'",
)).count === 0);

console.log(`0125 team join entitlements: ${pass} passed, ${fail} failed`);
await c.end();
if (fail) process.exitCode = 1;
