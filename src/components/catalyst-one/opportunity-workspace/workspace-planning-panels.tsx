"use client";

import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import { WorkspaceStagePanel } from "./workspace-stage-panel";

/** Presentation-only requirement / qualification view. */
export function WorkspaceRequirementPanel() {
  const { loanAmountLabel, productLabel, stageCode, opportunity } = useOpportunityWorkspace();

  return (
    <div className="space-y-4">
      <OwGlassPanel>
        <OwPanelHeader
          title="Funding Requirement"
          description="Qualify the ask — this is planning context, not a loan application form."
        />
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <Fact label="Stated Loan Amount" value={loanAmountLabel} />
          <Fact label="Product Path" value={productLabel} />
          <Fact label="Opportunity" value={opportunity?.opportunityCode ?? "—"} />
          <Fact label="Planning Stage" value={stageCode.replace(/_/g, " ")} />
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-zinc-400">
          Clarify purpose and quantum with the customer before locking Funding Strategy. Stage controls below remain
          Catalyst One’s workflow truth.
        </p>
      </OwGlassPanel>
      <WorkspaceStagePanel />
    </div>
  );
}

export function WorkspaceProductPanel() {
  const { productLabel, loanAmountLabel, opportunity } = useOpportunityWorkspace();

  return (
    <OwGlassPanel>
      <OwPanelHeader
        title="Product"
        badge="Planning"
        description="Product framing for this opportunity."
      />
      <dl className="mt-3 space-y-3 text-sm">
        <Fact label="Selected Product" value={productLabel} />
        <Fact label="Aligned Requirement" value={loanAmountLabel} />
        <Fact label="Opportunity Code" value={opportunity?.opportunityCode ?? "—"} />
        <Fact label="Product Ref" value={opportunity?.productRef ?? "—"} />
      </dl>
      <p className="mt-4 text-xs text-zinc-400">
        Keep product selection stable once lender conversations begin. Execution product changes belong in Loan Workspace.
      </p>
    </OwGlassPanel>
  );
}

export function WorkspaceRelationshipsPanel() {
  const { contact, selectedLender, opportunityId } = useOpportunityWorkspace();

  return (
    <OwGlassPanel>
      <OwPanelHeader
        title="Relationships"
        badge="Planning"
        description="People and institution relationships for this opportunity."
      />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Customer</p>
          <p className="mt-1 text-sm font-semibold text-zinc-50">{contact?.name ?? "—"}</p>
          <p className="mt-1 text-xs text-zinc-400">{contact?.mobilePrimary ?? "—"}</p>
          <p className="mt-2 text-[11px] text-amber-200/90">
            Primary decision maker:{" "}
            <span className="font-medium">Not identified</span>
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Lender</p>
          <p className="mt-1 text-sm font-semibold text-zinc-50">
            {selectedLender?.lenderName ?? "Not selected"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {selectedLender?.executorName
              ? `Contact · ${selectedLender.executorName}`
              : "Assign institution contact via Funding Strategy"}
          </p>
          {selectedLender?.branchName && (
            <p className="mt-1 text-xs text-zinc-400">Branch · {selectedLender.branchName}</p>
          )}
        </div>
      </div>
      <p className="mt-3 text-[10px] text-zinc-500">Opportunity · {opportunityId.slice(0, 12)}…</p>
    </OwGlassPanel>
  );
}

/** Presentation-only competition / parallel-channel view. */
export function WorkspaceCompetitionPanel() {
  const { selectedLender, productLabel } = useOpportunityWorkspace();

  return (
    <OwGlassPanel>
      <OwPanelHeader
        title="Competition"
        badge="Planning"
        description="Capture competing offers or parallel channels for strategic clarity."
      />
      <div className="mt-3 space-y-3 text-sm">
        <div className="rounded-xl border border-dashed border-white/15 bg-zinc-950/35 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Current preferred path
          </p>
          <p className="mt-1 font-semibold text-zinc-50">
            {selectedLender?.lenderName ?? "No lender selected yet"} · {productLabel}
          </p>
        </div>
        <p className="text-xs leading-relaxed text-zinc-400">
          Record competing banks, existing banking limits, or customer-spoken alternatives as planning notes.
          This surface does not change lender assignment — use Funding Strategy for institution selection.
        </p>
        <ul className="space-y-2 text-xs text-zinc-300">
          <li className="rounded-lg border border-white/10 bg-zinc-950/40 px-2.5 py-2">
            Competing offer / channel · Not captured
          </li>
          <li className="rounded-lg border border-white/10 bg-zinc-950/40 px-2.5 py-2">
            Customer preference signal · Pending discussion note
          </li>
        </ul>
      </div>
    </OwGlassPanel>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium capitalize text-zinc-50">{value}</dd>
    </div>
  );
}
