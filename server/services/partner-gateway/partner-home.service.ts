/**
 * CO-WP-103A / CO-WP-103B — Partner Home companion experience projection.
 *
 * Projects Enterprise Experience Engine packages for the Daily Business Companion.
 * No CRM/MIS snapshot. Companion must not recalculate or invent content.
 */
import { isDatabaseAvailable } from "@server/lib/prisma";
import { wealthPartnerTypeLabel } from "@/constants/enterprise-wealth-partner-registry";
import {
  PARTNER_HOME_EXPERIENCE_ENGINE,
  PARTNER_HOME_BUSINESS_FEED_META,
  PARTNER_HOME_EMPTY_STATES,
  PARTNER_HOME_FEED_CATALOG,
  PARTNER_HOME_GLOBAL_SEARCH_META,
  PARTNER_HOME_GREETING_SPOTLIGHTS,
  PARTNER_HOME_HERO_CATALOG,
  PARTNER_HOME_HERO_EMPTY_STATE,
  PARTNER_HOME_HIGHLIGHT_CATALOG,
  PARTNER_HOME_HIGHLIGHTS_META,
  PARTNER_HOME_MY_BUSINESS_TODAY_META,
  PARTNER_HOME_NOTIFICATION_CATALOG,
  PARTNER_HOME_NOTIFICATIONS_META,
  PARTNER_HOME_PERSONALISATION_CATALOG,
  PARTNER_HOME_PERSONALISATION_META,
  PARTNER_HOME_QUICK_SUGGESTIONS,
  PARTNER_HOME_RECENT_SEARCHES,
  PARTNER_HOME_RECOMMENDED_ACTIONS,
  PARTNER_HOME_RECOMMENDED_ACTIONS_META,
  PARTNER_HOME_SAARTHI,
  PARTNER_HOME_SEARCH_SUGGESTIONS,
  PARTNER_HOME_TODAY_CHIP_CATALOG,
  PARTNER_HOME_IDENTITY_DEFAULT_TIER,
  PARTNER_HOME_IDENTITY_PRODUCT_AUTHORISATIONS,
  PARTNER_HOME_PROFESSIONAL_IDENTITY,
  PARTNER_HOME_VISITING_CARD_ACTIONS,
  PARTNER_HOME_VISITING_CARD_BRANDING,
  PARTNER_HOME_VISITING_CARD_QR,
} from "@/constants/enterprise-partner-home";
import {
  isExperienceItemEligible,
  resolveExperiencePackage,
  withExperienceGovernance,
  type ExperienceResolveContext,
} from "@/lib/enterprise-partner-home";
import type {
  PartnerHomeDashboardDto,
  PartnerHomeGreetingPeriod,
} from "@/types/enterprise-partner-gateway";
import {
  PartnerGatewayError,
  resolvePartnerBindingForUser,
} from "./partner-binding.service";
import { composePartnerCommandCenter } from "./partner-command-center.compose";
import { composePartnerBusinessSnapshot } from "./partner-business-snapshot.compose";
import { partnerBusinessService } from "./partner-business.service";
import { partnerNotificationCenterService } from "./partner-notification-center.service";

function greetingForNow(now = new Date()): {
  period: PartnerHomeGreetingPeriod;
  salutation: string;
} {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  if (hour >= 5 && hour < 12) return { period: "morning", salutation: "Good Morning" };
  if (hour >= 12 && hour < 17) return { period: "afternoon", salutation: "Good Afternoon" };
  if (hour >= 17 && hour < 21) return { period: "evening", salutation: "Good Evening" };
  return { period: "night", salutation: "Good Evening" };
}

function applyPersonalisationTokens(
  template: string,
  tokens: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => tokens[key] ?? "");
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "WP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function readProfessionalTitle(profileJson: unknown, partnerType: string): string | null {
  if (profileJson && typeof profileJson === "object" && !Array.isArray(profileJson)) {
    const title = (profileJson as Record<string, unknown>).professionalTitle;
    if (typeof title === "string" && title.trim()) return title.trim();
  }
  const label = wealthPartnerTypeLabel(partnerType);
  return label?.trim() ? label : null;
}

