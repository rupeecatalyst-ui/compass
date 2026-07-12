"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

export function WorkspaceContactSummary() {
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
    <OwGlassPanel className="h-full">
      <OwPanelHeader title="Customer Summary" badge="ECM" description="Primary applicant profile" />
      <dl className="space-y-2.5 text-sm">
        <Row label="Name" value={contact?.name ?? "—"} />
        <Row label="Applicant Type" value={contact?.primaryRole?.replace(/_/g, " ") ?? "—"} />
        <Row label="Mobile" value={contact?.mobilePrimary ?? "—"} />
        <Row label="Secondary Mobile" value={contact?.mobileSecondary ?? "—"} />
        <Row label="Personal Email" value={contact?.personalEmail ?? "—"} />
        <Row label="Official Email" value={contact?.officialEmail ?? "—"} />
        <Row label="Active Roles" value={roles.length ? roles.join(", ") : "—"} />
        <Row label="Assigned RM" value="RM-001" />
        <Row label="Contact Id" value={contact?.id ?? "—"} />
        <Row label="Opportunity" value={opportunityId ? opportunityId.slice(0, 8) + "…" : "—"} />
        <Row label="Current Stage" value={stageCode.replace(/_/g, " ")} />
        <Row
          label="Doc Completion"
          value={`${documentStats.completionPct}% (${documentStats.verifiedCount}/${documentStats.requiredCount})`}
        />
        <Row label="Selected Lender" value={selectedLender?.lenderName ?? "Not selected"} />
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link href={customerHref}>Open Customer 360</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={contactHref}>View Full Contact</Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            refresh();
          }}
        >
          Refresh
        </Button>
      </div>
      {lastPlaceholderStatus && (
        <p className="mt-2 text-[10px] text-muted-foreground">{lastPlaceholderStatus}</p>
      )}
    </OwGlassPanel>
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
