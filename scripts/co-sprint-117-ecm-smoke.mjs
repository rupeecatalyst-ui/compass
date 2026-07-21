/**
 * CO-SPRINT-117 — ECM REST API smoke tests (Prisma mode).
 *
 * Prerequisites:
 *   ENTERPRISE_PERSISTENCE_MODE=prisma
 *   DATABASE_URL set
 *   migrate deploy + db seed completed
 *   Next.js server running (default http://localhost:3000)
 *
 * Usage:
 *   node scripts/co-sprint-117-ecm-smoke.mjs
 *   node scripts/co-sprint-117-ecm-smoke.mjs http://localhost:3000
 */

const BASE = (process.argv[2] || process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.SMOKE_EMAIL || "admin@compass.com";
const PASSWORD = process.env.SMOKE_PASSWORD || "Admin@123";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function json(res) {
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const report = {
    base: BASE,
    passed: [],
    failed: [],
  };

  const step = async (name, fn) => {
    try {
      await fn();
      report.passed.push(name);
      console.log(`✅ ${name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report.failed.push({ name, message });
      console.error(`❌ ${name}: ${message}`);
    }
  };

  let accessToken = "";
  let contactId = "";
  let companyId = "";
  const mobile = `9${String(Date.now()).slice(-9)}`;
  const companyName = `  Cert Smoke Co   ${Date.now()}  `;

  await step("AUTH login", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
      }),
    );
    assert(status === 200 && body.success, `login failed (${status}): ${JSON.stringify(body)}`);
    accessToken = body.data?.accessToken;
    assert(accessToken, "missing accessToken");
  });

  const auth = () => ({
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  });

  await step("CONTACT create defaults to provisional", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/contacts`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({
          name: "Certification Smoke Contact",
          mobilePrimary: mobile,
          primaryRole: "customer",
        }),
      }),
    );
    assert(status === 201 && body.success, `create failed (${status}): ${JSON.stringify(body)}`);
    assert(body.data?.status === "provisional", `expected provisional, got ${body.data?.status}`);
    contactId = body.data.id;
  });

  await step("CONTACT get by id", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/contacts/${contactId}`, { headers: auth() }),
    );
    assert(status === 200 && body.data?.id === contactId, `get failed (${status})`);
  });

  await step("CONTACT query lists created contact", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/contacts?search=${encodeURIComponent(mobile)}&status=all`, {
        headers: auth(),
      }),
    );
    assert(status === 200 && body.success, `query failed (${status})`);
    const found = (body.data?.items || []).some((c) => c.id === contactId);
    assert(found, "created contact not found in query");
  });

  await step("CONTACT promote provisional → active → complete → verified", async () => {
    for (const next of ["active", "complete", "verified"]) {
      const { status, body } = await json(
        await fetch(`${BASE}/api/ecm/contacts/${contactId}`, {
          method: "PATCH",
          headers: auth(),
          body: JSON.stringify({ action: "promoteStatus", status: next }),
        }),
      );
      assert(status === 200 && body.data?.status === next, `promote to ${next} failed (${status}): ${JSON.stringify(body)}`);
    }
  });

  await step("CONTACT reject invalid demotion", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/contacts/${contactId}`, {
        method: "PATCH",
        headers: auth(),
        body: JSON.stringify({ action: "promoteStatus", status: "provisional" }),
      }),
    );
    assert(status === 400, `expected 400 demotion reject, got ${status}: ${JSON.stringify(body)}`);
  });

  await step("CONTACT mobile uniqueness", async () => {
    const { status } = await json(
      await fetch(`${BASE}/api/ecm/contacts`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({
          name: "Duplicate Mobile Contact",
          mobilePrimary: mobile,
          primaryRole: "customer",
        }),
      }),
    );
    assert(status === 400, `expected duplicate mobile 400, got ${status}`);
  });

  await step("COMPANY create with name normalization", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/companies`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({ companyName }),
      }),
    );
    assert(status === 201 && body.success, `company create failed (${status}): ${JSON.stringify(body)}`);
    assert(body.data?.companyName === companyName.trim().replace(/\s+/g, " "), "display name not trimmed/collapsed");
    companyId = body.data.id;
  });

  await step("COMPANY case-insensitive uniqueness", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/companies`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({ companyName: companyName.toUpperCase() }),
      }),
    );
    assert(status === 201 && body.success, `dedup path failed (${status})`);
    assert(body.data?.id === companyId, "expected existing company id on case-variant create");
  });

  await step("COMPANY archive sets archived_by / archived_at", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/companies/${companyId}`, {
        method: "PATCH",
        headers: auth(),
        body: JSON.stringify({ action: "archive" }),
      }),
    );
    assert(status === 200 && body.data?.status === "archived", `archive failed (${status})`);
    assert(body.data?.enabled === false, "enabled should be false");
    assert(Boolean(body.data?.archivedBy), "archivedBy missing");
    assert(Boolean(body.data?.archivedOn), "archivedOn missing");
  });

  await step("CONTACT archive sets archived_by / archived_at", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/contacts/${contactId}`, {
        method: "PATCH",
        headers: auth(),
        body: JSON.stringify({ action: "archive" }),
      }),
    );
    assert(status === 200 && body.data?.status === "archived", `archive failed (${status})`);
    assert(body.data?.enabled === false, "enabled should be false");
    assert(Boolean(body.data?.archivedBy), "archivedBy missing");
    assert(Boolean(body.data?.archivedOn), "archivedOn missing");
  });

  await step("PERSISTENCE guard when mode wrong is server-config (query still auth-gated)", async () => {
    const { status } = await json(
      await fetch(`${BASE}/api/ecm/contacts`, { headers: { Authorization: "Bearer invalid" } }),
    );
    assert(status === 401 || status === 500, `expected auth/persistence failure, got ${status}`);
  });

  console.log("\n--- CO-SPRINT-117 ECM Smoke Summary ---");
  console.log(`Passed: ${report.passed.length}`);
  console.log(`Failed: ${report.failed.length}`);
  if (report.failed.length) {
    process.exitCode = 1;
    for (const f of report.failed) console.error(` - ${f.name}: ${f.message}`);
  } else {
    console.log("All ECM REST smoke checks passed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
