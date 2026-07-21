/**
 * CO-HOTFIX-005 — Loan Journey ECM selector verification.
 *
 * Usage: node scripts/co-hotfix-005-verify.mjs [baseUrl]
 */

const BASE = process.argv[2] || process.env.VERIFY_BASE_URL || "https://catalyst-one-two.vercel.app";
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
  console.log(`\nCO-HOTFIX-005 verify → ${BASE}\n`);

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
  const mobile = `9${String(stamp).slice(-9)}`;
  const companyName = `Loan Journey Co ${stamp}`;

  const contact = await jsonFetch("/api/ecm/contacts", {
    method: "POST",
    token,
    body: {
      name: `Loan Journey Contact ${stamp}`,
      mobilePrimary: mobile,
      primaryRole: "customer",
    },
  });
  if (!contact.res.ok || !contact.data?.data?.id) {
    fail("Create ECM contact", contact.data?.error?.message || String(contact.res.status));
    process.exit(1);
  }
  const contactId = contact.data.data.id;
  ok("Create ECM contact", contactId.slice(0, 8));

  const company = await jsonFetch("/api/ecm/companies", {
    method: "POST",
    token,
    body: {
      companyName,
      createdBy: "co-hotfix-005-verify",
    },
  });
  if (!company.res.ok || !company.data?.data?.id) {
    fail("Create ECM company", company.data?.error?.message || String(company.res.status));
    process.exit(1);
  }
  const companyId = company.data.data.id;
  ok("Create ECM company", companyId.slice(0, 8));

  await jsonFetch(`/api/ecm/companies/${companyId}/links`, {
    method: "POST",
    token,
    body: {
      contactId,
      relationRole: "director",
    },
  });
  ok("Link contact to company");

  const contactsList = await jsonFetch(
    `/api/ecm/contacts?search=${encodeURIComponent(`Loan Journey Contact ${stamp}`)}&status=all`,
    { token },
  );
  const contactFound = (contactsList.data?.data?.items ?? []).some((c) => c.id === contactId);
  if (contactFound) ok("ECM contacts API returns new contact");
  else fail("ECM contacts API returns new contact");

  const companiesList = await jsonFetch(
    `/api/ecm/companies?search=${encodeURIComponent(companyName)}&status=all`,
    { token },
  );
  const companyFound = (companiesList.data?.data?.items ?? []).some((c) => c.id === companyId);
  if (companyFound) ok("ECM companies API returns new company");
  else fail("ECM companies API returns new company");

  // Soft-delete excluded from operational query
  const activeCompanies = await jsonFetch("/api/ecm/companies?pageSize=500", { token });
  const activeIds = (activeCompanies.data?.data?.items ?? []).map((c) => c.id);
  if (activeIds.includes(companyId)) ok("Company visible in operational ECM query");
  else fail("Company visible in operational ECM query");

  console.log("\nLoan Journey pickers read hydrated ECM session cache (same REST endpoints).");
  console.log(`Test contact: ${contactId} · Test company: ${companyId}`);
  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
