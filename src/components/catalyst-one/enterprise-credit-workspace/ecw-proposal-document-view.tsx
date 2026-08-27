"use client";

/**
 * CO-CHANAKYA-CREDIT-PROPOSAL-017 — Lender-facing proposal document presentation.
 * Renders draft sections only — never internal intelligence.
 */

import type { ReactNode } from "react";
import type {
  ChanakyaCreditProposalDraft,
  ChanakyaCreditProposalSection,
} from "@/types/chanakya-credit-proposal";
import { cn } from "@/lib/utils";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    nodes.push(
      <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-foreground">
        {token.slice(2, -2)}
      </strong>,
    );
    last = match.index + token.length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderBodyLines(body: string): ReactNode[] {
  const lines = body.split("\n");
  const out: ReactNode[] = [];
  let listItems: string[] = [];
  let tableRows: string[][] = [];

  const flushList = (key: string) => {
    if (!listItems.length) return;
    out.push(
      <ul key={key} className="my-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">
        {listItems.map((item, idx) => (
          <li key={`${key}-${idx}`}>{renderInline(item.replace(/^-\s*/, ""), `${key}-${idx}`)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  const flushTable = (key: string) => {
    if (tableRows.length < 2) {
      for (const row of tableRows) {
        out.push(
          <p key={`${key}-fallback-${row.join("-")}`} className="my-2 text-[15px] leading-relaxed">
            {renderInline(row.join(" | "), `${key}-fb`)}
          </p>,
        );
      }
      tableRows = [];
      return;
    }
    const [headerRow, ...restRows] = tableRows;
    const dataRows = restRows.filter(
      (row) => !row.every((cell) => /^:?-+:?$/.test(cell.trim())),
    );
    const headers = headerRow!.map((c) => c.trim());
    out.push(
      <div key={key} className="my-4 overflow-x-auto">
        <table className="w-full min-w-[20rem] border-collapse text-[14px] leading-snug">
          <thead>
            <tr className="border-b border-border/70 bg-muted/40">
              {headers.map((h, hi) => (
                <th
                  key={`${key}-h-${hi}`}
                  className={cn(
                    "px-3 py-2 font-semibold text-foreground",
                    hi > 0 ? "text-right" : "text-left",
                  )}
                >
                  {renderInline(h, `${key}-th-${hi}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={`${key}-r-${ri}`} className="border-b border-border/40">
                {row.map((cell, ci) => (
                  <td
                    key={`${key}-c-${ri}-${ci}`}
                    className={cn(
                      "px-3 py-2 text-foreground",
                      ci > 0 ? "text-right tabular-nums" : "text-left",
                    )}
                  >
                    {renderInline(cell.trim(), `${key}-td-${ri}-${ci}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableRows = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(`gap-${idx}`);
      flushTable(`table-gap-${idx}`);
      return;
    }
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList(`gap-${idx}`);
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) {
        tableRows.push(cells);
        return;
      }
      tableRows.push(cells);
      return;
    }
    flushTable(`table-${idx}`);
    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed);
      return;
    }
    flushList(`gap-${idx}`);
    if (trimmed.startsWith(">")) {
      out.push(
        <blockquote
          key={`q-${idx}`}
          className="my-3 border-l-4 border-teal-600/40 bg-muted/30 px-4 py-2 text-[15px] italic text-muted-foreground"
        >
          {renderInline(trimmed.replace(/^>\s?/, ""), `q-${idx}`)}
        </blockquote>,
      );
      return;
    }
    const headingMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (headingMatch && !trimmed.includes(": ")) {
      out.push(
        <h3
          key={`h3-${idx}`}
          className="mb-2 mt-5 font-serif text-lg font-semibold tracking-tight text-foreground"
        >
          {headingMatch[1]}
        </h3>,
      );
      return;
    }
    out.push(
      <p key={`p-${idx}`} className="my-2 text-[15px] leading-relaxed text-foreground">
        {renderInline(trimmed, `p-${idx}`)}
      </p>,
    );
  });
  flushList("final");
  flushTable("final-table");
  return out;
}

function SectionBlock({ section }: { section: ChanakyaCreditProposalSection }) {
  return (
    <section className="ecw-proposal-section mb-10 break-inside-avoid">
      <h2 className="mb-4 border-b border-border/60 pb-2 font-serif text-xl font-semibold tracking-tight text-foreground">
        {section.title}
      </h2>
      <div className="max-w-full space-y-1 overflow-x-hidden">{renderBodyLines(section.body)}</div>
    </section>
  );
}

export function EcwProposalDocumentView({
  draft,
  streamText,
  streaming,
  borrowerName,
  className,
}: {
  draft: ChanakyaCreditProposalDraft | null;
  streamText?: string;
  streaming?: boolean;
  borrowerName?: string | null;
  className?: string;
}) {
  const sections = draft?.sections ?? [];

  return (
    <article
      className={cn(
        "ecw-proposal-print-root ecw-proposal-lender-document mx-auto w-full max-w-[min(52rem,100%)] bg-card px-5 py-8 shadow-sm sm:px-8 sm:py-10 lg:max-w-[54rem]",
        "rounded-lg border border-border/50 print:border-0 print:shadow-none",
        className,
      )}
      data-lender-facing-document="true"
      data-no-customer-pii="true"
      data-proposal-export-surface="lender-document"
    >
      <header className="mb-8 border-b border-border/50 pb-6 print:mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
          Lender Credit Proposal
        </p>
        {draft ? (
          <div className="mt-2 space-y-1">
            <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
              {borrowerName?.trim() || draft.productName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[
                draft.opportunityNumber,
                draft.productName,
                draft.loanAmount > 0 ? `₹ ${draft.loanAmount.toLocaleString("en-IN")}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-xs text-muted-foreground">
              Draft · {new Date(draft.generatedAt).toLocaleString()} · advisory only
            </p>
          </div>
        ) : (
          <h1 className="mt-2 font-serif text-2xl font-semibold text-foreground">
            Generating proposal…
          </h1>
        )}
      </header>

      {sections.length > 0 ? (
        <div className="space-y-2">
          {sections.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))}
        </div>
      ) : streamText ? (
        <div className="whitespace-pre-wrap text-[15px] leading-[1.75] text-foreground">
          {streamText}
          {streaming ? (
            <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-teal-600 align-middle" />
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Proposal content will appear here once generation completes.
        </p>
      )}
    </article>
  );
}
