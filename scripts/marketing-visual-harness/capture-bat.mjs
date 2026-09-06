/**
 * CO-MARKETING-BAT-001 visual evidence.
 * Non-deployable harness + production Marketing components. No auth bypass. No Hostinger.
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

const shotDir = path.join(root, "docs", "co-marketing-bat-001", "screenshots");
fs.mkdirSync(shotDir, { recursive: true });

const PORT = Number(process.env.MARKETING_VISUAL_HARNESS_PORT || 4071);
const ORIGIN = `http://127.0.0.1:${PORT}`;

const BASE = {
  home: {
    surface: "home",
    expected: "Marketing Command Center",
    component: "MarketingCommandCenter",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-command-center.tsx",
    route: "/admin/marketing",
  },
  registry: {
    surface: "registry",
    expected: "Campaign Registry",
    component: "MarketingCampaignRegistryPanel",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-registry-panel.tsx",
    route: "/admin/marketing/registry",
  },
  basics: {
    surface: "basics",
    expected: "Basics",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
  },
  gallery: {
    surface: "template-gallery",
    expected: "Template gallery",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
  },
  editor: {
    surface: "visual-editor",
    expected: "Visual editor",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
  },
  preview: {
    surface: "desktop-preview",
    expected: "Desktop preview",
    component: "MarketingPreviewWorkspace",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-preview-workspace.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
  },
  review: {
    surface: "review-approval",
    expected: "Review and Approval",
    component: "MarketingCampaignBuilderPage",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
    route: "/admin/marketing/campaigns/[campaignId]",
  },
  monitoring: {
    surface: "monitoring",
    expected: "Campaign monitoring",
    component: "MarketingCampaignMonitoringWorkspace",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-campaign-monitoring-workspace.tsx",
    route: "/admin/marketing/monitoring",
  },
  consent: {
    surface: "consent",
    expected: "Consent and Suppression Centre",
    component: "MarketingConsentPanel",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-consent-panel.tsx",
    route: "/admin/marketing/consent",
  },
  qualification: {
    surface: "qualification",
    expected: "Qualification Inbox",
    component: "MarketingResponsesPanel",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-responses-panel.tsx",
    route: "/admin/marketing/responses",
  },
  analytics: {
    surface: "analytics",
    expected: "Analytics and Attribution",
    component: "MarketingAttributionPanel",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-attribution-panel.tsx",
    route: "/admin/marketing/attribution",
  },
  assets: {
    surface: "assets",
    expected: "Marketing Asset Library",
    component: "MarketingAssetsPanel",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-assets-panel.tsx",
    route: "/admin/marketing/assets",
  },
  deliverability: {
    surface: "deliverability",
    expected: "Sender identity and deliverability",
    component: "MarketingDeliverabilityPanel",
    importPath: "src/components/catalyst-one/admin/marketing/marketing-deliverability-panel.tsx",
    route: "/admin/marketing/deliverability",
  },
};

function shot(file, batId, base, extras = {}) {
  return { file, batId, ...base, ...extras };
}

const SURFACES = [
  shot("bat-a-home-desktop", "BAT-A-HOME", BASE.home, { width: 1440, height: 900 }),
  shot("bat-a-home-mobile", "BAT-A-HOME", BASE.home, { width: 390, height: 844 }),
  shot("bat-a-registry-desktop", "BAT-A-REGISTRY", BASE.registry, { width: 1440, height: 900 }),
  shot("bat-a-registry-mobile", "BAT-A-REGISTRY", BASE.registry, { width: 390, height: 844 }),
  shot("bat-a-builder-desktop", "BAT-A-BUILDER", BASE.basics, { width: 1440, height: 900 }),
  shot("bat-a-builder-mobile", "BAT-A-BUILDER", BASE.basics, { width: 390, height: 844 }),
  shot("bat-a-gallery", "BAT-A-GALLERY", BASE.gallery, { width: 1440, height: 900 }),
  shot("bat-a-editor", "BAT-A-EDITOR", BASE.editor, { width: 1440, height: 900 }),
  shot("bat-a-personalisation", "BAT-A-PERSONALISATION", {
    ...BASE.basics,
    surface: "personalisation",
    expected: "Personalisation",
  }, { width: 1440, height: 900 }),
  shot("bat-a-preview-desktop", "BAT-A-PREVIEW-DESKTOP", BASE.preview, {
    width: 1440,
    height: 900,
    click: "Desktop view",
  }),
  shot("bat-a-preview-mobile", "BAT-A-PREVIEW-MOBILE", {
    ...BASE.preview,
    surface: "mobile-preview",
    expected: "Mobile preview",
  }, { width: 390, height: 844, click: "Mobile view" }),
  shot("bat-a-review", "BAT-A-REVIEW", BASE.review, { width: 1440, height: 900 }),
  shot("bat-a-monitoring", "BAT-A-MONITORING", BASE.monitoring, { width: 1440, height: 900 }),
  shot("bat-a-consent", "BAT-A-CONSENT", BASE.consent, { width: 1440, height: 900 }),
  shot("bat-a-qualification", "BAT-A-QUALIFICATION", BASE.qualification, { width: 1440, height: 900 }),
  shot("bat-a-analytics", "BAT-A-ANALYTICS", BASE.analytics, { width: 1440, height: 900 }),
  shot("bat-a-assets", "BAT-A-ASSETS", BASE.assets, { width: 1440, height: 900 }),
  shot("bat-a-deliverability", "BAT-A-DELIVERABILITY", BASE.deliverability, { width: 1440, height: 900 }),
  shot("bat-empty-home", "BAT-EMPTY", BASE.home, { width: 1440, height: 900, batState: "empty" }),
  shot("bat-loading-home", "BAT-LOADING", BASE.home, {
    width: 1440,
    height: 900,
    skipLoadedWait: true,
  }),
  shot("bat-disconnected-analytics", "BAT-DISCONNECTED", BASE.analytics, { width: 1440, height: 900 }),
  shot("bat-paused-registry", "BAT-PAUSED", BASE.registry, {
    width: 1440,
    height: 900,
    batState: "paused",
  }),
  shot("bat-stopped-registry", "BAT-STOPPED", BASE.registry, {
    width: 1440,
    height: 900,
    batState: "stopped",
  }),
  shot("bat-validation-review", "BAT-VALIDATION", BASE.review, { width: 1440, height: 900 }),
  shot("bat-qualification-decision", "BAT-QUAL-DECISION", BASE.qualification, { width: 1440, height: 900 }),
  shot("bat-suppression-history", "BAT-SUPPRESSION", BASE.consent, { width: 1440, height: 900 }),
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
    console.log("visual BAT: skipping bundle");
    return;
  }
  const run = spawnSync(process.execPath, [path.join(dir, "bundle.mjs")], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
    shell: false,
  });
  if (run.status !== 0) throw new Error("visual harness bundle failed");
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

console.log("visual BAT: bundling");
bundle();
const server = await startServer();
const chrome =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  headless: true,
  executablePath: fs.existsSync(chrome) ? chrome : undefined,
  timeout: 60000,
  protocolTimeout: 120000,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

const shots = [];
let failed = false;

try {
  for (const item of SURFACES) {
    console.log(`visual BAT: capturing ${item.file}`);
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
      height: item.height ?? (item.width < 800 ? 844 : 900),
      isMobile: item.width < 800,
      hasTouch: item.width < 800,
    });
    const batState = item.batState ? `&batState=${encodeURIComponent(item.batState)}` : "";
    const url = `${ORIGIN}/index.html?surface=${encodeURIComponent(item.surface)}${batState}`;
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page
      .waitForFunction(() => (document.body?.innerText || "").length > 20, { timeout: 8000 })
      .catch(() => null);
    if (!item.skipLoadedWait) {
      await page
        .waitForFunction(
          () =>
            !/Loading Marketing Command Center|Restoring campaign draft|Loading campaign summary/.test(
              document.body?.innerText || "",
            ),
          { timeout: 8000 },
        )
        .catch(() => null);
    }
    if (item.click) {
      await page.evaluate((label) => {
        const button = [...document.querySelectorAll("button")].find((el) =>
          (el.textContent || "").includes(label),
        );
        button?.click();
      }, item.click);
      await new Promise((r) => setTimeout(r, 400));
    }
    await page.evaluate((expected) => {
      const nodes = [...document.querySelectorAll("h1,h2,h3,h4,p,button")];
      const hit = nodes.find((node) => (node.textContent || "").includes(expected));
      hit?.scrollIntoView({ block: "start" });
    }, item.expected);
    await new Promise((r) => setTimeout(r, 500));
    const bodyText = await page.evaluate(() => document.body?.textContent || "");
    const headingFound = new RegExp(
      item.expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    ).test(bodyText);
    const login = /sign in to compass/i.test(bodyText) || page.url().includes("/login");
    const file = path.join(shotDir, `${item.file}.png`);
    await page.screenshot({ path: file, fullPage: true });
    const bytes = fs.statSync(file).size;
    const pass =
      (headingFound || item.skipLoadedWait) &&
      !login &&
      bytes >= 4000 &&
      runtimeErrors.length === 0 &&
      external.length === 0 &&
      fs.existsSync(path.join(root, item.importPath));
    if (!pass) failed = true;
    shots.push({
      batId: item.batId,
      file: `${item.file}.png`,
      surface: item.surface,
      componentName: item.component,
      productionImportPath: item.importPath,
      realApplicationPage: item.route,
      fixtureProvider: "scripts/marketing-visual-harness/fixture-data.js",
      expectedHeading: item.expected,
      headingFound: headingFound ? item.expected : null,
      viewport: { width: item.width, height: item.height ?? (item.width < 800 ? 844 : 900) },
      screenshotBytes: bytes,
      runtimeErrors,
      externalRequests: external,
      loginCaptured: login,
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
  desktop: "1440x900",
  mobile: "390x844",
  failed,
  shots,
};
fs.writeFileSync(
  path.join(root, "docs", "co-marketing-bat-001", "visual-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

if (failed) {
  console.error("Marketing BAT visual capture FAIL");
  process.exit(1);
}
console.log(`Marketing BAT visual capture PASS ${shots.filter((s) => s.pass).length}/${shots.length}`);
