/**
 * Marketing sender identity durability — Prisma SSOT, restart survival, org isolation.
 * Uses an in-memory Prisma stand-in. Never writes production. No new migration.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
const ts = (rel) => pathToFileURL(resolve(root, rel)).href;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-sender-durability-local-jwt-aaaaaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-sender-durability-local-jwt-bbbbbbb";
}

const schema = read("prisma/schema.prisma");
const storeSrc = read("server/services/enterprise-marketing-engine/sender-identity-store.ts");
const campaignStoreSrc = read("server/services/enterprise-marketing-engine/campaign-store.ts");
const pkg = read("package.json");

assert.ok(schema.includes("model EnterpriseMarketingSenderIdentity"));
assert.ok(schema.includes('@@map("enterprise_marketing_sender_identities")'));
assert.ok(storeSrc.includes("isEnterprisePersistencePrisma"));
assert.ok(campaignStoreSrc.includes("isEnterprisePersistencePrisma"));
assert.ok(storeSrc.includes("enterpriseMarketingSenderIdentity"));
assert.ok(storeSrc.includes("SENDER_IDENTITY_PERSISTENCE_FAILED"));
assert.ok(storeSrc.includes("seedIfOrganizationEmpty"));
assert.ok(storeSrc.includes("pg_advisory_xact_lock"));
assert.ok(storeSrc.includes("isSenderPrimaryKeyConflict"));
assert.ok(!storeSrc.includes("mkt-sender-phase1-hostinger-smtp"));
assert.ok(pkg.includes("verify:co-marketing-sender-identity-durability"));
assert.doesNotMatch(storeSrc, /prisma\.migrate|CREATE TABLE|@@unique/);

const migrationsDir = join(root, "prisma/migrations");
assert.ok(existsSync(migrationsDir));
const migrationFolders = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
assert.ok(
  migrationFolders.includes("20260905120000_co_marketing_redesign_durable_foundation"),
  "existing sender identity table migration must remain the SSOT",
);
assert.ok(
  !migrationFolders.some((name) => /sender.identity.durab/i.test(name)),
  "no new sender-identity durability migration may be added",
);

function pkConflict() {
  return Object.assign(new Error("Unique constraint failed on the fields: (`id`)"), {
    code: "P2002",
    meta: { target: ["id"] },
  });
}

function createFakeSenderTable() {
  const rows = new Map();
  return {
    rows,
    async findMany({ where, orderBy }) {
      const list = [...rows.values()].filter((row) => row.organizationId === where.organizationId);
      if (orderBy?.displayName === "asc") {
        list.sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)));
      }
      return list.map((row) => ({ ...row }));
    },
    async findFirst({ where }) {
      const found = [...rows.values()].find((row) => {
        if (where.id && row.id !== where.id) return false;
        if (where.organizationId && row.organizationId !== where.organizationId) return false;
        if (where.fromAddress && row.fromAddress !== where.fromAddress) return false;
        if (typeof where.active === "boolean" && row.active !== where.active) return false;
        if (where.NOT?.id && row.id === where.NOT.id) return false;
        return true;
      });
      return found ? { ...found } : null;
    },
    async create({ data }) {
      if (rows.has(data.id)) throw pkConflict();
      const next = { ...data };
      rows.set(data.id, next);
      return { ...next };
    },
    async update({ where, data }) {
      const prev = rows.get(where.id);
      if (!prev) throw new Error("record not found");
      const next = { ...prev, ...data, id: where.id };
      rows.set(where.id, next);
      return { ...next };
    },
    async updateMany({ where, data }) {
      let count = 0;
      for (const row of rows.values()) {
        if (row.organizationId !== where.organizationId) continue;
        if (row.id === where.id?.not) continue;
        if (typeof where.isDefault === "boolean" && row.isDefault !== where.isDefault) continue;
        Object.assign(row, data);
        count += 1;
      }
      return { count };
    },
  };
}

function createThrowingTable() {
  const boom = () => {
    throw new Error("simulated prisma outage");
  };
  return {
    findMany: boom,
    findFirst: boom,
    create: boom,
    update: boom,
    updateMany: boom,
  };
}

function toRow(overrides) {
  const now = new Date();
  return {
    id: overrides.id,
    organizationId: overrides.organizationId,
    displayName: overrides.displayName ?? "Existing Sender",
    fromAddress: overrides.fromAddress ?? "existing.sender@example.com",
    replyTo: overrides.replyTo ?? "reply@example.com",
    channel: "EMAIL",
    active: overrides.active ?? true,
    isDefault: overrides.isDefault ?? true,
    simulated: overrides.simulated ?? false,
    approvalStatus: overrides.approvalStatus ?? "APPROVED",
    verificationStatus: overrides.verificationStatus ?? "PENDING",
    permittedCampaignCategoriesJson: ["Unspecified"],
    createdByUserId: "admin-1",
    approvedByUserId: "admin-1",
    approvedAt: now,
    lastValidationAt: now,
    validationFreshUntil: now,
    providerType: overrides.providerType ?? "smtp",
    providerProfileId: overrides.providerProfileId ?? "hostinger-smtp",
    createdAt: now,
    updatedAt: now,
  };
}

const storeMod = await import(ts("server/services/enterprise-marketing-engine/sender-identity-store.ts"));
const store = storeMod.marketingSenderIdentityStore;
const table = createFakeSenderTable();

storeMod.configureSenderIdentityStoreForTests({
  prismaDelegate: table,
  forcePrisma: true,
});
store.reset();

const orgA = "org-sender-durability-a";
const orgB = "org-sender-durability-b";
const orgExisting = "org-sender-durability-existing";
const orgConcurrent = "org-sender-durability-concurrent";
const orgDefaults = "org-sender-durability-defaults";
const orgDup = "org-sender-durability-dup";

const missing = await store.get("mkt-sender-unrelated", orgA);
assert.equal(missing, null);
assert.equal(table.rows.size, 0, "get of an unrelated id must not seed a fixture");

const concurrentSeed = await Promise.all([store.list(orgA), store.list(orgA), store.getDefaultActive(orgA)]);
assert.equal(concurrentSeed[0].length, 1);
assert.equal(concurrentSeed[1].length, 1);
assert.equal(concurrentSeed[0][0].id, concurrentSeed[1][0].id);
assert.equal(
  [...table.rows.values()].filter((row) => row.organizationId === orgA).length,
  1,
  "empty organisation seeds exactly one simulated default",
);
assert.equal(concurrentSeed[0][0].simulated, true);
assert.equal(concurrentSeed[0][0].isDefault, true);
assert.ok(!concurrentSeed[0].some((row) => row.id === "mkt-sender-phase1-hostinger-smtp"));

table.rows.set(
  "mkt-sender-existing-smtp",
  toRow({
    id: "mkt-sender-existing-smtp",
    organizationId: orgExisting,
    displayName: "Existing SMTP",
    fromAddress: "opportunities@example.com",
    isDefault: true,
    simulated: false,
  }),
);
const listedExisting = await store.list(orgExisting);
assert.equal(listedExisting.length, 1);
assert.equal(listedExisting[0].id, "mkt-sender-existing-smtp");
assert.equal(listedExisting[0].isDefault, true);
assert.equal(listedExisting[0].simulated, false);
assert.equal(listedExisting[0].displayName, "Existing SMTP");
assert.ok(!listedExisting.some((row) => row.id === `mkt-sender-${orgExisting}-default`));

const lookedUp = await store.get("mkt-sender-missing-other", orgExisting);
assert.equal(lookedUp, null);
assert.equal(
  [...table.rows.values()].filter((row) => row.organizationId === orgExisting).length,
  1,
  "lookup of an unrelated id must not insert a fixture beside an existing sender",
);

const listedAgain = await store.list(orgA);
assert.equal(listedAgain[0].createdAt, concurrentSeed[0][0].createdAt);
assert.equal(listedAgain[0].displayName, concurrentSeed[0][0].displayName);

const originalDefaultName = listedAgain[0].displayName;
const mutatedDefault = await store.upsert({
  organizationId: orgA,
  id: listedAgain[0].id,
  displayName: "Renamed Default Sender",
  fromAddress: listedAgain[0].fromAddress,
  replyTo: listedAgain[0].replyTo,
  simulated: true,
  isDefault: true,
});
assert.equal(mutatedDefault.displayName, "Renamed Default Sender");
assert.notEqual(originalDefaultName, mutatedDefault.displayName);

const durable = await store.upsert({
  organizationId: orgA,
  id: "mkt-sender-durable-custom",
  displayName: "Durable SMTP Sender",
  fromAddress: "durable.sender@example.com",
  replyTo: "reply@example.com",
  simulated: false,
  isDefault: true,
  approvalStatus: "DRAFT",
  providerType: "smtp",
  providerProfileId: "hostinger-smtp",
});
assert.equal(durable.id, "mkt-sender-durable-custom");
assert.equal(durable.isDefault, true);
assert.equal(durable.providerMapping.providerType, "smtp");
assert.equal(durable.providerMapping.providerProfileId, "hostinger-smtp");

const afterDefaultFlip = await store.get(listedAgain[0].id, orgA);
assert.equal(afterDefaultFlip.isDefault, false);

const sameId = await store.upsert({
  organizationId: orgA,
  id: "mkt-sender-durable-custom",
  displayName: "Durable SMTP Sender Updated",
  fromAddress: "durable.sender@example.com",
  replyTo: "reply@example.com",
  simulated: false,
  isDefault: true,
  approvalStatus: "DRAFT",
  providerType: "smtp",
  providerProfileId: "hostinger-smtp",
});
assert.equal(sameId.createdAt, durable.createdAt);
assert.equal(sameId.displayName, "Durable SMTP Sender Updated");

let duplicateBlocked = false;
try {
  await store.upsert({
    organizationId: orgA,
    displayName: "Clone",
    fromAddress: "durable.sender@example.com",
    simulated: false,
  });
} catch (err) {
  duplicateBlocked = err?.code === "DUPLICATE_SENDER_FROM_ADDRESS";
}
assert.equal(duplicateBlocked, true);

await store.list(orgDefaults);
const firstDefault = (await store.list(orgDefaults))[0];
const [flipA, flipB] = await Promise.all([
  store.upsert({
    organizationId: orgDefaults,
    id: "mkt-sender-defaults-a",
    displayName: "Default A",
    fromAddress: "default.a@example.com",
    simulated: false,
    isDefault: true,
  }),
  store.upsert({
    organizationId: orgDefaults,
    id: "mkt-sender-defaults-b",
    displayName: "Default B",
    fromAddress: "default.b@example.com",
    simulated: false,
    isDefault: true,
  }),
]);
assert.equal(flipA.isDefault || flipB.isDefault, true);
const defaultsAfter = await store.list(orgDefaults);
assert.equal(defaultsAfter.filter((row) => row.isDefault).length, 1);
assert.equal(defaultsAfter.find((row) => row.id === firstDefault.id)?.isDefault, false);

await store.upsert({
  organizationId: orgDup,
  id: "mkt-sender-dup-original",
  displayName: "Original",
  fromAddress: "shared.sender@example.com",
  simulated: false,
  isDefault: true,
});
const dupResults = await Promise.allSettled([
  store.upsert({
    organizationId: orgDup,
    id: "mkt-sender-dup-one",
    displayName: "Dup One",
    fromAddress: "shared.sender@example.com",
    simulated: false,
  }),
  store.upsert({
    organizationId: orgDup,
    id: "mkt-sender-dup-two",
    displayName: "Dup Two",
    fromAddress: "shared.sender@example.com",
    simulated: false,
  }),
]);
assert.ok(dupResults.every((result) => result.status === "rejected"));
assert.ok(
  dupResults.every(
    (result) => result.status === "rejected" && result.reason?.code === "DUPLICATE_SENDER_FROM_ADDRESS",
  ),
);
assert.equal(
  [...table.rows.values()].filter(
    (row) => row.organizationId === orgDup && row.fromAddress === "shared.sender@example.com" && row.active,
  ).length,
  1,
);

const orgDupFresh = "org-sender-durability-dup-fresh";
const freshDup = await Promise.allSettled([
  store.upsert({
    organizationId: orgDupFresh,
    id: "mkt-sender-fresh-one",
    displayName: "Fresh One",
    fromAddress: "fresh.shared@example.com",
    simulated: false,
    isDefault: true,
  }),
  store.upsert({
    organizationId: orgDupFresh,
    id: "mkt-sender-fresh-two",
    displayName: "Fresh Two",
    fromAddress: "fresh.shared@example.com",
    simulated: false,
    isDefault: true,
  }),
]);
const freshAccepted = freshDup.filter((result) => result.status === "fulfilled");
const freshRejected = freshDup.filter(
  (result) => result.status === "rejected" && result.reason?.code === "DUPLICATE_SENDER_FROM_ADDRESS",
);
assert.equal(freshAccepted.length, 1);
assert.equal(freshRejected.length, 1);
assert.equal(
  [...table.rows.values()].filter(
    (row) => row.organizationId === orgDupFresh && row.fromAddress === "fresh.shared@example.com" && row.active,
  ).length,
  1,
);

const orgBDefault = await store.getDefaultActive(orgB);
assert.ok(orgBDefault);
assert.equal(orgBDefault.organizationId, orgB);
assert.equal(await store.get("mkt-sender-durable-custom", orgB), null);
const orgBList = await store.list(orgB);
assert.equal(orgBList.length, 1);
assert.ok(orgBList.every((row) => row.organizationId === orgB));

const orgABeforeRestart = await store.list(orgA);
assert.equal(orgABeforeRestart.length, 2);
assert.ok(orgABeforeRestart.some((row) => row.id === "mkt-sender-durable-custom"));
assert.ok(orgABeforeRestart.some((row) => row.id === `mkt-sender-${orgA}-default`));

store.reset();
assert.ok(table.rows.size >= 3, "durable table must survive process-local reset");

const afterRestart = await store.list(orgA);
assert.equal(afterRestart.length, 2);
const restoredCustom = afterRestart.find((row) => row.id === "mkt-sender-durable-custom");
const restoredDefault = afterRestart.find((row) => row.id === `mkt-sender-${orgA}-default`);
assert.ok(restoredCustom);
assert.ok(restoredDefault);
assert.equal(restoredCustom.displayName, "Durable SMTP Sender Updated");
assert.equal(restoredCustom.isDefault, true);
assert.equal(restoredCustom.providerMapping.providerType, "smtp");
assert.equal(restoredDefault.displayName, "Renamed Default Sender");
assert.equal(restoredDefault.isDefault, false);
assert.ok(!afterRestart.some((row) => row.id === "mkt-sender-phase1-hostinger-smtp"));

const defaultAfterRestart = await store.getDefaultActive(orgA);
assert.equal(defaultAfterRestart.id, "mkt-sender-durable-custom");

assert.equal((await store.list(orgB)).length, 1);

const concurrentEmpty = await Promise.all([
  store.list(orgConcurrent),
  store.list(orgConcurrent),
  store.list(orgConcurrent),
]);
assert.ok(concurrentEmpty.every((rows) => rows.length === 1));
assert.equal(
  [...table.rows.values()].filter((row) => row.organizationId === orgConcurrent).length,
  1,
);

storeMod.configureSenderIdentityStoreForTests({
  prismaDelegate: createThrowingTable(),
  forcePrisma: true,
});
store.reset();
let failedClosed = false;
try {
  await store.list(orgA);
} catch (err) {
  failedClosed = err?.code === "SENDER_IDENTITY_PERSISTENCE_FAILED";
}
assert.equal(failedClosed, true, "prisma failures must fail closed");

storeMod.configureSenderIdentityStoreForTests({ pinMemory: true });
store.reset();
console.log("OK: marketing sender identity durability");
