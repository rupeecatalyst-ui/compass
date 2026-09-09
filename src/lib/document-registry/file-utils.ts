import { validateDocumentWorkspaceUpload, shouldInlinePreview } from "@/lib/document-workspace/file-security";

export type FileValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function getFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  return name.slice(dot + 1).toLowerCase();
}

export function validateDocumentFile(file: File): FileValidationResult {
  const result = validateDocumentWorkspaceUpload({
    filename: file.name,
    declaredMime: file.type,
    byteLength: file.size,
  });
  if (!result.ok) {
    return { ok: false, reason: result.message };
  }
  return { ok: true };
}

export function inferMimeHint(
  mimeType: string,
  fileName: string,
): "pdf" | "image" | "office" | "unknown" {
  const mime = mimeType.toLowerCase();
  const ext = getFileExtension(fileName);
  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  if (
    mime.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "heic"].includes(ext)
  ) {
    return "image";
  }
  if (
    mime.includes("word") ||
    mime.includes("excel") ||
    mime.includes("spreadsheet") ||
    mime.includes("powerpoint") ||
    mime.includes("presentation") ||
    ["doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx"].includes(ext)
  ) {
    return "office";
  }
  return "unknown";
}

export function canPreviewDocument(mimeType: string, fileName: string): boolean {
  return shouldInlinePreview({ mimeType, filename: fileName });
}

export function readFileWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error("Failed to read file."));
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}
