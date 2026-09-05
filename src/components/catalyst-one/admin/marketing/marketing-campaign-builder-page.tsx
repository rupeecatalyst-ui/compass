"use client";

/**
 * CO-MARKETING-REDESIGN-006 — Full-page guided Campaign Builder.
 * Save Draft never publishes. Steps 1–5 cannot send. Exit returns to Registry.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  MARKETING_BUILDER_TIMEZONES,
  MARKETING_BUILDER_UNSAVED_MESSAGE,
  MARKETING_BUILDER_UNSAVED_TITLE,
  MARKETING_CAMPAIGN_BUILDER_STEPS,
  MARKETING_BUILDER_CHANNEL_PICKER_OPTIONS,
  MARKETING_CAMPAIGN_OBJECTIVE_OPTIONS,
  MARKETING_CAMPAIGN_STATUS_LABELS,
  MARKETING_CHANNELS,
  MARKETING_CHANNEL_CONTRACTS,
  MARKETING_CHANNEL_NOT_CONFIGURED_LABEL,
  MARKETING_DEFAULT_BATCH_POLICY,
  MARKETING_FILTER_OPS,
  MARKETING_PERMISSIONS,
  MARKETING_TEST_MODE_BANNER,
  MARKETING_LIVE_PROVIDER_SENDING_DISABLED,
} from "@/constants/enterprise-marketing-engine";
import { ROUTES } from "@/constants/routes";
import { createEmptyContentDocument } from "@/lib/enterprise-marketing-engine/content-blocks";
import { paragraphTextFromDocument } from "@/lib/enterprise-marketing-engine/visual-editor";
import { MarketingTemplateGallery } from "./marketing-template-gallery";
import { MarketingVisualEmailEditor } from "./marketing-visual-email-editor";
import { MarketingPersonalisationCatalogue } from "./marketing-personalisation-catalogue";
import { MarketingPreviewWorkspace } from "./marketing-preview-workspace";
import { MarketingControlledTestPanel } from "./marketing-controlled-test-panel";
import { MarketingReadinessReview } from "./marketing-readiness-review";
import { MarketingDeliveryOperationsPanel } from "./marketing-delivery-operations-panel";
import { suggestMarketingColumnMap } from "@/lib/enterprise-marketing-engine/column-mapping";
import { MARKETING_PERSONALIZATION_FALLBACKS } from "@/constants/enterprise-marketing-engine/content";
import {
  buildMarketingPersonalisationCatalogue,
  insertPersonalisationTokenIntoDocument,
  insertPersonalisationTokenIntoText,
  resolvePersonalisationWithFallbacks,
  type MarketingPersonalisationSampleRecipient,
} from "@/lib/enterprise-marketing-engine/personalisation-catalogue";
import { inspectMarketingPreviewWorkspace } from "@/lib/enterprise-marketing-engine/preview-workspace";
import { renderMarketingEmailHtml } from "@/lib/enterprise-marketing-engine/email-render";
import { applyPersonalization } from "@/lib/enterprise-marketing-engine/personalization";
import type { MarketingTestSendHistoryEntry } from "@/lib/enterprise-marketing-engine/test-send-safety";
import {
  composeMarketingBuilderReview,
  emptyMarketingFilters,
  estimateMarketingDeliveryPlan,
  fingerprintMarketingBuilderDraft,
  isMarketingBuilderDraftDirty,
  mappedPersonalisationVariables,
  marketingBuilderDraftSavePayload,
  personalisationFallbackEntries,
  resolvePersonalisationSamplePreview,
  unresolvedPersonalisationTokens,
  validateMarketingBuilderStep,
  type MarketingBuilderDraft,
} from "@/lib/enterprise-marketing-engine/campaign-builder-shell";
import { composeMarketingReadinessReview, projectMarketingDeliveryOperations } from "@/lib/enterprise-marketing-engine/readiness-review";
import { hasMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import type { MarketingCampaign, MarketingCampaignVersion, MarketingContentDocument, MarketingContentTemplate, MarketingPrePublishCheckResult } from "@/types/enterprise-marketing-campaign";
import type { MarketingAudienceDefinition, MarketingAudiencePreviewResult, MarketingFilterDefinition } from "@/types/enterprise-marketing-audience";
import type { MarketingColumnMap } from "@/types/enterprise-marketing-durability";
import type { MarketingExecutionSummary } from "@/types/enterprise-marketing-execution";
import { toast } from "sonner";
import "@/styles/marketing-command-centre.css";
import "@/styles/marketing-visual-editor.css";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

const ACTOR = { role: "ADMIN" as const };

function bodyFromContent(version: MarketingCampaignVersion | null): string {
  return version ? paragraphTextFromDocument(version.content) : "";
}

function documentFromVersion(version: MarketingCampaignVersion | null): MarketingContentDocument {
  return version?.content ?? createEmptyContentDocument();
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function MarketingCampaignBuilderPage({
  campaignId,
  initialStep = 1,
}: {
  campaignId: string;
  initialStep?: number;
}) {
  const router = useRouter();
  const canCreate = hasMarketingPermission(ACTOR, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clampedInitial = Math.min(6, Math.max(1, initialStep));
  const [step, setStep] = useState(clampedInitial);
  const [maxReached, setMaxReached] = useState(clampedInitial);
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [savedFingerprint, setSavedFingerprint] = useState("");
  const [guardOpen, setGuardOpen] = useState(false);
  const [name, setName] = useState("");
  const [internalDescription, setInternalDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [channel, setChannel] = useState<(typeof MARKETING_CHANNELS)[number]>("EMAIL");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [bindingId, setBindingId] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [audienceId, setAudienceId] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<MarketingColumnMap>({ email: "" });
  const [mappingConfirmed, setMappingConfirmed] = useState(false);
  const [filters, setFilters] = useState<MarketingFilterDefinition>(emptyMarketingFilters());
  const [exclusions, setExclusions] = useState<MarketingFilterDefinition>(emptyMarketingFilters());
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [audienceCounts, setAudienceCounts] = useState<MarketingAudiencePreviewResult["counts"] | null>(null);
  const [executionSummary, setExecutionSummary] = useState<MarketingExecutionSummary | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<MarketingBuilderDraft["snapshotStatus"]>("Unavailable");
  const [senderName, setSenderName] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [emailContent, setEmailContent] = useState<MarketingContentDocument>(createEmptyContentDocument);
  const [editorNonce, setEditorNonce] = useState(0);
  const [templateName, setTemplateName] = useState("");
  const [personalizationSample, setPersonalizationSample] = useState(() => ({
    ...MARKETING_PERSONALIZATION_FALLBACKS,
  }));
  const [sampleRecipients, setSampleRecipients] = useState<MarketingPersonalisationSampleRecipient[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<MarketingTestSendHistoryEntry[]>([]);
  const [startAt, setStartAt] = useState("");
  const [timezone, setTimezone] = useState<(typeof MARKETING_BUILDER_TIMEZONES)[number]>("Asia/Kolkata");
  const [batchSize, setBatchSize] = useState(MARKETING_DEFAULT_BATCH_POLICY.batchSize);
  const [intervalMinutes, setIntervalMinutes] = useState(
    Math.round(MARKETING_DEFAULT_BATCH_POLICY.intervalMs / 60000),
  );
  const [windowStart, setWindowStart] = useState(MARKETING_DEFAULT_BATCH_POLICY.sendWindowStart);
  const [windowEnd, setWindowEnd] = useState(MARKETING_DEFAULT_BATCH_POLICY.sendWindowEnd);
  const [dailyMax, setDailyMax] = useState(MARKETING_DEFAULT_BATCH_POLICY.dailyMax);
  const [bindings, setBindings] = useState<Array<{ id: string; displayName: string }>>([]);
  const [datasets, setDatasets] = useState<Array<{ externalDatasetId: string; displayName: string }>>([]);
  const [templates, setTemplates] = useState<MarketingContentTemplate[]>([]);
  const [prePublish, setPrePublish] = useState<MarketingPrePublishCheckResult | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);

  const draft: MarketingBuilderDraft = useMemo(
    () => ({
      name,
      internalDescription,
      objective,
      channel,
      ownerUserId,
      tags: parseTags(tagsText),
      bindingId,
      datasetId,
      audienceId,
      columnMapEmail: columnMap.email,
      mappingConfirmed,
      snapshotStatus,
      filterCount: filters.rules.length,
      exclusionCount: exclusions.rules.length,
      eligibleCount,
      senderName,
      senderAddress,
      subject,
      preheader,
      templateId,
      messageBody,
      emailContent,
      personalizationSample,
      startAt,
      timezone,
      batchSize,
      intervalMs: intervalMinutes * 60_000,
      windowStart,
      windowEnd,
      dailyMax,
    }),
    [
      name,
      internalDescription,
      objective,
      channel,
      ownerUserId,
      tagsText,
      bindingId,
      datasetId,
      audienceId,
      columnMap.email,
      mappingConfirmed,
      snapshotStatus,
      filters.rules.length,
      exclusions.rules.length,
      eligibleCount,
      senderName,
      senderAddress,
      subject,
      preheader,
      templateId,
      messageBody,
      emailContent,
      personalizationSample,
      startAt,
      timezone,
      batchSize,
      intervalMinutes,
      windowStart,
      windowEnd,
      dailyMax,
    ],
  );

  const dirty = savedFingerprint ? isMarketingBuilderDraftDirty(savedFingerprint, draft) : false;

  const applyDetail = useCallback((campaignRow: MarketingCampaign, version: MarketingCampaignVersion | null) => {
    setCampaign(campaignRow);
    setName(campaignRow.name);
    setInternalDescription(campaignRow.internalDescription ?? "");
    setObjective(campaignRow.objective ?? "");
    setChannel(campaignRow.channel);
    setOwnerUserId(campaignRow.routingPlaceholder.ownerUserId ?? campaignRow.governance.createdByUserId ?? "");
    setTagsText((campaignRow.routingPlaceholder.tags ?? []).join(", "));
    setAudienceId(campaignRow.audienceId ?? "");
    setSenderName(campaignRow.sender.fromName);
    setSenderAddress(campaignRow.sender.fromAddress);
    setSubject(version?.subject ?? "");
    setPreheader(version?.previewText ?? "");
    setTemplateId(campaignRow.templateId ?? campaignRow.whatsappTemplateId ?? "");
    setMessageBody(bodyFromContent(version));
    setEmailContent(documentFromVersion(version));
    setEditorNonce((value) => value + 1);
    setStartAt((campaignRow.schedulePlaceholder.startAt ?? campaignRow.batchPolicy?.startAt ?? "").slice(0, 16));
    setTimezone(
      (campaignRow.batchPolicy?.timezone as (typeof MARKETING_BUILDER_TIMEZONES)[number]) ?? "Asia/Kolkata",
    );
    setBatchSize(campaignRow.batchPolicy?.batchSize ?? MARKETING_DEFAULT_BATCH_POLICY.batchSize);
    setIntervalMinutes(
      Math.round((campaignRow.batchPolicy?.intervalMs ?? MARKETING_DEFAULT_BATCH_POLICY.intervalMs) / 60000),
    );
    setWindowStart(campaignRow.batchPolicy?.sendWindowStart ?? MARKETING_DEFAULT_BATCH_POLICY.sendWindowStart);
    setWindowEnd(campaignRow.batchPolicy?.sendWindowEnd ?? MARKETING_DEFAULT_BATCH_POLICY.sendWindowEnd);
    setDailyMax(campaignRow.batchPolicy?.dailyMax ?? MARKETING_DEFAULT_BATCH_POLICY.dailyMax);
    setPersonalizationSample({
      ...MARKETING_PERSONALIZATION_FALLBACKS,
      senderName: campaignRow.sender.fromName || MARKETING_PERSONALIZATION_FALLBACKS.senderName,
    });
  }, []);

  const loadCampaign = useCallback(async () => {
    const res = await authenticatedJsonFetch(
      `/api/admin/marketing/campaigns?id=${encodeURIComponent(campaignId)}`,
    );
    const body = (await res.json()) as ApiEnvelope<{
      campaign: MarketingCampaign;
      draft: MarketingCampaignVersion | null;
    }>;
    if (!res.ok || !body.success || !body.data) {
      throw new Error(body.error?.message ?? "Failed to load campaign");
    }
    applyDetail(body.data.campaign, body.data.draft);
    return body.data;
  }, [applyDetail, campaignId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [detail, sourceRes, tplRes] = await Promise.all([
          loadCampaign(),
          authenticatedJsonFetch("/api/admin/marketing/data-sources"),
          authenticatedJsonFetch("/api/admin/marketing/campaigns?view=templates"),
        ]);
        if (cancelled) return;
        if (sourceRes.ok) {
          const sourceBody = (await sourceRes.json()) as ApiEnvelope<{
            bindings: Array<{ id: string; displayName: string }>;
          }>;
          setBindings(sourceBody.data?.bindings ?? []);
        }
        if (tplRes.ok) {
          const tplBody = (await tplRes.json()) as ApiEnvelope<{ templates: MarketingContentTemplate[] }>;
          setTemplates(tplBody.data?.templates ?? []);
        }
        if (detail.campaign.audienceId) {
          const audRes = await authenticatedJsonFetch("/api/admin/marketing/audiences");
          if (audRes.ok) {
            const audBody = (await audRes.json()) as ApiEnvelope<{ audiences: MarketingAudienceDefinition[] }>;
            const audience = audBody.data?.audiences.find((row) => row.id === detail.campaign.audienceId);
            if (audience) {
              setBindingId(audience.bindingId);
              setDatasetId(audience.datasetId);
              setColumnMap(audience.columnMap ?? { email: "" });
              setMappingConfirmed(audience.mappingConfirmed);
              setFilters(audience.filterDefinition ?? emptyMarketingFilters());
              setExclusions(audience.exclusionDefinition ?? emptyMarketingFilters());
              setSnapshotStatus(audience.mappingConfirmed ? "Not frozen" : "Unavailable");
            }
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to open Campaign Builder");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCampaign]);

  useEffect(() => {
    if (!loading && campaign) {
      setSavedFingerprint(fingerprintMarketingBuilderDraft(draft));
    }
    // Capture the restored server draft once after load, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, campaign?.id]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = MARKETING_BUILDER_UNSAVED_MESSAGE;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!bindingId) {
      setDatasets([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await authenticatedJsonFetch(
        `/api/admin/marketing/data-sources/${encodeURIComponent(bindingId)}?view=datasets`,
      );
      if (!res.ok || cancelled) return;
      const body = (await res.json()) as ApiEnvelope<{
        datasets: Array<{ externalDatasetId: string; displayName: string }>;
      }>;
      setDatasets(body.data?.datasets ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [bindingId]);

  useEffect(() => {
    if (!bindingId || !datasetId) {
      setHeaders([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await authenticatedJsonFetch(
        `/api/admin/marketing/data-sources/${encodeURIComponent(bindingId)}?view=schema&datasetId=${encodeURIComponent(datasetId)}`,
      );
      if (!res.ok || cancelled) return;
      const body = (await res.json()) as ApiEnvelope<{ schema: { headers: string[] } }>;
      const nextHeaders = body.data?.schema.headers ?? [];
      setHeaders(nextHeaders);
      const suggested = suggestMarketingColumnMap(nextHeaders).suggested;
      setColumnMap((prev) => (prev.email ? prev : suggested));
      setMappingConfirmed(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bindingId, datasetId]);

  async function persistAudience(): Promise<string | null> {
    if (!bindingId || !datasetId || !columnMap.email) return audienceId || null;
    const res = await authenticatedJsonFetch("/api/admin/marketing/audiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert",
        id: audienceId || undefined,
        name: `${name || "Campaign"} audience`,
        bindingId,
        datasetId,
        filterDefinition: filters,
        exclusionDefinition: exclusions,
        columnMap,
        mappingConfirmed,
        confirmMapping: mappingConfirmed,
        headers,
      }),
    });
    const body = (await res.json()) as ApiEnvelope<{ audience: MarketingAudienceDefinition }>;
    if (!res.ok || !body.success || !body.data?.audience) {
      throw new Error(body.error?.message ?? "Audience save failed");
    }
    setAudienceId(body.data.audience.id);
    return body.data.audience.id;
  }

  async function saveDraft(): Promise<boolean> {
    if (!canCreate) {
      toast.error("Not authorised to save drafts");
      return false;
    }
    setBusy(true);
    try {
      const nextAudienceId = await persistAudience();
      const content = emailContent;
      const payload = {
        ...marketingBuilderDraftSavePayload(campaignId, { ...draft, audienceId: nextAudienceId ?? "" }),
        content,
        whatsappTemplateId: channel === "WHATSAPP" ? templateId || null : null,
        templateId: channel === "EMAIL" ? templateId || null : undefined,
      };
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as ApiEnvelope<{ campaign: MarketingCampaign; draft: MarketingCampaignVersion | null }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message ?? "Save Draft failed");
      }
      applyDetail(body.data.campaign, body.data.draft);
      setSavedFingerprint(fingerprintMarketingBuilderDraft({ ...draft, audienceId: nextAudienceId ?? "" }));
      toast.success("Draft saved. Campaign was not approved or sent.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save Draft failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveAsReusableTemplate() {
    if (!templateName.trim()) return;
    setBusy(true);
    try {
      const saved = await saveDraft();
      if (!saved) return;
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_template",
          campaignId,
          templateName: templateName.trim(),
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{ template: MarketingContentTemplate }>;
      if (!res.ok || !body.success || !body.data?.template) {
        throw new Error(body.error?.message ?? "Save as template failed");
      }
      setTemplates((current) => [body.data!.template, ...current.filter((row) => row.id !== body.data!.template.id)]);
      setTemplateId(body.data.template.id);
      toast.success("Reusable organisation template saved. No live send.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save as template failed");
    } finally {
      setBusy(false);
    }
  }

  async function runPreviewEligibility() {
    if (!bindingId || !datasetId) return;
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          audienceId: audienceId || undefined,
          bindingId,
          datasetId,
          filterDefinition: filters,
          exclusionDefinition: exclusions,
          columnMap,
          mappingConfirmed,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{
        preview: {
          counts: MarketingAudiencePreviewResult["counts"];
          sampleRecipients?: MarketingPersonalisationSampleRecipient[];
        };
      }>;
      if (!res.ok || !body.success || !body.data?.preview) {
        throw new Error(body.error?.message ?? "Eligibility preview failed");
      }
      setAudienceCounts(body.data.preview.counts);
      setEligibleCount(body.data.preview.counts.eligible);
      const samples = body.data.preview.sampleRecipients ?? [];
      setSampleRecipients(samples);
      setSelectedSampleId(samples[0]?.id ?? null);
      if (samples[0]) {
        setPersonalizationSample(
          resolvePersonalisationWithFallbacks({
            ...samples[0].values,
            senderName,
          }),
        );
      }
      setSnapshotStatus(mappingConfirmed ? "Not frozen" : "Unavailable");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eligibility preview failed");
      setEligibleCount(null);
      setAudienceCounts(null);
    } finally {
      setBusy(false);
    }
  }

  function continueNext() {
    const gate = validateMarketingBuilderStep(step, draft);
    if (!gate.ok) {
      setGateMessage(gate.message);
      toast.error(gate.message);
      return;
    }
    setGateMessage(null);
    const next = Math.min(6, step + 1);
    setStep(next);
    setMaxReached((prev) => Math.max(prev, next));
  }

  function requestExit() {
    if (dirty) {
      setGuardOpen(true);
      return;
    }
    router.push(ROUTES.ADMIN_MARKETING_REGISTRY);
  }

  const mappedVars = mappedPersonalisationVariables(columnMap);
  const catalogue = buildMarketingPersonalisationCatalogue({
    columnMap,
    mappingConfirmed,
    senderName,
  });
  const unresolved = unresolvedPersonalisationTokens({
    subject,
    preheader,
    messageBody,
    mappedVariables: mappedVars,
    content: emailContent,
  });
  const samplePreview = resolvePersonalisationSamplePreview({
    subject,
    messageBody,
    sample: personalizationSample,
  });
  const localPreviewHtmlDesktop = renderMarketingEmailHtml({
    content: emailContent,
    subject,
    previewText: preheader,
    mode: "desktop",
    personalization: personalizationSample,
  });
  const localPreviewHtmlMobile = renderMarketingEmailHtml({
    content: emailContent,
    subject,
    previewText: preheader,
    mode: "mobile",
    personalization: personalizationSample,
  });
  const previewInspection = inspectMarketingPreviewWorkspace({
    content: emailContent,
    htmlDesktop: localPreviewHtmlDesktop,
    htmlMobile: localPreviewHtmlMobile,
  });
  const workspacePreview = campaign
    ? {
        campaignId,
        versionId: campaign.currentDraftVersionId,
        versionNumber: 1,
        subject: samplePreview.subject,
        previewText: applyPersonalization(preheader || "(no preheader)", personalizationSample),
        preheader: applyPersonalization(preheader || "(no preheader)", personalizationSample),
        sender: { fromName: senderName, fromAddress: senderAddress },
        htmlDesktop: localPreviewHtmlDesktop,
        htmlMobile: localPreviewHtmlMobile,
        plaintext: samplePreview.body,
        plainTextIsOverride: false,
        personalizationSample,
        sampleRecipientAvailable: Boolean(selectedSampleId && sampleRecipients.length),
        sampleRecipientLabel: sampleRecipients.find((row) => row.id === selectedSampleId)?.label ?? null,
        sampleSource: sampleRecipients.length ? ("audience_preview" as const) : ("unavailable" as const),
        linkInventory: previewInspection.linkInventory,
        missingImageWarnings: previewInspection.missingImageWarnings,
        unsubscribeVerified: previewInspection.unsubscribeVerified,
        utm: null,
        trackingEnabled: false,
        notice: sampleRecipients.length
          ? "Resolved from audience preview"
          : "Sample recipient unavailable until audience preview has an eligible row",
      }
    : null;
  const delivery = estimateMarketingDeliveryPlan({
    startAt,
    batchSize,
    intervalMs: intervalMinutes * 60_000,
    dailyMax,
    eligibleCount,
  });
  const review = campaign
    ? composeMarketingBuilderReview({
        draft,
        status: campaign.status,
        actor: ACTOR,
        executionEnabled: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
        prePublish,
      })
    : null;
  const readiness = campaign
    ? composeMarketingReadinessReview({
        campaign,
        version: {
          id: campaign.currentDraftVersionId,
          campaignId: campaign.id,
          versionNumber: 1,
          immutable: campaign.status === "APPROVED" || campaign.status === "SCHEDULED",
          frozenAt: campaign.governance.approvedAt,
          frozenReason: campaign.governance.approvedAt ? "APPROVED" : null,
          subject,
          previewText: preheader,
          content: emailContent,
          trackingEnabled: false,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
        },
        ownerUserId,
        workbookName: bindings.find((row) => row.id === bindingId)?.displayName ?? null,
        tabName: datasets.find((row) => row.externalDatasetId === datasetId)?.displayName ?? null,
        columnMap,
        preview: audienceCounts ? { counts: audienceCounts } : null,
        excludedCount: exclusions.rules.length,
        unresolvedWarnings: unresolved,
        latestTestSend: testHistory[0] ?? null,
        batchPolicy: {
          batchSize,
          intervalMs: intervalMinutes * 60_000,
          dailyMax,
          sendWindowStart: windowStart,
          sendWindowEnd: windowEnd,
          timezone,
          startAt: startAt || null,
          endAt: null,
        },
      })
    : null;
  const deliveryOps = projectMarketingDeliveryOperations(executionSummary);

  async function loadReview() {
    const [preRes, execRes] = await Promise.all([
      authenticatedJsonFetch(
        `/api/admin/marketing/campaigns?id=${encodeURIComponent(campaignId)}&view=pre-publish`,
      ),
      authenticatedJsonFetch(
        `/api/admin/marketing/campaigns?id=${encodeURIComponent(campaignId)}&view=execution`,
      ),
    ]);
    const preBody = (await preRes.json()) as ApiEnvelope<{ checks: MarketingPrePublishCheckResult }>;
    if (preRes.ok && preBody.data?.checks) setPrePublish(preBody.data.checks);
    const execBody = (await execRes.json()) as ApiEnvelope<{ execution: MarketingExecutionSummary }>;
    if (execRes.ok && execBody.data?.execution) setExecutionSummary(execBody.data.execution);
  }

  async function transition(lifecycleAction: "SUBMIT_FOR_REVIEW" | "APPROVE") {
    setBusy(true);
    try {
      const saved = await saveDraft();
      if (!saved) return;
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transition", campaignId, lifecycleAction }),
      });
      const body = (await res.json()) as ApiEnvelope<{ campaign: MarketingCampaign }>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message ?? `${lifecycleAction} failed`);
      }
      toast.success(`${lifecycleAction} recorded. No live send.`);
      await loadCampaign();
      await loadReview();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${lifecycleAction} failed`);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (step === 6) void loadReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function addRule(target: "filters" | "exclusions") {
    const rule = { id: `rule-${Date.now()}`, field: headers[0] ?? "", op: "eq" as const, value: "" };
    if (target === "filters") setFilters((prev) => ({ ...prev, rules: [...prev.rules, rule] }));
    else setExclusions((prev) => ({ ...prev, rules: [...prev.rules, rule] }));
  }

  const currentStep = MARKETING_CAMPAIGN_BUILDER_STEPS[step - 1];

  return (
    <div className="mkt-cc mkt-cc-page mkt-builder-shell">
      <header className="mkt-builder-header">
        <div>
          <p className="mkt-cc-kicker">Marketing · Campaign Builder</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="mkt-cc-title">{name || "Untitled campaign"}</h1>
            <span className="mkt-builder-status">
              {campaign ? MARKETING_CAMPAIGN_STATUS_LABELS[campaign.status] : "Loading"}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Full-page guided authoring. Save Draft never approves or launches.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={requestExit}>
            Exit to Campaign Registry
          </Button>
          <Button type="button" className="rounded-xl" disabled={busy || !canCreate} onClick={() => void saveDraft()}>
            <Save className="mr-2 h-4 w-4" aria-hidden />
            Save Draft
          </Button>
        </div>
      </header>

      {!ENTERPRISE_MARKETING_EXECUTION_ENABLED ? (
        <div className="mkt-cc-banner" role="status">
          {MARKETING_TEST_MODE_BANNER}
        </div>
      ) : null}

      <div className="mkt-builder-progress">
        <p className="mkt-builder-progress-status" aria-live="polite">
          Step {step} of {MARKETING_CAMPAIGN_BUILDER_STEPS.length} · {currentStep.title}
        </p>
        <nav className="mkt-builder-rail" aria-label="Campaign builder steps">
          {MARKETING_CAMPAIGN_BUILDER_STEPS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`mkt-builder-rail-step ${item.number === step ? "is-current" : ""} ${item.number < step ? "is-done" : ""}`}
              disabled={item.number > maxReached}
              aria-current={item.number === step ? "step" : undefined}
              onClick={() => {
                if (item.number > step) {
                  const gate = validateMarketingBuilderStep(step, draft);
                  if (!gate.ok) {
                    setGateMessage(gate.message);
                    toast.error(gate.message);
                    return;
                  }
                }
                setStep(item.number);
              }}
            >
              <p className="mkt-builder-rail-number text-xs font-semibold text-muted-foreground">
                Step {item.number}
              </p>
              <p className="mkt-builder-rail-title mt-1 text-sm font-semibold">{item.title}</p>
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Restoring campaign draft…
        </p>
      ) : error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <section className="mkt-builder-canvas" aria-labelledby="mkt-builder-step-title">
          <h2 id="mkt-builder-step-title" className="text-xl font-semibold tracking-tight">
            {currentStep.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{currentStep.description}</p>
          {gateMessage ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {gateMessage}
            </p>
          ) : null}

          {step === 1 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="mkt-builder-name">Campaign name</Label>
                <Input id="mkt-builder-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="mkt-builder-desc">Internal description</Label>
                <Textarea id="mkt-builder-desc" value={internalDescription} onChange={(e) => setInternalDescription(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Objective</Label>
                <Select value={objective || undefined} onValueChange={setObjective}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select objective" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETING_CAMPAIGN_OBJECTIVE_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select
                  value={channel}
                  onValueChange={(value) => {
                    if (value === "EMAIL") setChannel("EMAIL");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETING_BUILDER_CHANNEL_PICKER_OPTIONS.map((item) => {
                      const contract = MARKETING_CHANNEL_CONTRACTS[item.kind];
                      const label = item.selectable
                        ? contract.label
                        : `${contract.label} — ${MARKETING_CHANNEL_NOT_CONFIGURED_LABEL}`;
                      return (
                        <SelectItem key={item.persistedValue} value={item.persistedValue} disabled={!item.selectable}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Email is the operational channel. WhatsApp, SMS, Messenger, digital advertising audience, and
                  landing-page campaigns are {MARKETING_CHANNEL_NOT_CONFIGURED_LABEL}.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-builder-owner">Owner</Label>
                <Input id="mkt-builder-owner" value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-builder-tags">Tags</Label>
                <Input
                  id="mkt-builder-tags"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="Comma-separated"
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold">Audience source</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Authorised workbook</Label>
                  <Select value={bindingId || undefined} onValueChange={setBindingId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select authorised workbook" />
                    </SelectTrigger>
                    <SelectContent>
                      {bindings.map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {row.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Worksheet tab</Label>
                  <Select value={datasetId || undefined} onValueChange={setDatasetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tab" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map((row) => (
                        <SelectItem key={row.externalDatasetId} value={row.externalDatasetId}>
                          {row.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <h3 className="font-semibold">Column mapping</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {(["email", "name", "mobile", "location"] as const).map((key) => (
                  <div key={key} className="space-y-1.5">
                    <Label>Map {key}</Label>
                    <Select
                      value={(typeof columnMap[key] === "string" && columnMap[key]) || undefined}
                      onValueChange={(value) => {
                        setColumnMap((prev) => ({ ...prev, [key]: value }));
                        setMappingConfirmed(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${key} column`} />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header) => (
                          <SelectItem key={`${key}-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <Button type="button" variant={mappingConfirmed ? "secondary" : "default"} disabled={!columnMap.email} onClick={() => setMappingConfirmed(true)}>
                {mappingConfirmed ? "Mapping confirmed" : "Confirm mapping"}
              </Button>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Filters</h3>
                    <Button type="button" size="sm" variant="outline" onClick={() => addRule("filters")}>
                      Add filter
                    </Button>
                  </div>
                  {filters.rules.map((rule, index) => (
                    <div key={rule.id} className="mt-2 grid grid-cols-3 gap-2">
                      <Input
                        value={rule.field}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            rules: prev.rules.map((item, i) => (i === index ? { ...item, field: e.target.value } : item)),
                          }))
                        }
                        placeholder="Field"
                      />
                      <Select
                        value={rule.op}
                        onValueChange={(value) =>
                          setFilters((prev) => ({
                            ...prev,
                            rules: prev.rules.map((item, i) =>
                              i === index ? { ...item, op: value as (typeof MARKETING_FILTER_OPS)[number] } : item,
                            ),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MARKETING_FILTER_OPS.map((op) => (
                            <SelectItem key={op} value={op}>
                              {op}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={typeof rule.value === "string" ? rule.value : ""}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            rules: prev.rules.map((item, i) => (i === index ? { ...item, value: e.target.value } : item)),
                          }))
                        }
                        placeholder="Value"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Exclusions</h3>
                    <Button type="button" size="sm" variant="outline" onClick={() => addRule("exclusions")}>
                      Add exclusion
                    </Button>
                  </div>
                  {exclusions.rules.map((rule) => (
                    <p key={rule.id} className="mt-2 text-sm text-muted-foreground">
                      {rule.field || "(field)"} {rule.op} {typeof rule.value === "string" ? rule.value : ""}
                    </p>
                  ))}
                </div>
              </div>
              <h3 className="font-semibold">Eligibility preview</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" disabled={busy} onClick={() => void runPreviewEligibility()}>
                  Eligibility preview
                </Button>
                <p className="text-sm">Eligible: {eligibleCount ?? "Unavailable"}</p>
                <p className="text-sm">Snapshot: {snapshotStatus}</p>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {channel === "EMAIL" ? (
                <>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-builder-from-name">Sender name</Label>
                <Input id="mkt-builder-from-name" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-builder-from-address">Sender address</Label>
                <Input id="mkt-builder-from-address" value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} />
              </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="mkt-builder-subject">Subject</Label>
                    <Input id="mkt-builder-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="mkt-builder-preheader">Preheader</Label>
                    <Input id="mkt-builder-preheader" value={preheader} onChange={(e) => setPreheader(e.target.value)} />
                  </div>
                <div className="space-y-4 md:col-span-2">
                  <h3 className="font-semibold">Template gallery</h3>
                  <MarketingTemplateGallery
                    organizationId={campaign?.organizationId ?? "local"}
                    saved={templates}
                    onUse={(next) => {
                      setTemplateId(next.templateId);
                      setSubject(next.subject);
                      setPreheader(next.previewText);
                      setEmailContent(next.content);
                      setMessageBody(paragraphTextFromDocument(next.content));
                      setEditorNonce((value) => value + 1);
                      toast.success("Template applied to the visual editor. Save Draft to persist.");
                    }}
                  />
                  <h3 className="font-semibold">Visual editor</h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="mkt-builder-message">Message editor</Label>
                    <textarea
                      id="mkt-builder-message"
                      className="sr-only"
                      value={messageBody}
                      readOnly
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <MarketingVisualEmailEditor
                      key={editorNonce}
                      document={emailContent}
                      subject={subject}
                      previewText={preheader}
                      onChange={(next) => {
                        setEmailContent(next);
                        setMessageBody(paragraphTextFromDocument(next));
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-56 flex-1 space-y-1.5">
                      <Label htmlFor="mkt-builder-template-name">Save as reusable template</Label>
                      <Input
                        id="mkt-builder-template-name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Organisation template name"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy || !templateName.trim()}
                      onClick={() => void saveAsReusableTemplate()}
                    >
                      Save as template
                    </Button>
                  </div>
                </div>
                </>
              ) : (
                <div
                  className="md:col-span-2 rounded-md border border-dashed p-4"
                  data-mkt-channel-surface="not_configured"
                >
                  <p className="font-semibold">{MARKETING_CHANNEL_NOT_CONFIGURED_LABEL}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Email remains the operational channel. WhatsApp, SMS, Messenger, digital advertising audience, and
                    landing-page campaigns are domain contracts only and cannot execute.
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="mt-6 space-y-6">
              <h3 className="font-semibold">Available mapped variables</h3>
              <MarketingPersonalisationCatalogue
                entries={catalogue}
                onInsert={(token, target) => {
                  if (target === "subject") setSubject((value) => insertPersonalisationTokenIntoText(value, token));
                  else if (target === "preheader") setPreheader((value) => insertPersonalisationTokenIntoText(value, token));
                  else {
                    setEmailContent((current) => insertPersonalisationTokenIntoDocument(current, token));
                    setEditorNonce((value) => value + 1);
                  }
                }}
              />
              <section>
                <h3 className="font-semibold">Fallbacks</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {personalisationFallbackEntries().map(([token, fallback]) => (
                    <li key={token}>
                      {token}: {fallback || "(empty)"}
                    </li>
                  ))}
                </ul>
              </section>
              <h3 className="font-semibold">Resolved sample preview</h3>
              <MarketingPreviewWorkspace
                preview={workspacePreview}
                samples={sampleRecipients}
                selectedSampleId={selectedSampleId}
                onSelectSample={(id) => {
                  const sample = sampleRecipients.find((row) => row.id === id);
                  setSelectedSampleId(id);
                  if (sample) {
                    setPersonalizationSample(
                      resolvePersonalisationWithFallbacks({ ...sample.values, senderName }),
                    );
                  }
                }}
              />
              {unresolved.length ? (
                <p className="text-sm text-destructive" role="alert">
                  Unresolved variables: {unresolved.join(", ")}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No unresolved-variable warnings.</p>
              )}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="mkt-builder-start">Start</Label>
                <Input id="mkt-builder-start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-builder-timezone">Timezone</Label>
                <Select value={timezone} onValueChange={(value) => setTimezone(value as typeof timezone)}>
                  <SelectTrigger id="mkt-builder-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETING_BUILDER_TIMEZONES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground md:col-span-2">
                Default pacing: {batchSize} eligible recipients every {intervalMinutes} minutes. Daily window {windowStart}
                –{windowEnd}. Daily cap {dailyMax}.
              </p>
              <details className="mkt-advanced-pacing md:col-span-2">
                <summary>Advanced pacing</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="mkt-builder-batch">Batch size</Label>
                <Input id="mkt-builder-batch" type="number" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-builder-interval">Interval (minutes)</Label>
                <Input
                  id="mkt-builder-interval"
                  type="number"
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-builder-window-start">Daily window start</Label>
                <Input id="mkt-builder-window-start" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-builder-window-end">Daily window end</Label>
                <Input id="mkt-builder-window-end" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-builder-cap">Daily cap</Label>
                <Input id="mkt-builder-cap" type="number" value={dailyMax} onChange={(e) => setDailyMax(Number(e.target.value))} />
              </div>
                </div>
              </details>
              <div className="rounded-xl border p-4 text-sm md:col-span-2">
                <p>First batch: {delivery.firstBatch}</p>
                <p>Batch count: {delivery.batchCount}</p>
                <p>Completion estimate: {delivery.completionEstimate}</p>
              </div>
            </div>
          ) : null}

          {step === 6 && review && readiness ? (
            <div className="mt-6 space-y-6">
              <h3 className="font-semibold">Review and Approval</h3>
              <MarketingReadinessReview model={readiness} blockers={review.blockers} />
              <p className="text-base font-medium">{review.readySummary}</p>
              <p className="text-sm">Test status: {review.testStatus}</p>
              {review.warnings.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {review.warnings.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              <MarketingControlledTestPanel campaignId={campaignId} history={testHistory} onHistory={setTestHistory} />
              <MarketingDeliveryOperationsPanel
                campaignId={campaignId}
                actor={ACTOR}
                display={deliveryOps}
                onRefresh={() => {
                  void loadReview();
                  void loadCampaign();
                }}
              />
              <div className="mkt-production-lane space-y-3">
              <h3 className="font-semibold">Production approval & launch</h3>
                <p className="text-sm text-muted-foreground">{MARKETING_LIVE_PROVIDER_SENDING_DISABLED}</p>
                <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void transition("SUBMIT_FOR_REVIEW")}
                >
                  Submit for review
                </Button>
                <Button
                  type="button"
                  disabled={busy || !review.canApprove}
                  title={review.approveReason ?? undefined}
                  onClick={() => void transition("APPROVE")}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled
                  title={review.launchReason ?? "Launch unavailable"}
                >
                  Schedule / Launch
                </Button>
                </div>
                {review.launchReason ? <p className="text-sm text-muted-foreground">{review.launchReason}</p> : null}
                {review.approveReason ? <p className="text-sm text-muted-foreground">{review.approveReason}</p> : null}
              </div>
            </div>
          ) : null}
        </section>
      )}

      <footer className="mkt-builder-footer">
        <Button type="button" variant="ghost" disabled={busy || step === 1} onClick={() => setStep((prev) => Math.max(1, prev - 1))}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void saveDraft()}>
            Save Draft
          </Button>
          {step < 6 ? (
            <Button type="button" disabled={busy || loading} onClick={continueNext}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </footer>

      {guardOpen ? (
        <div
          className="mkt-builder-guard"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="mkt-unsaved-title"
          aria-describedby="mkt-unsaved-desc"
        >
          <div className="mkt-cc-panel max-w-lg space-y-4">
            <h2 id="mkt-unsaved-title" className="text-lg font-semibold">
              {MARKETING_BUILDER_UNSAVED_TITLE}
            </h2>
            <p id="mkt-unsaved-desc" className="text-sm text-muted-foreground">{MARKETING_BUILDER_UNSAVED_MESSAGE}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={async () => {
                  const ok = await saveDraft();
                  if (ok) router.push(ROUTES.ADMIN_MARKETING_REGISTRY);
                }}
              >
                Save Draft
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setGuardOpen(false);
                  setSavedFingerprint(fingerprintMarketingBuilderDraft(draft));
                  router.push(ROUTES.ADMIN_MARKETING_REGISTRY);
                }}
              >
                Discard
              </Button>
              <Button type="button" variant="outline" onClick={() => setGuardOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
