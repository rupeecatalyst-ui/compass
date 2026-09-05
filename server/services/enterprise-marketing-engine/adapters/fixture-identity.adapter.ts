/**
 * CO-MARKETING-MKT-11 — Fixture identity directory (isolated from live ECM).
 * Used when ENTERPRISE_MARKETING_HANDOFF_MODE=fixture. Never a marketing audience mirror.
 */

import {
  emailsMatch,
  normalizeMarketingMatchEmail,
  normalizeMarketingMatchPhone,
  phonesMatch,
} from "@/lib/enterprise-marketing-engine/qualification/match-identity";
import { fillMissingMarketingContactIdentity } from "@/lib/enterprise-marketing-engine/qualification/identity-fill";
import type { MarketingIdentityMatchResult } from "@/types/enterprise-marketing-qualification";
import type { MarketingIdentityResolutionPort } from "@/lib/enterprise-marketing-engine/ports/qualification-handoff.port";

type FixtureContact = {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
};

const contacts = new Map<string, FixtureContact>();
let seq = 0;

export const marketingFixtureIdentityDirectory = {
  upsert(contact: Omit<FixtureContact, "id"> & { id?: string }): FixtureContact {
    const id = contact.id?.trim() || `mkt-fix-ct-${++seq}`;
    const next: FixtureContact = {
      id,
      organizationId: contact.organizationId,
      name: contact.name,
      email: normalizeMarketingMatchEmail(contact.email),
      phone: normalizeMarketingMatchPhone(contact.phone),
    };
    contacts.set(id, next);
    return next;
  },

  list(organizationId: string): FixtureContact[] {
    return [...contacts.values()].filter((c) => c.organizationId === organizationId);
  },

  get(id: string): FixtureContact | null {
    return contacts.get(id) ?? null;
  },

  resetOrganization(organizationId: string) {
    for (const [id, c] of [...contacts.entries()]) {
      if (c.organizationId === organizationId) contacts.delete(id);
    }
  },
};

export function createFixtureIdentityResolutionPort(): MarketingIdentityResolutionPort {
  return {
    async matchOrCreate(input) {
      const email = normalizeMarketingMatchEmail(input.email);
      const phone = normalizeMarketingMatchPhone(input.phone);
      if (!email && !phone) {
        throw Object.assign(new Error("Email or phone is required to resolve a Contact"), {
          statusCode: 400,
          code: "IDENTITY_REQUIRED",
        });
      }
      const existing = marketingFixtureIdentityDirectory.list(input.organizationId);
      const byEmail = email ? existing.find((c) => emailsMatch(c.email, email)) : undefined;
      const matched = byEmail ?? (phone ? existing.find((c) => phonesMatch(c.phone, phone)) : undefined);
      if (matched) {
        const filled = fillMissingMarketingContactIdentity(matched, {
          name: input.name,
          email,
          phone,
        });
        marketingFixtureIdentityDirectory.upsert({
          ...matched,
          name: filled.next.name,
          email: filled.next.email,
          phone: filled.next.phone,
        });
        return {
          contactId: matched.id,
          created: false,
          matchedBy: byEmail ? "email" : "phone",
          name: filled.next.name,
          filledFields: filled.filledFields,
          overwroteExisting: false,
        } satisfies MarketingIdentityMatchResult;
      }
      const created = marketingFixtureIdentityDirectory.upsert({
        organizationId: input.organizationId,
        name: input.name.trim() || "Marketing recipient",
        email,
        phone,
      });
      return {
        contactId: created.id,
        created: true,
        matchedBy: "created",
        name: created.name,
      };
    },
  };
}
