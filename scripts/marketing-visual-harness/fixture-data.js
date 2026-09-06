/**
 * Non-deployable visual harness — fixture JSON for Marketing admin APIs.
 * Never contacts Hostinger, Google, or a provider. Never sends.
 */

const NOW = "2026-09-05T06:00:00.000Z";
const ORG = "org-mkt-visual-local";
const CAMPAIGN_ID = "mkt-camp-visual-fixture";

function metric(value, availability = "available", reason) {
  return { availability, value: availability === "available" ? value : null, reason: reason ?? null };
}

export const FIXTURE_CAMPAIGN = {
  id: CAMPAIGN_ID,
  organizationId: ORG,
  name: "Local fixture Home Loan campaign",
  objective: "Product Awareness",
  internalDescription: "Visual harness fixture — not production data",
  product: "Home Loan",
  audienceId: "mkt-aud-visual-fixture",
  channel: "EMAIL",
  sender: {
    fromName: "Rupee Catalyst Campaigns",
    fromAddress: "campaigns@campaign.example.rupeecatalyst.com",
    replyTo: "champion@rupeecatalyst.com",
  },
  status: "DRAFT",
  currentDraftVersionId: "mkt-ver-visual-1",
  activePublishedVersionId: null,
  schedulePlaceholder: { enabled: false, notes: "Fixture schedule only", startAt: NOW },
  routingPlaceholder: { mode: "UNCONFIGURED", notes: "Fixture routing", ownerUserId: "mkt-visual-admin", tags: ["fixture"] },
  notificationPlaceholder: { inApp: true, email: false, whatsapp: false, notes: "" },
  templateId: null,
  batchPolicy: {
    batchSize: 100,
    intervalMs: 60 * 60 * 1000,
    dailyMax: 500,
    sendWindowStart: "09:00",
    sendWindowEnd: "19:00",
    timezone: "Asia/Kolkata",
    startAt: NOW,
    endAt: null,
  },
  governance: {
    createdByUserId: "mkt-visual-admin",
    modifiedByUserId: "mkt-visual-admin",
    submittedByUserId: null,
    approvedByUserId: null,
    scheduledByUserId: null,
    submittedAt: null,
    approvedAt: null,
    scheduledAt: null,
  },
  stateHistory: [
    {
      id: "mkt-st-visual-0",
      from: "DRAFT",
      to: "DRAFT",
      action: "SAVE",
      actorUserId: "mkt-visual-admin",
      at: NOW,
      note: "Fixture created",
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
};

export const FIXTURE_VERSION = {
  id: "mkt-ver-visual-1",
  campaignId: CAMPAIGN_ID,
  versionNumber: 1,
  status: "DRAFT",
  subject: "Fixture Home Loan update",
  previewText: "A local visual-harness preview",
  content: {
    version: 1,
    blocks: [
      { id: "blk-blank-header", type: "header", props: { title: "Rupee Catalyst", subtitle: "", align: "left", padding: "16", color: "#0f172a" } },
      {
        id: "blk-blank-text",
        type: "text",
        props: {
          html: "Hello {{firstName}}, we have an update for professionals in {{city}}.",
          align: "left",
          padding: "8",
          color: "#1f2937",
        },
      },
      { id: "blk-blank-cta", type: "cta", props: { label: "Learn more", url: "https://rupeecatalyst.com", align: "center", padding: "16" } },
      {
        id: "blk-blank-unsubscribe",
        type: "unsubscribe",
        props: { required: true, label: "Unsubscribe", href: "{{unsubscribeUrl}}", align: "center", padding: "16" },
      },
    ],
  },
};

const MONITORING_METRICS = Object.fromEntries(
  [
    "frozenAudience",
    "queued",
    "attempted",
    "providerAccepted",
    "delivered",
    "deferred",
    "failed",
    "softBounced",
    "hardBounced",
    "opened",
    "clicked",
    "replied",
    "unsubscribed",
    "suppressed",
    "qualified",
  ].map((key) => [key, metric(key === "queued" ? 9 : 0, "unavailable", "Provider disconnected — fixture harness")]),
);
MONITORING_METRICS.queued = metric(9);
MONITORING_METRICS.frozenAudience = metric(12);

export function jsonOk(data) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export function resolveMarketingFixture(url, init) {
  const parsed = new URL(url, "http://visual-harness.local");
  const path = parsed.pathname;
  const view = parsed.searchParams.get("view");
  const method = (init?.method || "GET").toUpperCase();
  const batState =
    (typeof globalThis !== "undefined" && globalThis.__MARKETING_BAT_STATE) ||
    parsed.searchParams.get("batState") ||
    "default";

  if (!path.startsWith("/api/admin/marketing")) {
    throw new Error(`visual harness blocked non-Marketing request: ${path}`);
  }
  if (method !== "GET" && method !== "HEAD") {
    return jsonOk({ accepted: true, actuallySent: false, notice: "Fixture POST ignored — no send" });
  }

  if (path === "/api/admin/marketing") {
    return jsonOk({
      moduleId: "enterprise-marketing-engine",
      title: "Marketing Command Center",
      engineName: "Enterprise Marketing Engine",
      sprint: "CO-MARKETING-MKT-13",
      safety: {
        executionEnabled: false,
        handoffEnabled: false,
        handoffMode: "fixture",
        audienceImportEnabled: false,
        providerConnectEnabled: false,
        sheetsMode: "fixture",
        sheetsReadEnabled: true,
        emailMode: "dry_run",
        whatsappMode: "off",
        notice: "TEST MODE — live sending is disabled. Controlled dry-run only.",
      },
      capabilities: {
        campaignExecution: "disabled",
        audienceImport: "disabled",
        digitalLaunch: "disabled",
        dataSourceConnect: "read_only",
        sheetsAdapter: "fixture",
        audienceEngine: "definition_preview",
        emailSend: "disabled",
        whatsappSend: "disabled",
        contactCreate: "disabled",
        opportunityCreate: "disabled",
        operationalHandoff: "disabled",
      },
      boundaries: {
        isolatedFrom: ["Contact", "Opportunity", "Lead"],
        futureHandoff: "qualified_only",
        noLeadEntity: true,
      },
      ports: [],
      permissions: [],
    });
  }

  if (path === "/api/admin/marketing/campaigns") {
    if (batState === "empty") {
      return jsonOk({ campaigns: [] });
    }
    if (parsed.searchParams.get("id") === CAMPAIGN_ID) {
      if (view === "pre-publish") {
        return jsonOk({
          checks: {
            readyForApproval: false,
            blockingCodes: ["LIVE_SEND_DISABLED"],
            checks: [
              {
                id: "live-send",
                label: "Live send",
                severity: "error",
                passed: false,
                message: "Live send remains disabled",
              },
            ],
          },
        });
      }
      if (view === "execution") {
        return jsonOk({
          execution: {
            status: "IDLE",
            nextBatchAt: null,
            processedCount: 0,
            remainingCount: 0,
            pauseState: "ACTIVE",
          },
        });
      }
      const campaign = {
        ...FIXTURE_CAMPAIGN,
        status:
          batState === "paused" ? "PAUSED" : batState === "stopped" ? "STOPPED" : FIXTURE_CAMPAIGN.status,
      };
      return jsonOk({ campaign, draft: FIXTURE_VERSION });
    }
    if (view === "templates") {
      return jsonOk({ templates: [] });
    }
    const listed = {
      ...FIXTURE_CAMPAIGN,
      status:
        batState === "paused" ? "PAUSED" : batState === "stopped" ? "STOPPED" : FIXTURE_CAMPAIGN.status,
    };
    return jsonOk({ campaigns: [listed] });
  }

  if (path === "/api/admin/marketing/qualifications") {
    return jsonOk({
      qualifications: [
        {
          id: "mkt-qual-visual-1",
          organizationId: ORG,
          campaignId: CAMPAIGN_ID,
          campaignName: FIXTURE_CAMPAIGN.name,
          channel: "EMAIL",
          recipientFingerprint: "fp-visual-1",
          intent: "enquiry",
          businessState: "QUALIFIED",
          processState: "NEW",
          inboxStatus: "QUALIFIED",
          matchEmailPreview: "email:redacted-fixture",
          matchPhonePreview: null,
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      inbox: [
        {
          id: "mkt-qual-visual-1",
          organizationId: ORG,
          displayName: "Fixture respondent",
          campaignId: CAMPAIGN_ID,
          campaignName: FIXTURE_CAMPAIGN.name,
          sourceTabName: "Home Loan prospects",
          responseSummary: "Requested a Home Loan callback",
          productInterest: "Home Loan",
          responseTime: NOW,
          assigneeUserId: "mkt-visual-admin",
          inboxStatus: "QUALIFIED",
          businessState: "QUALIFIED",
          duplicateMatch: { result: "none", reused: false },
          nextAction: "handoff",
          qualificationId: "mkt-qual-visual-1",
        },
      ],
      routingPolicies: [],
      notificationPolicies: [],
      notificationAttempts: [],
    });
  }

  if (path === "/api/admin/marketing/analytics") {
    return jsonOk({
      range: { preset: "30d", from: NOW, to: NOW },
      notice: "Fixture analytics — not production data",
      commandCenter: {
        sent: metric(0, "unavailable", "No durable send records"),
        delivered: metric(0, "unavailable", "No durable send records"),
        failed: metric(0, "unavailable", "No durable send records"),
      },
      sourceAnalysis: [],
      campaigns: [],
    });
  }

  if (path === "/api/admin/marketing/data-sources") {
    return jsonOk({
      mode: "fixture",
      bindings: [{ id: "mkt-bind-visual", displayName: "Local fixture workbook" }],
    });
  }

  if (path.startsWith("/api/admin/marketing/data-sources/")) {
    if (view === "datasets") {
      return jsonOk({
        datasets: [{ externalDatasetId: "tab-home-loan", displayName: "Home Loan prospects" }],
      });
    }
    return jsonOk({
      schema: { headers: ["Email", "First Name", "City", "Mobile"] },
    });
  }

  if (path === "/api/admin/marketing/audiences") {
    return jsonOk({
      audiences: [
        {
          id: "mkt-aud-visual-fixture",
          organizationId: ORG,
          name: "Fixture Home Loan audience",
          bindingId: "mkt-bind-visual",
          datasetId: "tab-home-loan",
          datasetDisplayName: "Home Loan prospects",
          columnMap: { email: "Email", name: "First Name", location: "City", mobile: "Mobile" },
          mapping: null,
          mappingConfirmed: true,
          filterDefinition: { version: 1, logic: "AND", rules: [] },
          exclusionDefinition: { version: 1, logic: "AND", rules: [] },
          suppressionPolicy: { applyOrgSuppression: true, reasons: [] },
          eligibilityRules: { requireIdentity: true, requireValidEmailIfPresent: true, excludeDuplicatesInScan: true },
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    });
  }

  if (path === "/api/admin/marketing/campaign-monitoring") {
    if (view === "timeline") {
      return jsonOk({
        recipientId: "mkt-rcpt-visual-1",
        identityPreview: "email:redacted-fixture-row",
        sourceKey: "row-2",
        events: [
          { id: "ev-1", at: NOW, type: "queued", summary: "Queued — fixture recipient" },
          { id: "ev-2", at: NOW, type: "suppressed", summary: "Suppressed — fixture opt-out · not sent" },
        ],
      });
    }
    if (view === "recipients") {
      return jsonOk({
        durableAvailable: true,
        notice: "Fixture recipients",
        total: 1,
        page: 1,
        pageSize: 25,
        rows: [
          {
            id: "mkt-rcpt-visual-1",
            campaignId: CAMPAIGN_ID,
            ledgerId: "mkt-led-visual-1",
            identityPreview: "email:redacted-fixture-row",
            sourceKey: "row-2",
            status: "queued",
            batchNumber: 1,
            attemptCount: 0,
            failureCategory: "none",
            latestEvent: "queued",
            nextPermittedAction: "none",
            allowedActions: [],
            qualificationId: null,
            retryBlockedReason: null,
          },
        ],
      });
    }
    return jsonOk({
      sprint: "CO-MARKETING-REDESIGN-015",
      generatedAt: NOW,
      organizationId: ORG,
      campaignId: CAMPAIGN_ID,
      durableAvailable: true,
      providerConnected: false,
      notice: "Fixture monitoring. Live send remains disabled.",
      metrics: MONITORING_METRICS,
      capabilities: { retry: false, suppress: true, viewSuppression: true, openQualification: false },
    });
  }

  if (path === "/api/admin/marketing/consent") {
    return jsonOk({
      records: [
        {
          id: "mkt-sup-visual-1",
          organizationId: ORG,
          channel: "EMAIL",
          normalizedIdentity: "email:redacted-fixture-row",
          fingerprint: "fp-visual-1",
          normalizedEmail: null,
          kind: "UNSUBSCRIBE",
          reason: "UNSUBSCRIBE",
          status: "ACTIVE",
          duration: "PERMANENT",
          source: "recipient",
          note: "Fixture opt-out",
          effectiveAt: NOW,
          expiresAt: null,
          campaignId: CAMPAIGN_ID,
          providerEventId: null,
          actorUserId: "mkt-visual-admin",
          createdAt: NOW,
          updatedAt: NOW,
          auditTimestamp: NOW,
          identityPreview: "email:redacted-fixture-row",
        },
      ],
      cards: [
        { id: "active", label: "Active suppressions", count: 1, availability: "available" },
        { id: "unsub", label: "Unsubscribes", count: 1, availability: "available" },
      ],
      policy: {
        organizationId: ORG,
        requireExplicitConsent: true,
        grantedValues: ["CONSENT_GRANTED"],
        withdrawnBlocksDelivery: true,
        hardBounceBlocksEmail: true,
        complaintBlocksEmail: true,
        unsubscribeBlocksDelivery: true,
        temporaryExpiryRequired: true,
        updatedAt: NOW,
        updatedByUserId: "mkt-visual-admin",
      },
    });
  }

  if (path === "/api/admin/marketing/assets") {
    return jsonOk({
      assets: [
        {
          id: "mkt-asset-visual-1",
          organizationId: ORG,
          name: "Home loan banner",
          title: "Home loan banner",
          assetType: "IMAGE",
          category: "banner",
          mimeType: "image/png",
          storageProvider: "fixture",
          storageRef: "fixture://marketing-assets/cert-banner.png",
          url: "",
          byteSize: 1200,
          fileSize: 1200,
          width: 1200,
          height: 400,
          uploadedByUserId: "mkt-visual-admin",
          uploadedAt: NOW,
          tags: ["fixture"],
          productCategory: "Home Loan",
          approvalStatus: "approved",
          altText: "Home loan banner",
          usageReferences: [],
          archived: false,
          active: true,
          permissionScope: "ORG_MARKETING",
          currentVersionNumber: 1,
          versions: [],
          checksum: "fixture",
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    });
  }

  if (path === "/api/admin/marketing/deliverability") {
    return jsonOk({
      readiness: {
        simulated: true,
        anyVerified: false,
        lastValidationAt: null,
        freshUntil: null,
        notice: "Simulated fixture states are never shown as verified.",
        checks: [
          { id: "spf", label: "SPF", state: "SIMULATED", simulated: true },
          { id: "dkim", label: "DKIM", state: "SIMULATED", simulated: true },
          { id: "dmarc", label: "DMARC", state: "SIMULATED", simulated: true },
        ],
      },
      senders: [
        {
          id: "mkt-sender-visual-1",
          displayName: "Rupee Catalyst Campaigns",
          fromAddress: "campaigns@campaign.example.rupeecatalyst.com",
          replyTo: "champion@rupeecatalyst.com",
          approvalStatus: "pending",
          verificationStatus: "simulated",
          simulated: true,
          isDefault: true,
          channel: "EMAIL",
        },
      ],
    });
  }

  if (path === "/api/admin/marketing/attribution") {
    return jsonOk({
      sprint: "CO-MARKETING-REDESIGN-017",
      generatedAt: NOW,
      notice: "Fixture attribution — Opportunities created: Unavailable until durable records exist",
      filters: {},
      chain: [
        "campaign",
        "audience_snapshot",
        "recipient",
        "qualified_response",
        "contact",
        "opportunity",
        "deal",
        "disbursal",
        "recognised_revenue",
      ],
      attributedRecipients: metric(0, "unavailable", "Fixture zero — not production data"),
      qualifiedResponses: metric(0, "unavailable", "Fixture zero — not production data"),
      conversionRate: metric(null, "unavailable", "Fixture zero — not production data"),
      contactsCreated: metric(0, "unavailable", "Live handoff remains fixture"),
      contactsReused: metric(0, "unavailable", "Live handoff remains fixture"),
      opportunitiesCreated: metric(null, "unavailable", "Fixture zero — not production data"),
      totalOpportunityValue: metric(null, "unavailable", "Opportunity value is not Marketing revenue"),
      dealsCreated: metric(0, "unavailable", "Fixture zero — not production data"),
      disbursedAmount: metric(null, "unavailable", "Accounting confirmation missing"),
      recognisedRevenue: metric(null, "unavailable", "Accounting confirmation missing"),
      campaignCost: metric(null, "unavailable", "Campaign cost unavailable"),
      campaignRoi: metric(null, "unavailable", "Cost and revenue unavailable"),
      rows: [],
    });
  }

  return jsonOk({});
}
