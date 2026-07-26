/**
 * CO-STAB-001 — JWT probe: verify configured JWT_SECRET works; insecure placeholders must fail.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { requireEnv, INSECURE_JWT_DENYLIST } from "./_lib/require-env.mjs";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = "https://catalyst-one-two.vercel.app";
const prisma = new PrismaClient();

const user = await prisma.user.findUnique({ where: { email: "admin@rupeecatalyst.com" } });
if (!user) throw new Error("admin not found");

const jwtSecret = requireEnv("JWT_SECRET", { minLength: 32 });
const pairs = [
  [jwtSecret, requireEnv("JWT_REFRESH_SECRET", { minLength: 32 })],
  // Denylist probe — must NOT authenticate against a hardened production deployment
  [INSECURE_JWT_DENYLIST[0], INSECURE_JWT_DENYLIST[1]],
];

for (const [sec, ref] of pairs) {
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    sec,
    { expiresIn: "1h" },
  );
  const r = await fetch(`${BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json();
  console.log(
    sec?.slice(0, 12) + "...",
    r.status,
    j.success ? "OK" : j.error?.code || "fail",
  );
  void ref;
}

await prisma.$disconnect();
