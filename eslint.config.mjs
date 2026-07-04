import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "src/routes/**",
      "src/components/site/**",
      "src/server.ts",
      "src/start.ts",
      "src/router.tsx",
      "src/routeTree.gen.ts",
      "src/integrations/**",
      "vite.config.ts",
      "dist/**",
      ".next/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
