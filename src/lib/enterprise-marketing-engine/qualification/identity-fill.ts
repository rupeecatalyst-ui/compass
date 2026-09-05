/**
 * CO-MARKETING-REDESIGN-016 — Fill missing Contact identity only.
 * Never overwrite existing values with blanks or replacement data.
 */

export type MarketingContactIdentityFields = {
  name: string;
  email: string | null;
  phone: string | null;
};

export function fillMissingMarketingContactIdentity(
  existing: MarketingContactIdentityFields,
  incoming: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  },
): {
  next: MarketingContactIdentityFields;
  filledFields: string[];
  overwroteExisting: false;
} {
  const filledFields: string[] = [];
  const next: MarketingContactIdentityFields = {
    name: existing.name,
    email: existing.email,
    phone: existing.phone,
  };

  const incomingName = (incoming.name ?? "").trim();
  const existingName = (existing.name ?? "").trim();
  if (!existingName && incomingName) {
    next.name = incomingName;
    filledFields.push("name");
  }

  const incomingEmail = (incoming.email ?? "").trim() || null;
  if (!existing.email && incomingEmail) {
    next.email = incomingEmail;
    filledFields.push("email");
  }

  const incomingPhone = (incoming.phone ?? "").trim() || null;
  if (!existing.phone && incomingPhone) {
    next.phone = incomingPhone;
    filledFields.push("phone");
  }

  return { next, filledFields, overwroteExisting: false };
}
