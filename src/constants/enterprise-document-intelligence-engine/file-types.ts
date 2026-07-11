/**
 * EDIE default registered file types — extensible without code changes.
 */

export interface EdieDefaultFileTypeConfig {
  extension: string;
  mimeType: string;
  displayName: string;
}

export const EDIE_DEFAULT_FILE_TYPES: EdieDefaultFileTypeConfig[] = [
  { extension: "pdf", mimeType: "application/pdf", displayName: "PDF Document" },
  { extension: "doc", mimeType: "application/msword", displayName: "Word Document (DOC)" },
  { extension: "docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", displayName: "Word Document (DOCX)" },
  { extension: "xls", mimeType: "application/vnd.ms-excel", displayName: "Excel Spreadsheet (XLS)" },
  { extension: "xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", displayName: "Excel Spreadsheet (XLSX)" },
  { extension: "csv", mimeType: "text/csv", displayName: "CSV File" },
  { extension: "ppt", mimeType: "application/vnd.ms-powerpoint", displayName: "PowerPoint (PPT)" },
  { extension: "pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", displayName: "PowerPoint (PPTX)" },
  { extension: "txt", mimeType: "text/plain", displayName: "Text File" },
  { extension: "rtf", mimeType: "application/rtf", displayName: "Rich Text Format" },
  { extension: "jpg", mimeType: "image/jpeg", displayName: "JPEG Image" },
  { extension: "jpeg", mimeType: "image/jpeg", displayName: "JPEG Image" },
  { extension: "png", mimeType: "image/png", displayName: "PNG Image" },
  { extension: "gif", mimeType: "image/gif", displayName: "GIF Image" },
  { extension: "bmp", mimeType: "image/bmp", displayName: "BMP Image" },
  { extension: "tiff", mimeType: "image/tiff", displayName: "TIFF Image" },
  { extension: "webp", mimeType: "image/webp", displayName: "WebP Image" },
  { extension: "heic", mimeType: "image/heic", displayName: "HEIC Image" },
  { extension: "svg", mimeType: "image/svg+xml", displayName: "SVG Image" },
  { extension: "zip", mimeType: "application/zip", displayName: "ZIP Archive" },
  { extension: "rar", mimeType: "application/vnd.rar", displayName: "RAR Archive" },
  { extension: "7z", mimeType: "application/x-7z-compressed", displayName: "7-Zip Archive" },
  { extension: "xml", mimeType: "application/xml", displayName: "XML File" },
  { extension: "json", mimeType: "application/json", displayName: "JSON File" },
  { extension: "eml", mimeType: "message/rfc822", displayName: "Email Message" },
  { extension: "msg", mimeType: "application/vnd.ms-outlook", displayName: "Outlook Message" },
];
