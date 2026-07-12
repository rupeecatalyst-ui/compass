"use client";

import type { ExecutiveApproval } from "../types";
import { ApprovalCard } from "./ApprovalCard";
import { EmptyState } from "./EmptyState";
import { SectionHeader } from "./SectionHeader";

export function PendingApprovalsSection({
  approvals,
}: {
  approvals: ExecutiveApproval[];
}) {
  return (
    <section className="space-y-3" aria-labelledby="edw-approvals-heading">
      <SectionHeader
        eyebrow="Pending Executive Approvals"
        title="What requires executive approval"
        description="Placeholder approval cards — buttons do not execute workflows."
      />
      <h2 id="edw-approvals-heading" className="sr-only">
        Pending Executive Approvals
      </h2>
      {approvals.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          description="There are no placeholder approvals in this set."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {approvals.map((approval) => (
            <ApprovalCard key={approval.id} approval={approval} />
          ))}
        </div>
      )}
    </section>
  );
}
