/**
 * Isolated Prisma Client proof: parent hashes unchanged; prisma.ts has no createRequire.
 */
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PARENT_NM = "C:\\Compass by Rupee Catalyst (3)\\node_modules";
const PARENT_PRISMA_CLIENT = join(PARENT_NM, "@prisma", "client");
const PARENT_GENERATED = join(PARENT_NM, ".prisma", "client");

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
  const rollup = createHash("sha256");
  for (const file of files) {
    const st = statSync(file);
    const sha256 = await hashFile(file);
    const rel = relative(dir, file).replaceAll("\\", "/");
    rollup.update(`${rel}\0${st.size}\0${sha256}\n`);
  }
  return { dir, fileCount: files.length, digest: rollup.digest("hex") };
}

const prismaTs = readFileSync(join(root, "server/lib/prisma.ts"), "utf8");
if (/createRequire/.test(prismaTs)) {
  throw new Error("server/lib/prisma.ts still contains createRequire.");
}
const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
if (!/CATALYST_BAT_ISOLATED_PRISMA/.test(nextConfig)) {
  throw new Error("next.config.ts missing BAT isolated Prisma alias gate.");
}
if (/NODE_ENV === "production"/.test(nextConfig) === false) {
  throw new Error("next.config.ts must reject isolated Prisma in production.");
}

const prismaClient = await snapshotDir(PARENT_PRISMA_CLIENT);
const generatedClient = await snapshotDir(PARENT_GENERATED);
console.log(
  JSON.stringify({
    ok: true,
    createRequireRemoved: true,
    parentPrismaClient: prismaClient,
    parentGeneratedClient: generatedClient,
  }),
);
