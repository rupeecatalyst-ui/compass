/**
 * Bundle production Marketing React components for the non-deployable visual harness.
 * Not a Next.js route. No authentication bypass. No network providers.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync, mkdirSync, statSync } from "node:fs";

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, "..", "..");
const parentModules = join(root, "..", "..", "node_modules");
const localModules = join(root, "node_modules");
const nodeModules = existsSync(join(localModules, "esbuild")) ? localModules : parentModules;

const require = createRequire(pathToFileURL(join(nodeModules, "esbuild", "lib", "main.js")).href);
const esbuild = require(join(nodeModules, "esbuild"));

const outDir = join(dir, "dist");
mkdirSync(outDir, { recursive: true });

const result = await esbuild.build({
  absWorkingDir: root,
  entryPoints: [join(dir, "main.tsx")],
  bundle: true,
  outfile: join(outDir, "app.js"),
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  jsx: "automatic",
  sourcemap: false,
  logLevel: "warning",
  nodePaths: [nodeModules],
  banner: {
    js: 'var process={env:{NODE_ENV:"development",ENTERPRISE_MARKETING_HANDOFF_MODE:"fixture"}};',
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
    "process.env.NEXT_PUBLIC_CATALYST_DEPLOYMENT_ENV": JSON.stringify("Local"),
  },
  loader: {
    ".css": "css",
    ".png": "dataurl",
    ".svg": "dataurl",
    ".woff": "dataurl",
    ".woff2": "dataurl",
  },
  alias: {
    "@/lib/api-client": join(dir, "stubs/api-client.ts"),
    "next/link": join(dir, "stubs/next-link.tsx"),
    "next/navigation": join(dir, "stubs/next-navigation.ts"),
    "next/image": join(dir, "stubs/next-image.tsx"),
    "next/headers": join(dir, "stubs/server-only.js"),
    "server-only": join(dir, "stubs/server-only.js"),
  },
  plugins: [
    {
      name: "at-alias",
      setup(build) {
        const resolveExt = (base) => {
          const candidates = [
            `${base}.tsx`,
            `${base}.ts`,
            `${base}.jsx`,
            `${base}.js`,
            join(base, "index.tsx"),
            join(base, "index.ts"),
            join(base, "index.js"),
            base,
          ];
          for (const candidate of candidates) {
            if (!existsSync(candidate)) continue;
            try {
              if (statSync(candidate).isFile()) return candidate;
            } catch {
              continue;
            }
          }
          return null;
        };
        build.onResolve({ filter: /^@\/lib\/api-client$/ }, () => ({
          path: join(dir, "stubs/api-client.ts"),
        }));
        build.onResolve({ filter: /^@\// }, (args) => {
          const resolved = resolveExt(join(root, "src", args.path.slice(2)));
          if (!resolved) return { path: join(root, "src", args.path.slice(2)) };
          return { path: resolved };
        });
        build.onResolve({ filter: /^@server\// }, (args) => {
          const resolved = resolveExt(join(root, "server", args.path.slice("@server/".length)));
          if (!resolved) return { path: join(root, "server", args.path.slice("@server/".length)) };
          return { path: resolved };
        });
      },
    },
  ],
});

if (result.errors?.length) {
  console.error(result.errors);
  process.exit(1);
}
console.log("Marketing visual harness bundled");
