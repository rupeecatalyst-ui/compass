import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = "https://catalyst-one-two.vercel.app";
const prisma = new PrismaClient();

const user = await prisma.user.findUnique({ where: { email: "admin@rupeecatalyst.com" } });
if (!user) throw new Error("admin not found");

const pairs = [
  [process.env.JWT_SECRET, process.env.JWT_REFRESH_SECRET],
  ["dev-secret-change-in-production", "dev-refresh-secret-change-in-production"],
].filter(([a]) => a);

for (const [sec, ref] of pairs) {
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, sec, { expiresIn: "1h" });
  const r = await fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json();
  console.log(sec?.slice(0, 12) + "...", r.status, j.success ? "OK" : j.error?.code || "fail");
}

await prisma.$disconnect();
