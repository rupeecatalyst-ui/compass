import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { isValidEmailAddress, resolveCustomerToEmail } from "@/lib/enterprise-communication-center/recipient-router";
import { recipientIdentityKey, type EmailRecipientRef, type EmailRecipientOption } from "@/lib/enterprise-communication-center/recipient-selection";

function deny(): never {
  throw Object.assign(new Error("Unauthorized or unavailable email recipient"), { statusCode: 403, code: "UNAUTHORIZED_RECIPIENT" });
}
function parseRefs(value: unknown): EmailRecipientRef[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100) return deny();
  return value.map(ref => {
    if (!ref || !["contact", "user", "lender_contact"].includes(ref.kind) || typeof ref.id !== "string" || !ref.id.trim()) return deny();
    return { kind: ref.kind, id: ref.id.trim() };
  });
}

/** Same eligibility filters for autocomplete and dispatch; read existing SSOT only. */
async function directory(organizationId: string, search: string, refs?: EmailRecipientRef[]): Promise<EmailRecipientOption[]> {
  if (organizationId !== await resolvePilotOrganizationId()) return deny();
  const ids = (kind: EmailRecipientRef["kind"]) => refs?.filter(ref => ref.kind === kind).map(ref => ref.id);
  const contactIds = ids("contact"), userIds = ids("user"), lenderIds = ids("lender_contact");
  const contains = { contains: search, mode: "insensitive" as const };
  const [contacts, users, lenders] = await Promise.all([
    refs && !contactIds?.length ? [] : prisma.ecmContact.findMany({
      where: { organizationId, enabled: true, isDeleted: false, status: { not: "archived" },
        ...(refs ? { id: { in: contactIds } } : { OR: [{ name: contains }, { officialEmail: contains }, { personalEmail: contains }] }) },
      select: { id: true, name: true, officialEmail: true, personalEmail: true }, ...(!refs ? { take: 30 } : {}),
    }),
    refs && !userIds?.length ? [] : prisma.user.findMany({
      where: { isActive: true, role: { not: "VIEWER" },
        ...(refs ? { id: { in: userIds } } : { OR: [{ firstName: contains }, { lastName: contains }, { email: contains }] }) },
      select: { id: true, firstName: true, lastName: true, email: true }, ...(!refs ? { take: 30 } : {}),
    }),
    refs && !lenderIds?.length ? [] : prisma.enterpriseLenderContact.findMany({
      where: { organizationId, enabled: true, isDeleted: false,
        ...(refs ? { id: { in: lenderIds } } : { OR: [{ name: contains }, { email: contains }] }) },
      select: { id: true, name: true, email: true }, ...(!refs ? { take: 30 } : {}),
    }),
  ]);
  const options: EmailRecipientOption[] = [];
  for (const contact of contacts) {
    const email = resolveCustomerToEmail({ contact, primaryContactEmailFallback: null });
    if (email) options.push({ kind: "contact", id: contact.id, name: contact.name, email });
  }
  for (const user of users) if (isValidEmailAddress(user.email)) options.push({
    kind: "user", id: user.id, name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email!, email: user.email!.trim(),
  });
  for (const lender of lenders) if (isValidEmailAddress(lender.email)) options.push({
    kind: "lender_contact", id: lender.id, name: lender.name, email: lender.email!.trim(),
  });
  return options;
}

export async function searchEmailRecipientDirectory(organizationId: string, search: string) {
  const query = search.trim().slice(0, 120);
  return query ? directory(organizationId, query) : [];
}
export async function resolveEmailRecipientSelections(organizationId: string, toValue: unknown, ccValue: unknown) {
  const to = parseRefs(toValue), cc = parseRefs(ccValue);
  const options = await directory(organizationId, "", [...to, ...cc]);
  const byIdentity = new Map(options.map(option => [recipientIdentityKey(option), option.email]));
  const resolve = (refs: EmailRecipientRef[]) => refs.map(ref => byIdentity.get(recipientIdentityKey(ref)) || deny());
  return { to: resolve(to), cc: resolve(cc) };
}
