"use client";

import Link from "next/link";
import type { ExecutiveApproval } from "../types";
import { PriorityBadge } from "./PriorityBadge";

/**
 * Approve / Reject are inert placeholders — no workflow execution.
 */
export function ApprovalCard({ approval }: { approval: ExecutiveApproval }) {
  const submittedLabel = new Date(approval.submittedOn).toLocaleString();

  return (
    <article
      className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-sm shadow-black/20 transition-colors hover:border-zinc-700 focus-within:border-zinc-600"
      aria-labelledby={`approval-${approval.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority={approval.priority} />
        <span className="rounded-md border border-zinc-800 px-2 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500">
          {approval.currentStatus.replace(/_/g, " ")}
        </span>
      </div>
      <h3 id={`approval-${approval.id}`} className="mt-3 text-sm font-semibold text-zinc-50">
        {approval.approvalTitle}
      </h3>
      <dl className="mt-3 space-y-1.5 text-[11px] text-zinc-400">
        <div className="flex gap-2">
          <dt className="shrink-0 font-semibold uppercase tracking-wide text-zinc-600">Type</dt>
          <dd>{approval.approvalType}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-semibold uppercase tracking-wide text-zinc-600">
            Requested by
          </dt>
          <dd>{approval.requestedBy}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-semibold uppercase tracking-wide text-zinc-600">
            Submitted
          </dt>
          <dd className="tabular-nums">{submittedLabel}</dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Link
          href={approval.reviewAction.href}
          className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-200 outline-none transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-teal-500/50"
          aria-label={`${approval.reviewAction.label} ${approval.approvalTitle}`}
        >
          {approval.reviewAction.label}
        </Link>
        <button
          type="button"
          className="inline-flex rounded-md border border-zinc-700 px-3 py-1.5 text-[11px] font-medium text-zinc-400 outline-none transition-colors hover:border-zinc-600 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-teal-500/50"
          aria-label={`${approval.approveAction.label} ${approval.approvalTitle} (placeholder — no action)`}
          title="Placeholder — no approval workflow"
        >
          {approval.approveAction.label}
        </button>
        <button
          type="button"
          className="inline-flex rounded-md border border-zinc-800 px-3 py-1.5 text-[11px] font-medium text-zinc-500 outline-none transition-colors hover:border-zinc-700 hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-teal-500/50"
          aria-label={`${approval.rejectAction.label} ${approval.approvalTitle} (placeholder — no action)`}
          title="Placeholder — no rejection workflow"
        >
          {approval.rejectAction.label}
        </button>
      </div>
    </article>
  );
}
