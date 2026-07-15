"use client";

import { Mail, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityLink } from "@/components/catalyst-one/shared/entity-link";
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
          Clarify purpose and quantum with the customer before locking LIFE. Stage controls below remain
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

  const rows: Array<{
    id: string;
    name: string;
    org: string;
    mobile: string;
    email: string;
    role: string;
    linkType?: "customer" | "lender";
    linkId?: string;
  }> = [];

  if (contact) {
    rows.push({
      id: contact.id,
      name: contact.name,
      org:
        contact.roleProfiles?.customer?.companyName ||
        contact.roleProfiles?.partner?.companyName ||
        contact.city ||
        "—",
      mobile: contact.mobilePrimary ?? "—",
      email: contact.officialEmail || contact.personalEmail || "—",
      role: "Customer / Promoter",
      linkType: "customer",
      linkId: contact.id,
    });
  }

  if (selectedLender) {
    rows.push({
      id: `lender-${selectedLender.lenderName}`,
      name: selectedLender.executorName || "—",
      org: selectedLender.lenderName,
      mobile: "—",
      email: "—",
      role: "Lender contact",
      linkType: "lender",
      linkId: selectedLender.lenderName,
    });
  }

  return (
    <OwGlassPanel>
      <OwPanelHeader
        title="Relationship Directory"
        badge="Planning"
        description="People and institutions on this opportunity — no new CRM; navigate via existing links."
      />
      <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="border-b border-white/10 bg-zinc-950/60 text-[10px] uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Organisation</th>
              <th className="px-3 py-2 font-semibold">Mobile</th>
              <th className="px-3 py-2 font-semibold">Email</th>
              <th className="px-3 py-2 font-semibold">Role</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  No relationships linked yet. Add a contact from the header to populate this directory.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2.5 font-medium text-zinc-50">{r.name}</td>
                <td className="px-3 py-2.5 text-zinc-300">{r.org}</td>
                <td className="px-3 py-2.5 text-zinc-300">{r.mobile}</td>
                <td className="px-3 py-2.5 text-zinc-300">{r.email}</td>
                <td className="px-3 py-2.5 text-zinc-400">{r.role}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {r.linkType && r.linkId && (
                      <EntityLink
                        type={r.linkType}
                        id={r.linkId}
                        label="Open"
                        className="text-[11px] text-teal-300"
                      />
                    )}
                    {r.mobile !== "—" && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-zinc-400"
                        asChild
                      >
                        <a href={`tel:${r.mobile}`} aria-label="Call">
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {r.email !== "—" && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-zinc-400"
                        asChild
                      >
                        <a href={`mailto:${r.email}`} aria-label="Email">
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {!r.linkType && (
                      <UserRound className="h-3.5 w-3.5 text-zinc-500" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] text-zinc-500">
        Opportunity · {opportunityId.slice(0, 12)}…
        {!selectedLender && " · Assign LIFE contact to add the lender row."}
      </p>
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
          This surface does not change lender assignment — use LIFE for institution selection. Competition
          Intelligence capture remains Phase 2.
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
