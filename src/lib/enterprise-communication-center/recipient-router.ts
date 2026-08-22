/**
 * CO-ECC-RECIPIENT-001 — Phase 1 Operational Email RecipientRouter (pure).
 *
 * Customer-facing operational events only. Server-side SSOT resolution.
 * Does not send mail. Does not modify CHANNEL_PARTNERS. Does not enable ENCE.
 *
 * Prisma SSOT fields used:
 * - EnterpriseOpportunity: primaryContactId, primaryContactEmail,
 *   relationshipManagerUserId, primaryOwnerUserId, sourceWealthPartnerId
 * - EnterpriseDeal: primaryContactId, primaryContactEmail,
 *   relationshipManagerUserId, primaryOwnerUserId, opportunityId
 * - EcmContact: officialEmail, personalEmail, isDeleted
 * - User: email, isActive
 * - EnterpriseWealthPartner: email, contactId, isDeleted
 */

import { resolveProfileCodeForEvent } from "@/constants/enterprise-communication-center/events";
import type {
  EnterpriseCommunicationEventType,
  EnterpriseCommunicationProfileCode,
} from "@/types/enterprise-communication-center";

export const CUSTOMER_FACING_RECIPIENT_EVENTS = [
  "customer_invitation",
  "customer_notification",
  "loan_status_update",
  "document_request",
  "customer_communication",
] as const;

export type CustomerFacingRecipientEvent =
  (typeof CUSTOMER_FACING_RECIPIENT_EVENTS)[number];

export type RecipientRouterFailureCode =
  | "unsupported_event"
  | "missing_context"
  | "missing_customer_email"
  | "missing_or_inactive_transaction_manager"
  | "invalid_manager_assignment";

export type RecipientPartyRef = {
  role: "customer" | "transaction_manager" | "wealth_partner";
  entityKind: "contact" | "user" | "wealth_partner";
  entityId: string | null;
  email: string | null;
};

export type RecipientRouterSuccess = {
  ok: true;
  eventType: CustomerFacingRecipientEvent;
  senderProfileCode: "CUSTOMERS";
  to: string[];
  cc: string[];
  partyRefs: RecipientPartyRef[];
};

export type RecipientRouterFailure = {
  ok: false;
  code: RecipientRouterFailureCode;
  message: string;
  eventType?: EnterpriseCommunicationEventType;
  senderProfileCode: EnterpriseCommunicationProfileCode;
  to: [];
  cc: [];
  partyRefs: RecipientPartyRef[];
};

export type RecipientRouterResult = RecipientRouterSuccess | RecipientRouterFailure;

export type RecipientContactSnapshot = {
  id: string;
  officialEmail: string | null;
  personalEmail: string | null;
  isDeleted?: boolean;
};

export type RecipientUserSnapshot = {
  id: string;
  email: string | null;
  isActive: boolean;
};

export type RecipientWealthPartnerSnapshot = {
  id: string;
  email: string | null;
  contactId: string | null;
  isDeleted?: boolean;
  contact?: RecipientContactSnapshot | null;
};

export type RecipientOpportunitySnapshot = {
  id: string;
  primaryContactId: string | null;
  primaryContactEmail: string | null;
  relationshipManagerUserId: string | null;
  primaryOwnerUserId: string | null;
  sourceWealthPartnerId: string | null;
};

export type RecipientDealSnapshot = {
  id: string;
  opportunityId: string | null;
  primaryContactId: string | null;
  primaryContactEmail: string | null;
  relationshipManagerUserId: string | null;
  primaryOwnerUserId: string | null;
};

export type RecipientRouterResolveInput = {
  eventType: EnterpriseCommunicationEventType;
  opportunity?: RecipientOpportunitySnapshot | null;
  deal?: RecipientDealSnapshot | null;
  contactsById?: Record<string, RecipientContactSnapshot | undefined>;
  usersById?: Record<string, RecipientUserSnapshot | undefined>;
  wealthPartnersById?: Record<string, RecipientWealthPartnerSnapshot | undefined>;
};

const BASIC_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isCustomerFacingRecipientEvent(
  eventType: string,
): eventType is CustomerFacingRecipientEvent {
  return (CUSTOMER_FACING_RECIPIENT_EVENTS as readonly string[]).includes(eventType);
}

