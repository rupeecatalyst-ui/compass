/**
 * Marketing sender identity inspect — Prisma findFirst by fromAddress.
 * Read-only. Never writes production. No seed, lock, list, or memory fallback.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
const ts = (rel) => pathToFileURL(resolve(root, rel)).href;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-sender-inspect-local-jwt-aaaaaaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-sender-inspect-local-jwt-bbbbbbbb";
}

const storeSrc = read("server/services/enterprise-marketing-engine/sender-identity-store.ts");
const serviceSrc = read("server/services/enterprise-marketing-engine/sender.service.ts");
const routeSrc = read("src/app/api/admin/marketing/sender-identities/route.ts");
const pkg = read("package.json");

assert.ok(pkg.includes("verify:co-marketing-sender-identity-inspect"));
assert.ok(routeSrc.includes('url.searchParams.get("fromAddress")'));
assert.ok(routeSrc.includes("requireAccessToken"));
assert.ok(routeSrc.includes("requireAdministrator"));
assert.ok(routeSrc.includes("SENDER_MANAGE"));
assert.ok(routeSrc.includes("resolveMarketingOrganizationId"));
assert.ok(routeSrc.includes("marketingSenderService.findByFromAddress"));
assert.ok(routeSrc.includes("identity: null") || routeSrc.includes("{ identity, mode:"));
assert.ok(serviceSrc.includes("async findByFromAddress"));
assert.ok(serviceSrc.includes("resolveMarketingOrganizationId") || serviceSrc.includes("orgId(actor.organizationId)"));
assert.ok(storeSrc.includes("inspectPrismaTable"));
assert.ok(storeSrc.includes("async findByFromAddress"));

const inspectFn = storeSrc.slice(
  storeSrc.indexOf("async findByFromAddress"),
  storeSrc.indexOf("async getDefaultActive"),
);
assert.ok(inspectFn.includes("inspectPrismaTable"));
assert.ok(inspectFn.includes("findFirst"));
assert.doesNotMatch(inspectFn, /\.list\(/);
assert.doesNotMatch(inspectFn, /resolveByFromAddress/);
assert.doesNotMatch(inspectFn, /getDefaultActive/);
assert.doesNotMatch(inspectFn, /seedIfOrganizationEmpty/);
assert.doesNotMatch(inspectFn, /withOrgSenderLock/);
assert.doesNotMatch(inspectFn, /pg_advisory_xact_lock/);
assert.doesNotMatch(inspectFn, /\$transaction/);
assert.doesNotMatch(inspectFn, /identities\.(get|set|has)/);

const inspectTableFn = storeSrc.slice(
  storeSrc.indexOf("function inspectPrismaTable"),
  storeSrc.indexOf("function credentialConfigured"),
);
assert.ok(inspectTableFn.includes("testDelegate"));
assert.ok(inspectTableFn.includes("isEnterprisePersistencePrisma"));
assert.doesNotMatch(inspectTableFn, /testPinnedMemory/);
assert.doesNotMatch(inspectTableFn, /identities/);

const getHandler = routeSrc.slice(routeSrc.indexOf("export async function GET"), routeSrc.indexOf("export async function POST"));
assert.ok(getHandler.includes("fromAddress"));
assert.match(getHandler, /fromAddress[\s\S]*marketingSenderService\.list|identities = await marketingSenderService\.list/);
const fromAddressIdx = getHandler.indexOf("fromAddress");
const listIdx = getHandler.indexOf("marketingSenderService.list");
assert.ok(fromAddressIdx >= 0 && listIdx > fromAddressIdx, "fromAddress inspect must run before list");
assert.ok(!getHandler.includes("seedIfOrganizationEmpty"));
assert.ok(!getHandler.includes("resolveByFromAddress"));
assert.ok(!getHandler.includes("getDefaultActive"));

function pkConflict() {
  return Object.assign(new Error("Unique constraint failed on the fields: (`id`)"), {
    code: "P2002",
    meta: { target: ["id"] },
  });
}

function createFakeSenderTable() {
  const rows = new Map();
  let createCount = 0;
  return {
    rows,
    get createCount() {
      return createCount;
    },
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
      createCount += 1;
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
const serviceMod = await import(ts("server/services/enterprise-marketing-engine/sender.service.ts"));
const store = storeMod.marketingSenderIdentityStore;
const service = serviceMod.marketingSenderService;
const table = createFakeSenderTable();

storeMod.configureSenderIdentityStoreForTests({
  prismaDelegate: table,
  forcePrisma: true,
});
store.reset();

const orgA = "org-sender-inspect-a";
const orgB = "org-sender-inspect-b";
const admin = { userId: "admin-1", role: "ADMIN", organizationId: orgA };
const user = { userId: "user-1", role: "USER", organizationId: orgA };

table.rows.set(
  "mkt-sender-existing-smtp",
  toRow({
    id: "mkt-sender-existing-smtp",
    organizationId: orgA,
    displayName: "Existing SMTP",
    fromAddress: "opportunities@example.com",
    isDefault: true,
    simulated: false,
  }),
);
table.rows.set(
  "mkt-sender-org-b",
  toRow({
    id: "mkt-sender-org-b",
    organizationId: orgB,
    displayName: "Org B SMTP",
    fromAddress: "other@example.com",
  }),
);

const found = await store.findByFromAddress(orgA, "  Opportunities@example.com ");
assert.equal(found?.id, "mkt-sender-existing-smtp");
assert.equal(found?.fromAddress, "opportunities@example.com");
assert.equal(table.createCount, 0);

const publicFound = await service.findByFromAddress(admin, "opportunities@example.com");
assert.equal(publicFound?.id, "mkt-sender-existing-smtp");
assert.equal(publicFound?.fromAddress, "opportunities@example.com");
assert.equal(publicFound?.providerMapping?.providerType, "smtp");
assert.equal("apiKey" in (publicFound ?? {}), false);
assert.equal("smtpPassword" in (publicFound ?? {}), false);
assert.equal("password" in (publicFound ?? {}), false);
assert.equal("credential" in (publicFound ?? {}), false);

const missing = await store.findByFromAddress(orgA, "missing@example.com");
assert.equal(missing, null);
assert.equal(table.createCount, 0);
assert.equal(table.rows.size, 2);

const publicMissing = await service.findByFromAddress(admin, "missing@example.com");
assert.equal(publicMissing, null);
assert.equal(table.createCount, 0);

const emptyOrg = "org-sender-inspect-empty";
const emptyLookup = await store.findByFromAddress(emptyOrg, "anyone@example.com");
assert.equal(emptyLookup, null);
assert.equal(
  [...table.rows.values()].filter((row) => row.organizationId === emptyOrg).length,
  0,
  "empty organisation remains empty",
);
assert.equal(table.createCount, 0);

const crossOrg = await store.findByFromAddress(orgA, "other@example.com");
assert.equal(crossOrg, null);
assert.equal(table.rows.get("mkt-sender-org-b")?.organizationId, orgB);
assert.equal(table.createCount, 0);

await assert.rejects(
  () => service.findByFromAddress(user, "opportunities@example.com"),
  (err) => err?.code === "MARKETING_PERMISSION_DENIED" || err?.statusCode === 403,
);
await assert.rejects(
  () => service.findByFromAddress({ ...admin, organizationId: "default" }, "opportunities@example.com"),
  (err) => err?.code === "ORGANIZATION_REQUIRED",
);

storeMod.configureSenderIdentityStoreForTests({
  prismaDelegate: createThrowingTable(),
  forcePrisma: true,
});
await assert.rejects(
  () => store.findByFromAddress(orgA, "opportunities@example.com"),
  (err) => err?.code === "SENDER_IDENTITY_PERSISTENCE_FAILED" && err?.statusCode === 503,
);
await assert.rejects(
  () => service.findByFromAddress(admin, "opportunities@example.com"),
  (err) => err?.code === "SENDER_IDENTITY_PERSISTENCE_FAILED" && err?.statusCode === 503,
);

storeMod.configureSenderIdentityStoreForTests({ pinMemory: true });
store.reset();
await assert.rejects(
  () => store.findByFromAddress(orgA, "opportunities@example.com"),
  (err) => err?.code === "SENDER_IDENTITY_PERSISTENCE_FAILED" && err?.statusCode === 503,
  "inspect must never fall back to process memory",
);

const errorMapMod = await import(ts("src/lib/enterprise-marketing-engine/api-error-map.ts"));
const unauthMapped = errorMapMod.mapMarketingUnknownError(
  {
    status: 401,
    body: {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    },
  },
  "MARKETING_SENDER_FAILED",
  "Marketing sender identity request failed",
);
assert.equal(unauthMapped.status, 401);
assert.equal(unauthMapped.code, "UNAUTHORIZED");
assert.ok(getHandler.includes("requireAccessToken(request)"));
assert.ok(getHandler.indexOf("requireAccessToken") < getHandler.indexOf("fromAddress"));
assert.ok(getHandler.includes("requireAdministrator(actor)"));

storeMod.configureSenderIdentityStoreForTests({ pinMemory: true });

console.log("PASS co-marketing-sender-identity-inspect-verify");
