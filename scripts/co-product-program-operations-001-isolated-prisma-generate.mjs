/**
 * Copy worktree schema, generate Prisma Client into .tmp, prove parent node_modules unchanged.
 * Never prints passwords. Does not modify prisma/schema.prisma.
 */
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PARENT_NM = "C:\\Compass by Rupee Catalyst (3)\\node_modules";
const PARENT_PRISMA_CLIENT = join(PARENT_NM, "@prisma", "client");
const PARENT_GENERATED = join(PARENT_NM, ".prisma", "client");
const isolatedSchemaDir = join(root, ".tmp/isolated-prisma");
const isolatedSchemaPath = join(isolatedSchemaDir, "schema.prisma");
const outputDir = join(root, ".tmp/generated/prisma-client");
const reportPath = join(root, ".tmp/ppo-prisma-parent-integrity.json");

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

function hashFile(file) {
  return new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}

async function snapshotDir(dir) {
  const files = listFiles(dir);
  const entries = [];
  const rollup = createHash("sha256");
  for (const file of files) {
    const st = statSync(file);
    const sha256 = await hashFile(file);
    const rel = relative(dir, file).replaceAll("\\", "/");
    entries.push({
      relative: rel,
      size: st.size,
      mtimeMs: st.mtimeMs,
      sha256,
    });
    rollup.update(`${rel}\0${st.size}\0${sha256}\n`);
  }
  return {
    dir,
    fileCount: files.length,
    digest: rollup.digest("hex"),
    entries,
  };
}

function stripGenerator(text) {
  return text.replace(/\r\n/g, "\n").replace(/generator client \{[\s\S]*?\}\r?\n\r?\n/, "");
}

function declaredNames(text) {
  return [...text.replace(/\r\n/g, "\n").matchAll(/^(model|enum) (\w+)/gm)]
    .map((m) => `${m[1]} ${m[2]}`)
    .sort();
}

const source = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
const generatorRe =
  /generator client \{\r?\n  provider = "prisma-client-js"\r?\n\}/;
if (!generatorRe.test(source)) {
  throw new Error("Unexpected generator client block; refusing to copy schema.");
}

mkdirSync(isolatedSchemaDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });
const copied = source.replace(
  generatorRe,
  'generator client {\n  provider = "prisma-client-js"\n  output   = "../generated/prisma-client"\n}',
);
writeFileSync(isolatedSchemaPath, copied);

const before = {
  prismaClient: await snapshotDir(PARENT_PRISMA_CLIENT),
  generatedClient: await snapshotDir(PARENT_GENERATED),
};

function runPrismaGenerate() {
  return new Promise((resolveRun, reject) => {
    const child = spawn(
      process.execPath,
      [join(PARENT_NM, "prisma/build/index.js"), "generate", "--schema", isolatedSchemaPath],
      {
        cwd: root,
        env: {
          ...process.env,
          NODE_PATH: PARENT_NM,
          DATABASE_URL: "postgresql://127.0.0.1:55434/postgres",
          DIRECT_URL: "postgresql://127.0.0.1:55434/postgres",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      out += chunk;
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolveRun(out);
      else reject(new Error(`prisma generate exited ${code}`));
    });
  });
}

const generateOutput = await runPrismaGenerate();
if (/node_modules[\\/](@prisma|\.prisma)[\\/]client/i.test(generateOutput) && /Generated Prisma Client/i.test(generateOutput)) {
  const generatedLine = generateOutput.split(/\r?\n/).find((line) => /Generated Prisma Client/i.test(line)) ?? "";
  if (!generatedLine.includes(".tmp") && /node_modules/.test(generatedLine)) {
    throw new Error(`Prisma generate targeted node_modules: ${generatedLine}`);
  }
}

const after = {
  prismaClient: await snapshotDir(PARENT_PRISMA_CLIENT),
  generatedClient: await snapshotDir(PARENT_GENERATED),
};

function unchanged(label, a, b) {
  if (a.digest !== b.digest || a.fileCount !== b.fileCount) {
    const changed = [];
    const aMap = new Map(a.entries.map((e) => [e.relative, e]));
    const bMap = new Map(b.entries.map((e) => [e.relative, e]));
    for (const [rel, entry] of bMap) {
      const prev = aMap.get(rel);
      if (!prev || prev.sha256 !== entry.sha256 || prev.size !== entry.size) changed.push(rel);
    }
    for (const rel of aMap.keys()) {
      if (!bMap.has(rel)) changed.push(`removed:${rel}`);
    }
    throw new Error(`${label} changed after generate: ${changed.slice(0, 20).join(", ")}`);
  }
}

unchanged("parent node_modules/@prisma/client", before.prismaClient, after.prismaClient);
unchanged("parent node_modules/.prisma/client", before.generatedClient, after.generatedClient);

const generatedSchemaPath = join(outputDir, "schema.prisma");
if (!existsSync(generatedSchemaPath)) {
  throw new Error("Isolated generate did not write schema.prisma into .tmp/generated/prisma-client");
}
if (!existsSync(join(outputDir, "index.js"))) {
  throw new Error("Isolated generate did not write index.js");
}

const isolatedText = readFileSync(isolatedSchemaPath, "utf8");
if (stripGenerator(source) !== stripGenerator(isolatedText)) {
  throw new Error("Copied schema is not the worktree schema plus generator output only.");
}
const worktreeNames = declaredNames(source);
const generatedNames = declaredNames(readFileSync(generatedSchemaPath, "utf8"));
if (JSON.stringify(worktreeNames) !== JSON.stringify(generatedNames)) {
  throw new Error("Generated client schema model/enum names do not match the worktree schema.");
}
const generatedText = readFileSync(generatedSchemaPath, "utf8");
if (!generatedText.includes("ProgrammePublicationState") || !generatedText.includes("advantageCommittedAmount")) {
  throw new Error("Generated client schema is missing worktree programme/advantage fields.");
}
const worktreeSchemaHash = createHash("sha256").update(stripGenerator(source)).digest("hex");
const generatedSchemaHash = createHash("sha256").update(JSON.stringify(generatedNames)).digest("hex");

const resolvedOutput = resolve(outputDir);
if (!resolvedOutput.replaceAll("\\", "/").endsWith(".tmp/generated/prisma-client")) {
  throw new Error(`Unexpected isolated output path: ${resolvedOutput}`);
}

const report = {
  ok: true,
  copiedSchema: ".tmp/isolated-prisma/schema.prisma",
  generatedClient: ".tmp/generated/prisma-client",
  parent: {
    "@prisma/client": {
      beforeDigest: before.prismaClient.digest,
      afterDigest: after.prismaClient.digest,
      fileCount: before.prismaClient.fileCount,
    },
    ".prisma/client": {
      beforeDigest: before.generatedClient.digest,
      afterDigest: after.generatedClient.digest,
      fileCount: before.generatedClient.fileCount,
    },
  },
  schemaCorrespondence: {
    worktreeSchemaHash,
    generatedSchemaHash,
    match: true,
  },
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
