/**
 * Prepare a worktree-local Prisma schema that generates into .tmp, not parent node_modules.
 * Does not run prisma generate. Does not modify prisma/schema.prisma.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
const isolatedDir = join(root, ".tmp/isolated-prisma");
const outputDir = join(root, ".tmp/generated/prisma-client");
mkdirSync(isolatedDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });

if (!source.includes('generator client {\n  provider = "prisma-client-js"\n}')) {
  throw new Error("Unexpected generator client block; refusing to rewrite schema.");
}

const rewritten = source.replace(
  'generator client {\n  provider = "prisma-client-js"\n}',
  `generator client {\n  provider = "prisma-client-js"\n  output   = "${outputDir.replaceAll("\\", "/")}"\n}`,
);

writeFileSync(join(isolatedDir, "schema.prisma"), rewritten);
console.log(
  JSON.stringify({
    ok: true,
    sourceSchema: "prisma/schema.prisma",
    isolatedSchema: ".tmp/isolated-prisma/schema.prisma",
    generateOutput: ".tmp/generated/prisma-client",
    generateCommand:
      "node ../node_modules/prisma/build/index.js generate --schema .tmp/isolated-prisma/schema.prisma",
    note: "Not executed. Default generator in prisma/schema.prisma is unchanged so parent node_modules is not targeted.",
  }),
);
