#!/usr/bin/env node
/** Route, legal, SEO launch-safe checks. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const routes = [
  "compass/src/app/privacy/page.tsx",
  "compass/src/app/terms/page.tsx",
  "compass/src/app/disclaimer/page.tsx",
  "compass/src/app/sitemap.ts",
  "compass/src/app/robots.ts",
];
for (const route of routes) {
  assert.ok(existsSync(join(root, route)), `Missing ${route}`);
}

const site = readFileSync(join(root, "compass/src/config/site.ts"), "utf8");
const layout = readFileSync(join(root, "compass/src/app/layout.tsx"), "utf8");
const borrow = readFileSync(join(root, "compass/src/config/borrow-navigation.ts"), "utf8");

assert.match(site, /98219 84181/);
assert.match(site, /champion@rupeecatalyst.com/);
assert.doesNotMatch(layout, /localhost:3001/);
assert.match(borrow, /future:\s*true/);

console.log("CO-COMPASS-ROUTE-LEGAL-SEO verify: PASS");
