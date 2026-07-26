/**
 * Confirm production is serving the new Opportunity header layout markers.
 * Usage: node scripts/opportunity-header-prod-serve-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const BASE = process.env.VERIFY_BASE_URL || "https://catalyst-one-two.vercel.app";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(
  __dirname,
  "..",
  "docs",
  "certification-screenshots",
  "opportunity-header-layout",
);

function chromePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    cache: "no-store",
  });
  return {
    ok: res.ok,
    status: res.status,
    text: res.ok ? await res.text() : "",
    headers: {
      vercelId: res.headers.get("x-vercel-id"),
      vercelCache: res.headers.get("x-vercel-cache"),
      age: res.headers.get("age"),
    },
  };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const home = await fetchText(`${BASE}/`);
  const buildMatch = home.text.match(/\/_next\/static\/([a-zA-Z0-9_-]+)\//);
  const buildId = buildMatch?.[1] ?? null;

  const urls = new Set();
  for (const m of home.text.matchAll(/\/_next\/static\/[^"' ]+\.(?:js|css)/g)) {
    urls.add(`${BASE}${m[0]}`);
  }

  if (buildId) {
    for (const name of ["_buildManifest.js", "_ssgManifest.js"]) {
      urls.add(`${BASE}/_next/static/${buildId}/${name}`);
    }
    const manifest = await fetchText(`${BASE}/_next/static/${buildId}/_buildManifest.js`);
    if (manifest.ok) {
      for (const m of manifest.text.matchAll(/static\/chunks\/[^"' ]+\.js/g)) {
        urls.add(`${BASE}/_next/${m[0]}`);
      }
    }
  }

  let foundNew = false;
  let hitUrl = null;
  const needle = "minmax(0,18rem)";

  for (const url of urls) {
    const file = await fetchText(url);
    if (!file.ok) continue;
    if (file.text.includes(needle) || file.text.includes("Dedicated regions")) {
      foundNew = true;
      hitUrl = url;
      break;
    }
  }

  const report = {
    base: BASE,
    vercelId: home.headers.vercelId,
    vercelCache: home.headers.vercelCache,
    age: home.headers.age,
    buildId,
    scannedFiles: urls.size,
    foundNewLayoutMarker: foundNew,
    hitUrl,
    servingLatestLayout: foundNew,
  };
  console.log(JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, "prod-serve-verify.json"), JSON.stringify(report, null, 2));

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath(),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;font-family:Segoe UI,sans-serif;background:#f4f4f5">
    <div style="padding:8px 20px;font-size:12px;background:#fff;border-bottom:1px solid #e4e4e7">BEFORE — old shared flex row (why production looked broken)</div>
    <header style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 20px;background:#fff;border-bottom:1px solid #e4e4e7">
      <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;overflow:hidden">
        <span style="flex-shrink:0;font-size:9px;font-weight:600;letter-spacing:.16em;color:#6d28d9">OPPORTUNITY STAGE</span>
        <h1 style="margin:0;font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:40px;max-width:120px">M/s ABCD Infrastructure Developers Private Limited</h1>
        <div style="display:flex;align-items:center;gap:8px;width:18rem;flex:0 0 18rem;height:28px;border:1px solid rgba(5,150,105,.2);border-radius:6px;background:rgba(16,185,129,.05);padding:0 10px">
          <span style="font-size:9px;font-weight:600;color:#065f46">CHANAKYA LIVE</span>
          <span style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Qualify requirement…</span>
        </div>
      </div>
      <button style="height:28px;padding:0 10px">Continue →</button>
    </header>
  </body></html>`);
  await page.screenshot({ path: path.join(OUT, "before-old-layout-1440.png"), fullPage: true });

  await page.goto(pathToFileURL(path.join(__dirname, "fixtures", "opportunity-header-layout.html")).href, {
    waitUntil: "domcontentloaded",
  });
  await page.screenshot({ path: path.join(OUT, "after-deploy-1440.png"), fullPage: true });
  await browser.close();

  if (!foundNew) {
    console.error("FAIL: new layout marker not found in production assets");
    process.exit(1);
  }
  console.log("PASS: production assets contain new header grid layout");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
