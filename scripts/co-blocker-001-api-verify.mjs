/**
 * CO-BLOCKER-001 — API-level verification (no browser).
 * Usage: node scripts/co-blocker-001-api-verify.mjs [password]
 */

const BASE = process.env.VERIFY_BASE_URL || "https://catalyst-one-two.vercel.app";
const EMAIL = process.env.VERIFY_ADMIN_EMAIL || "admin@rupeecatalyst.com";
const PASSWORD = process.argv[2] || process.env.VERIFY_ADMIN_PASSWORD;

if (!PASSWORD) {
  console.error("Usage: node scripts/co-blocker-001-api-verify.mjs <password>");
  process.exit(1);
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`Login failed: ${body?.error?.message || res.status}`);
  }
  return body.data.accessToken;
}

async function query(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`${path} failed: ${body?.error?.message || res.status}`);
  }
  return body.data;
}

async function main() {
  console.log(`API verify → ${BASE}\n`);
  const token = await login();
  console.log("✅ Login OK");

  const contactsActive = await query("/api/ecm/contacts?status=active&pageSize=25", token);
  const contactsAll = await query("/api/ecm/contacts?status=all&pageSize=25", token);
  const companies = await query("/api/ecm/companies?status=all&pageSize=25", token);

  console.log(`Contacts (status=active): ${contactsActive.items?.length ?? 0}`);
  console.log(`Contacts (status=all): ${contactsAll.items?.length ?? 0}`);
  console.log(`Companies (status=all): ${companies.items?.length ?? 0}`);

  if (contactsAll.items?.length) {
    console.log("Sample contact:", contactsAll.items[0].name, contactsAll.items[0].status);
  }
  if (companies.items?.length) {
    console.log("Sample company:", companies.items[0].companyName);
  }

  const pass = (contactsAll.items?.length ?? 0) > 0 && (companies.items?.length ?? 0) > 0;
  console.log(pass ? "\n✅ API returns registry data" : "\n❌ API returned empty registry");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
