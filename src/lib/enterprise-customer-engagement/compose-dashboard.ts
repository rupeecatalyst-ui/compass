/**
 * CO-BIZ-004 — Customer dashboard projection from session + Deal DAL + tasks.
 */

import { CUSTOMER_PORTAL_DEFAULT_STAGE } from "@/constants/document-requests";
import { loadDealsSync } from "@/lib/enterprise-deal";
import type { DocumentRequestUploadSession } from "@/types/document-requests";
import type {
  EceActiveDealCard,
  EceCustomerTask,
  EceDashboardProjection,
  EceDocumentCentre,
  EceTimelineEvent,
} from "@/types/enterprise-customer-engagement";
import type { LoanFile } from "@/types/catalyst-one";

function formatAmount(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  }
}

function dealsForOpportunity(opportunityId: string): LoanFile[] {
  try {
    return loadDealsSync("customer_360").files.filter((f) => {
      if (f.archived) return false;
      const file = f as LoanFile & {
        opportunityId?: string;
        enterpriseOpportunityId?: string;
      };
      if (
        file.enterpriseOpportunityId === opportunityId ||
        file.opportunityId === opportunityId ||
        file.opportunityNumber === opportunityId
      ) {
        return true;
      }
      return (f.lenders ?? []).some((l) => l.opportunityId === opportunityId);
    });
  } catch {
    return [];
  }
}

function expectedMilestone(
  stage: string,
  tasks: EceCustomerTask[],
  docs: EceDocumentCentre | null,
): string {
  if (tasks.some((t) => t.status === "open")) {
    return "Complete pending customer actions";
  }
  if (docs?.progress.band === "pending_documents") {
    return "Submit required documents";
  }
  if (docs?.progress.band === "awaiting_verification") {
    return "Document verification by your Relationship Manager";
  }
  if (docs?.progress.band === "ready") {
    return "Lender submission / credit assessment";
  }
  const s = stage.toLowerCase();
  if (s.includes("document")) return "Document collection completion";
  if (s.includes("credit")) return "Credit decision";
  if (s.includes("login")) return "Lender login confirmation";
  if (s.includes("approv")) return "Sanction letter / acceptance";
  if (s.includes("disburs")) return "Fund disbursement";
  return "Next stage progress with your Relationship Manager";
}

export function composeCustomerDashboard(input: {
  session: DocumentRequestUploadSession;
  tasks: EceCustomerTask[];
  documents: EceDocumentCentre | null;
  recentActivity: EceTimelineEvent[];
}): EceDashboardProjection {
  const { session } = input;
  const deals = dealsForOpportunity(session.opportunityId);
  const dealCards: EceActiveDealCard[] = deals.map((d) => ({
    dealId: d.enterpriseDealId || d.id,
    fileNumber: d.fileNumber,
    productLabel: d.loanProduct || session.loanProduct,
    amountLabel: formatAmount(d.loanAmount || d.requiredAmount),
    stageLabel: String(d.stage || session.currentStage || "In progress"),
    relationshipManager: d.relationshipManager || session.rmName || "Your Relationship Manager",
    statusLabel: String(d.status || "Active"),
  }));

  const currentStage =
    session.currentStage?.trim() ||
    dealCards[0]?.stageLabel ||
    CUSTOMER_PORTAL_DEFAULT_STAGE;

  const rm =
    session.rmName?.trim() ||
    dealCards[0]?.relationshipManager ||
    "Your Relationship Manager";

  const next =
    input.tasks.find((t) => t.status === "open")?.title ??
    (input.documents?.items.find((i) => i.canUpload)?.label
      ? `Upload ${input.documents.items.find((i) => i.canUpload)!.label}`
      : null);

  return {
    asOf: new Date().toISOString(),
    opportunity: {
      opportunityId: session.opportunityId,
      reference: session.opportunityReference,
      productLabel: session.loanProduct,
      customerName: session.customerName,
      currentStage,
      applicationStatus:
        session.applicationStatus ||
        input.documents?.progress.applicationStatusLabel ||
        "In progress",
      relationshipManager: rm,
    },
    deals: dealCards,
    currentStage,
    relationshipManager: rm,
    nextRequiredAction: next,
    expectedNextMilestone: expectedMilestone(currentStage, input.tasks, input.documents),
    recentActivity: input.recentActivity.slice(0, 6),
    documentProgress:
      input.documents?.progress ??
      ({
        state: "awaiting_critical_documents",
        label: "Awaiting documents",
        total: 0,
        uploaded: 0,
        verified: 0,
        pending: 0,
        criticalPending: 0,
        journeyPending: 0,
        band: "pending_documents",
        bandLabel: "Pending Documents",
        applicationStatusLabel: "Awaiting Document List",
      } as EceDashboardProjection["documentProgress"]),
  };
}
