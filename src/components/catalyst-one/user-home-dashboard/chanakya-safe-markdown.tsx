"use client";

/**
 * CO-C1-CHANAKYA-CHAT-WORKSPACE-UX-011 — safe Markdown render.
 * No dangerouslySetInnerHTML; safe internal link allowlist.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { parseChanakyaSafeMarkdown, type ChanakyaMdInline } from "@/lib/chanakya-chat-ux/safe-markdown";
import { cn } from "@/lib/utils";

function InlineRun({ nodes }: { nodes: ChanakyaMdInline[] }) {
  return (
    <>
      {nodes.map((node, i) => {
        const key = `${node.kind}-${i}`;
        if (node.kind === "strong") return <strong key={key}>{node.text}</strong>;
        if (node.kind === "em") return <em key={key}>{node.text}</em>;
        if (node.kind === "code") {
          return (
            <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
              {node.text}
            </code>
          );
        }
        if (node.kind === "link" && node.internal) {
          return (
            <Link
              key={key}
              href={node.href}
              className="font-medium text-[var(--ei-teal)] underline-offset-2 hover:underline"
            >
              {node.text}
            </Link>
          );
        }
        return <span key={key}>{node.text}</span>;
      })}
    </>
  );
}

export function ChanakyaSafeMarkdown({
  text,
  streaming = false,
  className,
}: {
  text: string;
  streaming?: boolean;
  className?: string;
}) {
  const blocks = parseChanakyaSafeMarkdown(text, streaming);

  const heading = (level: 1 | 2 | 3, children: ReactNode, key: string) => {
    const cls = "mt-3 mb-1 font-semibold tracking-tight text-[var(--ei-ink)] first:mt-0";
    if (level === 1) return <h3 key={key} className={cn(cls, "text-base")}>{children}</h3>;
    if (level === 2) return <h4 key={key} className={cn(cls, "text-[15px]")}>{children}</h4>;
    return <h5 key={key} className={cn(cls, "text-sm")}>{children}</h5>;
  };

  return (
    <div
      className={cn(
        "chanakya-safe-markdown max-w-[42rem] text-[14px] leading-relaxed text-[var(--ei-ink-soft)]",
        className,
      )}
      data-chanakya-markdown="011"
    >
      {blocks.map((block, i) => {
        const key = `${block.type}-${i}`;
        if (block.type === "heading") return heading(block.level, block.text, key);
        if (block.type === "paragraph") {
          return (
            <p key={key} className="mb-2 last:mb-0">
              <InlineRun nodes={block.inlines} />
            </p>
          );
        }
        if (block.type === "blockquote") {
          return (
            <blockquote
              key={key}
              className="mb-2 border-l-2 border-[var(--ei-teal)]/40 pl-3 text-muted-foreground"
            >
              <InlineRun nodes={block.inlines} />
            </blockquote>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={key} className="mb-2 list-disc space-y-1 pl-5">
              {block.items.map((item, j) => (
                <li key={`${key}-${j}`}>
                  <InlineRun nodes={item} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={key} className="mb-2 list-decimal space-y-1 pl-5">
              {block.items.map((item, j) => (
                <li key={`${key}-${j}`}>
                  <InlineRun nodes={item} />
                </li>
              ))}
            </ol>
          );
        }
        if (block.type === "table") {
          return (
            <div key={key} className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    {block.headers.map((h) => (
                      <th
                        key={h}
                        className="border border-border/70 bg-muted/40 px-2 py-1 text-left font-semibold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={`${key}-r-${r}`}>
                      {row.map((cell, c) => (
                        <td key={`${key}-c-${c}`} className="border border-border/70 px-2 py-1">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === "code") {
          return (
            <pre
              key={key}
              className="mb-2 overflow-x-auto rounded-lg bg-muted/50 p-2 font-mono text-[12px]"
            >
              {block.code}
            </pre>
          );
        }
        return <hr key={key} className="my-3 border-border/60" />;
      })}
      {streaming ? (
        <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-[var(--ei-teal)] align-middle" />
      ) : null}
    </div>
  );
}

