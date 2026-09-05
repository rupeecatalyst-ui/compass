/**
 * CO-MARKETING-MKT-05 — Pre-publish validation (no send).
 */

import type {
  MarketingCampaign,
  MarketingCampaignVersion,
} from "@/types/enterprise-marketing-campaign";
import type { MarketingPrePublishCheckResult } from "@/types/enterprise-marketing-campaign";
import type { MarketingColumnMap } from "@/types/enterprise-marketing-durability";
import type { MarketingSenderIdentity } from "@/types/enterprise-marketing-email-delivery";
import { inspectMarketingPersonalisationUsage } from "@/lib/enterprise-marketing-engine/personalisation-catalogue";
import { hasMarketingUnsubscribeBlock } from "@/lib/enterprise-marketing-engine/visual-editor";
import { collectMarketingImageBlocksMissingAlt } from "@/lib/enterprise-marketing-engine/asset-alt-text";

function hasCta(version: MarketingCampaignVersion): boolean {
  if (version.ctaLabel?.trim() && version.ctaUrl?.trim()) return true;
  return version.content.blocks.some(
    (b) =>
      b.type === "cta" &&
      typeof b.props.label === "string" &&
      b.props.label.trim() &&
      typeof b.props.url === "string" &&
      b.props.url.trim() &&
      b.props.url !== "#",
  );
}

function senderConfigured(campaign: MarketingCampaign): boolean {
  return Boolean(
    campaign.sender.fromName?.trim() &&
      campaign.sender.fromAddress?.trim() &&
      campaign.sender.fromAddress.includes("@"),
  );
}

/**
 * Prepare validation before APPROVED (and reusable for SCHEDULE readiness).
 * Does not send. Returns structured checks — caller decides hard fail.
 */
