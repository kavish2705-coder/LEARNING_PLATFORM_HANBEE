import { connect } from "./_db.mjs";
// Pool chat (migration 0095): chat_relation_dir() branch for two independent
// students, pool_chat_conversation_id() singleton, chat_contacts() pagination.
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

const schoolMeta = (name) => ({role:"school_staff", full_name:"Owner "+name, school_name:name, registration_no:"REG-"+name, official_email:"office@"+name.toLowerCase()+".test", guardian_consent:"true"});

await c.query("begin");

// -----------------------------------------------------------------------
// Step 1: two active independent students get a relation; a deactivated
// independent student does not.
// -----------------------------------------------------------------------
const ind1 = await mkIndependent("ind1-95@x.test", "Ind One");
const ind2 = await mkIndependent("ind2-95@x.test", "Ind Two");
const ind3 = await mkIndependent("ind3-95@x.test", "Ind Three");

await asOwner();
let rel = (await one("select chat_relation_dir($1,$2) r",[ind1, ind2])).r;
check("two active independent students get a relation from chat_relation_dir", rel !== null, rel);
rel = (await one("select chat_relation_dir($1,$2) r",[ind2, ind1])).r;
check("the relation holds in the reverse direction too", rel !== null, rel);

await c.query("update profiles set account_status='suspended' where id=$1",[ind3]);
rel = (await one("select chat_relation_dir($1,$2) r",[ind1, ind3])).r;
check("a deactivated independent student gets no relation", rel === null, rel);
rel = (await one("select chat_relation_dir($1,$2) r",[ind3, ind1])).r;
check("...in either direction", rel === null, rel);

// -----------------------------------------------------------------------
// Step 2: a school student and an independent student do NOT get a
// relation (no cross-role leak).
// -----------------------------------------------------------------------
const ownerX = await signup("owner-x-95@x.test", schoolMeta("SchoolX95"));
const orgX = (await one("select org_id from organization_members where user_id=$1",[ownerX])).org_id;
await asUser(jamie); await c.query("select verify_school($1)",[orgX]);
await asUser(ownerX); await c.query("select * from invite_students($1, array['sx1-95@x.test'])",[orgX]);
await asOwner();
const tokX = (await one("select join_token t from organizations where id=$1",[orgX])).t;
const sx1 = await signup("sx1-95@x.test", {join_token: tokX, full_name: "School Student X1"});

rel = (await one("select chat_relation_dir($1,$2) r",[ind1, sx1])).r;
check("an independent student and a school student get no relation (direction 1)", rel === null, rel);
rel = (await one("select chat_relation_dir($1,$2) r",[sx1, ind1])).r;
check("an independent student and a school student get no relation (direction 2)", rel === null, rel);

// -----------------------------------------------------------------------
// pool_chat_conversation_id(): singleton, lazily created.
// -----------------------------------------------------------------------
await asUser(ind1);
let r = await tryq("select pool_chat_conversation_id() v");
check("pool_chat_conversation_id() succeeds for an independent student", !r.e, r.e?.message);
const poolConv1 = r.r?.rows[0]?.v;
check("it returns a conversation id", !!poolConv1);
r = await tryq("select pool_chat_conversation_id() v");
const poolConv2 = r.r?.rows[0]?.v;
check("calling it again returns the same singleton id", poolConv1 === poolConv2, `${poolConv1} vs ${poolConv2}`);

await asUser(ind2);
r = await tryq("select pool_chat_conversation_id() v");
const poolConv3 = r.r?.rows[0]?.v;
check("a different independent student gets the same global pool conversation", poolConv1 === poolConv3, `${poolConv1} vs ${poolConv3}`);

// -----------------------------------------------------------------------
// Step 3: chat_contacts() with p_limit returns a bounded page, not the full pool.
// -----------------------------------------------------------------------
const ind4 = await mkIndependent("ind4-95@x.test", "Ind Four");
const ind5 = await mkIndependent("ind5-95@x.test", "Ind Five");

await asUser(ind1);
r = await tryq("select count(*)::int n from chat_contacts()");
const fullCount = r.r?.rows[0]?.n;
check("chat_contacts() with no args still returns the full set (default unaffected)", !r.e && fullCount >= 3, r.e?.message ?? fullCount);

r = await tryq("select count(*)::int n from chat_contacts($1,$2)", [2, 0]);
check("chat_contacts(p_limit=2) returns a bounded page, not the full pool", !r.e && r.r?.rows[0]?.n === 2, r.e?.message ?? JSON.stringify(r.r?.rows));

r = await tryq("select count(*)::int n from chat_contacts($1,$2)", [1000, 0]);
check("chat_contacts() with a large p_limit still returns the same full count", !r.e && r.r?.rows[0]?.n === fullCount, r.e?.message ?? r.r?.rows[0]?.n);

await c.query("rollback");
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
