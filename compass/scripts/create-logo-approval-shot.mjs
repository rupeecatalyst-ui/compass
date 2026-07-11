import sharp from "sharp";

const src = "src/assets/brand/rupee-catalyst-logo-official-preview.png";
const dark = "src/assets/brand/rupee-catalyst-logo-dark@2x.png";
const pad = 40;

const srcMeta = await sharp(src).metadata();
const darkMeta = await sharp(dark).metadata();
const w = Math.max(srcMeta.width, darkMeta.width) + pad * 2;
const blockGap = 56;
const h = pad * 2 + 40 + srcMeta.height + blockGap + darkMeta.height + 40;

function label(text) {
  const svg = `<svg width="${w}" height="40"><text x="${pad}" y="28" font-family="Segoe UI, sans-serif" font-size="14" fill="#94a3b8">${text}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const bg = await sharp({
  create: { width: w, height: h, channels: 4, background: { r: 5, g: 7, b: 12, alpha: 255 } },
})
  .png()
  .toBuffer();

await sharp(bg)
  .composite([
    { input: await label("Official source (attached)"), top: pad, left: 0 },
    { input: await sharp(src).png().toBuffer(), top: pad + 40, left: pad },
    {
      input: await label("Proposed dark-theme (white removed, contrast optimised)"),
      top: pad + 40 + srcMeta.height + 16,
      left: 0,
    },
    { input: await sharp(dark).png().toBuffer(), top: pad + 40 + srcMeta.height + blockGap, left: pad },
  ])
  .png()
  .toFile("screenshots/brand-logo-dark-approval.png");

console.log("written screenshots/brand-logo-dark-approval.png", { w, h });
