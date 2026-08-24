/**
 * Merge .env.chatgpt-deploy.local into .env.local without printing secret values.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const src = resolve(root, ".env.chatgpt-deploy.local");
const dest = resolve(root, ".env.local");

if (!existsSync(src)) {
  console.error("Missing .env.chatgpt-deploy.local");
  process.exit(1);
}

const keys = [
  "CHATGPT_OAUTH_CLIENT_ID",
  "CHATGPT_OAUTH_CLIENT_SECRET",
  "CHATGPT_INTEGRATION_API_KEY",
  "CHATGPT_OAUTH_REDIRECT_URIS",
];

const picked = readFileSync(src, "utf8")
  .split(/\r?\n/)
  .filter((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return false;
    return keys.includes(t.split("=")[0]?.trim() || "");
  });

let destText = existsSync(dest) ? readFileSync(dest, "utf8") : "";
for (const key of keys) {
  destText = destText.replace(new RegExp(`^${key}=.*\\n?`, "gm"), "");
}
destText = destText.trimEnd();
destText += `\n\n# CO-CHATGPT-OAUTH-001 deploy secrets (local smoke — mirror on Hostinger)\n${picked.join("\n")}\n`;
writeFileSync(dest, destText, "utf8");

console.log("PASS: merged ChatGPT deploy keys into .env.local (values not printed)");
