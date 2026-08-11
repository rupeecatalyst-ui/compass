/**
 * CO-WP-102 — Resolve Enterprise Identity → Wealth Partner UUID (Zero-Trust).
 */
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import type { PartnerSessionDto } from "@/types/enterprise-partner-gateway";

export class PartnerGatewayError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "PartnerGatewayError";
  }
}

type PartnerRow = {
  id: string;
  organizationId: string;
  contactId: string | null;
  code: string;
  displayName: string;
  partnerType: string;
  lifecycleStatus: string;
  operationalStatus: string;
  email: string | null;
  mobile: string | null;
  cityLabel: string | null;
  profileJson: unknown;
  isDeleted: boolean;
};

function displayNameFromUser(user: { firstName: string; lastName: string; email: string }) {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || user.email;
}

import { memoPartnerBinding } from "./partner-request-memo";

export type PartnerBindingUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
};

export type PartnerBindingResult = {
  user: PartnerBindingUser;
  partner: PartnerRow;
  contactId: string | null;
};

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
} as const;

/**
 * Zero-Trust resolve: Authenticated user → Contact link → Wealth Partner UUID.
 * CO-WP-PERF-002 — request-scoped memo (same HTTP request only).
 * CO-WP-PERF-005 — optional preloaded user skips duplicate user read; partner
 * contact + activation lookups run concurrently when both may apply.
 */
export async function resolvePartnerBindingForUser(
  userId: string,
  opts?: { preloadedUser?: PartnerBindingUser },
): Promise<PartnerBindingResult> {
  return memoPartnerBinding(userId, () =>
    resolvePartnerBindingForUserUncached(userId, opts),
  );
}

async function findPartnerByActivation(userId: string): Promise<PartnerRow | null> {
  return prisma.enterpriseWealthPartner.findFirst({
    where: {
      isDeleted: false,
      profileJson: {
        path: ["activation", "activatedUserId"],
        equals: userId,
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function resolvePartnerBindingForUserUncached(
  userId: string,
  opts?: { preloadedUser?: PartnerBindingUser },
): Promise<PartnerBindingResult> {
  if (!isDatabaseAvailable()) {
    throw new PartnerGatewayError(
      "Enterprise services are currently unavailable.",
      "ENTERPRISE_UNAVAILABLE",
      503,
    );
  }

  const preloaded = opts?.preloadedUser;
  let user: PartnerBindingUser | null =
    preloaded && preloaded.id === userId ? preloaded : null;
  let contacts: Array<{ id: string; organizationId: string }>;

  if (user) {
    contacts = await prisma.ecmContact.findMany({
      where: { linkedUserId: userId, isDeleted: false },
      select: { id: true, organizationId: true },
    });
  } else {
    const [loadedUser, loadedContacts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: userSelect,
      }),
      prisma.ecmContact.findMany({
        where: { linkedUserId: userId, isDeleted: false },
        select: { id: true, organizationId: true },
      }),
    ]);
    user = loadedUser;
    contacts = loadedContacts;
  }

  if (!user || !user.isActive) {
    throw new PartnerGatewayError("Access denied", "FORBIDDEN", 403);
  }

  let partner: PartnerRow | null = null;
  let contactId: string | null = null;

  if (contacts.length > 0) {
    const contactIds = contacts.map((c) => c.id);
    const [byContact, byActivation] = await Promise.all([
      prisma.enterpriseWealthPartner.findFirst({
        where: {
          contactId: { in: contactIds },
          isDeleted: false,
        },
        orderBy: { updatedAt: "desc" },
      }),
      findPartnerByActivation(userId),
    ]);
    if (byContact) {
      partner = byContact;
      contactId = byContact.contactId;
    } else if (byActivation) {
      partner = byActivation;
      contactId = byActivation.contactId;
    }
  } else {
    const byActivation = await findPartnerByActivation(userId);
    if (byActivation) {
      partner = byActivation;
      contactId = byActivation.contactId;
    }
  }

  if (!partner) {
    throw new PartnerGatewayError(
      "No Wealth Partner mapping for this identity. Access denied.",
      "PARTNER_NOT_LINKED",
      403,
    );
  }

  const lifecycle = String(partner.lifecycleStatus || "").toLowerCase();
  const operational = String(partner.operationalStatus || "").toLowerCase();
  if (lifecycle === "suspended" || lifecycle === "retired" || operational === "suspended") {
    throw new PartnerGatewayError(
      "Wealth Partner access is suspended.",
      "PARTNER_SUSPENDED",
      403,
    );
  }

  return { user, partner, contactId };
}

export function toPartnerSessionDto(input: {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  partner: PartnerRow;
  contactId: string | null;
}): PartnerSessionDto {
  return {
    userId: input.user.id,
    email: input.user.email,
    firstName: input.user.firstName,
    lastName: input.user.lastName,
    displayName: displayNameFromUser(input.user),
    partnerId: input.partner.id,
    partnerCode: input.partner.code,
    partnerDisplayName: input.partner.displayName,
    organizationId: input.partner.organizationId,
    contactId: input.contactId,
    lifecycleStatus: input.partner.lifecycleStatus,
    operationalStatus: input.partner.operationalStatus,
  };
}
