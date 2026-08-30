/**
 * LOD readiness — mandatory Opportunity fields + EDIE certified checklist gate.
 * Never allow Generate LOD when product / borrower type would silently fall back.
 */

import {
  tryResolveEdieConstitutionKind,
  tryResolveEdieCustomerCategory,
  tryResolveEdieProductRef,
} from "@/lib/edie-certified/resolve-context";
import type { EnterpriseBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import {
  buildLodContactGapMessage,
  resolveLodContactReadiness,
  type LodResolvedContact,
} from "@/lib/document-requests/resolve-lod-contact";
import type { LoanParticipant } from "@/types/loan-participant";
import type { LoanFile } from "@/types/catalyst-one";
import type {
  DocumentRequestLodReadiness,
  DocumentRequestLodReadinessGap,
} from "@/types/document-requests";

export type DocumentRequestContextInput = {
  customerName?: string | null;
  /** Legacy direct mobile — used when structured borrower/participants are absent. */
  mobile?: string | null;
  /** Legacy direct email — used when structured borrower/participants are absent. */
  email?: string | null;
  productLabel?: string | null;
  /** salaried | self_employed | company — from employment */
  borrowerCategory?: string | null;
  employmentType?: string | null;
  constitution?: string | null;
  /** Optional entity hint (e.g. company participant) */
  entityHint?: string | null;
  borrower?: EnterpriseBorrowerIdentity | null;
  participants?: LoanParticipant[];
  contactRegistry?: {
    mobile?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
  leadCaseFile?: {
    customerMobile?: string | null;
    customerEmail?: string | null;
    customerName?: string | null;
  } | null;
  /**
   * COMPASS public journeys collect mobile identity, not email.
   * Document Center remains full-channel. Skipping does not invent LOD types.
   */
  skipContactChannelGaps?: boolean;
};

function requiresConstitution(category: "salaried" | "self_employed" | "company"): boolean {
  return category === "self_employed" || category === "company";
}

function buildChanakyaMessage(
  gaps: DocumentRequestLodReadinessGap[],
  isCompanyBorrower: boolean,
): string {
  const edieGaps = gaps.filter((g) => g.field.startsWith("edie."));
  const fieldGaps = gaps.filter((g) => !g.field.startsWith("edie."));

  const parts: string[] = [];
  if (fieldGaps.length) {
    parts.push(
      "I cannot generate an accurate List of Documents because some mandatory Opportunity information is missing.",
      "",
    );
    const contactOnly =
      fieldGaps.length > 0 &&
      fieldGaps.every((gap) => gap.field === "mobile" || gap.field === "email");
    if (contactOnly) {
      parts.push(buildLodContactGapMessage(isCompanyBorrower));
    } else {
      const contactGaps = fieldGaps.filter(
        (gap) => gap.field === "mobile" || gap.field === "email",
      );
      const otherGaps = fieldGaps.filter(
        (gap) => gap.field !== "mobile" && gap.field !== "email",
      );
      if (otherGaps.length) {
        parts.push(`Please complete: ${otherGaps.map((g) => g.label).join(", ")}.`);
      }
      if (contactGaps.length) {
        if (otherGaps.length) parts.push("");
        parts.push(buildLodContactGapMessage(isCompanyBorrower));
      }
    }
  }
  if (edieGaps.length) {
    if (parts.length) parts.push("");
    parts.push(
      "EDIE does not have a certified document checklist for the selected combination.",
      "LOD will not be generated using a different product or borrower type.",
      "",
      ...edieGaps.map((g) => g.detail || g.label),
    );
  }
  return parts.join("\n");
}

function resolveContactReadiness(input: DocumentRequestContextInput): {
  ready: boolean;
  contact: LodResolvedContact | null;
  missingChannels: ("mobile" | "email")[];
  isCompanyBorrower: boolean;
} {
  if (input.borrower || (input.participants?.length ?? 0) > 0) {
    return resolveLodContactReadiness({
      borrower: input.borrower,
      participants: input.participants,
      contactRegistry:
        input.contactRegistry ??
        (input.mobile || input.email || input.customerName
          ? {
              mobile: input.mobile,
              email: input.email,
              name: input.customerName,
            }
          : null),
      leadCaseFile: input.leadCaseFile,
    });
  }

  const mobile = input.mobile?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const ready = Boolean(mobile && email);
  return {
    ready,
    contact: ready
      ? {
          name: input.customerName?.trim() || "Authorised contact",
          mobile,
          email,
          source: "contact_registry",
        }
      : null,
    missingChannels: [
      ...(mobile ? [] : (["mobile"] as const)),
      ...(email ? [] : (["email"] as const)),
    ],
    isCompanyBorrower:
      input.entityHint === "company" || input.borrowerCategory === "company",
  };
}

export function buildDocumentRequestLodContext(input: {
  runtimeFile?: LoanFile | null;
  productLabel: string;
  employmentType?: string | null;
  borrowerCategory?: string | null;
  constitution?: string | null;
  customerName?: string | null;
  borrower?: EnterpriseBorrowerIdentity | null;
}): DocumentRequestContextInput {
  const runtimeFile = input.runtimeFile;
  const companyParticipant = runtimeFile?.participants?.find(
    (participant) =>
      participant.entityType === "company" || participant.role === "company",
  );
  const entityHint = companyParticipant ? "company" : undefined;
  const borrower =
    input.borrower ??
    ({
      kind: companyParticipant || input.borrowerCategory === "company" ? "company" : "individual",
      displayName: input.customerName?.trim() || runtimeFile?.customerName?.trim() || "",
      primaryContactMobile: runtimeFile?.customerMobile,
      primaryContactEmail: runtimeFile?.customerEmail,
      partyId: "",
      partyEntityId: runtimeFile?.customerId || "",
    } satisfies EnterpriseBorrowerIdentity);

  return {
    customerName:
      input.customerName?.trim() ||
      borrower.displayName ||
      runtimeFile?.customerName?.trim() ||
      "",
    productLabel: input.productLabel,
    employmentType: input.employmentType ?? runtimeFile?.employmentType,
    borrowerCategory: input.borrowerCategory,
    constitution:
      input.constitution?.trim() ||
      runtimeFile?.businessDetails?.constitution ||
      companyParticipant?.constitution,
    entityHint,
    borrower,
    participants: runtimeFile?.participants,
    leadCaseFile: runtimeFile
      ? {
          customerMobile: runtimeFile.customerMobile,
          customerEmail: runtimeFile.customerEmail,
          customerName: runtimeFile.customerName,
        }
      : null,
  };
}

/**
 * Validate Opportunity context for LOD — field completeness + EDIE certification.
 */
export function evaluateDocumentRequestLodReadiness(
  input: DocumentRequestContextInput,
): DocumentRequestLodReadiness {
  const gaps: DocumentRequestLodReadinessGap[] = [];
  const contactReadiness = resolveContactReadiness(input);

  if (!input.skipContactChannelGaps && !input.customerName?.trim()) {
    gaps.push({ field: "customerName", label: "Customer Name" });
  }
  if (!input.skipContactChannelGaps && !contactReadiness.ready) {
    if (contactReadiness.missingChannels.includes("mobile")) {
      gaps.push({ field: "mobile", label: "Mobile Number" });
    }
    if (contactReadiness.missingChannels.includes("email")) {
      gaps.push({ field: "email", label: "Email Address" });
    }
    if (
      !contactReadiness.missingChannels.length &&
      !contactReadiness.ready
    ) {
      gaps.push({ field: "mobile", label: "Mobile Number" });
      gaps.push({ field: "email", label: "Email Address" });
    }
  }

  const product = tryResolveEdieProductRef(input.productLabel);
  if (!product.ok) {
    gaps.push({
      field: product.code === "missing" ? "product" : "edie.product",
      label: product.code === "missing" ? "Product" : "Certified Product (EDIE)",
      detail: product.message,
    });
  }

  const category = tryResolveEdieCustomerCategory(
    input.employmentType,
    input.entityHint,
    input.borrowerCategory,
  );
  if (!category.ok) {
    gaps.push({
      field: category.code === "missing" ? "borrowerType" : "edie.borrowerType",
      label:
        category.code === "missing" ? "Borrower Type" : "Certified Borrower Type (EDIE)",
      detail: category.message,
    });
  } else if (requiresConstitution(category.customerCategory)) {
    const constitution = tryResolveEdieConstitutionKind(input.constitution);
    if (!constitution.ok) {
      gaps.push({
        field: constitution.code === "missing" ? "constitution" : "edie.constitution",
        label:
          constitution.code === "missing"
            ? "Business Constitution"
            : "Certified Business Constitution (EDIE)",
        detail: constitution.message,
    });
    }
  }

  const canGenerate = gaps.length === 0;
  return {
    canGenerate,
    gaps,
    chanakyaMessage: canGenerate
      ? null
      : buildChanakyaMessage(gaps, contactReadiness.isCompanyBorrower),
    resolvedContact: contactReadiness.contact
      ? {
          name: contactReadiness.contact.name,
          mobile: contactReadiness.contact.mobile,
          email: contactReadiness.contact.email,
          source: contactReadiness.contact.source,
          participantId: contactReadiness.contact.participantId,
          participantRole: contactReadiness.contact.participantRole,
        }
      : null,
  };
}
