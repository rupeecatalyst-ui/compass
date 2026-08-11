/**
 * CO-WP-102 / CO-WP-103B — Partner API Gateway types.
 */
export const PARTNER_TOKEN_AUDIENCE = "wealth_partner_app" as const;
export const PARTNER_TOKEN_TYPE = "partner_access" as const;

export interface PartnerTokenPayload {
  userId: string;
  email: string;
  role: string;
  partnerId: string;
  organizationId: string;
  contactId: string | null;
  aud: typeof PARTNER_TOKEN_AUDIENCE;
  typ: typeof PARTNER_TOKEN_TYPE;
}

export interface PartnerSessionDto {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  partnerId: string;
  partnerCode: string | null;
  partnerDisplayName: string;
  organizationId: string;
  contactId: string | null;
  lifecycleStatus: string;
  operationalStatus: string;
  /** CO-WP-ACCESS-001 — Partner-level effective entitlements (no transaction context). */
  entitlements?: {
    executionMode: string;
    source: string;
    permissions: Record<string, boolean>;
    modules: Record<string, boolean>;
    templateCode: string | null;
  };
}

export interface PartnerAuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  session: PartnerSessionDto;
}

export interface PartnerHealthDto {
  status: "ok" | "degraded";
  service: "partner_gateway";
  timestamp: string;
  persistence: "prisma" | "unavailable";
}

/** CO-WP-103B — Home companion experience (Experience Engine projection). */
export type PartnerHomeGreetingPeriod = "morning" | "afternoon" | "evening" | "night";

export interface PartnerHomeGreetingSpotlightDto {
  id: string;
  text: string;
}

/**
 * CO-WP-103.20 — Shared Experience Engine schedule window.
 * Evaluated by Catalyst One before projection; companion may defensively re-check.
 */
export interface PartnerHomeExperienceScheduleDto {
  startsAt: string | null;
  endsAt: string | null;
}

/**
 * CO-WP-103.20 — Shared Experience governance envelope fields.
 * Applied across Home packages (Hero · Actions · Highlights · Business · Feed · Visiting · Saarthi).
 * Catalyst One owns evaluation of visibility / audience / scheduling.
 */
export interface PartnerHomeExperienceGovernedFieldsDto {
  /** Partner segment / type / tier key — null = all audiences. */
  audience: string | null;
  /** Higher wins. */
  priority: number;
  /** Stable tie-break (ascending). */
  sortOrder: number;
  /** Opaque Experience Engine rule key — null = always eligible when schedule/audience pass. */
  visibilityRule: string | null;
  /** Publish / campaign window — null = always in schedule. */
  schedule: PartnerHomeExperienceScheduleDto | null;
  /** Actionable route owned by Enterprise — empty string = non-interactive. */
  deepLink: string;
  /** Future personalisation package key (occasion / campaign / segment variant). */
  personalisationKey: string | null;
}

export interface PartnerHomeGreetingDto {
  period: PartnerHomeGreetingPeriod;
  salutation: string;
  /** First name preference for compact greetings. */
  givenName: string;
  partnerDisplayName: string;
  /** Always from Catalyst One — never invented in the companion. */
  professionalTitle: string | null;
  profilePhotoUrl: string | null;
  initials: string;
  unreadNotificationCount: number;
  /**
   * CO-WP-103.1 — Experience Engine greeting spotlights.
   * Companion rotates one at a time; never invents local copy.
   */
  spotlights: PartnerHomeGreetingSpotlightDto[];
}

/** @deprecated prefer PartnerHomeExperienceScheduleDto — kept for hero compat. */
export interface PartnerHomeHeroPublishWindowDto {
  startsAt: string | null;
  endsAt: string | null;
}

/** CO-WP-103.2 / CO-WP-103.20 — Future-ready Experience Engine hero card. */
export interface PartnerHomeHeroCardDto {
  id: string;
  /** Extensible content type — UI must not switch on WP-specific enums. */
  contentType: string;
  title: string;
  subtitle: string;
  /** CDN / Experience Engine imagery (nullable). */
  imageUrl: string | null;
  /** Named illustration token when no imageUrl. */
  illustrationKey: string | null;
  /** Theme token for gradient (teal | gold | indigo | …). */
  theme: string;
  /** Optional CSS gradient override from Enterprise. */
  backgroundGradient: string | null;
  ctaLabel: string;
  /** Semantic CTA verb — view_details | apply_now | learn_more | … */
  ctaAction: string;
  /** Deep link resolved by Catalyst One / companion router. */
  deepLink: string;
  badge: string | null;
  productCategory: string | null;
  audience: string | null;
  /** @deprecated prefer schedule */
  publishWindow: PartnerHomeHeroPublishWindowDto | null;
  /** CO-WP-103.20 — preferred schedule field (mirrors publishWindow when projected). */
  schedule: PartnerHomeExperienceScheduleDto | null;
  priority: number;
  sortOrder: number;
  visibilityRule: string | null;
  personalisationKey: string | null;
}

