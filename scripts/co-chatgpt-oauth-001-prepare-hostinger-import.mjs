/**
 * CO-CHATGPT-OAUTH-001 — Merge ChatGPT secrets into .env.hostinger for hPanel Import .env.
 * Never prints secret values.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const chatgptSrc = resolve(root, ".env.chatgpt-deploy.local");
const hostingerDest = resolve(root, ".env.hostinger");

const keys = [
  "CHATGPT_OAUTH_CLIENT_ID",
  "CHATGPT_OAUTH_CLIENT_SECRET",
  "CHATGPT_INTEGRATION_API_KEY",
  "CHATGPT_OAUTH_REDIRECT_URIS",
];

function parseLines(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/);
}

if (!existsSync(chatgptSrc)) {
  console.error("FAIL: .env.chatgpt-deploy.local missing — run provision-secrets first");
  process.exit(1);
}

const picked = parseLines(chatgptSrc).filter((line) => {
  const t = line.trim();
  if (!t || t.startsWith("#")) return false;
  const name = t.split("=")[0]?.trim();
  return keys.includes(name || "");
});

if (picked.length !== keys.length) {
  console.error(`FAIL: expected ${keys.length} ChatGPT keys in deploy file, found ${picked.length}`);
  process.exit(1);
}

let destLines = existsSync(hostingerDest) ? parseLines(hostingerDest) : [];
destLines = destLines.filter((line) => {
  const name = line.trim().split("=")[0]?.trim();
  return !keys.includes(name || "");
});

while (destLines.length && !destLines[destLines.length - 1].trim()) destLines.pop();

const merged = [
  ...destLines,
  "",
  "# CO-CHATGPT-OAUTH-001 — import these four keys via Hostinger hPanel → Import .env",
  ...picked,
  "",
].join("\n");

writeFileSync(hostingerDest, merged, { encoding: "utf8", mode: 0o600 });
console.log("PASS: merged ChatGPT keys into .env.hostinger (values not printed)");
console.log(`  file: ${hostingerDest}`);
console.log(`  keys: ${keys.join(", ")}`);
