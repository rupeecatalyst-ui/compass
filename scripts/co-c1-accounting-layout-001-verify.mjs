#!/usr/bin/env node
/**
 * CO-C1-ACCOUNTING-LAYOUT-001 — shared shell / Accounting layout gate.
 * Static engineering assertions; no business or persistence mutation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const shell = read("src/layouts/dashboard-layout.tsx");
assert.match(shell, /className="flex h-screen overflow-hidden bg-background"/);
assert.match(shell, /pathname\.startsWith\("\/accounting"\)/);
assert.match(shell, /min-h-0 w-full min-w-0 flex-1 overflow-x-hidden/);
assert.match(shell, /"w-full min-w-0"/);

const registry = read("src/constants/enterprise-registry-workspace.ts");
assert.doesNotMatch(
  registry,
  /ENTERPRISE_REGISTRY_FULL_WIDTH_PATH_PREFIXES[\s\S]*"\/accounting"/,
  "Accounting is a document-scroll workspace, not a locked registry datagrid",
);

const sidebar = read("src/components/layout/app-sidebar.tsx");
assert.match(sidebar, /shrink-0/);
assert.match(sidebar, /hidden h-screen.*md:flex/);
assert.match(
  sidebar,
  /<motion\.aside[\s\S]*?className="hidden h-screen shrink-0 flex-col/,
);

const animation = read("src/constants/animations.ts");
assert.match(animation, /expanded:\s*\{\s*width:\s*260\s*\}/);
assert.match(animation, /collapsed:\s*\{\s*width:\s*64\s*\}/);

const accounting = read(
  "src/components/catalyst-one/accounting/accounting-workspace.tsx",
);
assert.match(accounting, /<div className="w-full min-w-0">/);
assert.doesNotMatch(accounting, /-mx-4 md:-mx-6 lg:-mx-8/);
assert.doesNotMatch(accounting, /\bw-screen\b|100vw/);

const mobile = read("src/components/layout/mobile-nav.tsx");
assert.match(mobile, /w-\[min\(100vw,20rem\)\]/);
const topbar = read("src/components/layout/app-topbar.tsx");
assert.match(topbar, /matchMedia\("\(max-width: 767px\)"\)/);

console.log("CO-C1-ACCOUNTING-LAYOUT-001 verify: PASS");
