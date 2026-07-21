import { config } from "dotenv";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const BASE = "https://catalyst-one-two.vercel.app";
const prisma = new PrismaClient();

const admin = await prisma.user.findFirst({
  where: { email: "admin@rupeecatalyst.com", isActive: true },
});
const token = jwt.sign(
  { userId: admin.id, email: admin.email, role: admin.role },
  "dev-secret-change-in-production",
  { expiresIn: "1h" },
);

for (const term of ["CertLead", "Certlead", "9631921174"]) {
  const res = await fetch(`${BASE}/api/ecm/contacts?search=${encodeURIComponent(term)}&pageSize=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  console.log(term, "→", body.success ? body.data.items.map((i) => i.name).join(", ") : body.error?.message);
}

await prisma.$disconnect();
