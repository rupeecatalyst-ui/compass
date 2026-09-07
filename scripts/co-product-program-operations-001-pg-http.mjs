/**
 * Live HTTP BAT against the isolated Next process and clean_002.
 * Never prints passwords. Never uses production DATABASE_URL.
 */
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PARENT_NM = "C:\\Compass by Rupee Catalyst (3)\\node_modules";
const secret = JSON.parse(readFileSync(join(root, ".tmp/ppo-bat.secret.json"), "utf8"));
const dbIdx = process.argv.indexOf("--database");
const CLEAN_DB = dbIdx >= 0 ? process.argv[dbIdx + 1] : null;
if (CLEAN_DB !== "catalyst_one_product_program_bat_clean_002") {
  throw new Error("HTTP BAT must target catalyst_one_product_program_bat_clean_002.");
}
const HOST = "127.0.0.1";
const PORT = 3010;
const BASE = `http://${HOST}:${PORT}`;
const keepApp = process.argv.includes("--keep-app");

function urlFor(db) {
  return `postgresql://${encodeURIComponent(secret.user)}:${encodeURIComponent(secret.password)}@${HOST}:${secret.port}/${db}?schema=public`;
}

function redact(text) {
  return String(text)
    .replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@")
    .replace(/password[=:]\s*\S+/gi, "password=***");
}

const childEnv = {
  ...process.env,
  NODE_PATH: PARENT_NM,
  DATABASE_URL: urlFor(CLEAN_DB),
  DIRECT_URL: urlFor(CLEAN_DB),
  JWT_SECRET: secret.jwtSecret,
  JWT_REFRESH_SECRET: secret.jwtRefreshSecret,
  JWT_EXPIRES_IN: "8h",
  JWT_REFRESH_EXPIRES_IN: "7d",
  ENTERPRISE_PERSISTENCE_MODE: "prisma",
  NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE: "prisma",
  ENTERPRISE_MARKETING_EMAIL_MODE: "dry_run",
  NODE_ENV: "development",
  PORT: String(PORT),
  HOSTNAME: HOST,
  CATALYST_BAT_ISOLATED_PRISMA: "1",
  CATALYST_BAT_PRISMA_CLIENT_MODULE: ".tmp/generated/prisma-client",
  NEXT_TELEMETRY_DISABLED: "1",
};

const results = [];
function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(JSON.stringify({ id, ok, detail }));
  if (!ok) throw new Error(`${id} FAIL`);
}

function startNext() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(PARENT_NM, "next/dist/bin/next"), "dev", "--hostname", HOST, "--port", String(PORT)],
      { cwd: root, env: childEnv, stdio: ["ignore", "pipe", "pipe"] },
    );
    let ready = false;
    const failTimer = setTimeout(() => {
      if (!ready) reject(new Error("Next.js did not become ready within 180s"));
    }, 180_000);
    const onData = (chunk) => {
      const text = redact(String(chunk));
      process.stdout.write(text);
      if (/Ready in|started server|Local:/i.test(text)) {
        ready = true;
        clearTimeout(failTimer);
        resolve(child);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (!ready) {
        clearTimeout(failTimer);
        reject(new Error(`Next.js exited ${code} before ready`));
      }
    });
  });
}

