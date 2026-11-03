import { connect } from "./_db.mjs";

// Migration 0100: student-safe registration status, durable payment review
// notes, and published race-result visibility.
const c = await connect();
let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  (ok ? pass++ : fail++);
  console.log(ok ? "PASS" : "FAIL", name, detail);
};
const one = async (sql, params = []) => (await c.query(sql, params)).rows[0];
const asUser = async (userId) => {
  await c.query("reset role");
  await c.query("set local role authenticated");
  await c.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: userId, role: "authenticated" })]);
};
const asOwner = async () => {
  await c.query("reset role");
  await c.query("select set_config('request.jwt.claims','',true)");
};
const tryQuery = async (sql, params = []) => {
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

await c.query("begin");
try {
  const staff = (await one("select id from profiles where role='staff' and approved=true order by created_at limit 1"))?.id;
  const student = (await one("select id from profiles where role='student' and account_status='active' order by created_at limit 1"))?.id;
  const otherStudent = (await one("select id from profiles where role='student' and account_status='active' and id <> $1 order by created_at limit 1", [student]))?.id;
  const tournament = (await one("select id from tournaments order by starts_at desc limit 1"))?.id;

  check("staging has staff, student, second student, and tournament fixtures", Boolean(staff && student && otherStudent && tournament));

  if (staff && student && otherStudent && tournament) {
    const team = (await one(
      "select t.id from tournament_teams t join tournament_team_members m on m.team_id=t.id where t.tournament_id=$1 and m.student_id=$2 and t.status not in ('withdrawn','rejected') limit 1",
      [tournament, student],
    ))?.id;
    check("student has a live team fixture", Boolean(team));

    if (team) {
      await asUser(staff);
      const reject = await tryQuery("select decide_team($1,'rejected','migration 0100 test note')", [team]);
      check("staff can decide a team with a review note", !reject.error, reject.error?.message);

      await asOwner();
      const storedNote = (await one("select review_note from tournament_teams where id=$1", [team]))?.review_note;
      check("the payment review note is persisted", storedNote === "migration 0100 test note", storedNote);

      await asUser(student);
      const own = await tryQuery("select get_my_team_registration_status($1) status", [tournament]);
      check("student can read their registration status", !own.error, own.error?.message);
      const ownStatus = own.result?.rows[0]?.status;
      check("student status includes the persisted review note", ownStatus?.team?.review_note === "migration 0100 test note", JSON.stringify(ownStatus));

      await asUser(otherStudent);
      const denied = await tryQuery("select get_my_team_registration_status($1) status", [tournament]);
      check("a different student cannot receive the rejected student's team status", denied.error || denied.result?.rows[0]?.status?.team === null, denied.error?.message ?? JSON.stringify(denied.result?.rows[0]?.status));
    }
  }
} finally {
  await c.query("rollback");
  await c.end();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