function readProfilePhotoUrl(profileJson: unknown): string | null {
  if (!profileJson || typeof profileJson !== "object" || Array.isArray(profileJson)) {
    return null;
  }
  const url = (profileJson as Record<string, unknown>).profilePhotoUrl;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

/** CO-WP-IDENTITY-001 — optional profile fields; null when uncaptured (CAD-2026-001). */
function readProfileString(profileJson: unknown, key: string): string | null {
  if (!profileJson || typeof profileJson !== "object" || Array.isArray(profileJson)) {
    return null;
  }
  const value = (profileJson as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readYearsOfExperienceLabel(profileJson: unknown): string | null {
  if (!profileJson || typeof profileJson !== "object" || Array.isArray(profileJson)) {
    return null;
  }
  const profile = profileJson as Record<string, unknown>;
  const label = profile.yearsOfExperienceLabel;
  if (typeof label === "string" && label.trim()) return label.trim();
  const years = profile.yearsOfExperience;
  if (typeof years === "number" && Number.isFinite(years) && years >= 0) {
    return years === 1 ? "1 year" : `${Math.floor(years)} years`;
  }
  if (typeof years === "string" && years.trim()) return years.trim();
  return null;
}

/** Digits for tel: / WhatsApp — strip presentation masking when possible. */
function normalizeDialDigits(mobile: string | null | undefined): string | null {
  if (!mobile?.trim()) return null;
  const cleaned = mobile.replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.startsWith("91") && digits.length >= 12 ? digits : digits;
}

function buildIdentityConnectPayload(input: {
  partnerCode: string | null;
  partnerDisplayName: string;
  professionalTitle: string | null;
  websiteUrl: string;
}): { payloadUrl: string; imageUrl: string; shareUrl: string } {
  const code = input.partnerCode?.trim() || "partner";
  const shareUrl = `${input.websiteUrl.replace(/\/$/, "")}/partner/${encodeURIComponent(code)}`;
  const payloadUrl =
    `${shareUrl}?name=${encodeURIComponent(input.partnerDisplayName)}` +
    (input.professionalTitle
      ? `&title=${encodeURIComponent(input.professionalTitle)}`
      : "");
  const imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(payloadUrl)}`;
  return { payloadUrl, imageUrl, shareUrl };
}

function enrichIdentityActions(
  actions: Array<Record<string, unknown>>,
  contact: {
    mobile: string | null;
    email: string | null;
    shareUrl: string;
    qrImageUrl: string | null;
  },
): Array<Record<string, unknown>> {
  const dial = normalizeDialDigits(contact.mobile);
  const email = contact.email?.trim() || null;
  return actions.map((action) => {
    const id = String(action.id || "");
    if (id === "call") {
      return {
        ...action,
        actionKind: "call",
        externalHref: dial ? `tel:+${dial}` : null,
        enabled: Boolean(dial),
        disabledReason: dial ? null : "Mobile number not available on partner profile",
        deepLink: dial ? `tel:+${dial}` : action.deepLink,
        href: dial ? `tel:+${dial}` : action.href,
      };
    }
    if (id === "whatsapp") {
      const href = dial ? `https://wa.me/${dial}` : null;
      return {
        ...action,
        actionKind: "whatsapp",
        externalHref: href,
        enabled: Boolean(href),
        disabledReason: href ? null : "Mobile number not available for WhatsApp",
        deepLink: href || action.deepLink,
        href: href || action.href,
      };
    }
    if (id === "email") {
      const href = email ? `mailto:${email}` : null;
      return {
        ...action,
        actionKind: "email",
        externalHref: href,
        enabled: Boolean(href),
        disabledReason: href ? null : "Email not available on partner profile",
        deepLink: href || action.deepLink,
        href: href || action.href,
      };
    }
    if (id === "share") {
      return {
        ...action,
        actionKind: "share",
        externalHref: null,
        enabled: true,
        disabledReason: null,
      };
    }
    if (id === "copy_link") {
      return {
        ...action,
        actionKind: "copy_link",
        externalHref: contact.shareUrl || null,
        enabled: Boolean(contact.shareUrl),
        disabledReason: contact.shareUrl ? null : "Referral link unavailable",
      };
    }
    if (id === "save_qr") {
      return {
        ...action,
        actionKind: "save_qr",
        externalHref: contact.qrImageUrl,
        enabled: Boolean(contact.qrImageUrl),
        disabledReason: contact.qrImageUrl ? null : "QR code not ready",
      };
    }
    if (id === "preview_public") {
      return {
        ...action,
        actionKind: "preview_public",
        externalHref: contact.shareUrl || null,
        enabled: Boolean(contact.shareUrl),
        disabledReason: contact.shareUrl ? null : "Public profile link unavailable",
      };
    }
    return {
      ...action,
      actionKind: "navigate",
      externalHref: null,
      enabled: true,
      disabledReason: null,
    };
  });
}