export function runMarketingPrePublishChecks(input: {
  campaign: MarketingCampaign;
  version: MarketingCampaignVersion;
  columnMap?: MarketingColumnMap | null;
  mappingConfirmed?: boolean;
  senderIdentity?: MarketingSenderIdentity | null;
  requireApprovedSender?: boolean;
}): MarketingPrePublishCheckResult {
  const { campaign, version } = input;
  const checks: MarketingPrePublishCheckResult["checks"] = [];

  const audienceOk = Boolean(campaign.audienceId?.trim());
  checks.push({
    id: "audience",
    label: "Audience configured",
    severity: "error",
    passed: audienceOk,
    message: audienceOk ? "Audience linked" : "Link an audience before approval",
  });

  const contentOk =
    Boolean(version.subject?.trim()) &&
    version.content.blocks.length > 0 &&
    version.content.blocks.some((b) => b.type === "text" || b.type === "header" || b.type === "cta");
  checks.push({
    id: "content",
    label: "Content present",
    severity: "error",
    passed: contentOk,
    message: contentOk ? "Subject and content blocks present" : "Subject and content blocks required",
  });

  const senderOk = senderConfigured(campaign);
  checks.push({
    id: "sender",
    label: "Sender configured",
    severity: "error",
    passed: senderOk,
    message: senderOk ? "Sender identity set" : "Configure sender name and address",
  });

  const senderApproved =
    !input.requireApprovedSender ||
    (input.senderIdentity != null &&
      input.senderIdentity.approvalStatus === "APPROVED" &&
      input.senderIdentity.simulated !== true &&
      input.senderIdentity.active);
  checks.push({
    id: "sender_approved",
    label: "Approved sender identity",
    severity: input.requireApprovedSender ? "error" : "warning",
    passed: senderApproved,
    message: senderApproved
      ? "Approved sender identity is linked"
      : "Production-capable execution requires an approved, non-simulated sender identity",
  });

  const unsubscribeOk = hasMarketingUnsubscribeBlock(version.content);
  checks.push({
    id: "unsubscribe",
    label: "Mandatory unsubscribe block",
    severity: "error",
    passed: unsubscribeOk,
    message: unsubscribeOk
      ? "Structural unsubscribe block present"
      : "Add an Unsubscribe block. Footer wording is not a substitute.",
  });

  const ctaOk = hasCta(version);
  checks.push({
    id: "cta",
    label: "Required CTA / links",
    severity: "error",
    passed: ctaOk,
    message: ctaOk ? "CTA configured" : "Add a CTA with label and URL",
  });

  const missingAltIds = collectMarketingImageBlocksMissingAlt(version.content);
  const altOk = missingAltIds.length === 0;
  checks.push({
    id: "alt_text",
    label: "Image accessibility alt text",
    severity: "error",
    passed: altOk,
    message: altOk
      ? "Image blocks include accessibility alt text"
      : "Images require accessibility alt text before campaign approval",
  });

  const personalisation = inspectMarketingPersonalisationUsage({
    subject: version.subject,
    preheader: version.previewText,
    content: version.content,
    columnMap: input.columnMap ?? null,
    mappingConfirmed: input.mappingConfirmed === true,
  });
  const hasUnsupported = personalisation.unsupportedTokens.length > 0;
  const hasUnresolved = personalisation.unresolvedTokens.length > 0;
  const hasMissingFallback = personalisation.missingFallbackTokens.length > 0;
  const personalisationBlocks =
    hasUnsupported || hasMissingFallback || (input.mappingConfirmed === true && hasUnresolved);
  const personalisationParts = [
    hasUnsupported
      ? `Unsupported tokens: ${personalisation.unsupportedTokens.map((t) => `{{${t}}}`).join(", ")}`
      : "",
    hasUnresolved
      ? `Unresolved mapped variables: ${personalisation.unresolvedTokens.map((t) => `{{${t}}}`).join(", ")}`
      : "",
    hasMissingFallback ? `Missing fallbacks: ${personalisation.missingFallbackTokens.join(", ")}` : "",
  ].filter(Boolean);
  checks.push({
    id: "personalisation",
    label: "Personalisation tokens",
    severity: personalisationBlocks ? "error" : "warning",
    passed: !personalisationBlocks,
    message: !hasUnsupported && !hasUnresolved && !hasMissingFallback
      ? "Personalisation tokens are allowlisted and resolved"
      : personalisationParts.join(". ") ||
        "Fix unsupported or unresolved personalisation tokens before approval",
  });

  // Scheduling validity — placeholder: if enabled, require notes; otherwise advisory pass
  const scheduleEnabled = campaign.schedulePlaceholder.enabled;
  const scheduleOk = !scheduleEnabled || Boolean(campaign.schedulePlaceholder.notes?.trim());
  checks.push({
    id: "scheduling",
    label: "Scheduling validity",
    severity: scheduleEnabled ? "error" : "warning",
    passed: scheduleOk,
    message: scheduleEnabled
      ? scheduleOk
        ? "Schedule placeholder noted"
        : "Schedule enabled but notes missing"
      : "Schedule not enabled (placeholder OK for approval)",
  });

  const routingOk = campaign.routingPlaceholder.mode !== "UNCONFIGURED";
  checks.push({
    id: "routing",
    label: "Routing policy",
    severity: "warning",
    passed: routingOk,
    message: routingOk
      ? `Routing mode: ${campaign.routingPlaceholder.mode}`
      : "Routing still UNCONFIGURED — configure user, team, round-robin, or a closed rule before live handoff",
  });

  const notif = campaign.notificationPlaceholder;
  const notificationOk = notif.inApp || notif.email || notif.whatsapp;
  checks.push({
    id: "notification",
    label: "Notification configuration",
    severity: "warning",
    passed: notificationOk,
    message: notificationOk
      ? "At least one notification channel flagged"
      : "No notification channels selected",
  });

  // Deliverability — foundation: sender domain shape only (no ESP)
  const deliverabilityOk = senderOk && !campaign.sender.fromAddress.includes(" ");
  checks.push({
    id: "deliverability",
    label: "Deliverability configuration",
    severity: "warning",
    passed: deliverabilityOk,
    message: deliverabilityOk
      ? "Sender address present (ESP deliverability guard arrives later)"
      : "Sender address invalid for deliverability prep",
  });

  const blocking = checks.filter((c) => c.severity === "error" && !c.passed);
  return {
    readyForApproval: blocking.length === 0,
    checks,
    blockingCodes: blocking.map((c) => c.id),
  };
}

export function assertReadyForApproval(result: MarketingPrePublishCheckResult): void {
  if (result.readyForApproval) return;
  throw Object.assign(
    new Error(
      `Pre-publish checks failed: ${result.blockingCodes.join(", ")}. Fix blocking issues before approval.`,
    ),
    {
      statusCode: 400,
      code: "PRE_PUBLISH_CHECKS_FAILED",
      detail: result,
    },
  );
}
