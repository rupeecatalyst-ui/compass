/**
 * CO-HOTFIX-006 — Enterprise Registry Integration verification.
 *
 * Verifies ECM API CRUD + unified search visibility for contacts/companies.
 *
 * Usage: node scripts/co-hotfix-006-verify.mjs [baseUrl]
 */

const BASE = process.argv[2] || process.env.VERIFY_BASE_URL || "https://catalyst-one-two.vercel.app";
const ADMIN_EMAIL = process.env.VERIFY_ADMIN_EMAIL || "admin@rupeecatalyst.com";
const ADMIN_PASSWORD = process.env.VERIFY_ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error("Set VERIFY_ADMIN_PASSWORD (Rupee Catalyst production Super Admin).");
  process.exit(1);
}

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

function includesName(items, name, field = "name") {
  const q = name.toLowerCase();
  return items.some((i) => {
    const label = (i[field] || i.companyName || i.label || "").toLowerCase();
    return label.includes(q);
  });
}

async function main() {
  console.log(`\nCO-HOTFIX-006 Enterprise Registry verify → ${BASE}\n`);

  const login = await jsonFetch("/api/auth/login", {
    method: "POST",
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!login.res.ok || !login.data?.data?.accessToken) {
    fail("Login", login.data?.error?.message || String(login.res.status));
    process.exit(1);
  }
  ok("Login");
  const token = login.data.data.accessToken;

  const stamp = Date.now();
  const contactName = `Registry Audit Contact ${stamp}`;
  const contactMobile = `9${String(stamp).slice(-9)}`;
  const companyName = `Registry Audit Company ${stamp}`;
  const searchToken = String(stamp).slice(-4);

  // --- Contact lifecycle ---
  const createdContact = await jsonFetch("/api/ecm/contacts", {
    method: "POST",
    token,
    body: { name: contactName, mobilePrimary: contactMobile, primaryRole: "customer" },
  });
  if (!createdContact.res.ok || !createdContact.data?.data?.id) {
    fail("Create contact", createdContact.data?.error?.message || String(createdContact.res.status));
    process.exit(1);
  }
  const contactId = createdContact.data.data.id;
  ok("Create contact", contactId.slice(0, 8));

  let listed = await jsonFetch(`/api/ecm/contacts?q=${encodeURIComponent(searchToken)}`, { token });
  const contactItems = listed.data?.data?.items ?? listed.data?.data ?? [];
  if (includesName(contactItems, contactName)) ok("Contact visible in search after create");
  else fail("Contact visible in search after create");

  const updatedName = `${contactName} Updated`;
  const updated = await jsonFetch(`/api/ecm/contacts/${contactId}`, {
    method: "PATCH",
    token,
    body: { name: updatedName },
  });
  if (updated.res.ok) ok("Edit contact");
  else fail("Edit contact", updated.data?.error?.message);

  listed = await jsonFetch(`/api/ecm/contacts?q=${encodeURIComponent("Updated")}`, { token });
  const afterEdit = listed.data?.data?.items ?? listed.data?.data ?? [];
  if (includesName(afterEdit, updatedName)) ok("Updated contact in search");
  else fail("Updated contact in search");

  const softDelContact = await jsonFetch("/api/admin/recovery", {
    method: "POST",
    token,
    body: { action: "soft_delete", module: "contacts", entityId: contactId, reason: "co-hotfix-006" },
  });
  if (softDelContact.res.ok) ok("Soft delete contact");
  else fail("Soft delete contact", softDelContact.data?.error?.message);

  listed = await jsonFetch(`/api/ecm/contacts?q=${encodeURIComponent(searchToken)}&status=all`, { token });
  const afterDelete = listed.data?.data?.items ?? listed.data?.data ?? [];
  const stillVisible = includesName(afterDelete.filter((c) => c.enabled !== false), updatedName);
  if (!stillVisible) ok("Soft-deleted contact excluded from operational query");
  else fail("Soft-deleted contact excluded from operational query");

  const restoreContact = await jsonFetch("/api/admin/recovery", {
    method: "POST",
    token,
    body: { action: "restore", module: "contacts", entityId: contactId },
  });
  if (restoreContact.res.ok) ok("Restore contact");
  else fail("Restore contact", restoreContact.data?.error?.message);

  listed = await jsonFetch(`/api/ecm/contacts?q=${encodeURIComponent(searchToken)}`, { token });
  const afterRestore = listed.data?.data?.items ?? listed.data?.data ?? [];
  if (includesName(afterRestore, updatedName)) ok("Restored contact visible in search");
  else fail("Restored contact visible in search");

  // --- Company lifecycle ---
  const createdCompany = await jsonFetch("/api/ecm/companies", {
    method: "POST",
    token,
    body: { companyName, createdBy: "co-hotfix-006-verify" },
  });
  if (!createdCompany.res.ok || !createdCompany.data?.data?.id) {
    fail("Create company", createdCompany.data?.error?.message || String(createdCompany.res.status));
    process.exit(1);
  }
  const companyId = createdCompany.data.data.id;
  ok("Create company", companyId.slice(0, 8));

  let companies = await jsonFetch(`/api/ecm/companies?q=${encodeURIComponent(searchToken)}`, { token });
  const companyItems = companies.data?.data?.items ?? companies.data?.data ?? [];
  if (includesName(companyItems, companyName, "companyName")) ok("Company visible in search after create");
  else fail("Company visible in search after create");

  const updatedCompanyName = `${companyName} Updated`;
  const editCo = await jsonFetch(`/api/ecm/companies/${companyId}`, {
    method: "PATCH",
    token,
    body: { companyName: updatedCompanyName },
  });
  if (editCo.res.ok) ok("Edit company");
  else fail("Edit company", editCo.data?.error?.message);

  companies = await jsonFetch(`/api/ecm/companies?q=${encodeURIComponent("Updated")}`, { token });
  const coAfterEdit = companies.data?.data?.items ?? companies.data?.data ?? [];
  if (includesName(coAfterEdit, updatedCompanyName, "companyName")) ok("Updated company in search");
  else fail("Updated company in search");

  const softDelCo = await jsonFetch("/api/admin/recovery", {
    method: "POST",
    token,
    body: { action: "soft_delete", module: "companies", entityId: companyId, reason: "co-hotfix-006" },
  });
  if (softDelCo.res.ok) ok("Soft delete company");
  else fail("Soft delete company", softDelCo.data?.error?.message);

  companies = await jsonFetch(`/api/ecm/companies?q=${encodeURIComponent(searchToken)}`, { token });
  const coAfterDelete = companies.data?.data?.items ?? companies.data?.data ?? [];
  const coStillVisible = includesName(
    coAfterDelete.filter((c) => c.enabled !== false),
    updatedCompanyName,
    "companyName",
  );
  if (!coStillVisible) ok("Soft-deleted company excluded from operational query");
  else fail("Soft-deleted company excluded from operational query");

  const restoreCo = await jsonFetch("/api/admin/recovery", {
    method: "POST",
    token,
    body: { action: "restore", module: "companies", entityId: companyId },
  });
  if (restoreCo.res.ok) ok("Restore company");
  else fail("Restore company", restoreCo.data?.error?.message);

  companies = await jsonFetch(`/api/ecm/companies?q=${encodeURIComponent(searchToken)}`, { token });
  const coAfterRestore = companies.data?.data?.items ?? companies.data?.data ?? [];
  if (includesName(coAfterRestore, updatedCompanyName, "companyName")) ok("Restored company visible in search");
  else fail("Restored company visible in search");

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
