/**
 * CO-SPRINT-118 — User Management + Contact Registry verification.
 *
 * Prerequisites: Next.js running with ENTERPRISE_PERSISTENCE_MODE=prisma + DATABASE_URL
 *
 * Usage:
 *   node scripts/co-sprint-118-verify.mjs
 *   node scripts/co-sprint-118-verify.mjs http://localhost:3000
 */

const BASE = (process.argv[2] || process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
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
  let createdUserId = "";
  let contactId = "";
  let companyId = "";
  const stamp = Date.now();
  const mobile = `9${String(stamp).slice(-9)}`;
  const companyName = `Verify Co ${stamp}`;
  const userEmail = `um.mvp.${stamp}@rupeecatalyst.com`;

  await step("AUTH Super Admin login (seeded)", async () => {
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
    assert(body.data?.user?.role === "SUPER_ADMIN", "expected SUPER_ADMIN role");
    assert(body.data?.user?.mustChangePassword === true, "expected mustChangePassword true");
  });

  const auth = () => ({
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  });

  await step("AUTH reject wrong password", async () => {
    const { status } = await json(
      await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL, password: "WrongPassword!1" }),
      }),
    );
    assert(status === 401 || status === 400, `expected auth failure, got ${status}`);
  });

  await step("USER ADMIN list", async () => {
    const { status, body } = await json(await fetch(`${BASE}/api/admin/users`, { headers: auth() }));
    assert(status === 200 && body.success, `list failed (${status})`);
    assert(Array.isArray(body.data?.users), "users array missing");
    assert(
      body.data.users.some((u) => u.email === EMAIL),
      "seeded admin missing from list",
    );
  });

  await step("USER ADMIN create", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/admin/users`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({
          fullName: "UM MVP Tester",
          email: userEmail,
          employeeId: `EMP-${stamp}`,
          role: "ANALYST",
        }),
      }),
    );
    assert(status === 201 && body.success, `create failed (${status}): ${JSON.stringify(body)}`);
    assert(body.data?.temporaryPassword, "temporary password missing");
    assert(body.data?.user?.mustChangePassword === true, "mustChangePassword expected");
    createdUserId = body.data.user.id;
  });

  await step("USER ADMIN search + role filter", async () => {
    const { status, body } = await json(
      await fetch(
        `${BASE}/api/admin/users?search=${encodeURIComponent(userEmail)}&role=ANALYST&status=active`,
        { headers: auth() },
      ),
    );
    assert(status === 200 && body.success, `search failed (${status})`);
    assert(body.data.users.some((u) => u.id === createdUserId), "created user not found via search");
  });

  await step("USER ADMIN edit role", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/admin/users/${createdUserId}`, {
        method: "PATCH",
        headers: auth(),
        body: JSON.stringify({ role: "MANAGER", fullName: "UM MVP Tester Updated" }),
      }),
    );
    assert(status === 200 && body.data?.user?.role === "MANAGER", `edit failed (${status})`);
  });

  await step("USER ADMIN deactivate / activate", async () => {
    let res = await json(
      await fetch(`${BASE}/api/admin/users/${createdUserId}`, {
        method: "PATCH",
        headers: auth(),
        body: JSON.stringify({ action: "deactivate" }),
      }),
    );
    assert(res.status === 200 && res.body.data?.user?.isActive === false, "deactivate failed");
    res = await json(
      await fetch(`${BASE}/api/admin/users/${createdUserId}`, {
        method: "PATCH",
        headers: auth(),
        body: JSON.stringify({ action: "activate" }),
      }),
    );
    assert(res.status === 200 && res.body.data?.user?.isActive === true, "activate failed");
  });

  await step("USER ADMIN reset password", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/admin/users/${createdUserId}`, {
        method: "PATCH",
        headers: auth(),
        body: JSON.stringify({ action: "resetPassword" }),
      }),
    );
    assert(status === 200 && body.data?.temporaryPassword, `reset failed (${status})`);
    assert(body.data?.user?.mustChangePassword === true, "mustChangePassword after reset");
  });

  await step("CONTACT create individual (provisional)", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/contacts`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({
          name: "Verify Individual",
          mobilePrimary: mobile,
          primaryRole: "customer",
        }),
      }),
    );
    assert(status === 201 && body.success, `contact create failed (${status}): ${JSON.stringify(body)}`);
    assert(body.data?.status === "provisional", `expected provisional, got ${body.data?.status}`);
    contactId = body.data.id;
  });

  await step("COMPANY create", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/companies`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({ companyName }),
      }),
    );
    assert(status === 201 && body.success, `company create failed (${status}): ${JSON.stringify(body)}`);
    companyId = body.data.id;
  });

  await step("LINK company ↔ contact", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/companies/${companyId}/links`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({ contactId, relationRole: "director" }),
      }),
    );
    assert(status === 201 && body.success, `link failed (${status}): ${JSON.stringify(body)}`);
    assert(body.data?.companyId === companyId && body.data?.contactId === contactId, "link ids mismatch");
  });

  await step("SEARCH contact", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/contacts?search=${encodeURIComponent(mobile)}&status=all`, {
        headers: auth(),
      }),
    );
    assert(status === 200 && body.data?.items?.some((c) => c.id === contactId), `search failed (${status})`);
  });

  await step("FILTER company by search", async () => {
    const { status, body } = await json(
      await fetch(`${BASE}/api/ecm/companies?search=${encodeURIComponent(companyName)}&status=all`, {
        headers: auth(),
      }),
    );
    assert(status === 200 && body.data?.items?.some((c) => c.id === companyId), `filter failed (${status})`);
  });

  await step("RELOAD lists (persistence)", async () => {
    const contacts = await json(
      await fetch(`${BASE}/api/ecm/contacts?status=all&pageSize=5000`, { headers: auth() }),
    );
    const companies = await json(
      await fetch(`${BASE}/api/ecm/companies?status=all&pageSize=5000`, { headers: auth() }),
    );
    const links = await json(
      await fetch(`${BASE}/api/ecm/companies/${companyId}/links`, { headers: auth() }),
    );
    assert(contacts.body.data?.items?.some((c) => c.id === contactId), "contact missing after reload");
    assert(companies.body.data?.items?.some((c) => c.id === companyId), "company missing after reload");
    assert(links.body.data?.links?.some((l) => l.contactId === contactId), "link missing after reload");
  });

  console.log("\n--- CO-SPRINT-118 Verification Summary ---");
  console.log(`Base: ${BASE}`);
  console.log(`Passed: ${report.passed.length}`);
  console.log(`Failed: ${report.failed.length}`);
  if (report.failed.length) {
    process.exitCode = 1;
    for (const f of report.failed) console.error(` - ${f.name}: ${f.message}`);
  } else {
    console.log("All User Management + Contact Registry checks passed (PostgreSQL SSOT).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
