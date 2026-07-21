/**
 * CO-HOTFIX-001 — Production verification (read-only API checks).
 * Usage: node scripts/co-hotfix-001-verify.mjs
 */

const BASE = (process.argv[2] || "https://catalyst-one-two.vercel.app").replace(/\/$/, "");
const EMAIL = process.env.SMOKE_EMAIL || "admin@rupeecatalyst.com";
const PASSWORD = process.env.SMOKE_PASSWORD || "Rc7$mK9pL2#vNq4X";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function json(res) {
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const report = { base: BASE, passed: [], failed: [] };
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
  let user = null;

  await step("APP homepage responds", async () => {
    const res = await fetch(`${BASE}/login`, { redirect: "manual" });
    assert(res.status === 200 || res.status === 307 || res.status === 308, `login page status ${res.status}`);
  });

  await step("AUTH login seeded Super Admin", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
      }),
    );
    assert(status === 200 && body.success, `login failed (${status}): ${JSON.stringify(body)}`);
    accessToken = body.data?.accessToken;
    user = body.data?.user;
    assert(accessToken, "missing accessToken");
    assert(user?.email === EMAIL, `unexpected email ${user?.email}`);
    assert(user?.role === "SUPER_ADMIN", `unexpected role ${user?.role}`);
  });

  await step("AUTH mustChangePassword=true", async () => {
    assert(user?.mustChangePassword === true, `expected mustChangePassword true, got ${user?.mustChangePassword}`);
  });

  const auth = () => ({
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  });

  await step("ADMIN users list (Prisma)", async () => {
    const { status, body } = await json(await fetch(`${BASE}/api/admin/users`, { headers: auth() }));
    assert(status === 200 && body.success, `users list failed (${status}): ${JSON.stringify(body)}`);
    assert(Array.isArray(body.data?.users), "users array missing");
    assert(
      body.data.users.some((u) => u.email === EMAIL),
      "seeded admin missing from users list",
    );
  });

  await step("ECM contacts query (prisma mode, live Postgres)", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/contacts?status=all&pageSize=50`, { headers: auth() }),
    );
    assert(status === 200 && body.success, `contacts failed (${status}): ${JSON.stringify(body)}`);
    assert(Array.isArray(body.data?.items), "contacts items missing");
    // Memory mode returns 500 with "requires ENTERPRISE_PERSISTENCE_MODE=prisma"
  });

  await step("ECM companies query (prisma mode)", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/companies?status=all&pageSize=50`, { headers: auth() }),
    );
    assert(status === 200 && body.success, `companies failed (${status}): ${JSON.stringify(body)}`);
    assert(Array.isArray(body.data?.items), "companies items missing");
  });

  await step("Change-password page available", async () => {
    const res = await fetch(`${BASE}/change-password`, { redirect: "manual" });
    assert(res.status === 200 || res.status === 307 || res.status === 308, `change-password status ${res.status}`);
  });

  console.log("\n--- CO-HOTFIX-001 Verification Summary ---");
  console.log(`Base: ${BASE}`);
  console.log(`Passed: ${report.passed.length}`);
  console.log(`Failed: ${report.failed.length}`);
  if (user) {
    console.log(`User: ${user.email} role=${user.role} mustChangePassword=${user.mustChangePassword}`);
  }
  if (report.failed.length) {
    process.exitCode = 1;
    for (const f of report.failed) console.error(` - ${f.name}: ${f.message}`);
  } else {
    console.log("Production connected to Supabase; prisma mode verified.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
