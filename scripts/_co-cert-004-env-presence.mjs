/**
 * CO-CERT-004 — Local env presence check (never prints secret values).
 */
import fs from "fs";

const keys = [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE",
  "ENTERPRISE_PERSISTENCE_MODE",
  "DATABASE_URL",
  "DIRECT_URL",
  "DEMO_AUTH_ENABLED",
  "DEMO_AUTH_PASSWORD",
  "VERIFY_ADMIN_PASSWORD",
  "SMOKE_PASSWORD",
  "VERIFY_ADMIN_EMAIL",
];

const denylist = new Set([
  "",
  "dev-secret-change-in-production",
  "dev-refresh-secret-change-in-production",
  "change-me-to-a-long-random-secret-in-production",
  "change-me-to-another-long-random-secret",
  "secret",
  "changeme",
]);

function statusFor(key, value) {
  const v = (value ?? "").trim().replace(/^["']|["']$/g, "");
  if (!v) return "EMPTY";
  if (denylist.has(v)) return "PLACEHOLDER";
  if (key.includes("JWT") && v.length < 32) return "TOO_SHORT";
  if (key.includes("PERSISTENCE")) return v === "prisma" ? "prisma" : `OTHER:${v}`;
  if (key.includes("URL") || key.includes("PASSWORD") || key.includes("SECRET")) return "SET";
  return "SET";
}

const report = { files: {} };
for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) {
    report.files[file] = { present: false };
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  const entries = {};
  for (const key of keys) {
    const m = text.match(new RegExp(`^${key}=(.*)$`, "m"));
    entries[key] = m ? statusFor(key, m[1]) : "MISSING";
  }
  report.files[file] = { present: true, entries };
}

const jwtA = report.files[".env.local"]?.entries?.JWT_SECRET;
const jwtB = report.files[".env.local"]?.entries?.JWT_REFRESH_SECRET;
report.jwtDistinct =
  jwtA === "SET" && jwtB === "SET"
    ? "both_set_distinctness_not_compared_in_output"
    : "incomplete";

console.log(JSON.stringify(report, null, 2));
