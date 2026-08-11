/**
 * CO-WP-EXP-001 — Partner Saarthi guidance (Wealth Partner AI companion).
 *
 * Constitutional:
 * - Saarthi ≠ Chanakya (never imports Chanakya / Enterprise AI employee surfaces)
 * - Answers only from partner-authorized Catalyst One projections
 * - Never fabricates business numbers or exposes other partners / credit workbench
 */
import {
  resolvePartnerBindingForUser,
  PartnerGatewayError,
} from "@server/services/partner-gateway/partner-binding.service";
import { partnerEntitlementsService } from "@server/services/partner-entitlements";
import { partnerOwnershipService } from "@server/services/partner-gateway/partner-ownership.service";
import { partnerDealService } from "@server/services/partner-gateway/partner-deal.service";
import { partnerNotificationCenterService } from "@server/services/partner-gateway/partner-notification-center.service";
import { prisma } from "@server/lib/prisma";

export type PartnerSaarthiTopic =
  | "business"
  | "pipeline"
  | "opportunity"
  | "deal"
  | "product"
  | "performance"
  | "general";

export type PartnerSaarthiGuidanceCardDto = {
  id: string;
  title: string;
  body: string;
  deepLink: string;
  topic: PartnerSaarthiTopic;
};

export type PartnerSaarthiDeskDto = {
  partnerId: string;
  title: string;
  subtitle: string;
  dtoNotice: string;
  persona: {
    name: "Saarthi";
    role: "Wealth Partner companion";
    separationNotice: string;
  };
  suggestedQuestions: Array<{ id: string; label: string; topic: PartnerSaarthiTopic }>;
  guidanceCards: PartnerSaarthiGuidanceCardDto[];
  emptyGuidance: { title: string; message: string };
  dtoSource: "enterprise_partner_saarthi";
};

export type PartnerSaarthiAskResultDto = {
  question: string;
  topic: PartnerSaarthiTopic;
  answer: string;
  unavailable: boolean;
  relatedDeepLinks: Array<{ label: string; deepLink: string }>;
  dtoSource: "enterprise_partner_saarthi";
  dtoNotice: string;
};

function detectTopic(question: string): PartnerSaarthiTopic {
  const q = question.toLowerCase();
  if (/deal|lender|pipeline stage|negotiation/.test(q) && /deal|lender/.test(q)) return "deal";
  if (/deal/.test(q)) return "deal";
  if (/product|mix|hl|lap|business loan/.test(q)) return "product";
  if (/target|achievement|performance|conversion|volume/.test(q)) return "performance";
  if (/pipeline|open|active/.test(q)) return "pipeline";
  if (/opportunit|customer|case/.test(q)) return "opportunity";
  if (/business|today|what should|next/.test(q)) return "business";
  return "general";
}

function isClosed(lifecycleStatus: string): boolean {
  const life = (lifecycleStatus || "").toLowerCase();
  return ["won", "lost", "disbursed", "closed", "cancelled"].includes(life);
}

