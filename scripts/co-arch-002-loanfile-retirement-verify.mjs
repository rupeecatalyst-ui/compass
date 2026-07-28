/**
 * CO-ARCH-002 — Legacy Loan File retirement structural verify.
 * Fails on user-facing "Loan File(s)" product language in UI constants/components.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, acc);
    } else if (/\.(tsx|ts)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Strings that must not appear as user-facing product copy (quoted). */
const bannedQuoted = [
  '"Loan File"',
  "'Loan File'",
  '"Loan Files"',
  "'Loan Files'",
  '`Loan File`',
  '`Loan Files`',
  '"loan file"',
  "'loan file'",
  '"loan files"',
  "'loan files'",
];

const scanRoots = [
  path.join(root, "src/components"),
  path.join(root, "src/constants"),
  path.join(root, "src/mission-control"),
];

const allowPathFragments = [
  // Redirect / retirement comments may mention the retired name
  `${path.sep}loan-files${path.sep}page.tsx`,
  "loan-file-retirement",
];

for (const scanRoot of scanRoots) {
  for (const file of walk(scanRoot)) {
    if (allowPathFragments.some((f) => file.includes(f))) continue;
    const text = fs.readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      // Ignore pure comments (still allow code strings)
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
        return;
      }
      for (const banned of bannedQuoted) {
        if (line.includes(banned)) {
          failures.push(`${path.relative(root, file)}:${i + 1} contains ${banned}`);
        }
      }
    });
  }
}

// Architecture invariants
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
if (/\bmodel\s+LoanFile\b/.test(schema)) {
  failures.push("Prisma must not define model LoanFile");
}

const nav = fs.readFileSync(path.join(root, "src/config/navigation.ts"), "utf8");
if (/title:\s*["']Loan Files["']/.test(nav) || /title:\s*["']Loan File["']/.test(nav)) {
  failures.push("Primary navigation must not expose Loan File(s)");
}

const soft = fs.readFileSync(
  path.join(root, "src/constants/enterprise-soft-delete/index.ts"),
  "utf8",
);
if (/loan_files:\s*["']Loan Files["']/.test(soft)) {
  failures.push("Soft-delete label loan_files must not display as Loan Files");
}

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`Missing: ${rel}`);
}
mustExist(".cursor/rules/loan-file-retirement-co-arch-002.mdc");
mustExist("docs/co-arch-002/CO-ARCH-002-LEGACY-LOAN-FILE-RETIREMENT-REPORT.md");
mustExist("src/app/(dashboard)/loan-files/page.tsx");

const loanFilesPage = fs.readFileSync(
  path.join(root, "src/app/(dashboard)/loan-files/page.tsx"),
  "utf8",
);
if (!loanFilesPage.includes("router.replace")) {
  failures.push("/loan-files page must remain a redirect shell");
}

if (failures.length) {
  console.error("CO-ARCH-002 verify FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-ARCH-002 verify PASSED");
console.log(" - No Prisma LoanFile model");
console.log(" - No primary-nav Loan File(s)");
console.log(" - No banned user-facing Loan File quoted strings in UI constants/components");
console.log(" - /loan-files remains redirect-only");