export interface PartnerHomeHeroEmptyStateDto {
  title: string;
  subtitle: string;
  theme: string;
  illustrationKey: string;
}

export interface PartnerHomeTodayChipDto {
  id: string;
  kind: string;
  label: string;
  icon: string;
  theme: string;
  /** Operational count from Enterprise — may be 0 until queues wired. */
  count: number;
  deepLink: string;
  audience: string | null;
  priority: number;
  sortOrder: number;
  visibilityRule: string | null;
  schedule: PartnerHomeExperienceScheduleDto | null;
  personalisationKey: string | null;
}

export interface PartnerHomeMyBusinessTodayMetaDto {
  title: string;
}

export interface PartnerHomeFeedItemDto {
  id: string;
  /** Content type / category key (campaign, roi, product, …). */
  contentType: string;
  /** @deprecated prefer contentType */
  kind?: string;
  title: string;
  subtitle: string;
  /** @deprecated prefer subtitle */
  summary?: string;
  icon: string;
  theme: string;
  category: string;
  /** ISO timestamp — display as relative/absolute time. */
  publishedAt: string | null;
  /** @deprecated prefer publishedAt */
  occurredAt?: string | null;
  deepLink: string;
  /** @deprecated prefer deepLink */
  href?: string;
  /** Future “Read More” affordance — nullable until Experience Engine enables. */
  readMoreLabel: string | null;
  audience: string | null;
  priority: number;
  sortOrder: number;
  visibilityRule: string | null;
  schedule: PartnerHomeExperienceScheduleDto | null;
  personalisationKey: string | null;
}

export interface PartnerHomeBusinessFeedMetaDto {
  title: string;
  viewAllLabel: string | null;
  viewAllDeepLink: string | null;
}

export interface PartnerHomeRecommendedActionDto {
  id: string;
  /** Short action title shown on the card. */
  title: string;
  /** @deprecated prefer title — kept for companion compatibility. */
  label?: string;
  /** Named icon token from Experience Engine. */
  icon: string;
  /** Premium gradient theme token. */
  theme: string;
  /** Deep link resolved by companion router. */
  deepLink: string;
  /** @deprecated prefer deepLink */
  href?: string;
  audience: string | null;
  priority: number;
  sortOrder: number;
  /** Future Experience Engine visibility key (nullable). */
  visibilityRule: string | null;
  schedule: PartnerHomeExperienceScheduleDto | null;
  personalisationKey: string | null;
}

export interface PartnerHomeRecommendedActionsMetaDto {
  title: string;
  viewAllLabel: string | null;
  viewAllDeepLink: string | null;
}

export interface PartnerHomeHighlightDto {
  id: string;
  title: string;
  subtitle: string;
  /** Named icon token from Experience Engine. */
  icon: string;
  /** Premium colour theme (tone alias supported). */
  theme: string;
  /** @deprecated prefer theme */
  tone?: string;
  deepLink: string;
  /** @deprecated prefer deepLink */
  href?: string;
  badge: string | null;
  audience: string | null;
  priority: number;
  sortOrder: number;
  visibilityRule: string | null;
  schedule: PartnerHomeExperienceScheduleDto | null;
  personalisationKey: string | null;
}

export interface PartnerHomeHighlightsMetaDto {
  title: string;
}

export interface PartnerHomeVisitingCardActionDto {
  id: string;
  label: string;
  icon: string;
  deepLink: string;
  /** @deprecated prefer deepLink */
  href?: string;
  /**
   * CO-WP-FEATURE-COMPLETION-001 — how the companion should execute the action.
   * call | whatsapp | email | share | navigate
   */
  actionKind?: string;
  /** tel: / mailto: / https://wa.me/ — null when contact data unavailable */
  externalHref?: string | null;
  enabled?: boolean;
  disabledReason?: string | null;
  audience: string | null;
  priority: number;
  sortOrder: number;
  visibilityRule: string | null;
  schedule: PartnerHomeExperienceScheduleDto | null;
  personalisationKey: string | null;
}

