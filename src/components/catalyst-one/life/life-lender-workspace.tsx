"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Star } from "lucide-react";
import {
  getLifeFrameworkVersion,
  getLifeRegistrySnapshot,
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
import { buildElwWorkspaceHref, normalizeLenderId } from "@/constants/enterprise-lender-workspace";
import { ROUTES } from "@/constants/routes";
import { updateLoanFileInStorage } from "@/lib/loan-files-utils";
import { cn } from "@/lib/utils";
import type { LoanLenderExecution } from "@/types/catalyst-one";

function resolveLenderIdFromRecommendation(row: LifeBusinessRecommendation): string {
  const contact = getLifeRegistrySnapshot().contacts.find((c) => c.id === row.contactId);
  if (contact?.lenderRef) return normalizeLenderId(contact.lenderRef);
  const name = row.lenderName.toLowerCase();
  if (name.includes("hdfc")) return "hdfc";
  if (name.includes("icici")) return "icici";
  if (name.includes("axis")) return "axis";
  if (name.includes("sbi") || name.includes("state bank")) return "sbi";
  if (name.includes("kotak")) return "kotak";
  return normalizeLenderId(row.lenderName);
}

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
  const [assignNotice, setAssignNotice] = useState<string | null>(null);
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

  const handleAssign = (row: LifeBusinessRecommendation) => {
    setAssignedId(row.contactId);
    setAssignNotice(null);

    if (!loanFileId) {
      setAssignNotice(
        "Executive selected. Open a Loan File and return via Link to Lender to persist the assignment.",
      );
      return;
    }

    try {
      const now = new Date().toISOString();
      const lenderCase: LoanLenderExecution = {
        id: `life-${row.contactId}-${Date.now()}`,
        lender: row.lenderName,
        branch: row.branchName,
        relationshipManager: row.executiveName,
        status: "active",
        caseStage: "identified",
        isPrimary: true,
        fromStrategic: true,
        createdAt: now,
        updatedAt: now,
      };
      const updated = updateLoanFileInStorage(loanFileId, {
        lenders: [lenderCase],
        lender: row.lenderName,
      });
      if (updated) {
        setAssignNotice(
          `${row.executiveName} · ${row.lenderName} linked to loan ${updated.fileNumber}.`,
        );
      } else {
        setAssignNotice("Could not find the Loan File to persist this assignment.");
      }
    } catch (error) {
      // BCC / validation will surface if loan cannot save — keep context
      setAssignNotice(
        error instanceof Error
          ? error.message
          : "I need a few more loan details before I can save this lender link. Let's finish those and retry.",
      );
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="LIFE · Case Recommendations" description={subtitle} />
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
              Select one executive. Matching uses case context automatically.
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
                      loanFileId={loanFileId}
                      onAssign={() => handleAssign(row)}
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
                {assignNotice ?? "Lender executive assigned."}
              </span>
              {loanFileId && (
                <div className="mt-2">
                  <Button asChild size="sm" variant="outline" className="h-7 rounded-md text-xs">
                    <Link href={`${ROUTES.LOAN_FILES}?file=${encodeURIComponent(loanFileId)}`}>
                      Open Loan File
                    </Link>
                  </Button>
                </div>
              )}
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
  loanFileId,
  onAssign,
}: {
  row: LifeBusinessRecommendation;
  assigned: boolean;
  loanFileId?: string;
  onAssign: () => void;
}) {
  const lenderId = resolveLenderIdFromRecommendation(row);
  const elwHref = buildElwWorkspaceHref(lenderId, {
    from: "life",
    loanFileId,
    returnTo: loanFileId
      ? `${ROUTES.LENDERS}?loanFileId=${encodeURIComponent(loanFileId)}`
      : ROUTES.LENDERS,
    selectionMode: true,
  });

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
      <td className="px-4 py-3 font-medium text-foreground">
        <div className="space-y-1">
          <p>{row.lenderName}</p>
          <Link
            href={elwHref}
            className="text-[11px] font-medium text-teal-700 hover:underline dark:text-teal-300"
          >
            Open Lender Workspace
          </Link>
        </div>
      </td>
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
