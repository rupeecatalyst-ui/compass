/**
 * Customer recommendation message for one stored version.
 * Commercials come only from that version's saved cards.
 */
import { RUPEE_CATALYST_CORPORATE_BRAND } from "@/constants/enterprise-communication-center/corporate-branding";
import type { CompassRecommendationHistoryVersion } from "@/lib/compass-customer-gateway/recommendation-history";

export const RECOMMENDATION_CLIENT_EMAIL_SUBJECT = "Your Home Loan Recommendations | Rupee Catalyst";
export const RECOMMENDATION_CLIENT_EMAIL_HEADING = "Your Personalised Home Loan Recommendations";
export const RECOMMENDATION_INDICATIVE_DISCLAIMER =
  "These recommendations are indicative and remain subject to the lender's own assessment, documentation and approval.";

export const COMPASS_RECOMMENDATION_DISPATCHES_KEY = "compassRecommendationDispatches";

export type RecommendationDispatchStatus = "sent" | "failed" | "pending" | "disabled";

export type RecommendationDispatchRecord = {
  versionNumber: number;
  recipient: string;
  actorUserId: string;
  attemptedAt: string;
  deliveryStatus: RecommendationDispatchStatus;
  providerStatus: string | null;
  failure: string | null;
  resend: boolean;
};

export type RecommendationClientLenderRow = {
  lender: string;
  rank: number | null;
  preference: number | null;
  eligibleOffer: string | null;
  interestRate: string | null;
  emi: string | null;
  tenure: string | null;
  processingTime: string | null;
  programme: string | null;
};

