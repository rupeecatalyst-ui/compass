"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { EnterpriseRelationshipWorkspace } from "@/components/catalyst-one/enterprise-relationship-workspace/enterprise-relationship-workspace";
import { displayOpportunityRequirementStageLabel } from "@/lib/lead-opportunity-journey/opportunity-field-display";
import { OwGlassPanel } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import { WorkspaceStagePanel } from "./workspace-stage-panel";
import { StrategicTabToolbar } from "./strategic-tab-toolbar";

/** Requirement tab — inline edit for planning fields. */
export function WorkspaceRequirementPanel() {
  const { loanAmountLabel, productLabel, stageCode, opportunity } = useOpportunityWorkspace();
  const [editing, setEditing] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-4">
      <StrategicTabToolbar
        title="Requirement"
        description="Qualify the ask — planning context, not a loan application form."
        editing={editing}
        onEditToggle={() => setEditing((v) => !v)}
      />
      <OwGlassPanel>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="Stated Loan Amount" value={loanAmountLabel} />
          <Fact label="Product Path" value={productLabel} />
          <Fact label="Opportunity" value={opportunity?.opportunityCode ?? "—"} />
          <Fact
            label="Planning Stage"
            value={displayOpportunityRequirementStageLabel(stageCode)}
          />
        </dl>
        {editing ? (
          <div className="mt-4 space-y-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Funding purpose
              <Input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Purchase · Construction · BT"
                className="mt-1 h-9 border-white/10 bg-zinc-950/50 text-sm"
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Qualification notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Urgency, quantum rationale, customer constraints…"
                className="mt-1 min-h-[80px] w-full resize-y rounded-md border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
          </div>
        ) : (
          <p className="mt-4 text-xs leading-relaxed text-zinc-400">
            {purpose || notes
              ? [purpose, notes].filter(Boolean).join(" · ")
              : "Click Edit to capture purpose and qualification notes without leaving Strategic Workspace."}
          </p>
        )}
      </OwGlassPanel>
      <WorkspaceStagePanel />
    </div>
  );
}

/** Solution Design (product) tab. */
export function WorkspaceProductPanel() {
  const { productLabel, loanAmountLabel, opportunity } = useOpportunityWorkspace();
  const [editing, setEditing] = useState(false);
  const [structureNote, setStructureNote] = useState("");

  return (
    <div className="space-y-3">
      <StrategicTabToolbar
        title="Solution Design"
        description="Product framing and financing structure for this opportunity."
        editing={editing}
        onEditToggle={() => setEditing((v) => !v)}
      />
      <OwGlassPanel>
        <dl className="space-y-3 text-sm">
          <Fact label="Selected Product" value={productLabel} />
          <Fact label="Aligned Requirement" value={loanAmountLabel} />
          <Fact label="Opportunity Code" value={opportunity?.opportunityCode ?? "—"} />
          <Fact label="Product Ref" value={opportunity?.productRef ?? "—"} />
        </dl>
        {editing ? (
          <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Structure notes
            <textarea
              value={structureNote}
              onChange={(e) => setStructureNote(e.target.value)}
              placeholder="Tenure, BT vs Fresh, co-lending notes…"
              className="mt-1 min-h-[80px] w-full resize-y rounded-md border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
        ) : (
          <p className="mt-4 text-xs text-zinc-400">
            {structureNote ||
              "Click Edit to refine solution design notes. Execution product changes belong in Loan Workspace."}
          </p>
        )}
      </OwGlassPanel>
    </div>
  );
}

export function WorkspaceRelationshipsPanel({
  onAddRelationship,
}: {
  onAddRelationship?: () => void;
}) {
  const { contact } = useOpportunityWorkspace();
  const [editing, setEditing] = useState(false);

  if (!contact) {
    return (
      <div className="space-y-3">
        <StrategicTabToolbar
          title="Relationships"
          description="Enterprise Relationship Workspace — business relationships for this opportunity."
        />
        <OwGlassPanel>
          <p className="text-sm text-zinc-400">
            Link a primary contact to open the Enterprise Relationship Workspace. This tab does not
            duplicate Loan Structure.
          </p>
        </OwGlassPanel>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <StrategicTabToolbar
        title="Relationships"
        description="Enterprise Relationship Workspace — graph of business relationships (not Loan Structure)."
        editing={editing}
        onEditToggle={() => setEditing((v) => !v)}
        editLabel="Edit"
      />
      <EnterpriseRelationshipWorkspace
        contact={contact}
        onAddRelationship={editing ? onAddRelationship : undefined}
      />
    </div>
  );
}

/** Competition panel lives in workspace-competition-panel.tsx */
export { WorkspaceCompetitionPanel } from "./workspace-competition-panel";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium capitalize text-zinc-50">{value}</dd>
    </div>
  );
}
