/**
 * Hostinger-only launcher for the committed Stage 1 read-only certification.
 * It validates the reviewed two-commit lineage before starting the harness and
 * intentionally fails the build after a successful certification.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const APPROVED_PARENT = "a960af4233e24c18a58082344ec119bd308814b7";
export const APPROVED_WRAPPER_COMMIT = "ca91473ce7a13976ff17db9be6e6d805b2dcea4c";
export const PASS_MARKER =
  "[stage1-production-certification] PASS_RECORDED_INTENTIONAL_DEPLOYMENT_ABORT";
export const INTENTIONAL_ABORT_EXIT = 86;

const WRAPPER_PATH =
  "scripts/co-c1-canonical-lender-recommendation-stage1-hostinger-certify.mjs";
const HARNESS_PATH =
  "scripts/co-c1-canonical-lender-recommendation-stage1-production-certify.mjs";
const ALLOWED_COMMIT_PATHS = ["package.json", WRAPPER_PATH];
const STAGE1_PATHS = [
  "scripts/co-c1-canonical-lender-recommendation-stage1-verify.mjs",
  "server/services/lender-recommendation/canonical-lender-recommendation.service.ts",
  "server/services/lender-recommendation/index.ts",
  "server/services/lender-recommendation/policy-rule-parser.ts",
  "server/services/lender-recommendation/programme-assessment-adapter.ts",
  "server/services/lender-recommendation/programme-availability.ts",
  "server/services/lender-recommendation/recommendation-programme.repository.ts",
  "src/types/canonical-lender-recommendation.ts",
];

class GuardFailure extends Error {
  constructor(code) {
    super(code);
    this.name = "GuardFailure";
  }
}

function fail(code) {
  throw new GuardFailure(code);
}

function normalizeLines(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
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
  return String(result.output ?? "").trim();
}

export function verifyRepositoryIdentity(git) {
  const parents = normalizeLines(requireGit(git, ["rev-list", "--parents", "-n", "1", "HEAD"], "GIT_HEAD_UNAVAILABLE"))[0]?.split(/\s+/) ?? [];
  if (parents.length !== 2) fail("HEAD_PARENT_COUNT_INVALID");
  if (parents[1] !== APPROVED_WRAPPER_COMMIT) fail("HEAD_PARENT_UNAPPROVED");

  const wrapperParents = normalizeLines(requireGit(git, ["rev-list", "--parents", "-n", "1", APPROVED_WRAPPER_COMMIT], "WRAPPER_COMMIT_UNAVAILABLE"))[0]?.split(/\s+/) ?? [];
  if (wrapperParents.length !== 2 || wrapperParents[0] !== APPROVED_WRAPPER_COMMIT ||
      wrapperParents[1] !== APPROVED_PARENT) fail("WRAPPER_LINEAGE_UNAPPROVED");

  const ancestor = git(["merge-base", "--is-ancestor", APPROVED_PARENT, "HEAD"]);
  if (ancestor.error || ancestor.status !== 0) fail("APPROVED_PARENT_NOT_ANCESTOR");

  const count = requireGit(git, ["rev-list", "--count", `${APPROVED_PARENT}..HEAD`], "COMMIT_COUNT_UNAVAILABLE");
  if (count !== "2") fail("COMMIT_COUNT_INVALID");

  const status = requireGit(git, ["status", "--porcelain", "--untracked-files=all"], "WORKTREE_STATUS_UNAVAILABLE");
  if (status) fail("WORKTREE_NOT_CLEAN");

  const changed = normalizeLines(requireGit(
    git,
    ["diff", "--name-only", "--diff-filter=ACDMRTUXB", `${APPROVED_PARENT}..HEAD`],
    "COMMIT_DIFF_UNAVAILABLE",
  )).sort();
  if (changed.length !== ALLOWED_COMMIT_PATHS.length ||
      changed.some((path, index) => path !== [...ALLOWED_COMMIT_PATHS].sort()[index])) {
    fail("COMMIT_PATHS_UNAPPROVED");
  }

  const stage1 = git(["diff", "--quiet", APPROVED_PARENT, "HEAD", "--", ...STAGE1_PATHS]);
  if (stage1.error || stage1.status !== 0) fail("STAGE1_IDENTITY_MISMATCH");

  const harness = git(["diff", "--quiet", APPROVED_PARENT, "HEAD", "--", HARNESS_PATH]);
  if (harness.error || harness.status !== 0) fail("HARNESS_IDENTITY_MISMATCH");

  // Compare complete committed text, including whitespace: only this insertion
  // into the immutable wrapper commit's package.json is authorized.
  const packages = [APPROVED_WRAPPER_COMMIT, "HEAD"].map((ref) => {
    const result = git(["show", `${ref}:package.json`]);
    if (result.error || result.status !== 0) fail("PACKAGE_IDENTITY_UNAVAILABLE");
    return String(result.output ?? "");
  });
  const canonicalEntry = '    "cert:canonical-lender-stage1:production-readonly": "node scripts/co-c1-canonical-lender-recommendation-stage1-hostinger-certify.mjs",';
  const aliasEntry = '    "cert:stage1": "npm run cert:canonical-lender-stage1:production-readonly",';
  const parts = packages[0].split(canonicalEntry);
  if (parts.length !== 2 || packages[1] !== `${parts[0]}${canonicalEntry}\n${aliasEntry}${parts[1]}`) {
    fail("PACKAGE_ALIAS_IDENTITY_MISMATCH");
  }
}

export function verifyMigrationFlag(value) {
  if (String(value ?? "").trim().toLowerCase() !== "false") {
    fail("MIGRATION_FLAG_NOT_EXPLICITLY_FALSE");
  }
}

export function runCertificationHarness(root = process.cwd()) {
  return spawnSync(
    process.execPath,
    ["--conditions=react-server", "--import", "tsx", HARNESS_PATH],
    { cwd: root, shell: false, stdio: "inherit" },
  );
}

export function resolveHarnessOutcome(result, emit = console.log) {
  if (result.error || result.signal || result.status === null) {
    return { exitCode: 1, reason: "HARNESS_PROCESS_FAILURE" };
  }
  if (result.status !== 0) return { exitCode: result.status };
  emit(PASS_MARKER);
  return { exitCode: INTENTIONAL_ABORT_EXIT };
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
    const outcome = resolveHarnessOutcome(runHarness(), emit);
    if (outcome.reason) console.error(`[stage1-production-certification] FAIL ${outcome.reason}`);
    return outcome.exitCode;
  } catch (error) {
    const reason = error instanceof GuardFailure ? error.message : "WRAPPER_VALIDATION_FAILURE";
    console.error(`[stage1-production-certification] FAIL ${reason}`);
    return 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = executeWrapper();
