/**
 * CO-CHATGPT-OAUTH-001 — Generate production ChatGPT secrets (never prints values).
 * Writes to .env.chatgpt-deploy.local (gitignored). Copy keys to Hostinger hPanel only.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outPath = resolve(process.cwd(), ".env.chatgpt-deploy.local");
const gitignorePath = resolve(process.cwd(), ".gitignore");

const clientId = `c1-chatgpt-${randomBytes(6).toString("hex")}`;
const clientSecret = randomBytes(32).toString("base64url");
const integrationKey = randomBytes(32).toString("base64url");
const redirectUri = "https://chat.openai.com/aip/oauth/callback";

const content = `# CO-CHATGPT-OAUTH-001 — generated ${new Date().toISOString()} — DO NOT COMMIT
CHATGPT_OAUTH_CLIENT_ID=${clientId}
CHATGPT_OAUTH_CLIENT_SECRET=${clientSecret}
CHATGPT_INTEGRATION_API_KEY=${integrationKey}
CHATGPT_OAUTH_REDIRECT_URIS=${redirectUri}
`;

writeFileSync(outPath, content, { encoding: "utf8", mode: 0o600 });

if (existsSync(gitignorePath)) {
  const gi = readFileSync(gitignorePath, "utf8");
  if (!gi.includes(".env.chatgpt-deploy.local")) {
    appendFileSync(gitignorePath, "\n.env.chatgpt-deploy.local\n");
  }
}

console.log("PASS: ChatGPT production secrets generated");
console.log(`  output: ${outPath} (gitignored, values not printed)`);
console.log("  action: copy these four keys to Hostinger environment variables, then rebuild/restart");