export interface PartnerHomeVisitingCardQrDto {
  /** pending | ready | unavailable — Enterprise QR API later. */
  status: string;
  imageUrl: string | null;
  caption: string;
  /** Connect payload encoded into the QR (Enterprise-owned). */
  payloadUrl?: string | null;
}

export interface PartnerHomeVisitingCardBrandingDto {
  companyName: string;
  brandMarkLabel: string;
  /** Official Rupee Catalyst logo URL — companion must not redraw. */
  brandMarkUrl: string | null;
}

export interface PartnerHomeIdentityVerifiedDto {
  status: "verified" | "pending";
  label: string;
}

export interface PartnerHomeIdentityShareDto {
  title: string;
  text: string;
  url: string;
}

/** CO-WP-IDENTITY-001 — authorised products projected for Professional Identity Card. */
export interface PartnerHomeIdentityProductDto {
  productCode: string;
  productLabel: string;
  iconLabel: string;
}

export interface PartnerHomeIdentityTierDto {
  tierCode: "bronze" | "silver" | "gold" | "platinum" | string;
  tierLabel: string;
}

export interface PartnerHomeIdentityBackDto {
  scanCaption: string;
  companyAddress: string;
  websiteUrl: string;
  supportContact: string;
  corporateDisclaimer: string;
  poweredByLabel: string;
}

export interface PartnerHomeIdentityFutureSlotDto {
  id: string;
  label: string;
  status: "reserved";
}

export interface PartnerHomeVisitingCardDto {
  /** CO-WP-IDENTITY-001 — card title for UI */
  cardTitle: string;
  partnerDisplayName: string;
  /** Catalyst One only — never invent in companion. */
  professionalTitle: string | null;
  partnerCode: string | null;
  email: string | null;
  mobile: string | null;
  city: string | null;
  yearsOfExperienceLabel: string | null;
  languagesLabel: string | null;
  initials: string;
  profilePhotoUrl: string | null;
  verifiedIdentity: PartnerHomeIdentityVerifiedDto;
  share: PartnerHomeIdentityShareDto;
  tier: PartnerHomeIdentityTierDto;
  authorisedProducts: PartnerHomeIdentityProductDto[];
  authorisedProductsNotice: string;
  branding: PartnerHomeVisitingCardBrandingDto;
  qr: PartnerHomeVisitingCardQrDto;
  back: PartnerHomeIdentityBackDto;
  futurePlaceholders: PartnerHomeIdentityFutureSlotDto[];
  actions: PartnerHomeVisitingCardActionDto[];
}

export interface PartnerHomeSaarthiCapabilityDto {
  id: string;
  label: string;
  /** Future surface — presentation hint only; not wired to AI. */
  kind: string;
  enabled: boolean;
  priority: number;
  sortOrder: number;
  visibilityRule: string | null;
  personalisationKey: string | null;
}

export interface PartnerHomeSaarthiDto {
  headline: string;
  message: string;
  askCtaLabel: string;
  deepLink: string;
  audience: string | null;
  priority: number;
  sortOrder: number;
  visibilityRule: string | null;
  schedule: PartnerHomeExperienceScheduleDto | null;
  personalisationKey: string | null;
  /** Future: Voice · Chat · Training · Recommendations — presentation only. */
  capabilities: PartnerHomeSaarthiCapabilityDto[];
}

/** CO-WP-103.11 — Notification Experience (Enterprise-controlled). */
export interface PartnerHomeNotificationCategoryDto {
  id: string;
  label: string;
  emoji: string;
}

export interface PartnerHomeNotificationDto {
  id: string;
  /** business | campaigns | training | announcements | saarthi | customers */
  category: string;
  icon: string;
  title: string;
  subtitle: string;
  publishedAt: string;
  /** critical | high | normal | low */
  priority: string;
  read: boolean;
  deepLink: string;
  theme: string;
  sortOrder: number;
}

export interface PartnerHomeNotificationsMetaDto {
  title: string;
  markReadLabel: string;
  markAllReadLabel: string;
  emptyTitle: string;
  emptySubtitle: string;
  categories: PartnerHomeNotificationCategoryDto[];
}

/** CO-WP-103.12 — Global Search (presentation package; no search backend). */
export interface PartnerHomeSearchScopeDto {
  id: string;
  label: string;
  icon: string;
  theme: string;
}

export interface PartnerHomeSearchSuggestionDto {
  id: string;
  /** customers | loan_files | products | lenders | training | campaigns | documents | knowledge_base | saarthi */
  scope: string;
  title: string;
  subtitle: string;
  icon: string;
  theme: string;
  deepLink: string;
  /** Presentation filter tokens only — not a search index. */
  keywords: string[];
  priority: number;
  sortOrder: number;
}

