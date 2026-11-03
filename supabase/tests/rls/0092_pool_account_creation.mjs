import { connect } from "./_db.mjs";
// Staff-only independent account creation (migration 0092):
// staff_create_independent_invite() issues a solo-student invite, accepted
// through the existing handle_new_user() trigger, and is_solo can no longer
// be flipped to true by a plain client-side profile update.
const c = await connect();
const id = async e => (await c.query("select id from profiles where email=$1",[e])).rows[0].id;
const jamie=await id("jamie@hanbeelms.edu"), morgan=await id("morgan@hanbeelms.edu"), ava=await id("ava@student.edu");
let pass=0, fail=0; const check=(n,ok,x="")=>{(ok?pass++:fail++);console.log(ok?"PASS":"FAIL",n,x)};
const asUser = async (u) => { await c.query("reset role"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:u,role:"authenticated"})]); };
const asAnon = async () => { await c.query("reset role"); await c.query("set local role anon"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:"anon"})]); };
const asOwner = async () => { await c.query("reset role"); await c.query("select set_config('request.jwt.claims','',true)"); };
const tryq = async (sql,p)=>{ await c.query("savepoint s"); try{const r=await c.query(sql,p); await c.query("release savepoint s"); return {r};}catch(e){await c.query("rollback to savepoint s"); return {e};} };
const one = async (sql,p) => (await c.query(sql,p)).rows[0];
const signup = async (email, meta) => { await asOwner(); const uid = (await one("select gen_random_uuid() u")).u;
  const r = await tryq("select test_support_signup($1,$2,$3::jsonb)",[uid,email,JSON.stringify(meta)]);
  return { ...r, uid }; };

await c.query("begin");

// Step 1: a non-staff caller cannot call staff_create_independent_invite.
await asUser(ava);
let r = await tryq("select staff_create_independent_invite('Road Kid','rk1@x.test')");
check("student cannot call staff_create_independent_invite", !!r.e, r.e?.message);

await asAnon();
r = await tryq("select staff_create_independent_invite('Road Kid','rk2@x.test')");
check("anonymous cannot call staff_create_independent_invite", !!r.e, r.e?.message);

// Step 4: Hanbee staff can call it; the resulting accepted profile has
// is_solo=true, org_id=null.
await asUser(jamie);
r = await tryq("select staff_create_independent_invite('Road Kid','rk3@x.test') v");
check("Hanbee staff can call staff_create_independent_invite", !r.e, r.e?.message);
// staff_create_independent_invite() now returns jsonb ({id, token,
// full_name, email, expires_at} -- see 0110_payment_qr_and_reference.sql),
// not a bare uuid, so the frontend's IndependentInvite type can carry the
// token/expiry straight back without a second round trip.
const invId = r.r.rows[0].v.id;
check("it returns the invitation's uuid", typeof invId === "string" && invId.length === 36, invId);

await asOwner();
const inv = await one("select org_id, role, accepted, full_name from invitations where id=$1",[invId]);
check("the invite row has org_id null, role student, recorded full_name", inv.org_id===null && inv.role==="student" && inv.accepted===false && inv.full_name==="Road Kid", JSON.stringify(inv));
const tok = (await one("select token t from invitations where id=$1",[invId])).t;

r = await signup("rk3@x.test", {invite_token: tok});
check("the invite is accepted via ordinary signup", !r.e, r.e?.message);
const rk3 = r.uid;
const prof = await one("select role, is_solo, full_name from profiles where id=$1",[rk3]);
check("accepted profile is role=student, is_solo=true", prof.role==="student" && prof.is_solo===true, JSON.stringify(prof));
check("accepted profile has no organization_members row (org_id=null in effect)", !(await one("select 1 x from organization_members where user_id=$1",[rk3])));
check("accepted profile's full_name falls back to the invite's recorded name", prof.full_name==="Road Kid", JSON.stringify(prof));

// A manager may also issue an independent invite.
await asUser(morgan);
r = await tryq("select staff_create_independent_invite('Another Kid','rk4@x.test')");
check("a manager can also call staff_create_independent_invite", !r.e, r.e?.message);

// Validation: duplicate pending invite, missing name, bad email, taken email.
await asUser(jamie);
r = await tryq("select staff_create_independent_invite('Dup','rk3@x.test')");
check("a second invite for an email with a still-pending invite is refused", !!r.e, r.e?.message);
r = await tryq("select staff_create_independent_invite('', 'rk5@x.test')");
check("an empty full name is refused", !!r.e, r.e?.message);
r = await tryq("select staff_create_independent_invite('Bad Email','not-an-email')");
check("an invalid email is refused", !!r.e, r.e?.message);
r = await tryq("select staff_create_independent_invite('Null Email', null)");
check("a null email is refused", !!r.e, r.e?.message);
r = await tryq("select staff_create_independent_invite('Taken','ava@student.edu')");
check("an email already in use by a profile is refused", !!r.e, r.e?.message);

// Guard: is_solo can no longer be set true through a plain client update to
// one's own profile row (only through the trusted invite/accept path above,
// or convert_to_solo()/join_school(), which still work via the trusted flag).
// ava is seeded with is_solo=true already, so first force it false (as the
// owner, which bypasses the guard entirely) to get a clean starting point.
await asOwner();
await c.query("update profiles set is_solo = false where id = $1",[ava]);
await asUser(ava);
await c.query("update profiles set is_solo = true where id = $1",[ava]);
check("a student's direct self-update cannot flip is_solo to true", (await one("select is_solo from profiles where id=$1",[ava])).is_solo === false);

// A direct insert into invitations bypassing the RPC is still blocked by guard_invitation() for non-staff.
await asAnon();
r = await tryq("insert into invitations (email, role, full_name) values ('rk6@x.test','student','X')");
check("anonymous cannot insert an independent invitation directly", !!r.e, r.e?.message);

await c.query("rollback"); await asOwner();
check("all test rows rolled back", (await one("select count(*)::int n from profiles where email like '%@x.test'")).n===0);
console.log(`${pass} passed, ${fail} failed`);
await c.end();