function givenNameFrom(
  user: { firstName: string; lastName: string; email: string },
  partnerDisplayName: string,
): string {
  const first = (user.firstName || "").trim();
  if (first && !/^(wealth|partner|demo)$/i.test(first)) return first;
  const parts = partnerDisplayName.trim().split(/\s+/).filter(Boolean);
  const meaningful = parts.find((p) => !/^(wealth|partner|demo)$/i.test(p));
  if (meaningful) return meaningful;
  if (parts.length) return parts[parts.length - 1];
  return user.email.split("@")[0] || "Partner";
}

export const partnerHomeService = {
  async getHomeDashboard(userId: string, partnerId: string): Promise<PartnerHomeDashboardDto> {
    if (!isDatabaseAvailable()) {
      throw new PartnerGatewayError(
        "Enterprise services are currently unavailable.",
        "ENTERPRISE_UNAVAILABLE",
        503,
      );
    }

    const binding = await resolvePartnerBindingForUser(userId);
    if (binding.partner.id !== partnerId) {
      throw new PartnerGatewayError("Access denied", "FORBIDDEN", 403);
    }

    const partner = binding.partner;
    const { period, salutation } = greetingForNow();
    const partnerDisplayName = partner.displayName || binding.user.email;
    const professionalTitle = readProfessionalTitle(partner.profileJson, partner.partnerType);
    const profilePhotoUrl = readProfilePhotoUrl(partner.profileJson);
    const givenName = givenNameFrom(binding.user, partnerDisplayName);
    const initials = initialsFromName(partnerDisplayName);

    // CO-WP-103.20 — Experience Engine resolve context (Visibility · Audience · Schedule).
    const experienceCtx: ExperienceResolveContext = {
      now: new Date(),
      audiences: ["wealth_partners", partner.partnerType].filter(Boolean),
      // Future EE rule engine populates satisfied keys; null-rule items always pass.
      satisfiedVisibilityRules: new Set<string>(),
    };

    // CO-WP-COMMAND-001 + CO-WP-HOME-SNAPSHOT-001 + CO-PERF
    // Single opportunity hydrate for notifications + command center + snapshot.
    // Caps fan-out and avoids Notification Center ECM×40 on Home.
    const HOME_OPP_LIMIT = 12;
    let commandCenter = composePartnerCommandCenter({
      opportunities: [],
      partnerProfileJson: (partner.profileJson as Record<string, unknown> | null) ?? null,
      givenName,
    });
    let businessSnapshot = composePartnerBusinessSnapshot({
      opportunities: [],
      customerCount: 0,
      partnerProfileJson: (partner.profileJson as Record<string, unknown> | null) ?? null,
    });
    let opportunities: Awaited<
      ReturnType<typeof partnerBusinessService.getOpportunity>
    >[] = [];
    let customerCount = 0;
    try {
      const pipeline = await partnerBusinessService.getBusinessPipeline(userId);
      const opportunityIds = pipeline.opportunities
        .slice(0, HOME_OPP_LIMIT)
        .map((r) => r.opportunityId);
      const [details, customerHits] = await Promise.all([
        Promise.all(
          opportunityIds.map(async (id) => {
            try {
              return await partnerBusinessService.getOpportunity(userId, id);
            } catch {
              return null;
            }
          }),
        ),
        partnerBusinessService.searchCustomers(userId, "").catch(() => []),
      ]);
      opportunities = details.filter(Boolean) as NonNullable<(typeof details)[number]>[];
      customerCount = customerHits.length;
      commandCenter = composePartnerCommandCenter({
        opportunities,
        partnerProfileJson: (partner.profileJson as Record<string, unknown> | null) ?? null,
        givenName,
      });
      businessSnapshot = composePartnerBusinessSnapshot({
        opportunities,
        customerCount,
        partnerProfileJson: (partner.profileJson as Record<string, unknown> | null) ?? null,
      });
    } catch {
      // Keep empty Command Center + Snapshot — home must still load.
    }

    let notifications: import("@/types/enterprise-partner-gateway").PartnerHomeNotificationDto[] =
      [];
    try {
      notifications = await partnerNotificationCenterService.listForHomeFast(
        userId,
        opportunities,
      );
    } catch {
      notifications = [...PARTNER_HOME_NOTIFICATION_CATALOG]
        .map((item, index) => {
          const publishedAt =
            item.publishedAt ??
            new Date(Date.now() - (index + 1) * 2_700_000).toISOString();
          return { ...item, publishedAt };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    const unreadNotificationCount = notifications.filter((n) => !n.read).length;

    const myBusinessToday = resolveExperiencePackage(
      PARTNER_HOME_TODAY_CHIP_CATALOG.map((chip) => ({ ...chip })),
      experienceCtx,
    );

    const personalisation = resolveExperiencePackage(
      PARTNER_HOME_PERSONALISATION_CATALOG.map((card) => {
        const tokens = {
          givenName,
          salutation,
          partnerDisplayName,
        };
        return {
          ...card,
          eyebrow: card.eyebrow
            ? applyPersonalisationTokens(card.eyebrow, tokens)
            : null,
          title: applyPersonalisationTokens(card.title, tokens),
          body: applyPersonalisationTokens(card.body, tokens),
        };
      }),
      experienceCtx,
    );

    const heroCarousel = resolveExperiencePackage(
      PARTNER_HOME_HERO_CATALOG.map((card) => {
        const governed = withExperienceGovernance({ ...card });
        return {
          ...governed,
          publishWindow: governed.schedule,
        };
      }),
      experienceCtx,
    ).map((card) => ({
      ...card,
      publishWindow: card.schedule,
    }));

    const businessFeed = resolveExperiencePackage(
      PARTNER_HOME_FEED_CATALOG.map((item, index) => {
        const publishedAt =
          item.publishedAt ??
          new Date(Date.now() - (index + 1) * 3_600_000 * 2).toISOString();
        return {
          ...item,
          kind: item.contentType,
          summary: item.subtitle,
          href: item.deepLink,
          occurredAt: publishedAt,
          publishedAt,
        };
      }),
      experienceCtx,
    );

    const recommendedActions = resolveExperiencePackage(
      PARTNER_HOME_RECOMMENDED_ACTIONS.map((a) => ({
        ...a,
        label: a.title,
        href: a.deepLink,
      })),
      experienceCtx,
    );

    const todaysHighlights = resolveExperiencePackage(
      PARTNER_HOME_HIGHLIGHT_CATALOG.map((h) => ({
        ...h,
        tone: h.theme,
        href: h.deepLink,
      })),
      experienceCtx,
    );

    const connect = buildIdentityConnectPayload({
      partnerCode: partner.code,
      partnerDisplayName,
      professionalTitle,
      websiteUrl: PARTNER_HOME_PROFESSIONAL_IDENTITY.back.websiteUrl,
    });

    const visitingActions = enrichIdentityActions(
      resolveExperiencePackage(
        PARTNER_HOME_VISITING_CARD_ACTIONS.map((a) => ({
          ...a,
          href: a.deepLink,
        })),
        experienceCtx,
      ) as Array<Record<string, unknown>>,
      {
        mobile: partner.mobile?.trim() || null,
        email: partner.email || binding.user.email,
        shareUrl: connect.shareUrl,
        qrImageUrl: connect.imageUrl,
      },
    );

    const identityEmail = partner.email || binding.user.email;
    const identityMobile = partner.mobile?.trim() || null;

    const saarthiGoverned = withExperienceGovernance({ ...PARTNER_HOME_SAARTHI });
    const saarthi = isExperienceItemEligible(saarthiGoverned, experienceCtx)
      ? {
          headline: saarthiGoverned.headline,
          message: saarthiGoverned.message,
          askCtaLabel: saarthiGoverned.askCtaLabel,
          deepLink: saarthiGoverned.deepLink,
          audience: saarthiGoverned.audience,
          priority: saarthiGoverned.priority,
          sortOrder: saarthiGoverned.sortOrder,
          visibilityRule: saarthiGoverned.visibilityRule,
          schedule: saarthiGoverned.schedule,
          personalisationKey: saarthiGoverned.personalisationKey,
          capabilities: resolveExperiencePackage(
            PARTNER_HOME_SAARTHI.capabilities.map((c) => ({
              ...c,
              deepLink: "",
            })),
            experienceCtx,
          ).map((c) => ({
            id: c.id,
            label: c.label,
            kind: c.kind,
            enabled: c.enabled,
            priority: c.priority,
            sortOrder: c.sortOrder,
            visibilityRule: c.visibilityRule,
            personalisationKey: c.personalisationKey,
          })),
        }
      : null;

    return {
      generatedAt: new Date().toISOString(),
      partnerId: partner.id,
      experience: {
        source: PARTNER_HOME_EXPERIENCE_ENGINE.source,
        surface: PARTNER_HOME_EXPERIENCE_ENGINE.surface,
      },
      greeting: {
        period,
        salutation,
        givenName,
        partnerDisplayName,
        professionalTitle,
        profilePhotoUrl,
        initials,
        unreadNotificationCount,
        spotlights: PARTNER_HOME_GREETING_SPOTLIGHTS.map((s) => ({ ...s })),
      },
      // CO-WP-103.13 / CO-WP-103.20 — Personalisation (token-resolved + EE governance).
      personalisationMeta: { ...PARTNER_HOME_PERSONALISATION_META },
      personalisation,
      heroCarousel,
      heroEmptyState: { ...PARTNER_HOME_HERO_EMPTY_STATE },
      myBusinessTodayMeta: { ...PARTNER_HOME_MY_BUSINESS_TODAY_META },
      myBusinessToday,
      businessFeedMeta: { ...PARTNER_HOME_BUSINESS_FEED_META },
      businessFeed,
      recommendedActionsMeta: { ...PARTNER_HOME_RECOMMENDED_ACTIONS_META },
      recommendedActions,
      todaysHighlightsMeta: { ...PARTNER_HOME_HIGHLIGHTS_META },
      todaysHighlights,
      // CO-WP-IDENTITY-001 / CO-WP-FEATURE-COMPLETION-001 — Professional Identity Card.
      visitingCard: {
        cardTitle: PARTNER_HOME_PROFESSIONAL_IDENTITY.cardTitle,
        partnerDisplayName,
        professionalTitle,
        partnerCode: partner.code,
        email: identityEmail,
        mobile: identityMobile,
        city: partner.cityLabel?.trim() || readProfileString(partner.profileJson, "city") || null,
        yearsOfExperienceLabel: readYearsOfExperienceLabel(partner.profileJson),
        languagesLabel: readProfileString(partner.profileJson, "languagesLabel"),
        initials,
        profilePhotoUrl,
        verifiedIdentity: { ...PARTNER_HOME_PROFESSIONAL_IDENTITY.verifiedIdentity },
        share: {
          title: `${partnerDisplayName} · Rupee Catalyst Wealth Partner`,
          text: [
            partnerDisplayName,
            professionalTitle || "Wealth Partner",
            partner.code ? `Partner Code: ${partner.code}` : null,
            "Verified Rupee Catalyst Partner",
            connect.shareUrl,
          ]
            .filter(Boolean)
            .join("\n"),
          url: connect.shareUrl,
        },
        tier: { ...PARTNER_HOME_IDENTITY_DEFAULT_TIER },
        authorisedProducts: PARTNER_HOME_IDENTITY_PRODUCT_AUTHORISATIONS.map((p) => ({
          ...p,
        })),
        authorisedProductsNotice:
          PARTNER_HOME_PROFESSIONAL_IDENTITY.authorisedProductsNotice,
        branding: { ...PARTNER_HOME_VISITING_CARD_BRANDING },
        qr: {
          status: "ready",
          imageUrl: connect.imageUrl,
          caption: PARTNER_HOME_PROFESSIONAL_IDENTITY.back.scanCaption,
          payloadUrl: connect.payloadUrl,
        },
        back: { ...PARTNER_HOME_PROFESSIONAL_IDENTITY.back },
        futurePlaceholders: PARTNER_HOME_PROFESSIONAL_IDENTITY.futurePlaceholders.map(
          (slot) => ({ ...slot }),
        ),
        actions: visitingActions as unknown as import("@/types/enterprise-partner-gateway").PartnerHomeVisitingCardActionDto[],
      },
      saarthi: saarthi ?? {
        headline: PARTNER_HOME_SAARTHI.headline,
        message: PARTNER_HOME_SAARTHI.message,
        askCtaLabel: PARTNER_HOME_SAARTHI.askCtaLabel,
        deepLink: PARTNER_HOME_SAARTHI.deepLink,
        audience: PARTNER_HOME_SAARTHI.audience,
        priority: PARTNER_HOME_SAARTHI.priority,
        sortOrder: PARTNER_HOME_SAARTHI.sortOrder,
        visibilityRule: PARTNER_HOME_SAARTHI.visibilityRule,
        schedule: PARTNER_HOME_SAARTHI.schedule,
        personalisationKey: PARTNER_HOME_SAARTHI.personalisationKey,
        capabilities: [],
      },
      notificationsMeta: {
        title: "Notification Center",
        markReadLabel: PARTNER_HOME_NOTIFICATIONS_META.markReadLabel,
        markAllReadLabel: PARTNER_HOME_NOTIFICATIONS_META.markAllReadLabel,
        emptyTitle: PARTNER_HOME_NOTIFICATIONS_META.emptyTitle,
        emptySubtitle:
          "Opportunity, document, approval, task, and campaign events from Catalyst One appear here.",
        categories: [
          { id: "business", label: "Business", emoji: "🏦" },
          { id: "campaigns", label: "Campaigns", emoji: "🎁" },
          { id: "customers", label: "Customers", emoji: "👤" },
        ],
      },
      notifications,
      globalSearch: {
        meta: {
          title: PARTNER_HOME_GLOBAL_SEARCH_META.title,
          placeholder: PARTNER_HOME_GLOBAL_SEARCH_META.placeholder,
          recentTitle: PARTNER_HOME_GLOBAL_SEARCH_META.recentTitle,
          quickTitle: PARTNER_HOME_GLOBAL_SEARCH_META.quickTitle,
          suggestionsTitle: PARTNER_HOME_GLOBAL_SEARCH_META.suggestionsTitle,
          scopesTitle: PARTNER_HOME_GLOBAL_SEARCH_META.scopesTitle,
          emptyTitle: PARTNER_HOME_GLOBAL_SEARCH_META.emptyTitle,
          emptySubtitle: PARTNER_HOME_GLOBAL_SEARCH_META.emptySubtitle,
          clearRecentLabel: PARTNER_HOME_GLOBAL_SEARCH_META.clearRecentLabel,
          triggerLabel: PARTNER_HOME_GLOBAL_SEARCH_META.triggerLabel,
          scopes: PARTNER_HOME_GLOBAL_SEARCH_META.scopes.map((s) => ({ ...s })),
        },
        recentSearches: PARTNER_HOME_RECENT_SEARCHES.map((r) => ({ ...r })),
        quickSuggestions: PARTNER_HOME_QUICK_SUGGESTIONS.map((q) => ({ ...q })),
        suggestions: [...PARTNER_HOME_SEARCH_SUGGESTIONS]
          .map((s) => ({
            ...s,
            keywords: [...s.keywords],
          }))
          .sort((a, b) => b.priority - a.priority || a.sortOrder - b.sortOrder),
      },
      emptyStates: PARTNER_HOME_EMPTY_STATES.map((e) => ({ ...e })),
      commandCenter,
      businessSnapshot,
    };
  },
};
