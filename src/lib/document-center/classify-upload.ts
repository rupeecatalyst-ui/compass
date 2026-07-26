/**
 * Heuristic filename → checklist typeRef mapping for Folder Upload.
 * Unmapped files go to Other Documents for manual assignment.
 */

import type { EdieChecklistItem } from "@/types/edie-certified-rules";

export const OTHER_DOCUMENTS_TYPE_PREFIX = "doc:other:";

/** Common aliases that help map noisy filenames to catalog labels. */
const ALIAS_HINTS: Array<{ pattern: RegExp; hints: string[] }> = [
  { pattern: /\bpan\b/i, hints: ["pan"] },
  { pattern: /\baadhaar\b|\baadhar\b/i, hints: ["aadhaar", "aadhar"] },
  { pattern: /\bpassport\b/i, hints: ["passport"] },
  { pattern: /\bdl\b|driving\s*licen/i, hints: ["driving", "licence", "license"] },
  { pattern: /\bvoter\b/i, hints: ["voter"] },
  { pattern: /\bphoto(graph)?\b|\bselfie\b/i, hints: ["photograph", "photo"] },
  { pattern: /\bsignature\b|\bsign\b/i, hints: ["signature"] },
  { pattern: /\belectric/i, hints: ["electricity"] },
  { pattern: /\brent\s*agree|\brental\b/i, hints: ["rent", "agreement"] },
  { pattern: /\bbank\s*statement|\bstatement\b/i, hints: ["bank statement", "statement"] },
  { pattern: /\bsalary\s*slip|\bpayslip\b|\bpay\s*slip\b/i, hints: ["salary"] },
  { pattern: /\bitr\b|income\s*tax|form\s*16/i, hints: ["itr", "income tax", "form 16"] },
  { pattern: /\bgst\b/i, hints: ["gst"] },
  { pattern: /\bcibil\b|\bcredit\s*report\b/i, hints: ["cibil", "credit"] },
  { pattern: /\bproperty\b|\bsale\s*deed\b|\bchain\b/i, hints: ["property", "sale deed", "chain"] },
  { pattern: /\bsite\s*visit\b/i, hints: ["site visit"] },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreMatch(filename: string, item: EdieChecklistItem): number {
  const fileNorm = normalize(filename);
  const labelNorm = normalize(item.label);
  if (!fileNorm || !labelNorm) return 0;

  let score = 0;
  if (fileNorm.includes(labelNorm) || labelNorm.includes(fileNorm)) score += 40;

  const labelTokens = labelNorm.split(" ").filter((t) => t.length > 2);
  for (const token of labelTokens) {
    if (fileNorm.includes(token)) score += 12;
  }

  for (const alias of ALIAS_HINTS) {
    if (!alias.pattern.test(filename)) continue;
    for (const hint of alias.hints) {
      if (labelNorm.includes(hint) || normalize(item.typeRef).includes(hint.replace(/\s+/g, ""))) {
        score += 25;
      }
    }
  }

  return score;
}

export interface ClassifiedUpload {
  file: File;
  typeRef: string;
  label: string;
  /** True when no confident checklist match — assign to Other Documents. */
  isOther: boolean;
}

/**
 * Map each file to the best checklist item, or Other Documents when confidence is low.
 */
export function classifyUploadsAgainstChecklist(
  files: File[],
  checklistItems: EdieChecklistItem[],
): ClassifiedUpload[] {
  const candidates = checklistItems.filter(
    (i) => !i.typeRef.startsWith(OTHER_DOCUMENTS_TYPE_PREFIX),
  );

  return files.map((file) => {
    let best: EdieChecklistItem | null = null;
    let bestScore = 0;
    for (const item of candidates) {
      const s = scoreMatch(file.name, item);
      if (s > bestScore) {
        bestScore = s;
        best = item;
      }
    }

    if (best && bestScore >= 24) {
      return {
        file,
        typeRef: best.folderId ?? best.typeRef,
        label: best.folderLabel || best.label,
        isOther: false,
      };
    }

    const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "Supporting Document";
    return {
      file,
      typeRef: `${OTHER_DOCUMENTS_TYPE_PREFIX}${crypto.randomUUID()}`,
      label: baseName,
      isOther: true,
    };
  });
}
