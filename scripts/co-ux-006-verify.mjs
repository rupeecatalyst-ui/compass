/**
 * CO-UX-006 — Verify (static)
 * Checks that Fresh Login KPI SSOT and API route files exist.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const required = [
  "src/constants/opportunity-business-source.ts",
  "src/app/api/enterprise-opportunities/fresh-logins/route.ts",
  "src/components/catalyst-one/user-home-dashboard/fresh-logins-section.tsx",
  "src/lib/user-home-dashboard/fresh-logins.ts",
];

let ok = true;
for (const rel of required) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) {
    console.error(`MISSING: ${rel}`);
    ok = false;
  } else {
    console.log(`OK: ${rel}`);
  }
}

if (!ok) process.exit(1);
console.log("CO-UX-006 verify: PASS");
