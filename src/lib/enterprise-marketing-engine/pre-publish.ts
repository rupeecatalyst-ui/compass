/**
 * CO-MARKETING-MKT-05 — Pre-publish validation (no send).
 */

import type {
  MarketingCampaign,
  MarketingCampaignVersion,
} from "@/types/enterprise-marketing-campaign";
import type { MarketingPrePublishCheckResult } from "@/types/enterprise-marketing-campaign";

function hasDisclaimer(campaign: MarketingCampaign, version: MarketingCampaignVersion): boolean {
  if (version.disclaimer && version.disclaimer.trim().length > 0) return true;
  return version.content.blocks.some((b) => {
    if (b.type === "disclaimer" && typeof b.props.text === "string" && b.props.text.trim()) {
      return true;
    }
    if (b.type === "footer" && typeof b.props.text === "string") {
      const t = b.props.text.toLowerCase();
      return t.includes("unsubscrib") || t.includes("disclaimer") || t.includes("terms");
    }
    return false;
  });
}

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

  const complianceOk = hasDisclaimer(campaign, version);
  checks.push({
    id: "compliance",
    label: "Unsubscribe / compliance elements",
    severity: "error",
    passed: complianceOk,
    message: complianceOk
      ? "Disclaimer or unsubscribe footer present"
      : "Add disclaimer block/field or unsubscribe footer text",
  });

  const ctaOk = hasCta(version);
  checks.push({
    id: "cta",
    label: "Required CTA / links",
    severity: "error",
    passed: ctaOk,
    message: ctaOk ? "CTA configured" : "Add a CTA with label and URL",
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
