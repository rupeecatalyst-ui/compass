"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { displayOpportunityRequirementStageLabel } from "@/lib/lead-opportunity-journey/opportunity-field-display";
import { OwGlassPanel } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import { StrategicTabToolbar } from "./strategic-tab-toolbar";

export function WorkspaceContactSummary({
  onEditContact,
}: {
  onEditContact?: () => void;
}) {
  const {
    contact,
    contactId,
    refresh,
    lastPlaceholderStatus,
    opportunityId,
    documentStats,
    selectedLender,
    stageCode,
  } = useOpportunityWorkspace();
  const [editing, setEditing] = useState(false);
  const [localNote, setLocalNote] = useState("");

  const roles = [
    contact?.primaryRole,
    ...(contact?.additionalRoles ?? []),
  ].filter(Boolean) as string[];

  const contactHref = contactId
    ? `${ROUTES.CONTACTS}?contact=${encodeURIComponent(contactId)}`
    : ROUTES.CONTACTS;
  const customerHref = contactId
    ? `${ROUTES.CUSTOMERS}?customer=${encodeURIComponent(contactId)}`
    : ROUTES.CUSTOMERS;

  return (
    <div className="space-y-3">
      <StrategicTabToolbar
        title="Customer Profile"
        description="Primary applicant — edit inline without leaving Strategic Workspace."
        editing={editing}
        onEditToggle={() => {
          if (!editing && onEditContact) {
            onEditContact();
            return;
          }
          setEditing((v) => !v);
        }}
      />
      <OwGlassPanel className="h-full">
        <dl className="space-y-2.5 text-sm">
          <Row label="Name" value={contact?.name ?? "—"} />
          <Row label="Applicant Type" value={contact?.primaryRole?.replace(/_/g, " ") ?? "—"} />
          <Row label="Mobile" value={contact?.mobilePrimary ?? "—"} />
          <Row label="Secondary Mobile" value={contact?.mobileSecondary ?? "—"} />
          <Row label="Personal Email" value={contact?.personalEmail ?? "—"} />
          <Row label="Official Email" value={contact?.officialEmail ?? "—"} />
          <Row label="Active Roles" value={roles.length ? roles.join(", ") : "—"} />
          <Row label="Assigned RM" value={contact?.ownerName ?? "—"} />
          <Row label="Contact Id" value={contact?.id ?? "—"} />
          <Row label="Opportunity" value={opportunityId ? opportunityId.slice(0, 8) + "…" : "—"} />
          <Row label="Current Stage" value={displayOpportunityRequirementStageLabel(stageCode)} />
          <Row
            label="Doc Completion"
            value={`${documentStats.completionPct}% (${documentStats.verifiedCount}/${documentStats.requiredCount})`}
          />
          <Row label="Selected Lender" value={selectedLender?.lenderName ?? "Not selected"} />
        </dl>
        {editing && (
          <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Profile note
            <Input
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              className="mt-1 h-9"
              placeholder="RM observation…"
            />
          </label>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href={customerHref}>Open Customer 360</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={contactHref}>View Full Contact</Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        {lastPlaceholderStatus && (
          <p className="mt-2 text-[10px] text-muted-foreground">{lastPlaceholderStatus}</p>
        )}
      </OwGlassPanel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-zinc-200/60 pb-2 last:border-0 dark:border-white/5">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-right text-xs font-medium capitalize text-foreground">{value}</dd>
    </div>
  );
}
