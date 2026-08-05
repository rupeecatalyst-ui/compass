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

/**
 * Zero-Trust resolve: Authenticated user → Contact link → Wealth Partner UUID.
 */
export async function resolvePartnerBindingForUser(userId: string): Promise<{
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
  };
  partner: PartnerRow;
  contactId: string | null;
}> {
  if (!isDatabaseAvailable()) {
    throw new PartnerGatewayError(
      "Enterprise services are currently unavailable.",
      "ENTERPRISE_UNAVAILABLE",
      503,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new PartnerGatewayError("Access denied", "FORBIDDEN", 403);
  }

  const contacts = await prisma.ecmContact.findMany({
    where: { linkedUserId: userId, isDeleted: false },
    select: { id: true, organizationId: true },
  });

  let partner: PartnerRow | null = null;
  let contactId: string | null = null;

  if (contacts.length > 0) {
    const contactIds = contacts.map((c) => c.id);
    const byContact = await prisma.enterpriseWealthPartner.findFirst({
      where: {
        contactId: { in: contactIds },
        isDeleted: false,
      },
      orderBy: { updatedAt: "desc" },
    });
    if (byContact) {
      partner = byContact;
      contactId = byContact.contactId;
    }
  }

  if (!partner) {
    const byActivation = await prisma.enterpriseWealthPartner.findFirst({
      where: {
        isDeleted: false,
        profileJson: {
          path: ["activation", "activatedUserId"],
          equals: userId,
        },
      },
      orderBy: { updatedAt: "desc" },
    });
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