export interface PartnerHomeRecentSearchDto {
  id: string;
  label: string;
  scope: string | null;
  deepLink: string | null;
}

export interface PartnerHomeQuickSuggestionDto {
  id: string;
  label: string;
  icon: string;
  theme: string;
  scope: string | null;
  deepLink: string;
}

export interface PartnerHomeGlobalSearchMetaDto {
  title: string;
  placeholder: string;
  recentTitle: string;
  quickTitle: string;
  suggestionsTitle: string;
  scopesTitle: string;
  emptyTitle: string;
  emptySubtitle: string;
  clearRecentLabel: string;
  triggerLabel: string;
  scopes: PartnerHomeSearchScopeDto[];
}

export interface PartnerHomeGlobalSearchDto {
  meta: PartnerHomeGlobalSearchMetaDto;
  recentSearches: PartnerHomeRecentSearchDto[];
  quickSuggestions: PartnerHomeQuickSuggestionDto[];
  suggestions: PartnerHomeSearchSuggestionDto[];
}

/** CO-WP-103.13 — Home Personalisation (Experience Engine package). */
export interface PartnerHomePersonalisationCardDto {
  id: string;
  /**
   * Extensible kind — time_greeting | welcome_back | birthday |
   * congratulations | motivation | festival | business_quote | …
   */
  kind: string;
  eyebrow: string | null;
  title: string;
  body: string;
  icon: string;
  theme: string;
  deepLink: string | null;
  ctaLabel: string | null;
  priority: number;
  sortOrder: number;
  audience: string | null;
  visibilityRule: string | null;
  schedule: PartnerHomeExperienceScheduleDto | null;
  personalisationKey: string | null;
}

export interface PartnerHomePersonalisationMetaDto {
  title: string;
  emptyTitle: string;
  emptySubtitle: string;
}

/** CO-WP-103.15 — Premium Empty State Experience (Experience Engine). */
export interface PartnerHomeEmptyStateDto {
  id: string;
  /**
   * campaigns | feed | notifications | business | training |
   * documents | hero | actions | highlights | …
   */
  kind: string;
  illustrationKey: string;
  title: string;
  /** Positive, encouraging message — never a dead end. */
  message: string;
  ctaLabel: string;
  deepLink: string;
  theme: string;
}

export interface PartnerHomeExperienceMetaDto {
  source: string;
  surface: string;
}

export interface PartnerHomeDashboardDto {
  generatedAt: string;
  partnerId: string;
  /** CO-WP-PERF-002 — progressive Home phase. */
  homeLoadPhase?: "shell" | "desk";
  experience: PartnerHomeExperienceMetaDto;
  greeting: PartnerHomeGreetingDto;
  personalisationMeta: PartnerHomePersonalisationMetaDto;
  personalisation: PartnerHomePersonalisationCardDto[];
  heroCarousel: PartnerHomeHeroCardDto[];
  heroEmptyState: PartnerHomeHeroEmptyStateDto;
  myBusinessTodayMeta: PartnerHomeMyBusinessTodayMetaDto;
  myBusinessToday: PartnerHomeTodayChipDto[];
  businessFeedMeta: PartnerHomeBusinessFeedMetaDto;
  businessFeed: PartnerHomeFeedItemDto[];
  recommendedActionsMeta: PartnerHomeRecommendedActionsMetaDto;
  recommendedActions: PartnerHomeRecommendedActionDto[];
  todaysHighlightsMeta: PartnerHomeHighlightsMetaDto;
  todaysHighlights: PartnerHomeHighlightDto[];
  visitingCard: PartnerHomeVisitingCardDto;
  saarthi: PartnerHomeSaarthiDto;
  notificationsMeta: PartnerHomeNotificationsMetaDto;
  notifications: PartnerHomeNotificationDto[];
  globalSearch: PartnerHomeGlobalSearchDto;
  emptyStates: PartnerHomeEmptyStateDto[];
  /** CO-WP-COMMAND-001 — Partner Command Center (primary home surface). */
  commandCenter?: import("./enterprise-partner-command-center").PartnerCommandCenterDto;
  /** CO-WP-HOME-SNAPSHOT-001 — Premium Business Snapshot KPI cards. */
  businessSnapshot?: import("./enterprise-partner-business-snapshot").PartnerHomeBusinessSnapshotDto;
}
