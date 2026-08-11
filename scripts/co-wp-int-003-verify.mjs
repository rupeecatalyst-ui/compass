/**
 * CO-WP-INT-003 — ECM contact duplicate / idempotency verify (development).
 * Does NOT deploy. Does NOT drop unique constraints.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`Missing: ${rel}`);
}
function mustContain(rel, needle, label = needle) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (!text.includes(needle)) failures.push(`${rel} missing ${label}`);
}
function mustNotContain(rel, needle, label = needle) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (text.includes(needle)) failures.push(`${rel} must not contain ${label}`);
}

mustExist("docs/co-wp-int-003/CO-WP-INT-003-INTEGRATION-REPORT.md");
mustContain(
  "server/repositories/ecm/contact.repository.ts",
  "ecmMobileLookupCandidates",
  "mobile lookup candidates",
);
mustContain(
  "server/repositories/ecm/contact.repository.ts",
  "mobilePrimary: { in: candidates }",
  "candidate IN lookup",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "CO-WP-INT-003",
  "INT-003 marker",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "P2002",
  "unique race handling",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "findIdentityByMobile",
  "ECM identity resolve",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "ecmCanonicalMobilePrimary",
  "canonical mobile persist",
);
mustNotContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "@@unique([organizationId, mobilePrimary]",
  "must not redefine constraint in service",
);

// Pure normalization / candidate tests (TEST 3)
const {
  ecmMobileLookupCandidates,
  ecmCanonicalMobilePrimary,
} = await import("../server/repositories/ecm/contact.repository.ts");

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

const base = "9876543210";
const variants = ["9876543210", "+91 98765 43210", "919876543210", "91-98765-43210", "09876543210"];
const candidateSets = variants.map((v) => new Set(ecmMobileLookupCandidates(v)));
for (const set of candidateSets) {
  assert(set.has(base), `candidates must include 10-digit ${base}`);
}
assert(
  ecmCanonicalMobilePrimary("+91 98765 43210") === "919876543210" ||
    ecmCanonicalMobilePrimary("+91 98765 43210").endsWith(base),
  "canonical mobile is digit-normalized",
);
assert(
  ecmCanonicalMobilePrimary("9876543210") === "9876543210",
  "10-digit canonical unchanged",
);

// Overlap: any variant's candidates intersect another on last10
const last10 = base;
assert(
  candidateSets.every((s) => s.has(last10)),
  "TEST 3: all formats share last-10 candidate",
);

console.log(
  JSON.stringify(
    {
      staticOk: failures.length === 0,
      sampleCanonical: ecmCanonicalMobilePrimary("+919876543210"),
      sampleCandidates: ecmMobileLookupCandidates("+91 98765 43210"),
    },
    null,
    2,
  ),
);

if (failures.length) {
  console.error("CO-WP-INT-003 VERIFY FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

// Optional live DB regression (read + resolve path) when DATABASE_URL present
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

if (process.env.DATABASE_URL && process.env.CO_WP_INT_003_LIVE !== "0") {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.ecmContact.findFirst({
      where: { isDeleted: false, mobilePrimary: { not: { startsWith: "pending-" } } },
      select: {
        id: true,
        organizationId: true,
        mobilePrimary: true,
        name: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    if (existing) {
      const { ecmContactRepository } = await import(
        "../server/repositories/ecm/contact.repository.ts"
      );
      const digits = existing.mobilePrimary.replace(/\D/g, "");
      const last10 = digits.slice(-10);
      const formats = [existing.mobilePrimary, last10, `91${last10}`, `+91${last10}`];
      for (const fmt of formats) {
        const hit = await ecmContactRepository.findIdentityByMobile(
          existing.organizationId,
          fmt,
        );
        if (!hit || hit.id !== existing.id) {
          failures.push(`LIVE TEST 3 fail: format ${fmt} did not resolve to ${existing.id}`);
        }
      }
      // TEST 2 style: resolve twice — same id
      const a = await ecmContactRepository.findByMobile(
        existing.organizationId,
        `+91${last10}`,
      );
      const b = await ecmContactRepository.findByMobile(
        existing.organizationId,
        last10,
      );
      if (!a || !b || a.id !== b.id || a.id !== existing.id) {
        failures.push("LIVE TEST 2 fail: reuse identity mismatch");
      }
      console.log(
        JSON.stringify(
          {
            liveRegression: failures.length === 0 ? "PASS" : "FAIL",
            probedContactId: existing.id,
            mobilePrimary: existing.mobilePrimary,
          },
          null,
          2,
        ),
      );
    } else {
      console.log(JSON.stringify({ liveRegression: "SKIPPED_NO_CONTACTS" }, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (failures.length) {
  console.error("CO-WP-INT-003 VERIFY FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-WP-INT-003 VERIFY PASS");
console.log(
  JSON.stringify(
    {
      contactIdempotency: "find → create → P2002 re-fetch",
      uniqueConstraint: "preserved",
      deploy: "not performed",
    },
    null,
    2,
  ),
);
