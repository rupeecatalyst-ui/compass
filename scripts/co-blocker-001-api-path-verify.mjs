/**
 * CO-BLOCKER-001 — API path verification (no browser).
 * Simulates LiveEntityMasterSearch → ecmApiClient calls against local/prod server.
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });
config({ path: path.join(__dirname, "..", ".env") });

const BASE = process.env.VERIFY_BASE_URL || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const prisma = new PrismaClient();

async function tokenForAdmin() {
  const user = await prisma.user.findFirst({ where: { email: "admin@rupeecatalyst.com", isActive: true } });
  if (!user) throw new Error("admin user missing");
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
}

async function query(pathname, token) {
  const res = await fetch(`${BASE}${pathname}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  return { status: res.status, body };
}

const token = await tokenForAdmin();
const contacts = await query("/api/ecm/contacts?status=all&pageSize=25", token);
const companies = await query("/api/ecm/companies?status=all&pageSize=25", token);

console.log(`API verify → ${BASE}`);
console.log("contacts:", contacts.status, contacts.body.success ? contacts.body.data.items.length : contacts.body);
console.log("companies:", companies.status, companies.body.success ? companies.body.data.items.length : companies.body);

if (contacts.body.success && contacts.body.data.items[0]) {
  const name = contacts.body.data.items[0].name;
  const search = await query(`/api/ecm/contacts?status=all&search=${encodeURIComponent(name.slice(0, 8))}&pageSize=25`, token);
  console.log("contact search:", search.body.success ? search.body.data.items.map((c) => c.name) : search.body);
}

if (companies.body.success && companies.body.data.items[0]) {
  const name = companies.body.data.items[0].companyName;
  const search = await query(`/api/ecm/companies?status=all&search=${encodeURIComponent(name.slice(0, 8))}&pageSize=25`, token);
  console.log("company search:", search.body.success ? search.body.data.items.map((c) => c.companyName) : search.body);
}

await prisma.$disconnect();
const pass =
  contacts.status === 200 &&
  contacts.body.success &&
  contacts.body.data.items.length > 0 &&
  companies.status === 200 &&
  companies.body.success &&
  companies.body.data.items.length > 0;
process.exit(pass ? 0 : 1);