export type RecommendationClientMessage = {
  versionNumber: number;
  title: string;
  recordedAt: string | null;
  subject: string;
  heading: string;
  greeting: string;
  requestedAmount: string | null;
  lenders: RecommendationClientLenderRow[];
  disclaimer: string;
  footer: string;
  textBody: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function cell(value: string | null): string {
  return value?.trim() || "Not available";
}

export function recommendationGreeting(customerName: string | null | undefined): string {
  const name = customerName?.trim();
  if (!name) return "Hello,";
  return `Dear ${name},`;
}

export function requestedAmountFromAssessment(
  assessment: ReadonlyArray<{ label: string; value: string }>,
): string | null {
  return assessment.find((line) => line.label === "Requested amount")?.value ?? null;
}

export function lendersForVersion(version: CompassRecommendationHistoryVersion): RecommendationClientLenderRow[] {
  return version.cards.map((card) => ({
    lender: card.displayName,
    rank: card.rank,
    preference: card.customerPreference,
    eligibleOffer: card.tentativeOfferLabel,
    interestRate: card.interestRateLabel,
    emi: card.estimatedEmiLabel,
    tenure: card.tenureLabel,
    processingTime: card.processingTimeLabel,
    programme: card.programmeVersion != null ? `Programme version ${card.programmeVersion}` : null,
  }));
}

export function recommendationFooter(): string {
  const brand = RUPEE_CATALYST_CORPORATE_BRAND;
  return [
    brand.legalName,
    brand.tagline,
    brand.websiteUrl,
    brand.supportPhone ? `Support: ${brand.supportPhone}` : "",
    `Logo: ${brand.logoPath}`,
  ].filter(Boolean).join("\n");
}

export function buildRecommendationClientMessage(input: {
  version: CompassRecommendationHistoryVersion;
  customerName: string | null;
}): RecommendationClientMessage {
  const greeting = recommendationGreeting(input.customerName);
  const requestedAmount = requestedAmountFromAssessment(input.version.assessment);
  const lenders = lendersForVersion(input.version);
  const when = input.version.recordedAt ? ` on ${input.version.recordedAt}` : "";
  const lines = [
    RECOMMENDATION_CLIENT_EMAIL_HEADING,
    "",
    greeting,
    "",
    `Requested loan amount: ${cell(requestedAmount)}`,
    `${input.version.title}${when}`,
    "",
    "Lender options",
  ];
  if (lenders.length === 0) {
    lines.push("No lender options were saved for this recommendation.");
  } else {
    lines.push("Lender | Rank | Preference | Eligible offer | Interest | EMI | Tenure | Processing | Programme");
    for (const lender of lenders) {
      lines.push([
        lender.lender,
        lender.rank ?? "Not available",
        lender.preference != null ? `Preference ${lender.preference}` : "Not available",
        cell(lender.eligibleOffer),
        cell(lender.interestRate),
        cell(lender.emi),
        cell(lender.tenure),
        cell(lender.processingTime),
        cell(lender.programme),
      ].join(" | "));
    }
  }
  lines.push("", RECOMMENDATION_INDICATIVE_DISCLAIMER, "", recommendationFooter());
  return {
    versionNumber: input.version.versionNumber,
    title: input.version.title,
    recordedAt: input.version.recordedAt,
    subject: RECOMMENDATION_CLIENT_EMAIL_SUBJECT,
    heading: RECOMMENDATION_CLIENT_EMAIL_HEADING,
    greeting,
    requestedAmount,
    lenders,
    disclaimer: RECOMMENDATION_INDICATIVE_DISCLAIMER,
    footer: recommendationFooter(),
    textBody: lines.join("\n"),
  };
}

export function buildRecommendationPdfHtml(input: {
  message: RecommendationClientMessage;
  customerName: string | null;
  opportunityReference: string | null;
  logoSrc: string | null;
}): string {
  const rows = input.message.lenders.length === 0
    ? "<tr><td colspan=\"8\">No lender options were saved for this recommendation.</td></tr>"
    : input.message.lenders.map((lender) => `<tr>
      <td>${escapeHtml(lender.lender)}</td>
      <td>${escapeHtml(lender.rank != null ? String(lender.rank) : "Not available")}</td>
      <td>${escapeHtml(lender.preference != null ? `Preference ${lender.preference}` : "Not available")}</td>
      <td>${escapeHtml(cell(lender.eligibleOffer))}</td>
      <td>${escapeHtml(cell(lender.interestRate))}</td>
      <td>${escapeHtml(cell(lender.emi))}</td>
      <td>${escapeHtml(cell(lender.tenure))}</td>
      <td>${escapeHtml(cell(lender.processingTime))}</td>
    </tr>`).join("");
  const logo = input.logoSrc
    ? `<img src="${escapeHtml(input.logoSrc)}" alt="Rupee Catalyst" width="180" />`
    : `<p><strong>${escapeHtml(RUPEE_CATALYST_CORPORATE_BRAND.legalName)}</strong></p>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(input.message.subject)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #142033; }
  h1 { font-size: 22px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #d5dbe3; padding: 6px 8px; text-align: left; font-size: 12px; }
  th { background: #10233f; color: #ffffff; }
  .note { margin-top: 16px; font-size: 12px; }
</style></head><body>
${logo}
<h1>${escapeHtml(input.message.heading)}</h1>
<p>${escapeHtml(input.message.greeting)}</p>
<p>Opportunity: ${escapeHtml(input.opportunityReference?.trim() || "Not available")}</p>
<p>Customer: ${escapeHtml(input.customerName?.trim() || "Not available")}</p>
<p>Requested loan amount: ${escapeHtml(cell(input.message.requestedAmount))}</p>
<p>${escapeHtml(input.message.title)}${input.message.recordedAt ? ` on ${escapeHtml(input.message.recordedAt)}` : ""}</p>
<table>
  <thead><tr><th>Lender</th><th>Rank</th><th>Preference</th><th>Eligible offer</th><th>Interest</th><th>EMI</th><th>Tenure</th><th>Processing</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<p class="note">${escapeHtml(input.message.disclaimer)}</p>
<pre>${escapeHtml(input.message.footer)}</pre>
</body></html>`;
}

export function readRecommendationDispatches(snapshot: unknown): RecommendationDispatchRecord[] {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return [];
  const raw = (snapshot as Record<string, unknown>)[COMPASS_RECOMMENDATION_DISPATCHES_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const versionNumber = row.versionNumber;
    const recipient = typeof row.recipient === "string" ? row.recipient.trim() : "";
    const actorUserId = typeof row.actorUserId === "string" ? row.actorUserId.trim() : "";
    const attemptedAt = typeof row.attemptedAt === "string" ? row.attemptedAt : "";
    const deliveryStatus = row.deliveryStatus;
    if (
      typeof versionNumber !== "number"
      || !recipient
      || !actorUserId
      || !attemptedAt
      || (deliveryStatus !== "sent" && deliveryStatus !== "failed" && deliveryStatus !== "pending" && deliveryStatus !== "disabled")
    ) return [];
    return [{
      versionNumber,
      recipient,
      actorUserId,
      attemptedAt,
      deliveryStatus,
      providerStatus: typeof row.providerStatus === "string" ? row.providerStatus : null,
      failure: typeof row.failure === "string" ? row.failure : null,
      resend: row.resend === true,
    }];
  });
}

/** Provider acceptance blocks another send until the employee explicitly resends. */
export function recommendationDispatchDecision(input: {
  records: readonly RecommendationDispatchRecord[];
  versionNumber: number;
  recipient: string;
  resend: boolean;
}): "send" | "duplicate" {
  const recipient = input.recipient.trim().toLowerCase();
  const accepted = input.records.some((record) =>
    record.versionNumber === input.versionNumber
    && record.recipient.trim().toLowerCase() === recipient
    && (record.deliveryStatus === "sent" || record.deliveryStatus === "pending"),
  );
  if (accepted && !input.resend) return "duplicate";
  return "send";
}

export function recommendationDispatchSourceEventId(input: {
  opportunityId: string;
  versionNumber: number;
  attempt: number;
}): string {
  return `chanakya-recommendation:${input.opportunityId}:${input.versionNumber}:${input.attempt}`;
}

export function nextRecommendationDispatchAttempt(
  records: readonly RecommendationDispatchRecord[],
  versionNumber: number,
): number {
  return records.filter((record) => record.versionNumber === versionNumber).length + 1;
}
