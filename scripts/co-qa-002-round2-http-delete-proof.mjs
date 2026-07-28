/**
 * CO-QA-002 Round 2 — HTTP DELETE proof against production API for Mehernosh Axis Deal.
 * Calls DELETE, queries DB, restores.
 */
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

const BASE =
  process.env.CO_QA_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://catalyst-one-two.vercel.app";
const DEAL_ID = "cms1qhjsy0005l304sxcmqo0g";
const OPP_ID = "cms1q4k3h0003l3047et4d0qt";
const p = new PrismaClient();

async function dbRow() {
  const rows = await p.$queryRawUnsafe(
    `SELECT id, deal_number, opportunity_id, COALESCE(is_deleted,false) AS is_deleted,
            deleted_at, deletion_reason, updated_at, row_version
     FROM enterprise_deals WHERE id = $1`,
    DEAL_ID
  );
  return rows[0] || null;
}

async function main() {
  console.log("BASE", BASE);

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@compass.com",
      password: "Admin@123",
    }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  console.log("LOGIN", loginRes.status, loginBody.success, loginBody.error || null);
  const token =
    loginBody?.data?.accessToken ||
    loginBody?.data?.tokens?.accessToken ||
    loginBody?.accessToken;
  if (!token) {
    console.log("LOGIN_BODY_KEYS", Object.keys(loginBody || {}), Object.keys(loginBody?.data || {}));
    throw new Error("No access token from login");
  }

  const before = await dbRow();
  console.log("DB_BEFORE_HTTP_DELETE", before);

  const delRes = await fetch(`${BASE}/api/enterprise-deals/${DEAL_ID}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason: "co_qa_002_round2_http_proof" }),
  });
  const delBody = await delRes.json().catch(() => ({}));
  console.log("HTTP_DELETE_STATUS", delRes.status);
  console.log(
    "HTTP_DELETE_BODY",
    JSON.stringify(
      {
        success: delBody.success,
        isDeleted: delBody.data?.isDeleted,
        dealNumber: delBody.data?.dealNumber,
        id: delBody.data?.id,
        error: delBody.error,
      },
      null,
      2
    )
  );

  const after = await dbRow();
  console.log("DB_IMMEDIATELY_AFTER_HTTP_DELETE", after);

  const listRes = await fetch(
    `${BASE}/api/enterprise-opportunities/${OPP_ID}/deals`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listBody = await listRes.json().catch(() => ({}));
  const items = listBody?.data?.items || listBody?.data || [];
  const ids = Array.isArray(items) ? items.map((i) => i.id) : [];
  console.log("LIST_DEALS_STATUS", listRes.status, "count", ids.length);
  console.log("DELETED_ID_IN_LIST", ids.includes(DEAL_ID));
  console.log(
    "LIST_IDS",
    ids.map((id, i) => ({
      id,
      dealNumber: items[i]?.dealNumber,
      lender: items[i]?.primaryCounterpartyName,
    }))
  );

  // Restore via API if soft-deleted
  if (after?.is_deleted) {
    const restoreRes = await fetch(`${BASE}/api/enterprise-deals/${DEAL_ID}/restore`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: "co_qa_002_round2_restore_after_proof" }),
    });
    const restoreBody = await restoreRes.json().catch(() => ({}));
    console.log("HTTP_RESTORE_STATUS", restoreRes.status, restoreBody.success);
    console.log("DB_AFTER_RESTORE", await dbRow());
  }

  console.log(
    "\nPHASE1_HTTP_VERDICT",
    JSON.stringify(
      {
        httpDeleteStatus: delRes.status,
        httpReportedIsDeleted: delBody.data?.isDeleted === true,
        dbIsDeletedAfter: after?.is_deleted === true,
        deletedDealReturnedByListApi: ids.includes(DEAL_ID),
        answer:
          delRes.ok && after?.is_deleted === true
            ? "YES — HTTP DELETE persists in Postgres"
            : "NO — HTTP DELETE did not persist",
      },
      null,
      2
    )
  );

  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
