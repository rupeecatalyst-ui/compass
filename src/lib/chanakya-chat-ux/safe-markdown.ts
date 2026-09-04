/**
 * CO-C1-CHANAKYA-CHAT-WORKSPACE-UX-011
 * Safe Markdown parse — no HTML execution.
 * Designed for streaming partial output stability.
 */

import { CHANAKYA_CHAT_ALLOWED_INTERNAL_HREF_PREFIXES } from "@/constants/chanakya-chat-ux";

export type ChanakyaMdInline =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string; internal: boolean };

export type ChanakyaMdBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; inlines: ChanakyaMdInline[] }
  | { type: "blockquote"; inlines: ChanakyaMdInline[] }
  | { type: "ul"; items: ChanakyaMdInline[][] }
  | { type: "ol"; items: ChanakyaMdInline[][] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; code: string }
  | { type: "hr" };

export function stripUnsafeHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<[^>]+>/g, "");
}

export function isAllowedChanakyaInternalHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return false;
  }
  return CHANAKYA_CHAT_ALLOWED_INTERNAL_HREF_PREFIXES.some(
    (prefix) =>
      trimmed === prefix || trimmed.startsWith(`${prefix}?`) || trimmed.startsWith(`${prefix}/`),
  );
}

function parseInlines(raw: string): ChanakyaMdInline[] {
  const text = stripUnsafeHtml(raw);
  const nodes: ChanakyaMdInline[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push({ kind: "text", text: text.slice(last, match.index) });
    const token = match[0];

    if (token.startsWith("**")) nodes.push({ kind: "strong", text: token.slice(2, -2) });
    else if (token.startsWith("*")) nodes.push({ kind: "em", text: token.slice(1, -1) });
    else if (token.startsWith("`")) nodes.push({ kind: "code", text: token.slice(1, -1) });
    else if (token.startsWith("[")) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (m) {
        const href = m[2].trim();
        const internal = isAllowedChanakyaInternalHref(href);
        if (internal) nodes.push({ kind: "link", text: m[1], href, internal: true });
        else nodes.push({ kind: "text", text: m[1] });
      }
    }

    last = match.index + token.length;
  }

  if (last < text.length) nodes.push({ kind: "text", text: text.slice(last) });
  return nodes.length ? nodes : [{ kind: "text", text }];
}

export function parseChanakyaSafeMarkdown(body: string, streaming = false): ChanakyaMdBlock[] {
  const source = stripUnsafeHtml(body.replace(/\r\n/g, "\n"));
  const lines = source.split("\n");
  const blocks: ChanakyaMdBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed === "---" || trimmed === "***") {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", code: codeLines.join("\n") });
      continue;
    }

    const hm = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (hm) {
      blocks.push({
        type: "heading",
        level: hm[1].length as 1 | 2 | 3,
        text: hm[2].replace(/#+\s*$/, "").trim(),
      });
      i += 1;
      continue;
    }

    if (streaming && /^#{1,3}[^\s#]/.test(trimmed)) {
      blocks.push({ type: "paragraph", inlines: parseInlines(trimmed) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const q: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        q.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "blockquote", inlines: parseInlines(q.join(" ")) });
      continue;
    }

    if (trimmed.startsWith("|") && (trimmed.endsWith("|") || streaming)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i += 1;
      }

      const splitRow = (row: string) =>
        row
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());

      const headers = splitRow(tableLines[0] ?? "");
      const dataRows = tableLines
        .slice(1)
        .filter((r) => !/^\|?[\s|:-]+\|?$/.test(r))
        .map(splitRow);

      blocks.push({ type: "table", headers, rows: dataRows });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items: items.map(parseInlines) });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items: items.map(parseInlines) });
      continue;
    }

    const para: string[] = [trimmed];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(">") &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("|") &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      lines[i].trim() !== "---"
    ) {
      para.push(lines[i].trim());
      i += 1;
    }

    blocks.push({ type: "paragraph", inlines: parseInlines(para.join(" ")) });
  }

  return blocks;
}

