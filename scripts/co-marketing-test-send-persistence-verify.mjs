/**
 * Campaign Builder dry-run history persistence.
 * Uses a throwaway loopback Postgres cluster. No production database, no SMTP.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pgBin = join("C:\\Program Files\\PostgreSQL\\17\\bin");
const incomingUrl = process.env.DATABASE_URL ?? "";
if (incomingUrl && !/127\.0\.0\.1|localhost/i.test(incomingUrl)) {
  console.log("ignored non-loopback DATABASE_URL");
}
delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const schema = read("prisma/schema.prisma").replaceAll("\r\n", "\n");
const modelStart = schema.indexOf("model EnterpriseMarketingTestSend {");
const modelEnd = schema.indexOf("model EnterpriseMarketingQualification");
assert.ok(modelStart >= 0 && modelEnd > modelStart);
const testSendModel = schema.slice(modelStart, modelEnd);
assert.match(testSendModel, /\n  outcome\s+String\n/);
assert.match(testSendModel, /errorMessage\s+String\?/);
assert.doesNotMatch(schema, /enum\s+\w*TestSendOutcome/);

const service = read("server/services/enterprise-marketing-engine/campaign.service.ts");
assert.match(service, /outcome:\s*delivery\.outcome/);
assert.match(service, /errorMessage:\s*failureReason/);
assert.match(service, /builderDryRun:\s*true/);

const repository = read("src/lib/enterprise-marketing-engine/durability/repositories/prisma.ts");
assert.match(repository, /organizationId_idempotencyKey:\s*\{/);
assert.match(repository, /create:\s*record/);
assert.match(repository, /update:\s*record/);

const adapterSrc = read("server/services/enterprise-marketing-engine/adapters/dry-run-email-delivery.adapter.ts");
assert.match(adapterSrc, /never contacts external ESP\/SMTP/);
assert.doesNotMatch(adapterSrc, /nodemailer|createHostingerSmtp|smtp\.hostinger|tls\.connect|net\.connect/);
assert.match(adapterSrc, /dry-run-\$\{request\.idempotencyKey/);

const migrationHits = read(
  "prisma/migrations/20260905120000_co_marketing_redesign_durable_foundation/migration.sql",
);
assert.match(migrationHits, /"outcome" TEXT NOT NULL/);
assert.match(migrationHits, /"error_message" TEXT/);

function run(bin, args) {
  const result = spawnSync(join(pgBin, bin), args, {
    encoding: "utf8",
    windowsHide: true,
    stdio: "ignore",
  });
  if (result.status !== 0) {
    throw new Error(`${bin} failed (${result.status})`);
  }
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not reserve a loopback port"));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

const dataDir = mkdtempSync(join(tmpdir(), "c1-test-send-pg-"));
const port = await reservePort();
let prisma;

try {
  run("initdb.exe", [
    "-D",
    dataDir,
    "-U",
    "postgres",
    "--auth-local=trust",
    "--auth-host=trust",
    "-E",
    "UTF8",
  ]);
  run("pg_ctl.exe", [
    "-D",
    dataDir,
    "-l",
    join(dataDir, "server.log"),
    "-w",
    "-o",
    `-p ${port} -h 127.0.0.1`,
    "start",
  ]);

  const url = `postgresql://postgres@127.0.0.1:${port}/postgres`;
  assert.match(url, /^postgresql:\/\/postgres@127\.0\.0\.1:\d+\/postgres$/);
  process.env.DATABASE_URL = url;

  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient({ datasources: { db: { url } }, log: [] });
  const statements = [
    `CREATE TABLE "organizations" ("id" TEXT PRIMARY KEY)`,
    `CREATE TABLE "enterprise_marketing_campaigns" ("id" TEXT PRIMARY KEY)`,
    `CREATE TABLE "enterprise_marketing_test_sends" (
      "id" TEXT NOT NULL,
      "organization_id" TEXT NOT NULL,
      "campaign_id" TEXT NOT NULL,
      "campaign_version_id" TEXT NOT NULL,
      "test_recipient_email" TEXT NOT NULL,
      "dry_run" BOOLEAN NOT NULL DEFAULT true,
      "actually_sent" BOOLEAN NOT NULL DEFAULT false,
      "outcome" TEXT NOT NULL,
      "provider_message_id" TEXT,
      "idempotency_key" TEXT NOT NULL,
      "error_message" TEXT,
      "created_by_user_id" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "enterprise_marketing_test_sends_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX "emts_org_idempotency_uidx" ON "enterprise_marketing_test_sends"("organization_id", "idempotency_key")`,
    `ALTER TABLE "enterprise_marketing_test_sends" ADD CONSTRAINT "enterprise_marketing_test_sends_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "enterprise_marketing_test_sends" ADD CONSTRAINT "enterprise_marketing_test_sends_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "enterprise_marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    `INSERT INTO "organizations" ("id") VALUES ('org-dry-run')`,
    `INSERT INTO "enterprise_marketing_campaigns" ("id") VALUES ('camp-dry-run')`,
  ];
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  const safety = await import(
    pathToFileURL(join(root, "src/lib/enterprise-marketing-engine/test-send-safety.ts")).href
  );
  const dryRunPort = await import(
    pathToFileURL(
      join(root, "server/services/enterprise-marketing-engine/adapters/dry-run-email-delivery.adapter.ts"),
    ).href
  );
  const portsModule = await import(
    pathToFileURL(join(root, "src/lib/enterprise-marketing-engine/durability/repositories/prisma.ts")).href
  );

  assert.throws(
    () => safety.assertMarketingBuilderDryRunRecipient("stranger@gmail.com"),
    (error) => error.code === "TEST_RECIPIENT_NOT_ALLOWLISTED",
  );

  const recipient = safety.assertMarketingBuilderDryRunRecipient("  QA@RupeeCatalyst.com  ");
  assert.equal(recipient, "qa@rupeecatalyst.com");
  const delivered = await dryRunPort.createDryRunEmailDeliveryPort().deliver({
    idempotencyKey: "mkt-test:org-dry-run:camp-dry-run:ver-1:qa@rupeecatalyst.com",
    organizationId: "org-dry-run",
    campaignId: "camp-dry-run",
    campaignVersionId: "ver-1",
    batchId: "test-send:camp-dry-run:ver-1:qa@rupeecatalyst.com",
    recipientFingerprint: "email:qa@rupeecatalyst.com",
    recipientEmail: recipient,
    sender: {
      senderIdentityId: "sender-1",
      displayName: "Rupee Catalyst",
      fromAddress: "connect@rupeecatalyst.com",
      replyTo: "connect@rupeecatalyst.com",
    },
    subject: "Dry run",
    htmlBody: "<p>Dry run</p>",
    textBody: "Dry run",
    builderDryRun: true,
  });
  assert.equal(delivered.dryRun, true);
  assert.equal(delivered.outcome, "SENT");
  assert.match(delivered.providerMessageId, /^dry-run-/);

  const ports = portsModule.createPrismaMarketingDurabilityPorts(prisma);
  const record = {
    id: `hist-${delivered.idempotencyKey}`,
    organizationId: "org-dry-run",
    campaignId: "camp-dry-run",
    campaignVersionId: "ver-1",
    testRecipientEmail: recipient,
    dryRun: true,
    actuallySent: false,
    outcome: delivered.outcome,
    idempotencyKey: delivered.idempotencyKey,
    providerMessageId: delivered.providerMessageId,
    errorMessage: null,
    createdByUserId: "user-1",
    createdAt: "2026-11-09T06:30:00.000Z",
    updatedAt: "2026-11-09T06:30:00.000Z",
  };

  async function countRows() {
    const rows = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "enterprise_marketing_test_sends"`;
    return Number(rows[0].count);
  }

  assert.equal(await countRows(), 0);
  const incomplete = { ...record };
  delete incomplete.outcome;
  await assert.rejects(() => ports.testSends.record(incomplete), (error) => {
    assert.equal(error.name, "PrismaClientValidationError");
    assert.match(error.message, /enterpriseMarketingTestSend\.upsert\(\)/);
    assert.match(error.message, /outcome: String/);
    assert.match(error.message, /Argument `outcome` is missing/);
    return true;
  });
  assert.equal(await countRows(), 0, "missing outcome must not write a row");

  const saved = await ports.testSends.record(record);
  assert.equal(saved.outcome, "SENT");
  assert.equal(saved.dryRun, true);
  assert.equal(saved.actuallySent, false);
  assert.equal(saved.errorMessage, null);
  assert.equal(await countRows(), 1);

  const repeated = await ports.testSends.record({
    ...record,
    providerMessageId: `${delivered.providerMessageId}-repeat`,
    updatedAt: "2026-11-09T06:31:00.000Z",
  });
  assert.equal(repeated.providerMessageId, `${delivered.providerMessageId}-repeat`);
  assert.equal(await countRows(), 1, "the same organization and idempotency key must update one row");

  const stored = await prisma.$queryRaw`
    SELECT "outcome", "dry_run", "actually_sent", "error_message", "test_recipient_email", "provider_message_id"
    FROM "enterprise_marketing_test_sends"
  `;
  assert.equal(stored.length, 1);
  assert.equal(stored[0].outcome, "SENT");
  assert.equal(stored[0].dry_run, true);
  assert.equal(stored[0].actually_sent, false);
  assert.equal(stored[0].error_message, null);
  assert.equal(stored[0].test_recipient_email, "qa@rupeecatalyst.com");
  assert.match(stored[0].provider_message_id, /^dry-run-/);

  console.log("co-marketing-test-send-persistence-verify: pass");
} finally {
  if (prisma) await prisma.$disconnect().catch(() => {});
  spawnSync(join(pgBin, "pg_ctl.exe"), ["-D", dataDir, "-m", "fast", "-w", "stop"], {
    encoding: "utf8",
    windowsHide: true,
    stdio: "ignore",
  });
  rmSync(dataDir, { recursive: true, force: true });
  delete process.env.DATABASE_URL;
}
