/**
 * CO-C1-COMMUNICATION-002 — Pure inbound transaction matching (no I/O).
 */

import {
  C1_MESSAGE_ID_RE,
  DEAL_REFERENCE_RE,
  OPP_REFERENCE_RE,
  normalizeMessageId,
  resolveInternalEmailDomains,
} from "@/constants/enterprise-inbound-email";
import type {
  InboundEmailSenderRole,
  InboundTransactionMatch,
} from "@/types/enterprise-inbound-email";

export type InboundMatchCandidate = {
  opportunityId: string;
  opportunityNumber: string | null;
  dealId?: string | null;
  dealNumber?: string | null;
  primaryContactId?: string | null;
  lenderId?: string | null;
  sourceWealthPartnerId?: string | null;
};

export type InboundMatchContext = {
  fromEmail: string;
  subject: string;
  textBody: string | null;
  inReplyTo: string | null;
  referencesHeader: string | null;
  /** When set, overrides env INBOUND_EMAIL_INTERNAL_DOMAINS for this match. */
  internalDomains?: string[];
  outboundThread?: {
    sourceEventId: string;
    opportunityId: string | null;
    dealId: string | null;
    contactId: string | null;
    messageId: string | null;
  } | null;
  referenceMatches?: {
    opportunitiesByNumber: Record<string, InboundMatchCandidate>;
    dealsByNumber: Record<string, InboundMatchCandidate>;
  };
  senderContacts?: {
    contactIds: string[];
    lenderContactIds: string[];
    wealthPartnerIds: string[];
    isInternalUser: boolean;
  };
  openTransactionsByContact?: InboundMatchCandidate[];
};

function extractReferences(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.match(C1_MESSAGE_ID_RE) ?? []) {
    const n = normalizeMessageId(m);
    if (n) out.add(n);
  }
  return [...out];
}

function uniqueRefs(input: InboundMatchContext): string[] {
  const parts = [
    input.inReplyTo,
    input.referencesHeader,
    input.subject,
    input.textBody ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return extractReferences(parts);
}

function resolveSenderRole(args: {
  fromEmail: string;
  contactIds: string[];
  lenderContactIds: string[];
  wealthPartnerIds: string[];
  isInternalUser: boolean;
  internalDomains?: string[];
}): InboundEmailSenderRole {
  const domain = args.fromEmail.split("@")[1]?.toLowerCase() ?? "";
  const internal =
    args.internalDomains?.length
      ? args.internalDomains
      : resolveInternalEmailDomains();
  if (internal.includes(domain) || args.isInternalUser) {
    return "internal";
  }
  if (args.lenderContactIds.length) return "lender";
  if (args.wealthPartnerIds.length) return "wealth_partner";
  if (args.contactIds.length) return "customer";
  return "unknown";
}

export function matchInboundEmailTransaction(
  input: InboundMatchContext,
): InboundTransactionMatch {
  const senderRole = resolveSenderRole({
    fromEmail: input.fromEmail,
    contactIds: input.senderContacts?.contactIds ?? [],
    lenderContactIds: input.senderContacts?.lenderContactIds ?? [],
    wealthPartnerIds: input.senderContacts?.wealthPartnerIds ?? [],
    isInternalUser: input.senderContacts?.isInternalUser ?? false,
    internalDomains: input.internalDomains,
  });

  if (senderRole === "internal") {
    return {
      status: "processed",
      reason: "internal_sender",
      opportunityId: null,
      dealId: null,
      contactId: null,
      outboundSourceEventId: null,
      senderRole,
    };
  }

  const thread = input.outboundThread;
  if (thread?.opportunityId) {
    return {
      status: "matched",
      reason: "outbound_thread_headers",
      opportunityId: thread.opportunityId,
      dealId: thread.dealId,
      contactId: thread.contactId,
      outboundSourceEventId: thread.sourceEventId,
      senderRole,
    };
  }

  const haystack = `${input.subject}\n${input.textBody ?? ""}`;
  const dealRefs = [...new Set(haystack.match(DEAL_REFERENCE_RE) ?? [])].map((r) =>
    r.toUpperCase(),
  );
  const oppRefs = [...new Set(haystack.match(OPP_REFERENCE_RE) ?? [])].map((r) =>
    r.toUpperCase(),
  );

  const dealsByNumber = input.referenceMatches?.dealsByNumber ?? {};
  const oppsByNumber = input.referenceMatches?.opportunitiesByNumber ?? {};

  if (dealRefs.length === 1) {
    const deal = dealsByNumber[dealRefs[0]!];
    if (deal) {
      return {
        status: "matched",
        reason: "deal_reference",
        opportunityId: deal.opportunityId,
        dealId: deal.dealId ?? null,
        contactId: deal.primaryContactId ?? null,
        outboundSourceEventId: null,
        senderRole,
      };
    }
  }

  if (oppRefs.length === 1 && dealRefs.length === 0) {
    const opp = oppsByNumber[oppRefs[0]!];
    if (opp) {
      return {
        status: "matched",
        reason: "opportunity_reference",
        opportunityId: opp.opportunityId,
        dealId: opp.dealId ?? null,
        contactId: opp.primaryContactId ?? null,
        outboundSourceEventId: null,
        senderRole,
      };
    }
  }

  if (dealRefs.length > 1 || oppRefs.length > 1 || (dealRefs.length && oppRefs.length)) {
    return {
      status: "needs_review",
      reason: "ambiguous_reference_numbers",
      opportunityId: null,
      dealId: null,
      contactId: null,
      outboundSourceEventId: null,
      senderRole,
    };
  }

  const open = input.openTransactionsByContact ?? [];
  if (open.length === 1) {
    const tx = open[0]!;
    return {
      status: "matched",
      reason: "single_open_transaction_for_sender",
      opportunityId: tx.opportunityId,
      dealId: tx.dealId ?? null,
      contactId: tx.primaryContactId ?? null,
      outboundSourceEventId: null,
      senderRole,
    };
  }
  if (open.length > 1) {
    return {
      status: "needs_review",
      reason: "multiple_open_transactions_for_sender",
      opportunityId: null,
      dealId: null,
      contactId: input.senderContacts?.contactIds[0] ?? null,
      outboundSourceEventId: null,
      senderRole,
    };
  }

  if (uniqueRefs(input).length > 0) {
    return {
      status: "needs_review",
      reason: "thread_headers_unresolved",
      opportunityId: null,
      dealId: null,
      contactId: input.senderContacts?.contactIds[0] ?? null,
      outboundSourceEventId: null,
      senderRole,
    };
  }

  return {
    status: "unmatched",
    reason: "no_confident_transaction_match",
    opportunityId: null,
    dealId: null,
    contactId: input.senderContacts?.contactIds[0] ?? null,
    outboundSourceEventId: null,
    senderRole,
  };
}
