#!/usr/bin/env node
/**
 * CO-CERT-005 — Script 2: Enterprise Route Certification (HTTP smoke)
 * No secrets. Reports route + HTTP status + PASS/FAIL only.
 *
 * Usage: node scripts/co-cert-route-smoke.mjs
 * Optional: VERIFY_BASE_URL=https://catalyst-one-two.vercel.app
 */

import {
  exitCode,
  overallFromResults,
  padLabel,
  printSection,
} from "./_lib/cert-toolkit.mjs";

const base = (process.env.VERIFY_BASE_URL || "https://catalyst-one-two.vercel.app").replace(
  /\/$/,
  "",
);

const ROUTES = [
  { name: "Login", path: "/login", ok: (s) => s === 200 || (s >= 300 && s < 400) },
  { name: "Dashboard", path: "/dashboard", ok: (s) => s === 200 || (s >= 300 && s < 400) },
  { name: "Contacts", path: "/contacts", ok: (s) => s === 200 || (s >= 300 && s < 400) },
  { name: "Opportunities", path: "/opportunities", ok: (s) => s === 200 || (s >= 300 && s < 400) },
  { name: "Enterprise Deals", path: "/my-deals", ok: (s) => s === 200 || (s >= 300 && s < 400) },
  { name: "Documents", path: "/documents", ok: (s) => s === 200 || (s >= 300 && s < 400) },
  { name: "Lenders", path: "/lenders", ok: (s) => s === 200 || (s >= 300 && s < 400) },
  { name: "Accounting", path: "/accounting", ok: (s) => s === 200 || (s >= 300 && s < 400) },
  { name: "Mission Control", path: "/mission-control", ok: (s) => s === 200 || (s >= 300 && s < 400) },
  { name: "Workflow", path: "/workflow", ok: (s) => s === 200 || (s >= 300 && s < 400) },
  { name: "Settings", path: "/settings", ok: (s) => s === 200 || (s >= 300 && s < 400) },
];

printSection("Enterprise Route Certification");
console.log(`Target: ${base}`);
console.log("");
console.log(`${padLabel("Route", 24)}${padLabel("HTTP", 8)}Result`);

const results = [];
for (const route of ROUTES) {
  let status = -1;
  try {
    const res = await fetch(`${base}${route.path}`, {
      headers: { Cookie: "compass-access-token=probe" },
      redirect: "manual",
    });
    status = res.status;
  } catch {
    status = -1;
  }
  const pass = route.ok(status) ? "PASS" : "FAIL";
  results.push(pass);
  console.log(`${padLabel(route.name, 24)}${padLabel(String(status), 8)}${pass}`);
}

const overall = overallFromResults(results);
printSection("Overall Result");
console.log(overall);

process.exit(exitCode(overall));