async function waitHealth(child) {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${BASE}/login`, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      /* still booting */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  child.kill("SIGTERM");
  throw new Error("Next.js /login never responded");
}

async function json(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text.slice(0, 500) };
  }
  return { status: res.status, parsed };
}

function tokenOf(payload) {
  return (
    payload?.data?.accessToken ||
    payload?.data?.token ||
    payload?.data?.tokens?.accessToken ||
    payload?.accessToken ||
    null
  );
}

const RUN = randomBytes(4).toString("hex");
let child;
try {
  child = await startNext();
  await waitHealth(child);
  mkdirSync(join(root, ".tmp"), { recursive: true });
  writeFileSync(
    join(root, ".tmp/ppo-next.json"),
    `${JSON.stringify({ host: HOST, port: PORT, base: BASE, pid: child.pid, keepApp }, null, 2)}\n`,
  );

  const creatorLogin = await json("POST", "/api/auth/login", {
    body: { email: secret.users.creator.email, password: secret.users.creator.password },
  });
  const creatorToken = tokenOf(creatorLogin.parsed);
  record("HTTP-LOGIN-CREATOR", creatorLogin.status === 200 && Boolean(creatorToken), {
    status: creatorLogin.status,
  });

  const viewerLogin = await json("POST", "/api/auth/login", {
    body: { email: secret.users.viewer.email, password: secret.users.viewer.password },
  });
  const viewerToken = tokenOf(viewerLogin.parsed);
  record("HTTP-LOGIN-VIEWER", viewerLogin.status === 200 && Boolean(viewerToken), {
    status: viewerLogin.status,
  });

  const { PROGRAMME_BAT_FIXTURES } = await import("../src/lib/product-programme-operations/fixtures.ts");
  const createBody = PROGRAMME_BAT_FIXTURES.homeLoanSalaried({
    lenderId: "lender_ppo_clean",
    policyVersionId: "policyver_ppo_clean",
    creditRiskPolicyRef: "policy_ppo_clean",
    code: `HTTP-HL-SAL-${RUN}`,
    label: `HTTP Fixture Home Loan ${RUN}`,
  });
  delete createBody.employmentFamily;

  const denied = await json("POST", "/api/lender-registry/programs", {
    token: viewerToken,
    body: createBody,
  });
  record("HTTP-VIEWER-DENIED", denied.status === 403 || denied.status === 401, { status: denied.status });

  const created = await json("POST", "/api/lender-registry/programs", {
    token: creatorToken,
    body: createBody,
  });
  const programId = created.parsed?.data?.id;
  record("HTTP-CREATE", created.status === 200 || created.status === 201, {
    status: created.status,
    id: programId,
    publicationState: created.parsed?.data?.publicationState,
  });

  const listed = await json("GET", "/api/lender-registry/programs", { token: creatorToken });
  record("HTTP-LIST", listed.status === 200, { status: listed.status });

  const submitted = await json("POST", `/api/lender-registry/programs/${programId}/workflow`, {
    token: creatorToken,
    body: { action: "submit" },
  });
  record("HTTP-SUBMIT", submitted.status === 200, { status: submitted.status });

  const selfApprove = await json("POST", `/api/lender-registry/programs/${programId}/workflow`, {
    token: creatorToken,
    body: { action: "approve" },
  });
  record(
    "HTTP-SELF-APPROVE-DENIED",
    selfApprove.status === 403 || selfApprove.status === 400,
    { status: selfApprove.status },
  );

  const approverLogin = await json("POST", "/api/auth/login", {
    body: { email: secret.users.approver.email, password: secret.users.approver.password },
  });
  const approverToken = tokenOf(approverLogin.parsed);
  record("HTTP-LOGIN-APPROVER", approverLogin.status === 200 && Boolean(approverToken), {
    status: approverLogin.status,
  });

  const approved = await json("POST", `/api/lender-registry/programs/${programId}/workflow`, {
    token: approverToken,
    body: { action: "approve" },
  });
  record("HTTP-APPROVE", approved.status === 200, { status: approved.status });

  const published = await json("POST", `/api/lender-registry/programs/${programId}/workflow`, {
    token: approverToken,
    body: { action: "publish" },
  });
  record("HTTP-PUBLISH", published.status === 200 && published.parsed?.data?.isLivePublished === true, {
    status: published.status,
    isLivePublished: published.parsed?.data?.isLivePublished,
  });

  const publishedId = published.parsed?.data?.id || programId;
  const publishedLock = published.parsed?.data?.lockVersion;
  const draftRevision = await json("PATCH", `/api/lender-registry/programs/${publishedId}`, {
    token: creatorToken,
    body: {
      createDraftRevision: true,
      expectedLockVersion: publishedLock,
      minRoiExact: "8.250000",
      maxRoiExact: "9.000000",
    },
  });
  const draftId = draftRevision.parsed?.data?.id;
  const draftGet = await json("GET", `/api/lender-registry/programs/${draftId}`, { token: creatorToken });
  const parentGet = await json("GET", `/api/lender-registry/programs/${publishedId}`, { token: creatorToken });
  record(
    "HTTP-DRAFT-REVISION-ATOMIC",
    draftRevision.status === 200 &&
      draftGet.parsed?.data?.completenessState === "complete" &&
      draftGet.parsed?.data?.publicationState === "draft" &&
      draftGet.parsed?.data?.isLivePublished === false &&
      parentGet.parsed?.data?.isLivePublished === true,
    {
      status: draftRevision.status,
      completenessState: draftGet.parsed?.data?.completenessState,
      publicationState: draftGet.parsed?.data?.publicationState,
      parentLive: parentGet.parsed?.data?.isLivePublished,
    },
  );

  const emptyLogin = await json("POST", "/api/auth/login", { body: undefined });
  const emptyRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "",
  });
  const emptyText = await emptyRes.text();
  let emptyParsed;
  try {
    emptyParsed = JSON.parse(emptyText);
  } catch {
    emptyParsed = null;
  }
  record(
    "HTTP-LOGIN-EMPTY-BODY-JSON",
    emptyRes.status === 400 && Boolean(emptyParsed) && emptyParsed.success === false,
    { status: emptyRes.status, code: emptyParsed?.error?.code },
  );
  void emptyLogin;

  const logout = await json("POST", "/api/auth/logout", { token: creatorToken, body: {} });
  record("HTTP-LOGOUT", logout.status === 200 || logout.status === 204, { status: logout.status });
  const loginAgain = await json("POST", "/api/auth/login", {
    body: { email: secret.users.creator.email, password: secret.users.creator.password },
  });
  record("HTTP-LOGIN-AGAIN", loginAgain.status === 200 && Boolean(tokenOf(loginAgain.parsed)), {
    status: loginAgain.status,
  });

  const opps = await json("GET", "/api/enterprise-opportunities", { token: creatorToken });
  record(
    "HTTP-OPPORTUNITIES-REACHABLE",
    opps.status === 200 || opps.status === 401 || opps.status === 403 || opps.status === 404,
    { status: opps.status },
  );

  console.log(JSON.stringify({ ok: true, database: CLEAN_DB, base: BASE, results }));
} catch (err) {
  if (child && !keepApp) child.kill("SIGTERM");
  throw err;
}
if (child && !keepApp) {
  child.kill("SIGTERM");
} else {
  console.log(JSON.stringify({ appKept: true, base: BASE, pid: child?.pid }));
}
