import { connect } from "./_db.mjs";

const intentionallyPrivateTables = new Set([
  "ai_chat_minute_usage",
  "ai_chat_usage",
  "ai_daily_capacity",
]);
const db = await connect();

try {
  const { rows } = await db.query(`
    select c.relname as table_name,
           c.relrowsecurity as rls_enabled,
           count(p.oid)::int as policy_count
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_policy p on p.polrelid = c.oid
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
    group by c.oid, c.relname, c.relrowsecurity
    order by c.relname
  `);

  const failures = [];
  for (const table of rows) {
    console.log(
      `${table.rls_enabled ? "RLS" : "NO RLS"} ${table.table_name}: ${table.policy_count} policies`,
    );
    if (!table.rls_enabled) {
      failures.push(`${table.table_name} has RLS disabled`);
    } else if (table.policy_count === 0 && !intentionallyPrivateTables.has(table.table_name)) {
      failures.push(`${table.table_name} has RLS enabled but no policies`);
    }
  }

  for (const tableName of intentionallyPrivateTables) {
    if (!rows.some((table) => table.table_name === tableName)) {
      failures.push(`expected internal table ${tableName} was not found`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Schema access coverage failed:\n- ${failures.join("\n- ")}`);
  }

  console.log(`PASS: ${rows.length} public tables have RLS and policy coverage.`);
} finally {
  await db.end();
}
