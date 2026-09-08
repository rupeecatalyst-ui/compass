"use client";

import { DOCUMENT_WORKSPACE_LINKED_PARTIES_LABEL } from "@/constants/document-workspace-refinement-014";
import type { DocumentWorkspaceLinkedParty } from "@/lib/document-workspace/linked-parties";
import { cn } from "@/lib/utils";

export function DocumentWorkspaceLinkedParties({
  parties,
  activeKey,
  onSelect,
  compact,
  newCountsByEntityId,
}: {
  parties: DocumentWorkspaceLinkedParty[];
  activeKey: string;
  onSelect: (party: DocumentWorkspaceLinkedParty) => void;
  compact?: boolean;
  newCountsByEntityId?: Record<string, number>;
}) {
  return (
    <section
      data-document-workspace-linked-parties="014"
      aria-label={DOCUMENT_WORKSPACE_LINKED_PARTIES_LABEL}
      className={cn("min-w-0", compact ? "w-full" : "")}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {DOCUMENT_WORKSPACE_LINKED_PARTIES_LABEL}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {parties.map((party) => (
          <button
            key={party.key}
            type="button"
            disabled={!party.selectable}
            onClick={() => party.selectable && onSelect(party)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-left text-xs",
              party.key === activeKey
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-background",
              !party.selectable && "cursor-not-allowed opacity-70",
            )}
            data-party-key={party.key}
          >
            <span className="block font-medium">{party.displayName}</span>
            <span className="block text-[10px] opacity-80">{party.roleLabel}</span>
            {party.entityId && newCountsByEntityId?.[party.entityId] ? (
              <span data-new-from-email-count={party.entityId} className="mt-0.5 inline-flex rounded-full bg-amber-200 px-1.5 text-[10px] text-amber-950">
                {newCountsByEntityId[party.entityId]} new
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
