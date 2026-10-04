/**
 * Representative pre-migration BAT on the isolated pre database only.
 * Holds later worktree migrations, inserts fixtures, then applies remaining SQL.
 * Never prints passwords. Never touches production.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PARENT_NM = "C:\\Compass by Rupee Catalyst (3)\\node_modules";
const secret = JSON.parse(readFileSync(join(root, ".tmp/ppo-bat.secret.json"), "utf8"));
const dbIdx = process.argv.indexOf("--database");
const PRE_DB = dbIdx >= 0 ? process.argv[dbIdx + 1] : null;
if (!PRE_DB || PRE_DB.startsWith("-")) {
  throw new Error("Required: --database <name>. Refusing to default to a tainted BAT database.");
}
const FORBIDDEN = new Set([
  "catalyst_one_product_program_bat_001",
  "catalyst_one_product_program_bat_pre_001",
  "catalyst_one_product_program_bat_clean_002",
  "ppo_sql_preflight_review_001",
]);
if (FORBIDDEN.has(PRE_DB)) {
  throw new Error(`Refusing to mutate preserved evidence database ${PRE_DB}.`);
}
const HOST = "127.0.0.1";
const migrationsDir = join(root, "prisma/migrations");
const holdDir = join(root, ".tmp/held-migrations");
const LATER = [
  "20260906133000_co_advantage_committed_visibility",
  "20260906180000_co_product_program_operations_001",
  "20260906184500_co_product_program_operations_001_strict_publication",
];

function urlFor(db) {
  return `postgresql://${encodeURIComponent(secret.user)}:${encodeURIComponent(secret.password)}@${HOST}:${secret.port}/${db}?schema=public`;
}

function redact(text) {
  return String(text)
    .replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@")
    .replace(/password[=:]\s*\S+/gi, "password=***");
}

const { Client } = createRequire(join(root, ".tmp/pg-embed/node_modules/pg/package.json"))("pg");

function hold(names) {
  mkdirSync(holdDir, { recursive: true });
  for (const name of names) {
    const from = join(migrationsDir, name);
    const to = join(holdDir, name);
    if (existsSync(from) && !existsSync(to)) renameSync(from, to);
  }
}

function restore(names) {
  for (const name of names) {
    const from = join(holdDir, name);
    const to = join(migrationsDir, name);
    if (existsSync(from) && !existsSync(to)) renameSync(from, to);
  }
}

function runPrisma(args) {
  if (args.includes("resolve") || args.some((arg) => String(arg).includes("_prisma_migrations"))) {
    throw new Error("migrate resolve and catalogue manipulation are forbidden.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(PARENT_NM, "prisma/build/index.js"), ...args], {
      cwd: root,
      env: {
        ...process.env,
        NODE_PATH: PARENT_NM,
        DATABASE_URL: urlFor(PRE_DB),
        DIRECT_URL: urlFor(PRE_DB),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => process.stdout.write(redact(chunk)));
    child.stderr.on("data", (chunk) => process.stderr.write(redact(chunk)));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`prisma ${args.join(" ")} exited ${code}`));
    });
  });
}

async function withClient(fn) {
  const client = new Client({ connectionString: urlFor(PRE_DB) });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

function programInsert({ id, code, label, status, lifecycle, enabled, policy, lod, roi, archived, deleted }) {
  return {
    text: `INSERT INTO "enterprise_lender_programs" (
      "id","organization_id","lender_id","product_code","code","label",
      "lifecycle_status","status","enabled","version_number",
      "credit_risk_policy_ref","required_document_type_ids",
      "roi_percent","min_roi_percent","max_roi_percent",
      "is_deleted","approval_status","created_by","modified_by","created_at","updated_at"
    ) VALUES (
      $1,$2,$3,'HOME_LOAN',$4,$5,
      $6::"LenderProgramLifecycleStatus",$7::"RegistryStatus",$8,1,
      $9,$10::jsonb,
      $11,$11,$11,
      $12,'none','prestate','prestate',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
    )`,
    values: [
      id,
      "org_ppo_bat",
      "lender_ppo_bat",
      code,
      label,
      archived ? "archived" : lifecycle,
      archived ? "archived" : status,
      enabled,
      policy,
      lod,
      roi,
      Boolean(deleted),
    ],
  };
}

const results = [];
function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(JSON.stringify({ id, ok, detail }));
  if (!ok) throw new Error(`${id} FAIL: ${JSON.stringify(detail)}`);
}

async function assertFinal(client) {
  const surviving = await client.query(`
    SELECT "id","code","status","lifecycle_status","completeness_state","publication_state","is_live_published","is_deleted",
           "credit_risk_policy_ref","required_document_type_ids","roi_percent","min_roi_exact"
    FROM "enterprise_lender_programs" ORDER BY "code"
  `);
  record("NO-DELETES", surviving.rows.length === 10, { count: surviving.rows.length });
  const live = surviving.rows.filter((row) => row.is_live_published === true);
  record("NO-THIN-LIVE", live.length === 0, { live: live.map((row) => row.code) });
  const archived = surviving.rows.find((row) => row.id === "prog_archived");
  record("ARCHIVED-REMAINS", archived?.publication_state === "archived" && archived?.lifecycle_status === "archived" && archived?.status === "archived", {
    publication_state: archived?.publication_state,
    lifecycle_status: archived?.lifecycle_status,
    status: archived?.status,
  });
  const archivedIncomplete = surviving.rows.find((row) => row.id === "prog_archived_incomplete");
  record(
    "ARCHIVED-INCOMPLETE-REMAINS",
    archivedIncomplete?.publication_state === "archived" &&
      archivedIncomplete?.lifecycle_status === "archived" &&
      archivedIncomplete?.status === "archived" &&
      archivedIncomplete?.is_live_published === false,
    {
      publication_state: archivedIncomplete?.publication_state,
      lifecycle_status: archivedIncomplete?.lifecycle_status,
      status: archivedIncomplete?.status,
    },
  );
  const deleted = surviving.rows.find((row) => row.id === "prog_deleted");
  record(
    "DELETED-UNCHANGED",
    deleted?.is_deleted === true && deleted?.status === "active" && deleted?.lifecycle_status === "active",
    { is_deleted: deleted?.is_deleted, status: deleted?.status, lifecycle_status: deleted?.lifecycle_status },
  );
  const stub = surviving.rows.find((row) => row.id === "prog_empty_stub");
  record("STUB-DRAFT-INCOMPLETE", stub?.completeness_state === "incomplete" && stub?.publication_state === "draft", {
    completeness_state: stub?.completeness_state,
    publication_state: stub?.publication_state,
  });
  const complete = surviving.rows.find((row) => row.id === "prog_complete_active");
  record("NO-FABRICATED-POLICY", complete?.credit_risk_policy_ref === "policy-ref-1", {
    credit_risk_policy_ref: complete?.credit_risk_policy_ref,
  });
  record("NO-FABRICATED-LOD", JSON.stringify(complete?.required_document_type_ids) === JSON.stringify(["doc:pan"]), {
    required_document_type_ids: complete?.required_document_type_ids,
  });
  record("NO-FABRICATED-ROI-EXACT", complete?.min_roi_exact == null, { min_roi_exact: complete?.min_roi_exact });
  record(
    "COMPLETE-ACTIVE-REGISTRY-VISIBLE",
    complete?.status === "active" &&
      complete?.lifecycle_status === "active" &&
      complete?.publication_state === "published" &&
      complete?.completeness_state === "incomplete" &&
      complete?.is_live_published === false,
    {
      status: complete?.status,
      lifecycle_status: complete?.lifecycle_status,
      publication_state: complete?.publication_state,
      completeness_state: complete?.completeness_state,
      is_live_published: complete?.is_live_published,
    },
  );
  const opps = await client.query(`
    SELECT "id", "advantage_committed_amount" AS amt
    FROM "enterprise_opportunities" ORDER BY "id"
  `);
  const setRow = opps.rows.find((row) => row.id === "opp_set_adv");
  const nullRow = opps.rows.find((row) => row.id === "opp_null_adv");
  record("ADV-PRESERVED", Number(setRow?.amt) === 12345, { amt: setRow?.amt });
  record("ADV-NULL-UNCHANGED", nullRow?.amt == null, { amt: nullRow?.amt });
  const deal = await client.query(`SELECT "id","lender_program_id","snapshot" FROM "enterprise_deals" WHERE "id"='deal_pre_001'`);
  record("DEAL-SURVIVED", deal.rows[0]?.lender_program_id === "prog_complete_active", {
    lender_program_id: deal.rows[0]?.lender_program_id,
  });
  const stamp = deal.rows[0]?.snapshot?.publishedProgrammeStamp;
  record(
    "DEAL-STAMP-UNCHANGED",
    stamp?.programmeId === "prog_complete_active" && stamp?.programmeCode === "PRE-COMPLETE" && stamp?.programmeVersion === 1,
    stamp ?? null,
  );
  const payee = await client.query(`SELECT COUNT(*)::int AS n FROM "enterprise_accounting_payees"`);
  record("ACCOUNTING-SURVIVED", payee.rows[0].n === 1, payee.rows[0]);
}

if (process.argv.includes("--assert")) {
  await withClient(assertFinal);
  console.log(JSON.stringify({ ok: true, database: PRE_DB, results }));
  process.exit(0);
}

try {
  hold(LATER);
  console.log(JSON.stringify({ phase: "pre-cutoff migrate", database: PRE_DB, host: HOST, port: secret.port }));
  await runPrisma(["migrate", "deploy"]);

  await withClient(async (client) => {
    await client.query(`
      INSERT INTO "organizations" ("id","slug","name","is_active","created_at","updated_at")
      VALUES ('org_ppo_bat','ppo-bat-pre','PPO BAT Pre',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO NOTHING
    `);
    await client.query(`
      INSERT INTO "enterprise_lender_categories" (
        "id","organization_id","code","label","sort_order","status","enabled",
        "version_number","is_deleted","approval_status","created_by","modified_by","created_at","updated_at"
      ) VALUES (
        'cat_ppo_bat','org_ppo_bat','HFC','Housing Finance',1,'active',true,
        1,false,'none','prestate','prestate',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
      ) ON CONFLICT ("id") DO NOTHING
    `);
    await client.query(`
      INSERT INTO "enterprise_lenders" (
        "id","organization_id","category_id","code","label","institution_category",
        "lifecycle_status","operational_status","status","enabled","version_number",
        "is_deleted","approval_status","created_by","modified_by","created_at","updated_at"
      ) VALUES (
        'lender_ppo_bat','org_ppo_bat','cat_ppo_bat','FIXHFC','Fixture Housing Finance','hfc',
        'active','active','active',true,1,
        false,'none','prestate','prestate',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
      ) ON CONFLICT ("id") DO NOTHING
    `);

    const programs = [
      programInsert({
        id: "prog_complete_active",
        code: "PRE-COMPLETE",
        label: "Pre complete active",
        status: "active",
        lifecycle: "active",
        enabled: true,
        policy: "policy-ref-1",
        lod: '["doc:pan"]',
        roi: 8.4,
        archived: false,
      }),
      programInsert({
        id: "prog_empty_stub",
        code: "PRE-STUB",
        label: "Pre empty stub",
        status: "draft",
        lifecycle: "draft",
        enabled: true,
        policy: null,
        lod: "[]",
        roi: null,
        archived: false,
      }),
      programInsert({
        id: "prog_partial",
        code: "PRE-PARTIAL",
        label: "Pre partial",
        status: "draft",
        lifecycle: "draft",
        enabled: true,
        policy: "policy-ref-1",
        lod: "[]",
        roi: null,
        archived: false,
      }),
      programInsert({
        id: "prog_policy_no_lod",
        code: "PRE-POL-NO-LOD",
        label: "Pre policy no LOD",
        status: "active",
        lifecycle: "active",
        enabled: true,
        policy: "policy-ref-1",
        lod: "[]",
        roi: null,
        archived: false,
      }),
      programInsert({
        id: "prog_lod_no_policy",
        code: "PRE-LOD-NO-POL",
        label: "Pre LOD no policy",
        status: "active",
        lifecycle: "active",
        enabled: true,
        policy: null,
        lod: '["doc:pan"]',
        roi: null,
        archived: false,
      }),
      programInsert({
        id: "prog_roi_incomplete",
        code: "PRE-ROI-INCOMPLETE",
        label: "Pre ROI incomplete",
        status: "active",
        lifecycle: "active",
        enabled: true,
        policy: null,
        lod: "[]",
        roi: 9.1,
        archived: false,
      }),
      programInsert({
        id: "prog_draft",
        code: "PRE-DRAFT",
        label: "Pre draft",
        status: "draft",
        lifecycle: "draft",
        enabled: true,
        policy: "policy-ref-1",
        lod: '["doc:pan"]',
        roi: 8.5,
        archived: false,
      }),
      programInsert({
        id: "prog_archived",
        code: "PRE-ARCHIVED",
        label: "Pre archived",
        status: "archived",
        lifecycle: "archived",
        enabled: false,
        policy: "policy-ref-1",
        lod: '["doc:pan"]',
        roi: 8.2,
        archived: true,
      }),
      programInsert({
        id: "prog_archived_incomplete",
        code: "PRE-ARCH-INCOMPLETE",
        label: "Pre archived incomplete",
        status: "archived",
        lifecycle: "archived",
        enabled: false,
        policy: null,
        lod: "[]",
        roi: null,
        archived: true,
      }),
      programInsert({
        id: "prog_deleted",
        code: "PRE-DELETED",
        label: "Pre deleted",
        status: "active",
        lifecycle: "active",
        enabled: true,
        policy: null,
        lod: "[]",
        roi: null,
        archived: false,
        deleted: true,
      }),
    ];
    for (const stmt of programs) {
      await client.query(stmt.text, stmt.values);
    }

    await client.query(`
      INSERT INTO "enterprise_opportunities" (
        "id","organization_id","opportunity_number","product_code","product_family",
        "requirement_stage","stage_entered_at","primary_borrower_kind","currency_code",
        "updated_at"
      ) VALUES
        ('opp_null_adv','org_ppo_bat','OPP-PRE-001','HOME_LOAN','lending','lead',CURRENT_TIMESTAMP,'company','INR',CURRENT_TIMESTAMP),
        ('opp_set_adv','org_ppo_bat','OPP-PRE-002','HOME_LOAN','lending','lead',CURRENT_TIMESTAMP,'company','INR',CURRENT_TIMESTAMP)
    `);

    await client.query(`
      INSERT INTO "enterprise_deals" (
        "id","organization_id","deal_number","opportunity_id","lender_id","lender_program_id",
        "product_family","gross_stage","stage_entered_at","updated_at","snapshot"
      ) VALUES (
        'deal_pre_001','org_ppo_bat','DEAL-PRE-001','opp_null_adv','lender_ppo_bat','prog_complete_active',
        'lending','identified',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,
        '{"publishedProgrammeStamp":{"lenderId":"lender_ppo_bat","programmeId":"prog_complete_active","programmeCode":"PRE-COMPLETE","programmeVersion":1,"policyVersionId":null,"roiRange":null,"eligibilityBasis":"prestate","requiredDocuments":["doc:pan"],"effectiveFrom":null,"stampedAt":"2026-01-01T00:00:00.000Z","lineageId":"prog_complete_active"}}'::jsonb
      )
    `);

    await client.query(`
      INSERT INTO "enterprise_accounting_payees" (
        "id","organization_id","payee_type","legal_name","billing_name","display_name",
        "enabled","created_at","updated_at","is_deleted"
      ) VALUES (
        'payee_pre_001','org_ppo_bat','other','Pre Payee','Pre Payee','Pre Payee',
        true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false
      )
    `);

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM "enterprise_lender_programs") AS programs,
        (SELECT COUNT(*)::int FROM "enterprise_opportunities") AS opportunities,
        (SELECT COUNT(*)::int FROM "enterprise_deals") AS deals,
        (SELECT COUNT(*)::int FROM "enterprise_accounting_payees") AS payees
    `);
    record("PRE-FIXTURES", true, counts.rows[0]);
  });

  restore(["20260906133000_co_advantage_committed_visibility"]);
  await runPrisma(["migrate", "deploy"]);

  await withClient(async (client) => {
    const before = await client.query(`
      SELECT "id", "advantage_committed_amount" AS amt
      FROM "enterprise_opportunities" ORDER BY "id"
    `);
    const nullCount = before.rows.filter((row) => row.amt == null).length;
    record("ADV-AFTER-133000-NULL", nullCount === 2, { nullCount, rows: before.rows.length });
    await client.query(`
      UPDATE "enterprise_opportunities"
      SET "advantage_committed_amount" = 12345.00, "advantage_committed_currency" = 'INR'
      WHERE "id" = 'opp_set_adv'
    `);
  });

  restore([
    "20260906180000_co_product_program_operations_001",
    "20260906184500_co_product_program_operations_001_strict_publication",
  ]);
  await runPrisma(["migrate", "deploy"]);

  await withClient(assertFinal);

  console.log(JSON.stringify({ ok: true, database: PRE_DB, results }));
} catch (err) {
  restore(LATER);
  throw err;
} finally {
  restore(LATER);
}
