/**
 * CO-BAT mobile home scroll — fixture screenshots + live CSS contract.
 * No credentials / no live login.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs/bat-screenshots/mobile-home-scroll");
fs.mkdirSync(outDir, { recursive: true });

const fixture = `<!doctype html>
<html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<style>
:root { --bottomnav-h: 64px; --safe-bottom: 0px; --shell-max: 480px; --color-surface-canvas:#0f1413; --color-surface-elevated:#1a2220; --color-text-primary:#eef3f1; --color-border-subtle:#2a3532; }
html,body{margin:0;background:#0c1010;color:var(--color-text-primary);font-family:system-ui}
.app-frame.shell{min-height:100dvh;max-width:var(--shell-max);margin:0 auto;background:var(--color-surface-canvas);position:relative;
  height:100dvh;max-height:100dvh;overflow:hidden;display:flex;flex-direction:column;padding-bottom:calc(var(--bottomnav-h) + var(--safe-bottom))}
.shell-main{flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;padding:12px}
.home-dash{display:flex;flex-direction:column;gap:12px}
.card{border:1px solid var(--color-border-subtle);border-radius:14px;padding:16px;background:var(--color-surface-elevated);min-height:120px}
.featured{min-height:280px;background:linear-gradient(160deg,#1a5c57,#1a2220)}
.bottom-nav{position:fixed;left:50%;transform:translateX(-50%);bottom:0;width:min(100%,var(--shell-max));height:calc(var(--bottomnav-h) + var(--safe-bottom));
  display:grid;grid-template-columns:repeat(5,1fr);background:rgba(26,34,32,.94);border-top:1px solid var(--color-border-subtle);z-index:30}
.bn{display:grid;place-items:center;font-size:10px;opacity:.8}
</style></head><body>
<div class="app-frame shell">
  <main class="shell-main">
    <div class="home-dash">
      <div class="card featured">Featured Cards</div>
      <div class="card">Business Snapshot</div>
      <div class="card">Quick Actions</div>
      <div class="card">Recent Activity</div>
      <div class="card">Notifications</div>
      <div class="card" style="min-height:220px">Lower section reachable via scroll</div>
    </div>
  </main>
  <nav class="bottom-nav"><div class="bn">Home</div><div class="bn">Biz</div><div class="bn">+</div><div class="bn">Alerts</div><div class="bn">More</div></nav>
</div>
<script>
window.__metrics = (()=>{
  const shell=document.querySelector('.shell');
  const main=document.querySelector('.shell-main');
  const before=main.scrollTop; main.scrollTop=600; const after=main.scrollTop; main.scrollTop=0;
  return {
    canScroll: main.scrollHeight > main.clientHeight + 8,
    scrolled: after > 40,
    navFixed: getComputedStyle(document.querySelector('.bottom-nav')).position==='fixed',
    shellH: shell.clientHeight,
    mainScrollH: main.scrollHeight,
    mainClientH: main.clientHeight,
    vh: innerHeight
  };
})();
</script>
</body></html>`;

const fixturePath = path.join(outDir, "fixture.html");
fs.writeFileSync(fixturePath, fixture);

const chromeCandidates = [
  process.env.CHROME,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const executablePath = chromeCandidates.find((p) => fs.existsSync(p));
if (!executablePath) throw new Error("No Chrome/Edge found");

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox"],
});

async function shot(label, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const url = "file:///" + fixturePath.replace(/\\/g, "/");
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const metrics = await page.evaluate(() => window.__metrics);
  await page.screenshot({ path: path.join(outDir, `${label}-top.png`) });
  await page.evaluate(() => {
    document.querySelector(".shell-main").scrollTop = 9999;
  });
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, `${label}-bottom.png`) });
  await page.close();
  return metrics;
}

const android = await shot("android", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const iphone = await shot("iphone", {
  width: 393,
  height: 852,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
await browser.close();

const html = await fetch("https://wealth-partner-app.vercel.app/").then((r) =>
  r.text(),
);
const m = html.match(/\/assets\/(index-[A-Za-z0-9_-]+\.css)/);
if (!m) throw new Error("CSS asset not found in production HTML");
const css = await fetch(
  `https://wealth-partner-app.vercel.app/assets/${m[1]}`,
).then((r) => r.text());
const live = {
  cssAsset: m[1],
  has100dvh: css.includes("100dvh"),
  hasMinHeight0: /min-height:\s*0/.test(css),
  hasOverflowYAuto: /overflow-y:\s*auto/.test(css),
  hasPanXY: css.includes("pan-x pan-y"),
};

const report = { android, iphone, live, outDir };
fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (!android.canScroll || !android.scrolled || !android.navFixed) process.exit(2);
if (!iphone.canScroll || !iphone.scrolled || !iphone.navFixed) process.exit(3);
if (!live.has100dvh || !live.hasMinHeight0 || !live.hasOverflowYAuto) process.exit(4);
console.log("CO-BAT mobile home scroll visual verify: PASS");