export const partnerSaarthiService = {
  async getDesk(userId: string): Promise<PartnerSaarthiDeskDto> {
    const binding = await resolvePartnerBindingForUser(userId);
    const entitlements = await partnerEntitlementsService.assertEntitlement({
      wealthPartnerId: binding.partner.id,
      organizationId: binding.partner.organizationId,
      action: "view",
    });
    if (entitlements.modules.saarthi === false) {
      throw new PartnerGatewayError("Module not entitled: saarthi", "FORBIDDEN", 403);
    }

    const owned = await partnerOwnershipService.listOwnedOpportunities({
      organizationId: binding.partner.organizationId,
      wealthPartnerId: binding.partner.id,
      limit: 100,
    });
    const open = owned.filter((o) => !isClosed(o.lifecycleStatus));
    let dealsCount = 0;
    try {
      const deals = await partnerDealService.listDeals(userId);
      dealsCount = deals.length;
    } catch {
      dealsCount = 0;
    }

    let unread = 0;
    try {
      const center = await partnerNotificationCenterService.getCenter(userId);
      unread = center.items.filter((i) => !i.read).length;
    } catch {
      unread = 0;
    }

    const guidanceCards: PartnerSaarthiGuidanceCardDto[] = [];
    if (open.length > 0) {
      guidanceCards.push({
        id: "pipeline-open",
        title: "Your open pipeline",
        body: `You have ${open.length} open Opportunity${open.length === 1 ? "" : "ies"} sourced under your partner identity.`,
        deepLink: "/app/business",
        topic: "pipeline",
      });
    }
    if (dealsCount > 0) {
      guidanceCards.push({
        id: "deals-open",
        title: "Your deals",
        body: `${dealsCount} lender Deal${dealsCount === 1 ? "" : "s"} are visible for Opportunities you sourced.`,
        deepLink: "/app/deals",
        topic: "deal",
      });
    }
    if (unread > 0) {
      guidanceCards.push({
        id: "notifications-unread",
        title: "Notifications need attention",
        body: `${unread} unread notification${unread === 1 ? "" : "s"} are projected for your partner session.`,
        deepLink: "/app/notifications",
        topic: "business",
      });
    }
    const latest = open[0] ?? owned[0];
    if (latest) {
      guidanceCards.push({
        id: "latest-opportunity",
        title: "Continue recent Opportunity",
        body: `${latest.opportunityNumber} · ${latest.productLabel || "Product not specified"} · ${latest.primaryContactName || "Customer not specified"}`,
        deepLink: `/app/opportunities/${encodeURIComponent(latest.id)}`,
        topic: "opportunity",
      });
    }

    return {
      partnerId: binding.partner.id,
      title: "Saarthi",
      subtitle: "Wealth Partner companion — guidance from your authorized Catalyst One data.",
      dtoNotice:
        "Saarthi is separate from Chanakya. Answers use only Opportunities, Deals, notifications, and performance data you are entitled to see. Unavailable facts are stated as Not Specified.",
      persona: {
        name: "Saarthi",
        role: "Wealth Partner companion",
        separationNotice:
          "Chanakya remains the internal Catalyst One AI persona for employees. Saarthi never accesses Chanakya or other partners' data.",
      },
      suggestedQuestions: [
        { id: "q-pipeline", label: "How is my pipeline looking?", topic: "pipeline" },
        { id: "q-opps", label: "What Opportunities do I have?", topic: "opportunity" },
        { id: "q-deals", label: "Do I have any Deals?", topic: "deal" },
        { id: "q-products", label: "What is my product mix?", topic: "product" },
        { id: "q-performance", label: "How am I tracking on targets?", topic: "performance" },
        { id: "q-next", label: "What should I work on next?", topic: "business" },
      ],
      guidanceCards,
      emptyGuidance: {
        title: "No live guidance yet",
        message:
          "When you source Opportunities or receive notifications, Saarthi will summarise them here. Tips are never fabricated.",
      },
      dtoSource: "enterprise_partner_saarthi",
    };
  },

  async ask(userId: string, questionRaw: string): Promise<PartnerSaarthiAskResultDto> {
    const question = (questionRaw || "").trim();
    if (!question) {
      throw new PartnerGatewayError("Question is required", "VALIDATION", 400);
    }
    if (question.length > 500) {
      throw new PartnerGatewayError("Question is too long", "VALIDATION", 400);
    }

    const binding = await resolvePartnerBindingForUser(userId);
    await partnerEntitlementsService.assertEntitlement({
      wealthPartnerId: binding.partner.id,
      organizationId: binding.partner.organizationId,
      action: "view",
    });

    const topic = detectTopic(question);
    const owned = await partnerOwnershipService.listOwnedOpportunities({
      organizationId: binding.partner.organizationId,
      wealthPartnerId: binding.partner.id,
      limit: 100,
    });
    const open = owned.filter((o) => !isClosed(o.lifecycleStatus));
    const notice =
      "Answered from your authorized Catalyst One data only. Saarthi is not Chanakya and does not invent business facts.";

    if (topic === "pipeline" || topic === "business") {
      const answer =
        owned.length === 0
          ? "You do not have sourced Opportunities yet. Open My Business to start a New Opportunity when entitled."
          : `Pipeline snapshot for your partner identity: ${open.length} open, ${owned.length - open.length} closed/settled, ${owned.length} total. I cannot see other partners' pipelines.`;
      return {
        question,
        topic,
        answer,
        unavailable: owned.length === 0,
        relatedDeepLinks: [
          { label: "My Business", deepLink: "/app/business" },
          { label: "Notifications", deepLink: "/app/notifications" },
        ],
        dtoSource: "enterprise_partner_saarthi",
        dtoNotice: notice,
      };
    }

    if (topic === "opportunity") {
      if (owned.length === 0) {
        return {
          question,
          topic,
          answer:
            "No Opportunities are visible for your partner identity yet. Unauthorized Opportunities are never shown.",
          unavailable: true,
          relatedDeepLinks: [{ label: "New Opportunity", deepLink: "/app/opportunities/new" }],
          dtoSource: "enterprise_partner_saarthi",
          dtoNotice: notice,
        };
      }
      const lines = owned.slice(0, 8).map((o) => {
        const state = isClosed(o.lifecycleStatus) ? "Closed" : "Open";
        return `• ${o.opportunityNumber} — ${o.productLabel || "Not Specified"} — ${o.primaryContactName || "Not Specified"} (${state})`;
      });
      return {
        question,
        topic,
        answer: `Authorized Opportunities (${owned.length}):\n${lines.join("\n")}${
          owned.length > 8 ? "\n…and more in My Business." : ""
        }`,
        unavailable: false,
        relatedDeepLinks: [{ label: "My Business", deepLink: "/app/business" }],
        dtoSource: "enterprise_partner_saarthi",
        dtoNotice: notice,
      };
    }

    if (topic === "deal") {
      let deals: Awaited<ReturnType<typeof partnerDealService.listDeals>> = [];
      try {
        deals = await partnerDealService.listDeals(userId);
      } catch {
        deals = [];
      }
      if (deals.length === 0) {
        return {
          question,
          topic,
          answer:
            "No Deals are visible for Opportunities you sourced. Deals appear after lender identification in Catalyst One — partners do not mint Deals prematurely.",
          unavailable: true,
          relatedDeepLinks: [{ label: "Deals", deepLink: "/app/deals" }],
          dtoSource: "enterprise_partner_saarthi",
          dtoNotice: notice,
        };
      }
      const lines = deals
        .slice(0, 8)
        .map(
          (d) =>
            `• ${d.dealNumber} — ${d.lenderLabel} — ${d.stageLabel} (${d.opportunityNumber || d.opportunityId})`,
        );
      return {
        question,
        topic,
        answer: `Authorized Deals (${deals.length}):\n${lines.join("\n")}`,
        unavailable: false,
        relatedDeepLinks: [{ label: "Deals", deepLink: "/app/deals" }],
        dtoSource: "enterprise_partner_saarthi",
        dtoNotice: notice,
      };
    }

    if (topic === "product") {
      if (owned.length === 0) {
        return {
          question,
          topic,
          answer: "Product mix is Not Specified until you have sourced Opportunities.",
          unavailable: true,
          relatedDeepLinks: [{ label: "My Business", deepLink: "/app/business" }],
          dtoSource: "enterprise_partner_saarthi",
          dtoNotice: notice,
        };
      }
      const mix = new Map<string, number>();
      for (const o of owned) {
        const label = (o.productLabel || "Not Specified").trim() || "Not Specified";
        mix.set(label, (mix.get(label) || 0) + 1);
      }
      const lines = [...mix.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, n]) => `• ${label}: ${n}`);
      return {
        question,
        topic,
        answer: `Product mix from Opportunities you sourced:\n${lines.join("\n")}`,
        unavailable: false,
        relatedDeepLinks: [
          { label: "Performance", deepLink: "/app/performance" },
          { label: "My Business", deepLink: "/app/business" },
        ],
        dtoSource: "enterprise_partner_saarthi",
        dtoNotice: notice,
      };
    }

    if (topic === "performance") {
      const row = await prisma.enterpriseWealthPartner.findFirst({
        where: {
          id: binding.partner.id,
          organizationId: binding.partner.organizationId,
          isDeleted: false,
        },
        select: { profileJson: true },
      });
      const profile =
        row?.profileJson && typeof row.profileJson === "object" && !Array.isArray(row.profileJson)
          ? (row.profileJson as Record<string, unknown>)
          : null;
      const target = profile?.monthlyTargetAmount;
      const achieved = profile?.monthlyAchievedAmount ?? profile?.monthlyBusinessAmount;
      const hasTarget = typeof target === "number" && Number.isFinite(target);
      const hasAchieved = typeof achieved === "number" && Number.isFinite(achieved);
      if (!hasTarget && !hasAchieved) {
        return {
          question,
          topic,
          answer:
            "Performance targets and achievement are Not Specified until Catalyst One projects them for your partner identity. Open Performance for pipeline inventory that is already available.",
          unavailable: true,
          relatedDeepLinks: [{ label: "Performance", deepLink: "/app/performance" }],
          dtoSource: "enterprise_partner_saarthi",
          dtoNotice: notice,
        };
      }
      const parts: string[] = [];
      if (hasTarget) parts.push(`Monthly target (projected): ₹${Number(target).toLocaleString("en-IN")}`);
      if (hasAchieved) {
        parts.push(`Achievement / volume (projected): ₹${Number(achieved).toLocaleString("en-IN")}`);
      }
      parts.push(`Open pipeline count (your Opportunities): ${open.length}`);
      return {
        question,
        topic,
        answer: parts.join("\n"),
        unavailable: false,
        relatedDeepLinks: [{ label: "Performance", deepLink: "/app/performance" }],
        dtoSource: "enterprise_partner_saarthi",
        dtoNotice: notice,
      };
    }

    return {
      question,
      topic: "general",
      answer:
        "I can help with your authorized pipeline, Opportunities, Deals, product mix, and performance projections. Ask about those topics — I will not discuss other partners, Credit Workbench, or internal enterprise data.",
      unavailable: false,
      relatedDeepLinks: [
        { label: "Saarthi desk", deepLink: "/app/saarthi" },
        { label: "My Business", deepLink: "/app/business" },
      ],
      dtoSource: "enterprise_partner_saarthi",
      dtoNotice: notice,
    };
  },
};
