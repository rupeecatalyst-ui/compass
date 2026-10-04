/**
 * Independent certification launcher for the current canonical recommendation
 * architecture. Not part of `npm run build`. Does not abort Hostinger deploys.
 *
 * Default harness mode: database-free --self-test.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const APPROVED_APPLICATION_BASE = "017acdeef412fcdc49edf9e628ff7d86cd71cb24";
export const APPROVED_PRODUCTION_BASE = "d080869fec6104b676798589ac5407d1f48a20de";
export const CERTIFICATION_ID = "CO-CHANAKYA-CANONICAL-CERT-5C5-001";
export const PASS_MARKER = "[canonical-recommendation-certification] PASS";

const WRAPPER_PATH =
  "scripts/co-c1-canonical-lender-recommendation-stage1-hostinger-certify.mjs";
const HARNESS_PATH =
  "scripts/co-c1-canonical-lender-recommendation-stage1-production-certify.mjs";
const MANIFEST_PATH = "scripts/co-c1-canonical-recommendation-certification-manifest.json";
export const CERTIFICATION_ONLY_PATHS = [
  WRAPPER_PATH,
  HARNESS_PATH,
  MANIFEST_PATH,
  "package.json",
].sort();

class GuardFailure extends Error {
  constructor(code) {
    super(code);
    this.name = "GuardFailure";
  }
}

function fail(code) {
  throw new GuardFailure(code);
}

function porcelainEntries(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => {
      const body = line.replace(/\r$/, "").slice(3).trim();
      const path = body.includes(" -> ") ? body.split(" -> ").pop() : body;
      return String(path).replace(/\\/g, "/");
    });
}

function normalizeNameOnly(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

export function createGitRunner(root = process.cwd()) {
  return (args) => {
    const result = spawnSync("git", args, {
      cwd: root,
      encoding: "utf8",
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: result.status, output: result.stdout ?? "", error: result.error };
  };
}

function requireGit(git, args, code) {
  const result = git(args);
  if (result.error || result.status !== 0) fail(code);
  return String(result.output ?? "");
}

export function verifyRepositoryIdentity(git) {
  const ancestorApp = git(["merge-base", "--is-ancestor", APPROVED_APPLICATION_BASE, "HEAD"]);
  if (ancestorApp.error || ancestorApp.status !== 0) fail("APPLICATION_BASE_NOT_ANCESTOR");

  const ancestorProd = git(["merge-base", "--is-ancestor", APPROVED_PRODUCTION_BASE, "HEAD"]);
  if (ancestorProd.error || ancestorProd.status !== 0) fail("PRODUCTION_BASE_NOT_ANCESTOR");

  const committed = normalizeNameOnly(requireGit(
    git,
    ["diff", "--name-only", "--diff-filter=ACDMRTUXB", `${APPROVED_APPLICATION_BASE}..HEAD`],
    "COMMIT_DIFF_UNAVAILABLE",
  ));
  if (committed.some((path) => !CERTIFICATION_ONLY_PATHS.includes(path))) {
    fail("COMMIT_PATHS_UNAPPROVED");
  }

  const dirty = porcelainEntries(requireGit(
    git,
    ["status", "--porcelain", "--untracked-files=all"],
    "WORKTREE_STATUS_UNAVAILABLE",
  ));
  for (const path of dirty) {
    if (!CERTIFICATION_ONLY_PATHS.includes(path)) fail("WORKING_TREE_PATHS_UNAPPROVED");
  }
}

export function verifyMigrationFlag(value) {
  if (String(value ?? "").trim().toLowerCase() !== "false") {
    fail("MIGRATION_FLAG_NOT_EXPLICITLY_FALSE");
  }
}

export function verifyBuildIsNotCertification() {
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
  const build = String(pkg.scripts?.build ?? "");
  if (!build.startsWith("prisma generate &&")) fail("BUILD_GENERATE_CONTRACT_MISSING");
  if (build.includes("canonical-lender-recommendation-stage1-hostinger-certify")) {
    fail("CERTIFICATION_WIRED_INTO_BUILD");
  }
  if (build.includes("migrate deploy") && !build.includes("prisma-migrate-deploy-on-build")) {
    fail("UNGATED_MIGRATE_DEPLOY_IN_BUILD");
  }
}

export function runCertificationHarness(root = process.cwd()) {
  return spawnSync(
    process.execPath,
    ["--conditions=react-server", "--import", "tsx", HARNESS_PATH, "--self-test"],
    { cwd: root, shell: false, stdio: "inherit" },
  );
}

export function resolveHarnessOutcome(result, emit = console.log) {
  if (result.error || result.signal || result.status === null) {
    return { exitCode: 1, reason: "HARNESS_PROCESS_FAILURE" };
  }
  if (result.status !== 0) return { exitCode: result.status };
  emit(PASS_MARKER);
  return { exitCode: 0 };
}

export function executeWrapper({
  git = createGitRunner(),
  migrationFlag = process.env.PRISMA_MIGRATE_DEPLOY_ON_BUILD,
  runHarness = runCertificationHarness,
  emit = console.log,
} = {}) {
  try {
    verifyRepositoryIdentity(git);
    verifyMigrationFlag(migrationFlag);
    verifyBuildIsNotCertification();
    const outcome = resolveHarnessOutcome(runHarness(), emit);
    if (outcome.reason) console.error(`[canonical-recommendation-certification] FAIL ${outcome.reason}`);
    return outcome.exitCode;
  } catch (error) {
    const reason = error instanceof GuardFailure ? error.message : "WRAPPER_VALIDATION_FAILURE";
    console.error(`[canonical-recommendation-certification] FAIL ${reason}`);
    return 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = executeWrapper();
