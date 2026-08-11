import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
const prisma = new PrismaClient();
const admins = await prisma.user.findMany({
  where: { OR: [{ email: { contains: "admin" } }, { role: "SUPER_ADMIN" }] },
  select: { email: true, role: true, isActive: true },
});
const certUsers = await prisma.user.findMany({
  where: { email: { contains: "wp-access-cert" } },
  select: { email: true, isActive: true },
});
const certPartners = await prisma.enterpriseWealthPartner.findMany({
  where: { code: { in: ["WPACERTA", "WPACERTB"] } },
  select: {
    code: true,
    lifecycleStatus: true,
    operationalStatus: true,
    enabled: true,
    isDeleted: true,
    status: true,
  },
});
const audits = await prisma.partnerEntitlementAudit.count();
const opps = await prisma.enterpriseOpportunity.count({ where: { isDeleted: false } });
console.log(JSON.stringify({ admins, certUsers, certPartners, audits, opps }, null, 2));
await prisma.$disconnect();
