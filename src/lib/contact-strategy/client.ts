/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007 — browser client.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
import type {
  ContactStrategyFilters,
  ContactStrategyRelationshipPlan,
  ContactStrategySnapshot,
} from "@/types/contact-strategy";

function queryOf(filters: ContactStrategyFilters): string {
  const q = new URLSearchParams();
  if (filters.q) q.set("q", filters.q);
  if (filters.activityBand && filters.activityBand !== "all") q.set("activityBand", filters.activityBand);
  if (filters.contactRole && filters.contactRole !== "all") q.set("contactRole", filters.contactRole);
  if (filters.assignedEmployeeId && filters.assignedEmployeeId !== "all") {
    q.set("assignedEmployeeId", filters.assignedEmployeeId);
  }
  if (filters.companyId && filters.companyId !== "all") q.set("companyId", filters.companyId);
  if (filters.linkedTransaction && filters.linkedTransaction !== "all") {
    q.set("linkedTransaction", filters.linkedTransaction);
  }
  if (filters.nextActionDue && filters.nextActionDue !== "all") q.set("nextActionDue", filters.nextActionDue);
  if (filters.kpi) q.set("kpi", filters.kpi);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function fetchContactStrategySnapshot(
  filters: ContactStrategyFilters = {},
): Promise<ContactStrategySnapshot> {
  const res = await authenticatedJsonFetch(`/api/contact-strategy${queryOf(filters)}`, {
    cache: "no-store",
  });
  const json = (await res.json()) as { data?: ContactStrategySnapshot; error?: { message?: string } };
  if (!res.ok || !json.data) {
    throw new Error(json.error?.message || "Unable to load Contact Strategy.");
  }
  return json.data;
}

export async function saveContactStrategyPlan(
  contactId: string,
  plan: Partial<ContactStrategyRelationshipPlan>,
): Promise<ContactStrategyRelationshipPlan> {
  const res = await authenticatedJsonFetch(`/api/contact-strategy/${encodeURIComponent(contactId)}/plan`, {
    method: "PATCH",
    body: JSON.stringify(plan),
  });
  const json = (await res.json()) as {
    data?: ContactStrategyRelationshipPlan;
    error?: { message?: string };
  };
  if (!res.ok || !json.data) {
    throw new Error(json.error?.message || "Unable to save relationship plan.");
  }
  return json.data;
}
