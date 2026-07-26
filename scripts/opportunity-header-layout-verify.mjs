/**
 * Opportunity Workspace header — edge-case acceptance matrix.
 *
 * Covers: long customer name, long stage name, browser zoom, display scaling (DPR),
 * and desktop widths 1366 / 1440 / 1600 / 1920.
 *
 * Usage: node scripts/opportunity-header-layout-verify.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "fixtures", "opportunity-header-layout.html");
const SHOT_DIR = path.join(
  __dirname,
  "..",
  "docs",
  "certification-screenshots",
  "opportunity-header-layout",
);

const WIDTHS = [1366, 1440, 1600, 1920];
const ZOOMS = [0.9, 1, 1.1, 1.25];
const DISPLAY_SCALES = [
  { label: "100%", dpr: 1 },
  { label: "125%", dpr: 1.25 },
  { label: "150%", dpr: 1.5 },
];

const LONG_TITLE = "M/s ABCD Infrastructure Developers Private Limited";
const LONG_STAGE =
  "OPPORTUNITY STAGE — CREDIT READINESS QUALIFICATION WORKSTREAM";

function overlaps(a, b, pad = 0.5) {
  return !(
    a.right <= b.left + pad ||
    a.left >= b.right - pad ||
    a.bottom <= b.top + pad ||
    a.top >= b.bottom - pad
  );
}

function chromePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

async function measure(page) {
  return page.evaluate(() => {
    const header = document.querySelector("#after-header");
    const box = (sel) => {
      const el = header.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (style.display === "none" || r.width < 0.5 || r.height < 0.5) return null;
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    };

    const title = header.querySelector("[data-region='title']");
    const titleStyle = title ? window.getComputedStyle(title) : null;
    const lineHeight = titleStyle ? parseFloat(titleStyle.lineHeight) || 24 : 24;
    const titleLines = title ? Math.round(title.getBoundingClientRect().height / lineHeight) : 0;

    const buttons = [...header.querySelectorAll("[data-btn]")].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        clipped:
          r.left < -0.5 ||
          r.top < -0.5 ||
          r.right > window.innerWidth + 0.5 ||
          r.bottom > window.innerHeight + 0.5,
        width: r.width,
        height: r.height,
      };
    });

    const headerBox = header.getBoundingClientRect();
    const chanakyaCard = box("[data-region='chanakya-card']");
    const chanakya = box("[data-region='chanakya']");

    return {
      headerHeight: headerBox.height,
      title: box("[data-region='title']"),
      stage: box("[data-region='stage']"),
      chanakya,
      chanakyaCard,
      actions: box("[data-region='actions']"),
      titleLines,
      buttons,
      viewport: { w: window.innerWidth, h: window.innerHeight },
    };
  });
}

async function applyCase(page, { title, stage, zoom }) {
  await page.evaluate(
    ({ title, stage, zoom }) => {
      const titleEl = document.querySelector("[data-region='title']");
      const stageEl = document.querySelector("[data-region='stage']");
      if (titleEl) titleEl.textContent = title;
      if (stageEl) {
        stageEl.textContent = stage;
        stageEl.setAttribute("title", stage);
      }
      document.documentElement.style.zoom = String(zoom);
      document.getElementById("meta").textContent =
        `title="${title}" · stage="${stage}" · zoom=${Math.round(zoom * 100)}%`;
    },
    { title, stage, zoom },
  );
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = [];
  let failures = 0;

  // Representative matrix: all widths × zooms at 100% DPR, plus 125%/150% DPR at 1366 & 1920
  const matrix = [];
  for (const width of WIDTHS) {
    for (const zoom of ZOOMS) {
      matrix.push({ width, zoom, dpr: 1, scaleLabel: "100%" });
    }
  }
  for (const width of [1366, 1920]) {
    for (const scale of DISPLAY_SCALES.filter((s) => s.dpr !== 1)) {
      for (const zoom of [1, 1.25]) {
        matrix.push({ width, zoom, dpr: scale.dpr, scaleLabel: scale.label });
      }
    }
  }

  for (const cell of matrix) {
    const page = await browser.newPage();
    await page.setViewport({
      width: cell.width,
      height: 900,
      deviceScaleFactor: cell.dpr,
    });
    await page.goto(pathToFileURL(FIXTURE).href, { waitUntil: "domcontentloaded" });

    // Case A: long customer name + normal stage
    await applyCase(page, {
      title: LONG_TITLE,
      stage: "OPPORTUNITY STAGE",
      zoom: cell.zoom,
    });
    const a = await measure(page);

    // Case B: long stage + long customer name
    await applyCase(page, {
      title: LONG_TITLE,
      stage: LONG_STAGE,
      zoom: cell.zoom,
    });
    const b = await measure(page);

    const checks = [];
    for (const [label, m] of [
      ["longTitle", a],
      ["longStage+Title", b],
    ]) {
      const titleChanakyaOverlap =
        m.title && m.chanakya ? overlaps(m.title, m.chanakya) : false;
      const stageChanakyaOverlap =
        m.stage && m.chanakya ? overlaps(m.stage, m.chanakya) : false;
      const titleActionsOverlap =
        m.title && m.actions ? overlaps(m.title, m.actions) : false;
      const gapOk =
        m.title && m.chanakya
          ? m.chanakya.left - m.title.right >= 8 || m.chanakya.top >= m.title.bottom - 0.5
          : true;
      const buttonsClipped = m.buttons.some((btn) => btn.clipped || btn.width < 4);
      const chanakyaClipped =
        m.chanakyaCard &&
        (m.chanakyaCard.right > m.viewport.w + 1 || m.chanakyaCard.width < 40);
      const titleLinesOk = m.titleLines >= 1 && m.titleLines <= 2;
      const headerBalanced = m.headerHeight > 40 && m.headerHeight < 220;
      const heightJump =
        label === "longStage+Title"
          ? Math.abs(m.headerHeight - a.headerHeight) > 48
          : false;

      const pass =
        !titleChanakyaOverlap &&
        !stageChanakyaOverlap &&
        !titleActionsOverlap &&
        gapOk &&
        !buttonsClipped &&
        !chanakyaClipped &&
        titleLinesOk &&
        headerBalanced &&
        !heightJump;

      if (!pass) failures += 1;
      checks.push({
        label,
        pass,
        titleChanakyaOverlap,
        stageChanakyaOverlap,
        titleActionsOverlap,
        gapOk,
        buttonsClipped,
        chanakyaClipped,
        titleLines: m.titleLines,
        headerHeight: Math.round(m.headerHeight),
        heightJump,
      });
    }

    const shotName = `w${cell.width}-z${Math.round(cell.zoom * 100)}-dpr${cell.scaleLabel.replace("%", "")}.png`;
    const shotPath = path.join(SHOT_DIR, shotName);
    await page.screenshot({ path: shotPath, fullPage: true });
    await page.close();

    const row = {
      width: cell.width,
      zoom: `${Math.round(cell.zoom * 100)}%`,
      displayScale: cell.scaleLabel,
      checks,
      pass: checks.every((c) => c.pass),
      shotPath,
    };
    results.push(row);
    const mark = row.pass ? "PASS" : "FAIL";
    console.log(
      `${mark}  ${cell.width}px  zoom ${row.zoom}  scale ${cell.scaleLabel}  h=${checks[1].headerHeight}px  lines=${checks[1].titleLines}`,
    );
  }

  await browser.close();

  const reportPath = path.join(SHOT_DIR, "edge-case-verify-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        longTitle: LONG_TITLE,
        longStage: LONG_STAGE,
        failures,
        results,
      },
      null,
      2,
    ),
  );
  console.log(`\nReport: ${reportPath}`);
  console.log(failures === 0 ? "PASS — all edge cases" : `FAIL — ${failures} check(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
