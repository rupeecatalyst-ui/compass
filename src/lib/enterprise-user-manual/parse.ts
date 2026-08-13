/**
 * CO-C1-ADMIN-USER-MANUAL-001 — Minimal frontmatter + Markdown helpers.
 */

import type {
  UserManualArticleStatus,
  UserManualAudience,
  UserManualCategoryId,
} from "@/types/enterprise-user-manual";

export type ParsedFrontmatter = {
  id?: string;
  title?: string;
  summary?: string;
  categoryId?: UserManualCategoryId;
  status?: UserManualArticleStatus;
  audience?: UserManualAudience;
  updated?: string;
  tags?: string[];
  related?: string[];
};

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseFrontmatter(raw: string): { data: ParsedFrontmatter; body: string } {
  const trimmed = raw.replace(/^\uFEFF/, "");
  if (!trimmed.startsWith("---")) {
    return { data: {}, body: trimmed };
  }
  const end = trimmed.indexOf("\n---", 3);
  if (end < 0) {
    return { data: {}, body: trimmed };
  }
  const fmBlock = trimmed.slice(3, end).trim();
  const body = trimmed.slice(end + 4).replace(/^\r?\n/, "");
  const data: ParsedFrontmatter = {};
  for (const line of fmBlock.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    if (key === "tags" || key === "related") {
      data[key] = parseList(value.replace(/^\[|\]$/g, ""));
    } else if (
      key === "id" ||
      key === "title" ||
      key === "summary" ||
      key === "categoryId" ||
      key === "status" ||
      key === "audience" ||
      key === "updated"
    ) {
      (data as Record<string, string>)[key] = value;
    }
  }
  return { data, body };
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export function extractHeadings(body: string): Array<{ id: string; text: string; level: 2 | 3 }> {
  const headings: Array<{ id: string; text: string; level: 2 | 3 }> = [];
  const seen = new Map<string, number>();
  for (const line of body.split(/\r?\n/)) {
    const m = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (!m) continue;
    const level = m[1].length === 2 ? 2 : 3;
    const text = m[2].replace(/#+\s*$/, "").trim();
    let id = slugifyHeading(text);
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count + 1}`;
    headings.push({ id, text, level });
  }
  return headings;
}
