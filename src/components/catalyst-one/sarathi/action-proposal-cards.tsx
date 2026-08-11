"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EaiActionProposal } from "@/types/enterprise-ai-platform";

function friendlyKind(kind: string): string {
  const map: Record<string, string> = {
    create_lead: "Lead follow-up",
    create_opportunity: "Opportunity next step",
    request_documents: "Documents to prepare",
    schedule_follow_up: "Follow-up",
    customer_update: "Customer update",
    partner_update: "Partner update",
  };
  return map[kind] ?? kind.split("_").join(" ");
}

function customerFacingCopy(text: string): string {
  return text
    .replace(/\b(draft|proposal\s*only|crm\s*disabled|enterprise\s*ai\s*platform|enterprise\s*platform)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim();
}

/**
 * Next-step cards — customer language only.
 * Never runs CRM / workflow. Shown only after confirmation.
 */
export function ActionProposalCards({
  proposals,
  className,
}: {
  proposals: EaiActionProposal[];
  className?: string;
}) {
  if (proposals.length === 0) return null;

  return (
    <div className={cn("space-y-3 opacity-95", className)} aria-label="Suggested next steps">
      <div>
        <p className="font-display text-base text-foreground">Suggested next steps</p>
        <p className="mt-1 text-sm text-muted-foreground">
          These are recommendations for you to review — nothing happens until you choose to
          continue in the workspace.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {proposals.map((p) => (
          <Card
            key={p.proposalId}
            className="border-border/40 bg-muted/15 shadow-none"
          >
            <CardHeader className="space-y-1.5 p-4 pb-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {friendlyKind(p.kind)}
              </p>
              <CardTitle className="text-sm font-medium leading-snug">
                {customerFacingCopy(p.title)}
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                {customerFacingCopy(p.summary)}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0" />
          </Card>
        ))}
      </div>
    </div>
  );
}
