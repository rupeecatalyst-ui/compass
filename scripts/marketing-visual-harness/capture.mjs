/**
 * Non-deployable visual capture of production Marketing React components.
 * Serves the local harness only. No Next.js /internal route. No send. No Hostinger.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..", "..");
const parentModules = path.join(root, "..", "..", "node_modules");
const localModules = path.join(root, "node_modules");
const nodeModules = fs.existsSync(path.join(localModules, "puppeteer")) ? localModules : parentModules;
const require = createRequire(pathToFileURL(path.join(nodeModules, "puppeteer", "package.json")).href);
const puppeteer = require("puppeteer");

const shotDir = path.join(root, "docs", "co-marketing-redesign-022", "screenshots");
fs.mkdirSync(shotDir, { recursive: true });

const PORT = Number(process.env.MARKETING_VISUAL_HARNESS_PORT || 4070);
const ORIGIN = `http://127.0.0.1:${PORT}`;

const SURFACES = [
  {
    file: "01-home",
    surface: "home",
    expected: "Marketing Command Center",
    component: "MarketingCommandCenter",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-command-center.tsx",
    route: "/admin/marketing",
    width: 1440,
  },
  {
    file: "02-registry",
    surface: "registry",
    expected: "Campaign Registry",
    component: "MarketingCampaignRegistryPanel",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-registry-panel.tsx",
    route: "/admin/marketing/registry",
    width: 1440,
  },
  {
    file: "03-basics",
    surface: "basics",
    expected: "Basics",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
    width: 1440,
  },
  {
    file: "03-builder-mobile",
    surface: "basics",
    expected: "Basics",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
    width: 390,
  },
  {
    file: "04-audience-source",
    surface: "audience-source",
    expected: "Audience source",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
    width: 1440,
  },
  {
    file: "05-column-mapping",
    surface: "column-mapping",
    expected: "Column mapping",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
    width: 1440,
  },
  {
    file: "06-eligibility-preview",
    surface: "eligibility-preview",
    expected: "Eligibility preview",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
    width: 1440,
  },
  {
    file: "07-template-gallery",
    surface: "template-gallery",
    expected: "Template gallery",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
    width: 1440,
  },
  {
    file: "08-visual-editor",
    surface: "visual-editor",
    expected: "Visual editor",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
    width: 1440,
  },
  {
    file: "09-personalisation",
    surface: "personalisation",
    expected: "Personalisation",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
    width: 1440,
  },
  {
    file: "10-desktop-preview",
    surface: "desktop-preview",
    expected: "Desktop preview",
    component: "MarketingPreviewWorkspace",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-preview-workspace.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
    width: 1440,
    click: "Desktop view",
  },
  {
    file: "11-mobile-preview",
    surface: "mobile-preview",
    expected: "Mobile preview",
    component: "MarketingPreviewWorkspace",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-preview-workspace.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
    width: 390,
    click: "Mobile view",
  },
  {
    file: "12-schedule-delivery",
    surface: "schedule-delivery",
    expected: "Schedule & Delivery",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
    width: 1440,
  },
  {
    file: "13-review-approval",
    surface: "review-approval",
    expected: "Review and Approval",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
    width: 1440,
  },
  {
    file: "14-monitoring",
    surface: "monitoring",
    expected: "Campaign monitoring",
    component: "MarketingCampaignMonitoringWorkspace",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-monitoring-workspace.tsx",
    route: "/admin/marketing/monitoring",
    width: 1440,
  },
  {
    file: "15-recipient-timeline",
    surface: "recipient-timeline",
    expected: "Recipient timeline",
    component: "MarketingCampaignMonitoringWorkspace",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-monitoring-workspace.tsx",
    route: "/admin/marketing/monitoring",
    width: 1440,
    clickSelector: ".mkt-consent-row",
  },
  {
    file: "16-consent",
    surface: "consent",
    expected: "Consent and Suppression Centre",
    component: "MarketingConsentPanel",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-consent-panel.tsx",
    route: "/admin/marketing/consent",
    width: 1440,
  },
  {
    file: "17-qualification",
    surface: "qualification",
    expected: "Qualification Inbox",
    component: "MarketingResponsesPanel",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-responses-panel.tsx",
    route: "/admin/marketing/responses",
    width: 1440,
  },
  {
    file: "18-analytics",
    surface: "analytics",
    expected: "Analytics and Attribution",
    component: "MarketingAttributionPanel",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-attribution-panel.tsx",
    route: "/admin/marketing/attribution",
    width: 1440,
  },
  {
    file: "19-assets",
    surface: "assets",
    expected: "Marketing Asset Library",
    component: "MarketingAssetsPanel",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-assets-panel.tsx",
    route: "/admin/marketing/assets",
    width: 1440,
  },
  {
    file: "20-deliverability",
    surface: "deliverability",
    expected: "Sender identity and deliverability",
    component: "MarketingDeliverabilityPanel",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-deliverability-panel.tsx",
    route: "/admin/marketing/deliverability",
    width: 1440,
  },
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json",
  ".png": "image/png",
};

function bundle() {
  if (process.argv.includes("--skip-bundle") && fs.existsSync(path.join(dir, "dist", "app.js"))) {
    console.log("visual harness: skipping bundle");
    return;
  }
  const run = spawnSync(process.execPath, [path.join(dir, "bundle.mjs")], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
  if (run.status !== 0) {
    throw new Error("visual harness bundle failed");
  }
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", ORIGIN);
    let rel = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = path.join(dir, rel.replaceAll("/", path.sep));
    if (!file.startsWith(dir)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = path.extname(file);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

console.log("visual harness: bundling");
bundle();
console.log("visual harness: starting local http");
const server = await startServer();
console.log(`visual harness: serving ${ORIGIN}`);

const chrome =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
console.log("visual harness: launching Chrome");
const browser = await puppeteer.launch({
  headless: true,
  executablePath: fs.existsSync(chrome) ? chrome : undefined,
  timeout: 60000,
  protocolTimeout: 120000,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
console.log("visual harness: Chrome launched");

const shots = [];
let failed = false;

try {
  for (const item of SURFACES) {
    console.log(`visual harness: capturing ${item.surface}`);
    const page = await browser.newPage();
    const runtimeErrors = [];
    const external = [];
    page.on("pageerror", (err) => runtimeErrors.push(String(err)));
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (url.startsWith("fixture:")) {
        req.abort().catch(() => null);
        return;
      }
      const local =
        url.startsWith(ORIGIN) ||
        url.startsWith("data:") ||
        url.startsWith("blob:") ||
        url.startsWith("file:");
      if (!local) {
        external.push(url);
        req.abort().catch(() => null);
        return;
      }
      req.continue().catch(() => null);
    });
    await page.setViewport({
      width: item.width,
      height: item.width < 800 ? 844 : 900,
      isMobile: item.width < 800,
      hasTouch: item.width < 800,
    });
    const url = `${ORIGIN}/index.html?surface=${encodeURIComponent(item.surface)}`;
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page
      .waitForFunction(() => (document.body?.innerText || "").length > 40, { timeout: 8000 })
      .catch(() => null);
    await page
      .waitForFunction(
        () =>
          !/Loading Marketing Command Center|Restoring campaign draft|Loading campaign summary/.test(
            document.body?.innerText || "",
          ),
        { timeout: 8000 },
      )
      .catch(() => null);
    if (item.click) {
      await page.evaluate((label) => {
        const button = [...document.querySelectorAll("button")].find((el) =>
          (el.textContent || "").includes(label),
        );
        button?.click();
      }, item.click);
      await new Promise((r) => setTimeout(r, 400));
    }
    if (item.clickSelector) {
      await page.waitForSelector(item.clickSelector, { timeout: 4000 }).catch(() => null);
      await page.evaluate((sel) => {
        document.querySelector(sel)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }, item.clickSelector);
      await new Promise((r) => setTimeout(r, 900));
    }
    await page.evaluate((expected) => {
      const nodes = [...document.querySelectorAll("h1,h2,h3,h4,p,button")];
      const hit = nodes.find((node) => (node.textContent || "").includes(expected));
      hit?.scrollIntoView({ block: "start" });
    }, item.expected);
    await new Promise((r) => setTimeout(r, 700));
    const bodyText = await page.evaluate(() => document.body?.textContent || "");
    const headingFound = new RegExp(
      item.expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    ).test(bodyText);
    const login = /sign in to compass/i.test(bodyText) || page.url().includes("/login");
    const blank = bodyText.trim().length < 40;
    const file = path.join(shotDir, `${item.file}.png`);
    await page.screenshot({ path: file, fullPage: true });
    const bytes = fs.statSync(file).size;
    const pass =
      headingFound &&
      !login &&
      !blank &&
      bytes >= 8000 &&
      runtimeErrors.length === 0 &&
      external.length === 0 &&
      !bodyText.includes("Fixture document") &&
      fs.existsSync(path.join(root, item.importPath));
    if (!pass) failed = true;
    shots.push({
      file: `${item.file}.png`,
      surface: item.surface,
      componentName: item.component,
      productionImportPath: item.importPath,
      realApplicationPage: item.route,
      fixtureProvider: "scripts/marketing-visual-harness/fixture-data.js via authenticatedJsonFetch stub",
      expectedHeading: item.expected,
      headingFound: headingFound ? item.expected : null,
      viewport: { width: item.width, height: item.width < 800 ? 844 : 900 },
      screenshotBytes: bytes,
      runtimeErrors,
      externalRequests: external,
      loginCaptured: login,
      blank,
      pass,
    });
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

const manifest = {
  harness: "scripts/marketing-visual-harness",
  origin: ORIGIN,
  capturedAt: new Date().toISOString(),
  failed,
  shots,
};
fs.writeFileSync(
  path.join(root, "docs", "co-marketing-redesign-022", "visual-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

if (failed) {
  console.error("Marketing visual capture FAIL");
  process.exit(1);
}
console.log(`Marketing visual capture PASS ${shots.filter((s) => s.pass).length}/${shots.length}`);
