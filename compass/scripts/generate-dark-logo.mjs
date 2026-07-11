import fs from "fs";
import path from "path";
import sharp from "sharp";

const officialSource =
  process.argv[2] ??
  "C:/Users/abhir/.cursor/projects/c-Compass-by-Rupee-Catalyst-3/assets/c__Users_abhir_AppData_Roaming_Cursor_User_workspaceStorage_c6f06a2315879b4d3331d56c581c6d12_images_RC_Lpgo-dcd08ec6-bdd3-4989-bfc8-f5ca56837443.png";

const outDir = "src/assets/brand";
const baseName = "rupee-catalyst-logo-dark";
const masterWidth = 448;

function whiteDistance(r, g, b) {
  return Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
}

function alphaFromWhiteDistance(distance) {
  if (distance <= 28) return 0;
  if (distance >= 52) return 255;
  return Math.round(((distance - 28) / 24) * 255);
}

function optimizePixel(r, g, b) {
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;

  if (sat < 0.12 || lum > 210) {
    return [r, g, b];
  }

  let nr = r;
  let ng = g;
  let nb = b;

  if (lum < 95) {
    const lift = lum < 55 ? 1.1 : 1.06;
    nr = Math.min(255, r * lift);
    ng = Math.min(255, g * lift);
    nb = Math.min(255, b * lift);
  }

  if (g > r + 10 && b > r + 10) {
    ng = Math.min(255, ng * 1.03);
    nb = Math.min(255, nb * 1.02);
  }

  return [Math.round(nr), Math.round(ng), Math.round(nb)];
}

async function keyWhiteToAlpha(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const distance = whiteDistance(r, g, b);
    const alpha = alphaFromWhiteDistance(distance);

    if (alpha === 0) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 0;
      continue;
    }

    const [nr, ng, nb] = optimizePixel(r, g, b);
    out[i] = nr;
    out[i + 1] = ng;
    out[i + 2] = nb;
    out[i + 3] = alpha;
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 8 })
    .png({ compressionLevel: 9, adaptiveFiltering: true });
}

fs.mkdirSync(outDir, { recursive: true });

const sourceCopy = path.join(outDir, "rupee-catalyst-logo-official-source.png");
fs.copyFileSync(officialSource, sourceCopy);

const keyed = await keyWhiteToAlpha(fs.readFileSync(officialSource));
const master = await keyed
  .resize(masterWidth, null, { fit: "inside", kernel: sharp.kernel.lanczos3 })
  .png()
  .toBuffer();

const meta = await sharp(master).metadata();
const outputs = [sourceCopy];

await sharp(officialSource)
  .resize(masterWidth, null, { fit: "inside", kernel: sharp.kernel.lanczos3 })
  .png()
  .toFile(path.join(outDir, "rupee-catalyst-logo-official-preview.png"));

for (const scale of [1, 2, 3]) {
  const width = meta.width * scale;
  const height = meta.height * scale;
  const suffix = scale === 1 ? "" : `@${scale}x`;
  const pngPath = path.join(outDir, `${baseName}${suffix}.png`);
  await sharp(master)
    .resize(width, height, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(pngPath);
  outputs.push(pngPath);
}

const png2x = fs.readFileSync(path.join(outDir, `${baseName}@2x.png`));
const b64 = png2x.toString("base64");
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${meta.width} ${meta.height}" width="${meta.width}" height="${meta.height}" role="img" aria-label="Rupee Catalyst">
  <title>Rupee Catalyst</title>
  <image width="${meta.width}" height="${meta.height}" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,${b64}"/>
</svg>`;
const svgPath = path.join(outDir, `${baseName}.svg`);
fs.writeFileSync(svgPath, svg);
outputs.push(svgPath);

const markWidth = Math.round(meta.width * 0.36);
const mark = await sharp(master)
  .extract({ left: 0, top: 0, width: markWidth, height: Math.round(meta.height * 0.62) })
  .trim({ threshold: 8 })
  .png()
  .toBuffer();
const markMeta = await sharp(mark).metadata();
const mark2x = await sharp(mark)
  .resize(markMeta.width * 2, markMeta.height * 2, { kernel: sharp.kernel.lanczos3 })
  .png()
  .toBuffer();
fs.writeFileSync(path.join(outDir, `${baseName}-mark.png`), mark);
fs.writeFileSync(path.join(outDir, `${baseName}-mark@2x.png`), mark2x);
outputs.push(path.join(outDir, `${baseName}-mark.png`));

console.log(JSON.stringify({ master: meta, outputs }, null, 2));
