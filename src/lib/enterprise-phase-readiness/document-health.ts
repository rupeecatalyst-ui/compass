/**
 * Document health + collection metrics for Phase Readiness Dashboard.
 */

import { evaluateDocumentCompletionForLoanFile } from "@/lib/document-completion/evaluate-for-loan";
import { seedEdieCertifiedRulesIfNeeded } from "@/lib/edie-certified";
import {
  resolveApplicableWeights,
} from "@/lib/document-completion/score";
import {
  resolveEdieDocumentRulesForContext,
} from "@/lib/enterprise-document-intelligence-engine";
import type { DocumentCheckStatus, LoanFile, LoanFileDocument } from "@/types/catalyst-one";
import type {
  DocumentCollectionDetail,
  DocumentHealthCounts,
  DocumentVerificationDetail,
} from "@/types/enterprise-phase-readiness";

function seedDocumentRulesIfEmpty() {
  seedEdieCertifiedRulesIfNeeded();
}

function healthBucket(status: DocumentCheckStatus): keyof Omit<
  DocumentHealthCounts,
  "mandatoryTotal" | "optionalTotal"
> {
  switch (status) {
    case "verified":
      return "verified";
    case "rejected":
      return "rejected";
    case "received":
      return "underVerification";
    case "requested":
    case "pending":
    default:
      return "pending";
  }
}

export function deriveDocumentHealth(file: LoanFile | null | undefined): DocumentHealthCounts {
  seedDocumentRulesIfEmpty();
  const docs = file?.documents ?? [];
  const counts: DocumentHealthCounts = {
    mandatoryTotal: 0,
    optionalTotal: 0,
    received: 0,
    pending: 0,
    rejected: 0,
    expired: 0,
    underVerification: 0,
    verified: 0,
  };

  if (!file) return counts;

  const employmentKey = (() => {
    const e = (file.employmentType || "salaried").toLowerCase();
    if (e.includes("self")) return "self_employed";
    return "salaried";
  })();
  const productRef = file.loanProduct?.toLowerCase().includes("lap")
    ? "product:lap"
    : "product:home-loan";
  const rules = resolveEdieDocumentRulesForContext({
    productRef,
    employmentType: employmentKey,
    constitution: "individual",
    customerCategory: "standard",
    loanStage: "origination",
  });
  const typeRefs = [...new Set(rules.flatMap((r) => r.documentTypeRefs))];
  const weights = resolveApplicableWeights({
    documentTypeRefs: typeRefs,
    employmentType: employmentKey,
  });
  counts.mandatoryTotal = weights.filter((w) => w.mandatory).length;
  counts.optionalTotal = weights.filter((w) => !w.mandatory).length;

  for (const d of docs) {
    const bucket = healthBucket(d.status);
    counts[bucket] += 1;
    if (d.status === "received" || d.status === "verified") {
      counts.received += 1;
    }
  }

  return counts;
}

export function deriveDocumentCollection(
  file: LoanFile | null | undefined,
): DocumentCollectionDetail {
  const score = evaluateDocumentCompletionForLoanFile(file);
  const health = deriveDocumentHealth(file);

  const employmentKey = (() => {
    const e = (file?.employmentType || "salaried").toLowerCase();
    if (e.includes("self")) return "self_employed";
    return "salaried";
  })();
  const productRef = file?.loanProduct?.toLowerCase().includes("lap")
    ? "product:lap"
    : "product:home-loan";
  seedDocumentRulesIfEmpty();
  const rules = file
    ? resolveEdieDocumentRulesForContext({
        productRef,
        employmentType: employmentKey,
        constitution: "individual",
        customerCategory: "standard",
        loanStage: "origination",
      })
    : [];
  const typeRefs = [...new Set(rules.flatMap((r) => r.documentTypeRefs))];
  const weights = resolveApplicableWeights({
    documentTypeRefs: typeRefs,
    employmentType: employmentKey,
  });
  const mandatory = weights.filter((w) => w.mandatory);
  const optional = weights.filter((w) => !w.mandatory);

  // Approximate mandatory received from completion score mandatoryPct
  const mandatoryReceived = Math.round(
    (score.mandatoryPct / 100) * Math.max(mandatory.length, 1),
  );
  const optionalReceived = Math.round(
    (score.conditionalPct / 100) * Math.max(optional.length, 1),
  );

  return {
    pct: score.overallPct,
    receivedCount: score.uploadedCount,
    totalCount: Math.max(score.totalCount, health.mandatoryTotal + health.optionalTotal),
    mandatoryReceived: Math.min(mandatoryReceived, mandatory.length),
    mandatoryTotal: mandatory.length,
    optionalReceived: Math.min(optionalReceived, optional.length),
    optionalTotal: optional.length,
    criticalMissing: score.criticalMissing,
  };
}

export function deriveDocumentVerification(
  file: LoanFile | null | undefined,
): DocumentVerificationDetail {
  const docs: LoanFileDocument[] = file?.documents ?? [];
  const collected = docs.filter(
    (d) => d.status === "received" || d.status === "verified",
  );
  const verified = docs.filter((d) => d.status === "verified");
  const verifiedCount = verified.length;
  if (docs.length === 0) {
    const collection = deriveDocumentCollection(file);
    return {
      verifiedCount: 0,
      eligibleCount: Math.max(collection.receivedCount, 1),
      pct: 0,
    };
  }
  return {
    verifiedCount,
    eligibleCount: collected.length,
    pct:
      collected.length === 0
        ? 0
        : Math.round((verifiedCount / Math.max(collected.length, 1)) * 100),
  };
}
