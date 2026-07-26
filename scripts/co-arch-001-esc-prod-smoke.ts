/**
 * ESC production release — read-only DB counts + authenticated API smoke.
 * Does not print passwords. Uses CERT_ADMIN_* env or bootstrap email + password from argv[2].
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadEnv(path: string, override = false) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (override || !process.env[key]) process.env[key] = val;
  }
}

loadEnv(resolve(".env"));
loadEnv(resolve(".env.local"), true);
process.env.DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

const base = process.env.PROD_URL || "https://catalyst-one-two.vercel.app";
const email =
  process.env.CERT_ADMIN_EMAIL || "admin@rupeecatalyst.com";
const password =
  process.env.CERT_ADMIN_PASSWORD || process.argv[2] || "";

async function main() {
  const prisma = new PrismaClient();
  try {
    const admins = await prisma.user.findMany({
      where: { isActive: true, role: "SUPER_ADMIN" },
      select: { email: true, mustChangePassword: true },
      take: 5,
    });
    console.log(
      "ADMINS",
      admins.map((a) => `${a.email}${a.mustChangePassword ? "(mustChange)" : ""}`).join(" | "),
    );
    const counts = {
      referenceMasters: await prisma.enterpriseReferenceMaster.count(),
      productCategories: await prisma.enterpriseProductCategory.count(),
      productGroups: await prisma.enterpriseProductGroup.count(),
      products: await prisma.enterpriseProduct.count(),
      documentTypes: await prisma.enterpriseDocumentType.count(),
      documentDefs: await prisma.enterpriseDocumentDefinition.count(),
      lenderCategories: await prisma.enterpriseLenderCategory.count(),
      lenders: await prisma.enterpriseLender.count(),
      programs: await prisma.enterpriseLenderProgram.count(),
    };
    console.log("COUNTS", JSON.stringify(counts));
  } finally {
    await prisma.$disconnect();
  }

  if (!password) {
    console.log("LOGIN_SKIPPED no password provided");
    process.exit(0);
  }

  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await login.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { accessToken?: string };
    error?: { code?: string; message?: string };
  };
  console.log(
    "LOGIN",
    login.status,
    body.success === true ? "ok" : body.error?.code || "fail",
  );
  if (!body.success || !body.data?.accessToken) process.exit(2);
  const token = body.data.accessToken;

  const apis = [
    "/api/auth/me",
    "/api/reference-masters/domains",
    "/api/reference-masters?domain=industry&pageSize=5&status=active",
    "/api/product-registry/categories?pageSize=5&status=active",
    "/api/product-registry/products?pageSize=5&status=active",
    "/api/document-registry/types?pageSize=5&status=active",
    "/api/lender-registry/categories?pageSize=5&status=active",
    "/api/lender-registry/lenders?pageSize=5&status=active",
    "/api/ecm/contacts?pageSize=5",
  ];
  for (const api of apis) {
    const r = await fetch(`${base}${api}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = (await r.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { total?: number; items?: unknown[]; length?: number } | unknown[];
      error?: { message?: string };
    };
    let extra = "";
    if (j.data && typeof j.data === "object" && !Array.isArray(j.data)) {
      const d = j.data as { total?: number; items?: unknown[] };
      if (d.total != null) extra = `total=${d.total}`;
      else if (d.items) extra = `items=${d.items.length}`;
    } else if (Array.isArray(j.data)) {
      extra = `n=${j.data.length}`;
    }
    console.log(
      "API",
      r.status,
      api.split("?")[0],
      j.success === true ? "ok" : "fail",
      extra,
    );
  }

  await fetch(`${base}/api/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("LOGOUT ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