export function normalizeEmailForCompare(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmailAddress(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && BASIC_EMAIL_RE.test(trimmed);
}

export function canonicalizeEmail(value: string): string {
  return value.trim();
}

/** officialEmail → personalEmail → denorm primaryContactEmail. */
export function resolveCustomerToEmail(args: {
  contact: RecipientContactSnapshot | null | undefined;
  primaryContactEmailFallback: string | null | undefined;
}): string | null {
  const official = args.contact?.officialEmail?.trim() || "";
  if (isValidEmailAddress(official)) return canonicalizeEmail(official);

  const personal = args.contact?.personalEmail?.trim() || "";
  if (isValidEmailAddress(personal)) return canonicalizeEmail(personal);

  const denorm = args.primaryContactEmailFallback?.trim() || "";
  if (isValidEmailAddress(denorm)) return canonicalizeEmail(denorm);

  return null;
}

/**
 * Deal-scoped: Deal.RM → Deal.owner.
 * Else: Opportunity.RM → Opportunity.owner.
 */
export function resolveManagerUserId(args: {
  deal?: RecipientDealSnapshot | null;
  opportunity?: RecipientOpportunitySnapshot | null;
}): {
  userId: string | null;
  source: "deal_rm" | "opportunity_rm" | "deal_owner" | "opportunity_owner" | "none";
} {
  if (args.deal) {
    const dealRm = args.deal.relationshipManagerUserId?.trim() || "";
    if (dealRm) return { userId: dealRm, source: "deal_rm" };
    const dealOwner = args.deal.primaryOwnerUserId?.trim() || "";
    if (dealOwner) return { userId: dealOwner, source: "deal_owner" };
  }

  const oppRm = args.opportunity?.relationshipManagerUserId?.trim() || "";
  if (oppRm) return { userId: oppRm, source: "opportunity_rm" };

  const oppOwner = args.opportunity?.primaryOwnerUserId?.trim() || "";
  if (oppOwner) return { userId: oppOwner, source: "opportunity_owner" };

  return { userId: null, source: "none" };
}

export function resolveWealthPartnerEmail(
  partner: RecipientWealthPartnerSnapshot | null | undefined,
): string | null {
  if (!partner || partner.isDeleted) return null;

  const direct = partner.email?.trim() || "";
  if (isValidEmailAddress(direct)) return canonicalizeEmail(direct);

  const linked = partner.contact;
  if (linked && !linked.isDeleted) {
    const official = linked.officialEmail?.trim() || "";
    if (isValidEmailAddress(official)) return canonicalizeEmail(official);
    const personal = linked.personalEmail?.trim() || "";
    if (isValidEmailAddress(personal)) return canonicalizeEmail(personal);
  }

  return null;
}

/** Deduplicate: trim, lowercase compare, strip TO from CC, unique CC. */
export function dedupeRecipients(args: {
  to: string[];
  cc: string[];
}): { to: string[]; cc: string[] } {
  const toOut: string[] = [];
  const toKeys = new Set<string>();

  for (const raw of args.to) {
    if (!isValidEmailAddress(raw)) continue;
    const canon = canonicalizeEmail(raw);
    const key = normalizeEmailForCompare(canon);
    if (toKeys.has(key)) continue;
    toKeys.add(key);
    toOut.push(canon);
  }

  const ccOut: string[] = [];
  const ccKeys = new Set<string>();
  for (const raw of args.cc) {
    if (!isValidEmailAddress(raw)) continue;
    const canon = canonicalizeEmail(raw);
    const key = normalizeEmailForCompare(canon);
    if (toKeys.has(key)) continue;
    if (ccKeys.has(key)) continue;
    ccKeys.add(key);
    ccOut.push(canon);
  }

  return { to: toOut, cc: ccOut };
}

function fail(
  code: RecipientRouterFailureCode,
  message: string,
  extra?: Partial<
    Pick<RecipientRouterFailure, "eventType" | "senderProfileCode" | "partyRefs">
  >,
): RecipientRouterFailure {
  return {
    ok: false,
    code,
    message,
    senderProfileCode: extra?.senderProfileCode ?? "CUSTOMERS",
    eventType: extra?.eventType,
    to: [],
    cc: [],
    partyRefs: extra?.partyRefs ?? [],
  };
}

/**
 * Pure Phase-1 recipient resolution. Never trusts browser TO/CC.
 */
export function resolveCustomerFacingRecipients(
  input: RecipientRouterResolveInput,
): RecipientRouterResult {
  const { eventType } = input;

  if (!isCustomerFacingRecipientEvent(eventType)) {
    let profile: EnterpriseCommunicationProfileCode = "CUSTOMERS";
    try {
      profile = resolveProfileCodeForEvent(eventType);
    } catch {
      /* keep CUSTOMERS */
    }
    return fail("unsupported_event", `Event is not a Phase-1 customer-facing route: ${eventType}`, {
      eventType,
      senderProfileCode: profile,
    });
  }

  const senderProfileCode = resolveProfileCodeForEvent(eventType);
  if (senderProfileCode !== "CUSTOMERS") {
    return fail("unsupported_event", `Expected CUSTOMERS profile for ${eventType}`, {
      eventType,
      senderProfileCode,
    });
  }

  if (!input.opportunity && !input.deal) {
    return fail("missing_context", "Opportunity or Deal SSOT context is required", {
      eventType,
      senderProfileCode,
    });
  }

  const contactsById = input.contactsById ?? {};
  const usersById = input.usersById ?? {};
  const wealthPartnersById = input.wealthPartnersById ?? {};

  const primaryContactId =
    input.deal?.primaryContactId?.trim() ||
    input.opportunity?.primaryContactId?.trim() ||
    null;
  const primaryContactEmailFallback =
    input.deal?.primaryContactEmail ?? input.opportunity?.primaryContactEmail ?? null;

  const rawContact = primaryContactId ? contactsById[primaryContactId] : undefined;
  const customerContact = rawContact && !rawContact.isDeleted ? rawContact : null;

  const customerEmail = resolveCustomerToEmail({
    contact: customerContact,
    primaryContactEmailFallback,
  });

  const partyRefs: RecipientPartyRef[] = [
    {
      role: "customer",
      entityKind: "contact",
      entityId: primaryContactId,
      email: customerEmail,
    },
  ];

  if (!customerEmail) {
    return fail("missing_customer_email", "Customer TO email could not be resolved from SSOT", {
      eventType,
      senderProfileCode,
      partyRefs,
    });
  }

  const managerPick = resolveManagerUserId({
    deal: input.deal,
    opportunity: input.opportunity,
  });

  if (!managerPick.userId) {
    return fail(
      "missing_or_inactive_transaction_manager",
      "No relationshipManagerUserId or primaryOwnerUserId on Deal/Opportunity",
      { eventType, senderProfileCode, partyRefs },
    );
  }

  const managerUser = usersById[managerPick.userId];
  if (!managerUser) {
    return fail(
      "invalid_manager_assignment",
      `Transaction manager user not found: ${managerPick.userId}`,
      {
        eventType,
        senderProfileCode,
        partyRefs: [
          ...partyRefs,
          {
            role: "transaction_manager",
            entityKind: "user",
            entityId: managerPick.userId,
            email: null,
          },
        ],
      },
    );
  }

  if (!managerUser.isActive || !isValidEmailAddress(managerUser.email)) {
    return fail(
      "missing_or_inactive_transaction_manager",
      "Transaction manager is inactive or has no valid email",
      {
        eventType,
        senderProfileCode,
        partyRefs: [
          ...partyRefs,
          {
            role: "transaction_manager",
            entityKind: "user",
            entityId: managerUser.id,
            email: managerUser.email,
          },
        ],
      },
    );
  }

  const managerEmail = canonicalizeEmail(managerUser.email!);
  partyRefs.push({
    role: "transaction_manager",
    entityKind: "user",
    entityId: managerUser.id,
    email: managerEmail,
  });

  // Wealth Partner is Opportunity-owned. Deal events inherit via linked Opportunity snapshot.
  const wpId = input.opportunity?.sourceWealthPartnerId?.trim() || null;
  let wealthPartnerEmail: string | null = null;
  if (wpId) {
    wealthPartnerEmail = resolveWealthPartnerEmail(wealthPartnersById[wpId]);
    partyRefs.push({
      role: "wealth_partner",
      entityKind: "wealth_partner",
      entityId: wpId,
      email: wealthPartnerEmail,
    });
  }

  const { to, cc } = dedupeRecipients({
    to: [customerEmail],
    cc: wealthPartnerEmail ? [managerEmail, wealthPartnerEmail] : [managerEmail],
  });

  if (to.length === 0) {
    return fail("missing_customer_email", "Customer TO email invalid after normalization", {
      eventType,
      senderProfileCode,
      partyRefs,
    });
  }

  return {
    ok: true,
    eventType,
    senderProfileCode: "CUSTOMERS",
    to,
    cc,
    partyRefs,
  };
}
