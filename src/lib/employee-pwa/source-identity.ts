/**
 * CO-C1-EMPLOYEE-PWA-001
 * Source identity is read from the canonical immutable Opportunity source field.
 * Last action is display-only and must never reorder newest-first lists.
 */

export type EmployeePwaSourceIdentityInput = {
  sourceCode?: string | null;
  sourceContactName?: string | null;
  sourceWealthPartnerId?: string | null;
  sourceCampaignLabel?: string | null;
  relationshipManagerName?: string | null;
  primaryOwnerName?: string | null;
  createdByName?: string | null;
};

export function formatEmployeePwaSourceIdentity(input: EmployeePwaSourceIdentityInput): string {
  const code = (input.sourceCode || "").trim().toLowerCase();
  const partnerName = input.sourceContactName?.trim();
  const employeeName =
    input.relationshipManagerName?.trim() ||
    input.primaryOwnerName?.trim() ||
    input.createdByName?.trim();

  if (code === "website_compass" || code === "compass") {
    return "COMPASS";
  }
  if (code === "wealth_partner") {
    return partnerName ? `Wealth Partner · ${partnerName}` : "Wealth Partner";
  }
  if (code === "direct") {
    return employeeName ? `Direct · ${employeeName}` : "Direct";
  }
  if (!code) return "Not Specified";

  const labels: Record<string, string> = {
    walk_in: "Walk-in",
    marketing: "Marketing",
    no_cost_referral: "No Cost Referral",
    employee_referral: "Employee Referral",
    existing_customer: "Existing Customer",
    channel_partner: "Channel Partner",
    dsa: "DSA",
    customer_referral: "Customer Referral",
    other: "Other",
  };
  const typeLabel = labels[code] || code.replace(/_/g, " ");
  if (code === "marketing" && input.sourceCampaignLabel?.trim()) {
    return `${typeLabel} · ${input.sourceCampaignLabel.trim()}`;
  }
  if (partnerName && partnerName !== "—") return `${typeLabel} · ${partnerName}`;
  return typeLabel;
}

export function formatEmployeePwaAmount(amount: number | null | undefined, currency = "INR"): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "Not Specified";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatEmployeePwaDate(value: string | null | undefined): string {
  if (!value) return "Not Specified";
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return "Not Specified";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(ms));
}

export function formatEmployeePwaLastAction(input: {
  lastActionTitle?: string | null;
  lastActionAt?: string | null;
  updatedAt?: string | null;
}): string {
  const title = input.lastActionTitle?.trim();
  const at = formatEmployeePwaDate(input.lastActionAt || input.updatedAt);
  if (title) return `${title} · ${at}`;
  return `Updated · ${at}`;
}
