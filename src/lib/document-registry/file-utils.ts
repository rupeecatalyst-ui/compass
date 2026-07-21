import {
  DOCUMENT_REGISTRY_ALLOWED_EXTENSIONS,
  DOCUMENT_REGISTRY_ALLOWED_MIMES,
  DOCUMENT_REGISTRY_MAX_BYTES,
} from "@/constants/document-registry";

export type FileValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function getFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  return name.slice(dot + 1).toLowerCase();
}

export function validateDocumentFile(file: File): FileValidationResult {
  if (file.size <= 0) {
    return { ok: false, reason: "File is empty." };
  }
  if (file.size > DOCUMENT_REGISTRY_MAX_BYTES) {
    return {
      ok: false,
      reason: `File exceeds ${Math.round(DOCUMENT_REGISTRY_MAX_BYTES / (1024 * 1024))} MB limit.`,
    };
  }

  const ext = getFileExtension(file.name);
  const mime = (file.type || "").toLowerCase();

  if (ext && DOCUMENT_REGISTRY_ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: true };
  }
  if (mime && DOCUMENT_REGISTRY_ALLOWED_MIMES.has(mime)) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: "Unsupported file type. Use PDF, images, Office documents, CSV, or ZIP.",
  };
}

export function inferMimeHint(
  mimeType: string,
  fileName: string,
): "pdf" | "image" | "office" | "unknown" {
  const mime = mimeType.toLowerCase();
  const ext = getFileExtension(fileName);
  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "heic", "svg"].includes(ext)) {
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
  const hint = inferMimeHint(mimeType, fileName);
  return hint === "pdf" || hint === "image";
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
      else reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsArrayBuffer(file);
  });
}
