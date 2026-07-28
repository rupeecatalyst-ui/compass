/**
 * CO-QA-005 — Production DB transaction / lock / pool investigation (read-only).
 */
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

function redactUrl(u) {
  if (!u) return null;
  try {
    const url = new URL(u);
    return {
      host: url.hostname,
      port: url.port || (url.protocol === "postgresql:" ? "5432" : ""),
      db: url.pathname.replace(/^\//, ""),
      hasPgbouncer: url.searchParams.get("pgbouncer") === "true",
      connectionLimit: url.searchParams.get("connection_limit"),
      poolTimeout: url.searchParams.get("pool_timeout"),
      sslMode: url.searchParams.get("sslmode"),
      usesPoolerHost: /pooler/i.test(url.hostname),
      uses6543: url.port === "6543",
      uses5432: !url.port || url.port === "5432",
    };
  } catch {
    return { parseError: true };
  }
}

const p = new PrismaClient();

async function main() {
  console.log(
    JSON.stringify(
      {
        DATABASE_URL: redactUrl(process.env.DATABASE_URL),
        DIRECT_URL: redactUrl(process.env.DIRECT_URL),
      },
      null,
      2,
    ),
  );

  const activity = await p.$queryRawUnsafe(`
    SELECT pid, usename, state, wait_event_type, wait_event,
           (now() - xact_start)::text AS xact_age,
           (now() - query_start)::text AS query_age,
           left(query, 180) AS query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
    ORDER BY xact_start NULLS LAST
  `);

  const blocking = await p.$queryRawUnsafe(`
    SELECT blocked.pid AS blocked_pid,
           left(blocked.query, 120) AS blocked_query,
           blocking.pid AS blocking_pid,
           left(blocking.query, 120) AS blocking_query
    FROM pg_stat_activity blocked
    JOIN pg_locks bl ON bl.pid = blocked.pid AND NOT bl.granted
    JOIN pg_locks gl ON gl.locktype = bl.locktype
      AND gl.database IS NOT DISTINCT FROM bl.database
      AND gl.relation IS NOT DISTINCT FROM bl.relation
      AND gl.page IS NOT DISTINCT FROM bl.page
      AND gl.tuple IS NOT DISTINCT FROM bl.tuple
      AND gl.virtualxid IS NOT DISTINCT FROM bl.virtualxid
      AND gl.transactionid IS NOT DISTINCT FROM bl.transactionid
      AND gl.classid IS NOT DISTINCT FROM bl.classid
      AND gl.objid IS NOT DISTINCT FROM bl.objid
      AND gl.objsubid IS NOT DISTINCT FROM bl.objsubid
      AND gl.pid <> bl.pid
      AND gl.granted
    JOIN pg_stat_activity blocking ON blocking.pid = gl.pid
  `);

  const locks = await p.$queryRawUnsafe(`
    SELECT l.locktype, l.mode, l.granted, l.pid,
           c.relname,
           left(a.query, 100) AS query
    FROM pg_locks l
    LEFT JOIN pg_class c ON c.oid = l.relation
    LEFT JOIN pg_stat_activity a ON a.pid = l.pid
    WHERE l.database = (SELECT oid FROM pg_database WHERE datname = current_database())
      AND NOT l.granted
    LIMIT 50
  `);

  const longTx = await p.$queryRawUnsafe(`
    SELECT pid, state, (now() - xact_start)::text AS xact_age, left(query, 160) AS query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND xact_start IS NOT NULL
      AND now() - xact_start > interval '5 seconds'
    ORDER BY xact_start
  `);

  const migrations = await p.$queryRawUnsafe(`
    SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count
    FROM _prisma_migrations
    WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL
       OR migration_name LIKE '%co_dom_001%'
       OR migration_name LIKE '%co_doc_002%'
    ORDER BY started_at DESC NULLS LAST
    LIMIT 20
  `);

  const migrateStatus = await p.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS applied,
           COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS in_progress_or_failed
    FROM _prisma_migrations
  `);

  // Probe interactive transaction start latency
  const t0 = Date.now();
  let txProbe = { ok: false, ms: 0, error: null };
  try {
    await p.$transaction(
      async (tx) => {
        await tx.$queryRawUnsafe(`SELECT 1 AS ok`);
      },
      { maxWait: 5000, timeout: 10000 },
    );
    txProbe = { ok: true, ms: Date.now() - t0, error: null };
  } catch (e) {
    txProbe = {
      ok: false,
      ms: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // Nested pattern like createDeal: outer allocate then inner $transaction
  const t1 = Date.now();
  let nestedProbe = { ok: false, ms: 0, error: null };
  try {
    await p.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(`SELECT 1`);
    });
    await p.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(`SELECT 2`);
    });
    nestedProbe = { ok: true, ms: Date.now() - t1, error: null };
  } catch (e) {
    nestedProbe = {
      ok: false,
      ms: Date.now() - t1,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  console.log(
    JSON.stringify(
      {
        activityCount: activity.length,
        activity,
        blocking,
        ungrantedLocks: locks,
        longRunningTransactions: longTx,
        migrationsFocus: migrations,
        migrateSummary: migrateStatus[0],
        interactiveTxProbe: txProbe,
        sequentialTxProbe: nestedProbe,
      },
      null,
      2,
    ),
  );

  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
