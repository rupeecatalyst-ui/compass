"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

export function WorkspaceContactSummary() {
  const { contact } = useOpportunityWorkspace();
  const roles = [
    contact?.primaryRole,
    ...(contact?.additionalRoles ?? []),
  ].filter(Boolean) as string[];

  return (
    <OwGlassPanel className="h-full">
      <OwPanelHeader title="Customer Summary" badge="ECM" description="Primary applicant profile" />
      <dl className="space-y-2.5 text-sm">
        <Row label="Name" value={contact?.name ?? "—"} />
        <Row label="Applicant Type" value={contact?.primaryRole?.replace(/_/g, " ") ?? "—"} />
        <Row label="Mobile" value={contact?.mobilePrimary ?? "—"} />
        <Row label="Email" value={contact?.personalEmail ?? contact?.officialEmail ?? "—"} />
        <Row label="Active Roles" value={roles.length ? roles.join(", ") : "—"} />
        <Row label="Assigned RM" value="RM-001" />
      </dl>
      <Button asChild size="sm" className="mt-4 w-full sm:w-auto" variant="secondary">
        <Link href={ROUTES.CONTACTS}>View Full Contact</Link>
      </Button>
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
