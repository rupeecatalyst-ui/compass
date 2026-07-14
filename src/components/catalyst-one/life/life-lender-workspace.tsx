"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Star } from "lucide-react";
import {
  getLifeFrameworkVersion,
  recommendLifeLenderExecutives,
  seedLifeContactsIfEmpty,
} from "@/lib/enterprise-life-engine";
import type {
  LifeBusinessRecommendation,
  LifeRecommendationOutcome,
} from "@/types/enterprise-life-engine";
import { BusinessCompletionCard } from "@/components/catalyst-one/shared/business-completion";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * LIFE · Link to Lender (CF-LIFE-001)
 * Business action surface — ranks lender executives from case context.
 * Engine parameters (product ref, city, business mapping) are never editable here.
 */
export function LifeLenderWorkspace() {
  const searchParams = useSearchParams();
  const loanFileId = searchParams.get("loanFileId") ?? searchParams.get("file") ?? undefined;

  const [outcome, setOutcome] = useState<LifeRecommendationOutcome | null>(null);
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const [registryCount, setRegistryCount] = useState(0);

  const refresh = () => {
    seedLifeContactsIfEmpty();
    setRegistryCount(seedLifeContactsIfEmpty());
    setOutcome(recommendLifeLenderExecutives({ loanFileId }));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run when loan context changes
  }, [loanFileId]);

  const blockers = outcome?.blockers ?? [];
  const recommendations = outcome?.recommendations ?? [];
  const ready = Boolean(outcome?.ready);

  const subtitle = useMemo(() => {
    if (!outcome) return "Preparing lender recommendations from case context…";
    if (!ready) return "Complete required loan details to generate recommendations.";
    const customer = outcome.context.customerName;
    const file = outcome.context.loanFileNumber;
    if (customer && file) return `Recommendations for ${customer} · ${file}`;
    if (customer) return `Recommendations for ${customer}`;
    return "Choose a recommended lender executive to assign.";
  }, [outcome, ready]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="LIFE · Link to Lender"
        description={subtitle}
      />
      <p className="sr-only">
        Framework {getLifeFrameworkVersion()} · registry {registryCount} contacts · engine inputs
        hidden from Relationship Managers.
      </p>

      {!ready && blockers.length > 0 && (
        <div className="space-y-3">
          {blockers.map((blocker) => (
            <BusinessCompletionCard
              key={blocker.code}
              guide={{
                code: blocker.code,
                title: blocker.title,
                message: blocker.message,
                actionLabel: blocker.actionLabel,
                actionHref: blocker.actionHref,
              }}
            />
          ))}
        </div>
      )}

      {ready && (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Recommended Lender Executives
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select one executive. Internal matching criteria are applied automatically.
            </p>
          </div>

          {recommendations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No eligible lender executives matched this case yet. Complete more loan details or try
              another file.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Rank</th>
                    <th className="px-4 py-2.5 font-medium">Lender</th>
                    <th className="px-4 py-2.5 font-medium">Branch</th>
                    <th className="px-4 py-2.5 font-medium">Relationship Manager</th>
                    <th className="px-4 py-2.5 font-medium">Reason</th>
                    <th className="px-4 py-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.map((row) => (
                    <RecommendationRow
                      key={row.contactId}
                      row={row}
                      assigned={assignedId === row.contactId}
                      onAssign={() => setAssignedId(row.contactId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {assignedId && (
            <div className="border-t border-border bg-teal-50/80 px-4 py-3 text-sm text-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Check className="h-4 w-4" />
                Lender executive assigned for this session.
              </span>
              <span className="mt-0.5 block text-xs text-teal-800/80 dark:text-teal-200/80">
                Assignment is recorded for certification flow. Loan Journey will persist this to the
                Loan File when certified.
              </span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function RecommendationRow({
  row,
  assigned,
  onAssign,
}: {
  row: LifeBusinessRecommendation;
  assigned: boolean;
  onAssign: () => void;
}) {
  return (
    <tr
      className={cn(
        "border-t border-border/80 transition-colors",
        assigned ? "bg-teal-50/70 dark:bg-teal-950/30" : "hover:bg-muted/30",
      )}
    >
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-foreground">
          {row.rank === 1 && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
          {row.rank}
        </span>
      </td>
      <td className="px-4 py-3 font-medium text-foreground">{row.lenderName}</td>
      <td className="px-4 py-3 text-muted-foreground">{row.branchName}</td>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-foreground">{row.executiveName}</p>
          {row.relationshipManagerName !== row.executiveName && (
            <p className="text-[11px] text-muted-foreground">RM: {row.relationshipManagerName}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{row.reason}</td>
      <td className="px-4 py-3">
        <Button
          type="button"
          size="sm"
          variant={assigned ? "default" : "outline"}
          className="h-8 rounded-lg"
          onClick={onAssign}
        >
          {assigned ? "Assigned" : "Assign"}
        </Button>
      </td>
    </tr>
  );
}
