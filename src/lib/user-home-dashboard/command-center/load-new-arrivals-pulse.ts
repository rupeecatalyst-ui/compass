/**
 * CO-C1-DASH-001 — New Arrivals pulse (Partners + Contacts by creation timestamp).
 */

import { ROUTES } from "@/constants/routes";
import { NEW_ARRIVALS_QUERY } from "@/constants/user-home-dashboard/new-arrivals";
import { wealthPartnerTypeLabel } from "@/constants/enterprise-wealth-partner-registry";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { getAccessToken } from "@/lib/api-client";
import { listEcmContacts } from "@/lib/enterprise-contact-master";
import { ecmApiClient } from "@/lib/enterprise-persistence/ecm-api-client";
import { wealthPartnerApiClient } from "@/lib/enterprise-wealth-partner-registry";
import {
  isCreatedOnInNewArrivalsRange,
  newArrivalsRangeToDateBounds,
  resolveNewArrivalsDateRange,
  toLocalDateKey,
} from "@/lib/user-home-dashboard/new-arrivals/date-range";
import type { NewArrivalsPulseCard } from "@/types/dashboard-command-center";
import type { NewArrivalsDateRange } from "@/types/user-home-new-arrivals";

function previousEqualPeriod(
  range: Pick<NewArrivalsDateRange, "from" | "to" | "preset">,
): Pick<NewArrivalsDateRange, "from" | "to"> | null {
  const from = new Date(`${range.from}T00:00:00`);
  const to = new Date(`${range.to}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const dayMs = 86_400_000;
  const spanDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / dayMs) + 1);
  const prevTo = new Date(from.getTime() - dayMs);
  const prevFrom = new Date(prevTo.getTime() - (spanDays - 1) * dayMs);
  return {
    from: toLocalDateKey(prevFrom),
    to: toLocalDateKey(prevTo),
  };
}

function contactsDrillHref(range: Pick<NewArrivalsDateRange, "from" | "to">): string {
  const params = new URLSearchParams();
  params.set(NEW_ARRIVALS_QUERY.dateCreatedFrom, range.from);
  params.set(NEW_ARRIVALS_QUERY.dateCreatedTo, range.to);
  params.set(NEW_ARRIVALS_QUERY.fromNewArrivals, "1");
  return `${ROUTES.CONTACTS}?${params.toString()}`;
}

function partnersDrillHref(range: Pick<NewArrivalsDateRange, "from" | "to">): string {
  const params = new URLSearchParams();
  params.set("createdFrom", range.from);
  params.set("createdTo", range.to);
  params.set("fromNewArrivals", "1");
  return `${ROUTES.WEALTH_PARTNERS}?${params.toString()}`;
}

async function countContactsInRange(
  range: Pick<NewArrivalsDateRange, "from" | "to">,
): Promise<{ total: number; byRole: Record<string, number> }> {
  const byRole: Record<string, number> = {};
  if (isEnterprisePersistencePrisma() && getAccessToken()) {
    try {
      const result = await ecmApiClient.queryContacts({
        page: 1,
        pageSize: 100,
        status: "all",
        sortBy: "createdOn",
        sortDir: "desc",
        createdFrom: range.from,
        createdTo: range.to,
      });
      for (const c of result.items) {
        for (const role of c.roles ?? []) {
          byRole[role] = (byRole[role] ?? 0) + 1;
        }
      }
      return { total: result.total, byRole };
    } catch {
      /* fall through local */
    }
  }
  const contacts = listEcmContacts().filter((c) =>
    isCreatedOnInNewArrivalsRange(c.createdOn, range),
  );
  for (const c of contacts) {
    for (const role of c.roles ?? []) {
      byRole[role] = (byRole[role] ?? 0) + 1;
    }
  }
  return { total: contacts.length, byRole };
}

async function countPartnersInRange(
  range: Pick<NewArrivalsDateRange, "from" | "to">,
): Promise<{ total: number; byType: Record<string, number> }> {
  const bounds = newArrivalsRangeToDateBounds(range);
  const byType: Record<string, number> = {};
  try {
    const result = await wealthPartnerApiClient.queryPartners({
      page: 1,
      pageSize: 100,
      partnerType: "all",
      createdFrom: bounds.gte.toISOString(),
      createdTo: bounds.lte.toISOString(),
    });
    for (const p of result.items) {
      const key = p.partnerType || "others";
      byType[key] = (byType[key] ?? 0) + 1;
    }
    return { total: result.total, byType };
  } catch {
    return { total: 0, byType };
  }
}

const ROLE_LABELS: Record<string, string> = {
  customer: "Customer",
  partner: "Partner",
  investor: "Investor",
  banker: "Banker",
  employee: "Employee",
};

export async function loadNewArrivalsPulse(
  range: Pick<NewArrivalsDateRange, "from" | "to" | "preset" | "label">,
): Promise<NewArrivalsPulseCard[]> {
  const prev = previousEqualPeriod(range);
  const [partners, contacts, prevPartners, prevContacts] = await Promise.all([
    countPartnersInRange(range),
    countContactsInRange(range),
    prev ? countPartnersInRange(prev) : Promise.resolve(null),
    prev ? countContactsInRange(prev) : Promise.resolve(null),
  ]);

  const partnerBreakdown = Object.entries(partners.byType)
    .map(([id, count]) => ({
      id,
      label: wealthPartnerTypeLabel(id),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const contactBreakdown = Object.entries(contacts.byRole)
    .map(([id, count]) => ({
      id,
      label: ROLE_LABELS[id] ?? id,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return [
    {
      id: "new_partners",
      title: "New Partners",
      count: partners.total,
      deltaVsPrevious:
        prevPartners == null ? null : partners.total - prevPartners.total,
      breakdown: partnerBreakdown,
      href: partnersDrillHref(range),
    },
    {
      id: "new_contacts",
      title: "New Contacts",
      count: contacts.total,
      deltaVsPrevious:
        prevContacts == null ? null : contacts.total - prevContacts.total,
      breakdown: contactBreakdown,
      href: contactsDrillHref(range),
    },
  ];
}

export { resolveNewArrivalsDateRange };
