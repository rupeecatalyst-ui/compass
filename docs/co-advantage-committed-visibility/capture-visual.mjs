/**
 * Local fixture screenshots for Advantage Committed (₹).
 * No app login, no production data, no Hostinger, no send.
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const worktree = path.join(dir, "..", "..");
const parentModules = path.join(worktree, "..", "..", "node_modules");
const localModules = path.join(worktree, "node_modules");
const nodeModules = fs.existsSync(path.join(localModules, "puppeteer"))
  ? localModules
  : parentModules;
const require = createRequire(pathToFileURL(path.join(nodeModules, "puppeteer", "package.json")).href);
const puppeteer = require("puppeteer");

const htmlPath = path.join(dir, "visual-layout.html");
const shotDir = path.join(dir, "screenshots");
fs.mkdirSync(shotDir, { recursive: true });

const html = fs.readFileSync(htmlPath);
const server = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const origin = `http://127.0.0.1:${port}/`;

const browser = await puppeteer.launch({
  headless: "new",
  channel: "chrome",
});
const page = await browser.newPage();
await page.setViewport({ width: 1320, height: 780 });
await page.goto(origin, { waitUntil: "domcontentloaded" });

const shots = await page.$$eval("section[data-shot]", (nodes) =>
  nodes.map((node) => node.getAttribute("data-shot")),
);

for (const name of shots) {
  const handle = await page.$(`section[data-shot="${name}"]`);
  if (!handle) throw new Error(`missing surface ${name}`);
  const out = path.join(shotDir, `${name}.png`);
  await handle.screenshot({ path: out });
  console.log(`captured ${out}`);
}

await browser.close();
server.close();
console.log(`captured ${shots.length} Advantage Committed (₹) fixture screenshots`);
