import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const root = path.dirname(fileURLToPath(import.meta.url));
const html = path.join(root, "visual-layout.html");
const fileUrl = pathToFileURL(html).href;
const edgeCandidates = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);

const executablePath = edgeCandidates.find((candidate) => fs.existsSync(candidate));
const out = {
  desktop: { width: 1440, height: 900, file: "visual-desktop.png" },
  tablet: { width: 768, height: 1024, file: "visual-tablet.png" },
  mobile: { width: 390, height: 844, file: "visual-mobile.png" },
};

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"],
});

try {
  for (const [name, cfg] of Object.entries(out)) {
    const page = await browser.newPage();
    await page.setViewport({ width: cfg.width, height: cfg.height, deviceScaleFactor: 1 });
    await page.goto(fileUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    const shot = path.join(root, cfg.file);
    await page.screenshot({ path: shot, fullPage: true });
    const box = await page.$eval("[data-document-workspace-desk='013']", (el) => {
      const r = el.getBoundingClientRect();
      return { width: Math.round(r.width), viewport: window.innerWidth };
    });
    fs.writeFileSync(
      path.join(root, `visual-${name}.json`),
      JSON.stringify({ name, ...cfg, desk: box, halfOrMore: box.width >= box.viewport * 0.5 }, null, 2),
    );
    console.log(`captured ${name} deskWidth=${box.width} viewport=${box.viewport}`);
    await page.close();
  }
} finally {
  await browser.close();
}
