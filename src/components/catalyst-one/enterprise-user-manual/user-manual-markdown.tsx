/**
 * CO-C1-ADMIN-USER-MANUAL-001 — Lightweight Markdown → React (no react-markdown dependency).
 * Supports headings, lists, tables, blockquotes, code, links, emphasis.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { slugifyHeading } from "@/lib/enterprise-user-manual/parse";
import { cn } from "@/lib/utils";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={`${keyPrefix}-i-${i}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${i}`}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (m) {
        const href = m[2];
        const label = m[1];
        const internal = href.startsWith("/admin/user-manual");
        nodes.push(
          internal ? (
            <Link
              key={`${keyPrefix}-a-${i}`}
              href={href}
              className="font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
            >
              {label}
            </Link>
          ) : (
            <a
              key={`${keyPrefix}-a-${i}`}
              href={href}
              className="font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noreferrer" : undefined}
            >
              {label}
            </a>
          ),
        );
      }
    }
    last = match.index + token.length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string; id: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; lines: string[] }
  | { type: "code"; lang: string; code: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" };

function parseBlocks(body: string): Block[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  const seen = new Map<string, number>();

  const headingId = (text: string) => {
    let id = slugifyHeading(text);
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count + 1}`;
    return id;
  };

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
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      continue;
    }

    const hm = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (hm) {
      const level = hm[1].length as 1 | 2 | 3;
      const text = hm[2].replace(/#+\s*$/, "").trim();
      blocks.push({ type: "heading", level, text, id: headingId(text) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const q: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        q.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "blockquote", lines: q });
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      const splitRow = (row: string) =>
        row
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
      const headers = splitRow(tableLines[0] ?? "| |");
      const dataRows = tableLines
        .slice(1)
        .filter((r) => !/^\|[\s|:-]+\|$/.test(r))
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
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
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
    blocks.push({ type: "paragraph", text: para.join(" ") });
  }

  return blocks;
}

export function UserManualMarkdown({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  const blocks = parseBlocks(body);
  return (
    <div className={cn("user-manual-prose space-y-4 text-sm leading-relaxed text-foreground", className)}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading": {
            const Tag = `h${block.level}` as "h1" | "h2" | "h3";
            const size =
              block.level === 1
                ? "text-2xl font-semibold tracking-tight"
                : block.level === 2
                  ? "scroll-mt-24 pt-2 text-lg font-semibold tracking-tight"
                  : "scroll-mt-24 pt-1 text-base font-semibold";
            return (
              <Tag key={`h-${idx}`} id={block.id} className={size}>
                {block.text}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={`p-${idx}`} className="text-muted-foreground [&_strong]:text-foreground">
                {renderInline(block.text, `p${idx}`)}
              </p>
            );
          case "blockquote":
            return (
              <blockquote
                key={`q-${idx}`}
                className="rounded-lg border border-amber-500/40 bg-amber-500/[0.08] px-4 py-3 text-amber-950 dark:text-amber-100"
              >
                {block.lines.map((line, li) => (
                  <p key={li} className="text-[13px] leading-relaxed">
                    {renderInline(line, `q${idx}-${li}`)}
                  </p>
                ))}
              </blockquote>
            );
          case "code":
            return (
              <pre
                key={`code-${idx}`}
                className="overflow-x-auto rounded-lg border bg-muted/60 p-3 font-mono text-[12px] text-foreground"
              >
                <code>{block.code}</code>
              </pre>
            );
          case "ul":
            return (
              <ul key={`ul-${idx}`} className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                {block.items.map((item, ii) => (
                  <li key={ii}>{renderInline(item, `ul${idx}-${ii}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={`ol-${idx}`} className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
                {block.items.map((item, ii) => (
                  <li key={ii}>{renderInline(item, `ol${idx}-${ii}`)}</li>
                ))}
              </ol>
            );
          case "table":
            return (
              <div key={`t-${idx}`} className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[28rem] border-collapse text-left text-[13px]">
                  <thead className="bg-muted/50">
                    <tr>
                      {block.headers.map((h, hi) => (
                        <th key={hi} className="border-b px-3 py-2 font-semibold">
                          {renderInline(h, `th${idx}-${hi}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri} className="border-b border-border/60 last:border-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 text-muted-foreground align-top">
                            {renderInline(cell, `td${idx}-${ri}-${ci}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "hr":
            return <hr key={`hr-${idx}`} className="border-border/70" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
