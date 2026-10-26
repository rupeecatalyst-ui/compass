/**
 * Browser-side crop and resize before upload.
 * Email clients ignore CSS object-fit, so the stored JPEG/PNG/WebP is already the frame.
 */

import { MARKETING_ASSET_MAX_BYTES } from "@/constants/enterprise-marketing-engine/content";

export const MARKETING_EMAIL_IMAGE_MAX_WIDTH = 1200;
export const MARKETING_EMAIL_IMAGE_TARGET_BYTES = 400_000;

export type MarketingImageFrame = "original" | "hero" | "card";
export type MarketingImageFocal = "top" | "center" | "bottom";

export type PreparedMarketingUploadImage = {
  dataUrl: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  filename: string;
};

export function marketingImageCropRect(
  width: number,
  height: number,
  frame: MarketingImageFrame,
  focal: MarketingImageFocal,
): { sx: number; sy: number; sw: number; sh: number } {
  if (frame === "original" || width <= 0 || height <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(0, width), sh: Math.max(0, height) };
  }
  const target = frame === "hero" ? 16 / 9 : 1;
  const sourceAspect = width / height;
  if (sourceAspect > target) {
    const sw = Math.max(1, Math.round(height * target));
    return { sx: Math.max(0, Math.round((width - sw) / 2)), sy: 0, sw, sh: height };
  }
  const sh = Math.max(1, Math.round(width / target));
  const leftover = Math.max(0, height - sh);
  const sy = focal === "top" ? 0 : focal === "bottom" ? leftover : Math.round(leftover / 2);
  return { sx: 0, sy, sw: width, sh };
}

export function marketingImageOutputSize(
  sw: number,
  sh: number,
  maxWidth = MARKETING_EMAIL_IMAGE_MAX_WIDTH,
): { width: number; height: number } {
  if (sw <= maxWidth) return { width: Math.max(1, sw), height: Math.max(1, sh) };
  return {
    width: maxWidth,
    height: Math.max(1, Math.round(sh * (maxWidth / sw))),
  };
}

function renamed(filename: string, mimeType: string): string {
  const base = filename.replace(/\.[^.]+$/, "") || "image";
  if (mimeType === "image/png") return `${base}.png`;
  if (mimeType === "image/webp") return `${base}.webp`;
  if (mimeType === "image/gif") return `${base}.gif`;
  return `${base}.jpg`;
}

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read the prepared image"));
    };
    reader.onerror = () => reject(new Error("Could not read the prepared image"));
    reader.readAsDataURL(blob);
  });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

export async function prepareMarketingUploadImage(
  file: File,
  options: { frame: MarketingImageFrame; focal: MarketingImageFocal },
): Promise<PreparedMarketingUploadImage> {
  const mime = file.type.toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime)) {
    throw new Error("Use a JPG, PNG, WebP, or GIF image.");
  }
  if (file.size > MARKETING_ASSET_MAX_BYTES && mime === "image/gif") {
    throw new Error(`GIF exceeds the ${MARKETING_ASSET_MAX_BYTES} byte limit.`);
  }
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    throw new Error("Image preparation is available in the browser.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const crop = marketingImageCropRect(bitmap.width, bitmap.height, options.frame, options.focal);
    const output = marketingImageOutputSize(crop.sw, crop.sh);
    const unchanged =
      options.frame === "original" &&
      mime !== "image/gif" &&
      file.size <= MARKETING_EMAIL_IMAGE_TARGET_BYTES &&
      bitmap.width <= MARKETING_EMAIL_IMAGE_MAX_WIDTH &&
      bitmap.height <= MARKETING_EMAIL_IMAGE_MAX_WIDTH * 2;
    if (unchanged || mime === "image/gif") {
      if (file.size > MARKETING_ASSET_MAX_BYTES) {
        throw new Error(`Image exceeds the ${MARKETING_ASSET_MAX_BYTES} byte limit.`);
      }
      const dataUrl = await readDataUrl(file);
      return {
        dataUrl,
        mimeType: mime,
        byteSize: file.size,
        width: bitmap.width,
        height: bitmap.height,
        filename: file.name,
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = output.width;
    canvas.height = output.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare this image.");
    context.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, output.width, output.height);

    const preferred = mime === "image/png" ? "image/png" : mime === "image/webp" ? "image/webp" : "image/jpeg";
    let blob: Blob | null = null;
    let outMime = preferred;
    if (preferred === "image/png") {
      blob = await canvasBlob(canvas, "image/png");
    } else {
      for (const quality of [0.86, 0.74, 0.62, 0.5]) {
        blob = await canvasBlob(canvas, preferred, quality);
        if (blob && blob.size <= MARKETING_EMAIL_IMAGE_TARGET_BYTES) break;
      }
    }
    if ((!blob || blob.size > MARKETING_ASSET_MAX_BYTES) && preferred !== "image/jpeg") {
      outMime = "image/jpeg";
      for (const quality of [0.86, 0.74, 0.62, 0.5]) {
        blob = await canvasBlob(canvas, "image/jpeg", quality);
        if (blob && blob.size <= MARKETING_ASSET_MAX_BYTES) break;
      }
    }
    if (!blob || blob.size > MARKETING_ASSET_MAX_BYTES) {
      throw new Error(`Prepared image exceeds the ${MARKETING_ASSET_MAX_BYTES} byte limit.`);
    }
    const dataUrl = await readDataUrl(blob);
    return {
      dataUrl,
      mimeType: outMime,
      byteSize: blob.size,
      width: output.width,
      height: output.height,
      filename: renamed(file.name, outMime),
    };
  } finally {
    bitmap.close();
  }
}
