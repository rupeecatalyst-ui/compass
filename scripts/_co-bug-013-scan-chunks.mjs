import fs from "fs";
import path from "path";
import os from "os";

const base = "https://catalyst-one-two.vercel.app";
const htmlRes = await fetch(`${base}/contacts`, {
  headers: { Cookie: "compass-access-token=probe-token" },
});
const html = await htmlRes.text();
const chunks = [...html.matchAll(/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]);
const unique = [...new Set(chunks)];
const dir = path.join(os.tmpdir(), "c1-chunks-cobug013");
fs.mkdirSync(dir, { recursive: true });

const patterns = [
  "CO-STAB-001",
  "JWT_SECRET is required",
  "dev-secret-change-in-production",
  "ecmContactRepository",
  "server/config/env",
  "Unable to load this view",
];

const hits = [];
for (const c of unique) {
  const url = `${base}/_next/${c}`;
  const out = path.join(dir, c.replace(/[\\/]/g, "_"));
  try {
    const res = await fetch(url);
    const txt = await res.text();
    fs.writeFileSync(out, txt);
    const matched = patterns.filter((p) => txt.includes(p));
    if (matched.length) {
      hits.push({ chunk: c, matched });
      console.log("HIT", c, matched.join("|"));
    }
  } catch (e) {
    console.log("FAIL", c, String(e));
  }
}

// Also pull likely app route chunks by probing build id from html
const buildId = html.match(/"b":"([^"]+)"/)?.[1];
console.log(JSON.stringify({ chunkCount: unique.length, buildId, hits }, null, 2));
