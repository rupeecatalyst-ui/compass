/**
 * CO-C1-ADMIN-USER-MANUAL-001 — local verification (engineering gate).
 * Does not deploy. Does not touch Marketing execution flags.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

const articleIndexPath = path.join(
  root,
  "src/constants/enterprise-user-manual/article-index.ts",
);
const adminConsolePath = path.join(root, "src/constants/administration-console.ts");
const routesPath = path.join(root, "src/constants/routes.ts");
const pagePath = path.join(
  root,
  "src/app/(dashboard)/admin/user-manual/[[...slug]]/page.tsx",
);
const contentRoot = path.join(root, "content/enterprise-user-manual");

assert(fs.existsSync(articleIndexPath), "article-index.ts missing");
assert(fs.existsSync(adminConsolePath), "administration-console.ts missing");
assert(fs.existsSync(routesPath), "routes.ts missing");
assert(fs.existsSync(pagePath), "user-manual page missing");
assert(fs.existsSync(contentRoot), "content/enterprise-user-manual missing");

const routesSrc = fs.readFileSync(routesPath, "utf8");
assert(
  routesSrc.includes('ADMIN_USER_MANUAL: "/admin/user-manual"'),
  "ADMIN_USER_MANUAL route missing",
);

const consoleSrc = fs.readFileSync(adminConsolePath, "utf8");
assert(consoleSrc.includes('"user-manual"'), "user-manual category missing");
assert(
  consoleSrc.includes("ADMIN_USER_MANUAL"),
  "User Manual module href missing",
);
assert(
  /id:\s*"user-manual"[\s\S]*?id:\s*"organization"/.test(consoleSrc) ||
    consoleSrc.indexOf('id: "user-manual"') <
      consoleSrc.indexOf('id: "organization"'),
  "User Manual should be first-class ahead of Organization",
);

const indexSrc = fs.readFileSync(articleIndexPath, "utf8");
const fileMatches = [...indexSrc.matchAll(/file:\s*"([^"]+)"/g)].map((m) => m[1]);
assert(fileMatches.length >= 15, `expected >=15 articles, found ${fileMatches.length}`);

for (const rel of fileMatches) {
  const abs = path.join(contentRoot, rel);
  assert(fs.existsSync(abs), `missing markdown: ${rel}`);
  const raw = fs.readFileSync(abs, "utf8");
  assert(raw.startsWith("---"), `frontmatter missing: ${rel}`);
  assert(/title:\s*.+/.test(raw), `title missing: ${rel}`);
  assert(/categoryId:\s*.+/.test(raw), `categoryId missing: ${rel}`);
}

const marketingFiles = fileMatches.filter((f) => f.startsWith("marketing/"));
assert(marketingFiles.length >= 5, "Marketing section articles incomplete");

/** Minimal frontmatter + internal link sanity (mirrors loader expectations). */
const ids = new Set();
const internalLinkRe = /\]\(\/admin\/user-manual\/([^)#]+)\)/g;
for (const rel of fileMatches) {
  const raw = fs.readFileSync(path.join(contentRoot, rel), "utf8");
  const end = raw.indexOf("\n---", 3);
  assert(end > 0, `frontmatter end missing: ${rel}`);
  const fm = raw.slice(3, end);
  const idLine = fm.split(/\r?\n/).find((l) => l.startsWith("id:"));
  assert(idLine, `id missing: ${rel}`);
  const id = idLine.slice(3).trim();
  assert(!ids.has(id), `duplicate id: ${id}`);
  ids.add(id);
  const body = raw.slice(end + 4);
  assert(/#{1,3}\s+\S+/.test(body), `no headings in body: ${rel}`);
  let m;
  while ((m = internalLinkRe.exec(body)) !== null) {
    const target = m[1];
    assert(
      fileMatches.some((f) => f.replace(/\.md$/, "") === target),
      `broken manual link ${target} in ${rel}`,
    );
  }
}

const envExample = path.join(root, ".env.example");
if (fs.existsSync(envExample)) {
  const env = fs.readFileSync(envExample, "utf8");
  // Soft check — do not require the keys, but if present they must not be forced true by this sprint.
  assert(
    !/ENTERPRISE_MARKETING_EXECUTION_ENABLED\s*=\s*true/.test(env),
    ".env.example must not enable live marketing execution",
  );
}

const workspace = path.join(
  root,
  "src/components/catalyst-one/enterprise-user-manual/user-manual-workspace.tsx",
);
assert(fs.existsSync(workspace), "UserManualWorkspace missing");

const pageSrc = fs.readFileSync(pagePath, "utf8");
assert(pageSrc.includes("UserManualWorkspace"), "page does not mount workspace");
assert(
  !fs
    .readFileSync(path.join(root, "src/constants/routes.ts"), "utf8")
    .includes("ADMIN_MARKETING_USER_MANUAL"),
  "must not add Marketing-owned manual route",
);

if (failures.length) {
  console.error("CO-C1-ADMIN-USER-MANUAL-001 VERIFY FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-C1-ADMIN-USER-MANUAL-001 VERIFY PASS");
console.log(` articles: ${fileMatches.length}`);
console.log(` marketing articles: ${marketingFiles.length}`);
console.log(` unique ids: ${ids.size}`);
console.log(" route: /admin/user-manual");
console.log(" deploy: skipped (PO review gate)");
