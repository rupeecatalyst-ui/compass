/**
 * Generates PWA icons from approved Rupee Catalyst mark assets (pad only — no redraw)
 * and stamps cache version into public/sw.js.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const markSource = path.join(root, "src/assets/brand/rupee-catalyst-logo-dark-mark@2x.png");
const iconsDir = path.join(root, "public/pwa/icons");
const swTemplate = path.join(root, "public/sw.template.js");
const swOut = path.join(root, "public/sw.js");
const offlineHtml = path.join(root, "public/offline.html");

const THEME_BG = "#06080d";
const ICON_SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

if (!fs.existsSync(markSource)) {
  console.error(
    "Missing approved mark asset:",
    markSource,
    "\nReport to Product Owner — do not generate unofficial PWA icons.",
  );
  process.exit(1);
}

fs.mkdirSync(iconsDir, { recursive: true });

async function squareIcon(size) {
  const mark = await sharp(markSource)
    .resize(Math.round(size * 0.62), Math.round(size * 0.62), {
      fit: "inside",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: THEME_BG,
    },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));

  if (size === 180) {
    await sharp(path.join(iconsDir, `icon-${size}x${size}.png`)).toFile(
      path.join(iconsDir, "apple-touch-icon.png"),
    );
  }
}

for (const size of ICON_SIZES) {
  await squareIcon(size);
}

const maskable = await sharp(path.join(iconsDir, "icon-512x512.png"))
  .extend({
    top: 64,
    bottom: 64,
    left: 64,
    right: 64,
    background: THEME_BG,
  })
  .resize(512, 512)
  .png()
  .toFile(path.join(iconsDir, "icon-512x512-maskable.png"));

void maskable;

if (!fs.existsSync(offlineHtml)) {
  fs.writeFileSync(
    offlineHtml,
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#06080d" />
  <title>COMPASS — Offline</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #06080d; color: #f4f7fb; font-family: system-ui, sans-serif; padding: 24px; text-align: center; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p { color: #8b9cb3; max-width: 20rem; line-height: 1.5; }
    a { color: #2dd4bf; }
  </style>
</head>
<body>
  <div>
    <h1>You're offline</h1>
    <p>COMPASS needs an internet connection for applications, documents and personalised guidance. Public information will load when you're back online.</p>
    <p><a href="/">Try again</a></p>
    <p>Call <a href="tel:+919821984181">+91 98219 84181</a><br />
    Email <a href="mailto:champion@rupeecatalyst.com">champion@rupeecatalyst.com</a><br />
    B724, Jaswanti Allied Business Centre, Malad West, Mumbai – 400064</p>
  </div>
</body>
</html>`,
  );
}

const cacheVersion = `compass-pwa-${process.env.COMPASS_PWA_BUILD_ID || new Date().toISOString().slice(0, 10)}`;
const template = fs.readFileSync(swTemplate, "utf8");
fs.writeFileSync(swOut, template.replaceAll("__PWA_CACHE_VERSION__", cacheVersion));

console.log(
  JSON.stringify(
    {
      cacheVersion,
      icons: ICON_SIZES.map((s) => `icon-${s}x${s}.png`),
      markSource: path.basename(markSource),
    },
    null,
    2,
  ),
);
