/**
 * CO-SPRINT-119 — Soft Delete & Recovery verification (API smoke).
 *
 * Usage:
 *   node scripts/co-sprint-119-verify.mjs [baseUrl]
 *
 * Requires: ENTERPRISE_PERSISTENCE_MODE=prisma and SUPER_ADMIN credentials.
 */

const BASE = process.argv[2] || process.env.VERIFY_BASE_URL || "http://localhost:3000";

const ADMIN_EMAIL = process.env.VERIFY_ADMIN_EMAIL || "admin@rupeecatalyst.com";
const ADMIN_PASSWORD = process.env.VERIFY_ADMIN_PASSWORD || "Rc7$mK9pL2#vNq4X";

let passed = 0;
let failed = 0;

function ok(name, detail = "") {
  passed += 1;
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  failed += 1;
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function jsonFetch(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function main() {
  console.log(`\nCO-SPRINT-119 verify → ${BASE}\n`);

  const login = await jsonFetch("/api/auth/login", {
    method: "POST",
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!login.res.ok || !login.data?.data?.accessToken) {
    fail("Login as SUPER_ADMIN", login.data?.error?.message || String(login.res.status));
    process.exit(1);
  }
  ok("Login as SUPER_ADMIN");
  const token = login.data.data.accessToken;
  const role = login.data.data.user?.role;
  if (role === "SUPER_ADMIN") ok("Role is SUPER_ADMIN");
  else fail("Role is SUPER_ADMIN", `got ${role}`);

  // Create disposable contact
  const stamp = Date.now();
  const mobile = `9${String(stamp).slice(-9)}`;
  const create = await jsonFetch("/api/ecm/contacts", {
    method: "POST",
    token,
    body: {
      name: `Soft Delete Test ${stamp}`,
      mobilePrimary: mobile,
      primaryRole: "customer",
    },
  });
  if (!create.res.ok || !create.data?.data?.id) {
    fail("Create test contact", create.data?.error?.message || String(create.res.status));
    console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
    process.exit(1);
  }
  const contactId = create.data.data.id;
  ok("Create test contact", contactId.slice(0, 8));

  // Soft delete
  const soft = await jsonFetch("/api/admin/recovery", {
    method: "POST",
    token,
    body: {
      action: "soft_delete",
      module: "contacts",
      entityId: contactId,
      reason: "CO-SPRINT-119 verification",
    },
  });
  if (!soft.res.ok) {
    fail("Soft delete contact", soft.data?.error?.message || String(soft.res.status));
  } else {
    ok("Soft delete contact");
  }

  // Hidden from operational list
  const list = await jsonFetch("/api/ecm/contacts?search=" + encodeURIComponent(`Soft Delete Test ${stamp}`), {
    token,
  });
  const items = list.data?.data?.items ?? [];
  const stillVisible = items.some((c) => c.id === contactId);
  if (stillVisible) fail("Operational list hides deleted contact");
  else ok("Operational list hides deleted contact");

  // Appears in Recovery Center
  const recovery = await jsonFetch("/api/admin/recovery?module=contacts", { token });
  const records = recovery.data?.data?.records ?? [];
  const found = records.find((r) => r.entityId === contactId);
  if (!found) fail("Recovery Center lists deleted contact");
  else ok("Recovery Center lists deleted contact");

  // Restore
  const restore = await jsonFetch("/api/admin/recovery", {
    method: "POST",
    token,
    body: { action: "restore", module: "contacts", entityId: contactId },
  });
  if (!restore.res.ok) fail("Restore contact", restore.data?.error?.message || String(restore.res.status));
  else ok("Restore contact");

  // Soft delete again then permanent delete
  await jsonFetch("/api/admin/recovery", {
    method: "POST",
    token,
    body: { action: "soft_delete", module: "contacts", entityId: contactId },
  });
  const purge = await jsonFetch("/api/admin/recovery", {
    method: "POST",
    token,
    body: {
      action: "permanent_delete",
      module: "contacts",
      entityId: contactId,
      confirmation: "DELETE",
    },
  });
  if (!purge.res.ok) {
    fail("Permanent delete (SUPER_ADMIN)", purge.data?.error?.message || String(purge.res.status));
  } else {
    ok("Permanent delete (SUPER_ADMIN)");
  }

  const getGone = await jsonFetch(`/api/ecm/contacts/${contactId}`, { token });
  if (getGone.res.status === 404) ok("Permanently deleted contact not found");
  else fail("Permanently deleted contact not found", String(getGone.res.status));

  // Recovery Center page exists (HTML)
  const page = await fetch(`${BASE}/admin/enterprise-recovery-center`);
  if (page.ok || page.status === 307 || page.status === 302) {
    ok("Recovery Center route reachable", String(page.status));
  } else {
    fail("Recovery Center route reachable", String(page.status));
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
