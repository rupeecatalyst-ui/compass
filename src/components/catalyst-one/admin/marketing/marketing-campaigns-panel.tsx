"use client";

/**
 * CO-MARKETING-MKT-04 / MKT-05 / ACTIVATION-002 — Campaign Builder + controlled test execution.
 * Live unrestricted bulk send remains OFF. Controlled batches are SIMULATED (dry-run).
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Eye,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  LayoutTemplate,
  Smartphone,
  Monitor,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  MARKETING_CHANNELS,
  MARKETING_CONTENT_BLOCK_LABELS,
  MARKETING_CONTENT_BLOCK_TYPES,
  MARKETING_PERSONALIZATION_TOKENS,
  MARKETING_CAMPAIGN_STATUS_LABELS,
  MARKETING_LEGAL_TRANSITIONS,
  MARKETING_DEFAULT_BATCH_POLICY,
  MARKETING_CONTROLLED_TEST_BATCH_SIZES,
  MARKETING_CAMPAIGN_BUILDER_STEPS,
  MARKETING_CAMPAIGN_OBJECTIVE_OPTIONS,
  MARKETING_AUDIENCE_CATEGORY_OPTIONS,
  ENTERPRISE_MARKETING_EXECUTION_DRY_RUN_ENABLED,
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  type MarketingCampaignAction,
} from "@/constants/enterprise-marketing-engine";
import { ROUTES } from "@/constants/routes";
import {
  createBlock,
  syncCampaignFormFieldsIntoContent,
} from "@/lib/enterprise-marketing-engine/content-blocks";
import { cn } from "@/lib/utils";
import {
  defaultPersonalizationSample,
  listPersonalizationTokensInText,
  scanDocumentTokens,
} from "@/lib/enterprise-marketing-engine/personalization";
import type {
  MarketingCampaign,
  MarketingCampaignPreviewPayload,
  MarketingCampaignVersion,
  MarketingContentBlock,
  MarketingContentDocument,
  MarketingContentTemplate,
  MarketingPrePublishCheckResult,
  MarketingSenderIdentityDraft,
  MarketingUtmConfig,
  MarketingRoutingPlaceholder,
} from "@/types/enterprise-marketing-campaign";
import type {
  MarketingBatchPolicy,
  MarketingExecutionSummary,
} from "@/types/enterprise-marketing-execution";
import type { MarketingAudienceDefinition } from "@/types/enterprise-marketing-audience";
import { MarketingModuleNav } from "./marketing-module-nav";
import { toast } from "sonner";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

type CampaignDetail = {
  campaign: MarketingCampaign;
  draft: MarketingCampaignVersion | null;
  versions: MarketingCampaignVersion[];
  editPolicy?: {
    contentEditable: boolean;
    metadataEditable: boolean;
    readOnly: boolean;
    operationalControlsOnly: boolean;
  };
};


function blockSummary(b: MarketingContentBlock): string {
  const label = MARKETING_CONTENT_BLOCK_LABELS[b.type] ?? b.type;
  const title =
    (typeof b.props.title === "string" && b.props.title) ||
    (typeof b.props.label === "string" && b.props.label) ||
    (typeof b.props.html === "string" && b.props.html.slice(0, 40)) ||
    (typeof b.props.text === "string" && b.props.text.slice(0, 40)) ||
    "";
  return `${label}${title ? ` — ${title}` : ""}`;
}

const PERSONALIZATION_TOKEN_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  fullName: "Full name",
  city: "City",
  state: "State",
  profession: "Profession",
  company: "Company",
  companyName: "Company name",
  product: "Loan product",
  senderName: "RM / sender name",
};

function personalizationTokenLabel(token: string): string {
  return PERSONALIZATION_TOKEN_LABELS[token] ?? token;
}

function resolveObjectivePreset(value: string): string {
  if (!value) return "";
  const match = MARKETING_CAMPAIGN_OBJECTIVE_OPTIONS.find(
    (o) => o !== "Other" && o.toLowerCase() === value.toLowerCase(),
  );
  return match ?? (value ? "Other" : "");
}

function primaryTextBlockId(doc: MarketingContentDocument | null): string | null {
  return doc?.blocks.find((b) => b.type === "text")?.id ?? null;
}

function collectUsedPersonalizationTokens(input: {
  subject: string;
  previewText: string;
  content: MarketingContentDocument | null;
}): string[] {
  const tokens = new Set<string>();
  for (const tok of listPersonalizationTokensInText(input.subject)) tokens.add(tok);
  for (const tok of listPersonalizationTokensInText(input.previewText)) tokens.add(tok);
  if (input.content) {
    for (const tok of scanDocumentTokens(input.content)) tokens.add(tok);
  }
  return [...tokens];
}

function validateBuilderStep(
  step: number,
  fields: {
    name: string;
    audienceId: string;
    subject: string;
    sender: MarketingSenderIdentityDraft;
    channel: (typeof MARKETING_CHANNELS)[number];
    contentSourceMode: "existing" | "new";
    content: MarketingContentDocument | null;
    sendMode: "immediate" | "scheduled";
    scheduleStartAt: string;
  },
): { ok: true } | { ok: false; message: string } {
  switch (step) {
    case 1:
      if (!fields.name.trim()) {
        return { ok: false, message: "Campaign name is required before continuing." };
      }
      return { ok: true };
    case 2:
      if (!fields.audienceId) {
        return {
          ok: false,
          message: "Select a saved audience before continuing. Create one in Audiences first.",
        };
      }
      return { ok: true };
    case 3:
      if (!fields.subject.trim()) {
        return { ok: false, message: "Subject is required before continuing." };
      }
      if (!fields.sender.fromAddress.trim()) {
        return { ok: false, message: "Sender address is required before continuing." };
      }
      if (fields.channel === "EMAIL" && fields.contentSourceMode === "new") {
        const textBlock = fields.content?.blocks.find((b) => b.type === "text");
        const html = typeof textBlock?.props.html === "string" ? textBlock.props.html.trim() : "";
        if (!html) {
          return {
            ok: false,
            message: "Email body is required — enter the main message in the Email Body block.",
          };
        }
      }
      return { ok: true };
    case 5:
      if (fields.sendMode === "scheduled" && !fields.scheduleStartAt.trim()) {
        return { ok: false, message: "Select a schedule date and time before continuing." };
      }
      return { ok: true };
    default:
      return { ok: true };
  }
}

export function MarketingCampaignsPanel() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [audiences, setAudiences] = useState<MarketingAudienceDefinition[]>([]);
  const [senderIdentities, setSenderIdentities] = useState<
    Array<{
      id: string;
      displayName: string;
      fromAddress: string;
      replyTo?: string | null;
      active: boolean;
    }>
  >([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<
    Array<{ id: string; name: string; approvalState: string; active: boolean }>
  >([]);
  const [senderIdentityId, setSenderIdentityId] = useState("");
  const [whatsappTemplateId, setWhatsappTemplateId] = useState("");
  const [templates, setTemplates] = useState<MarketingContentTemplate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [preview, setPreview] = useState<MarketingCampaignPreviewPayload | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | "plaintext">("desktop");

  // Editable fields
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [internalDescription, setInternalDescription] = useState("");
  const [product, setProduct] = useState("");
  const [audienceId, setAudienceId] = useState("");
  const [channel, setChannel] = useState<(typeof MARKETING_CHANNELS)[number]>("EMAIL");
  const [sender, setSender] = useState<MarketingSenderIdentityDraft>({
    fromName: "",
    fromAddress: "",
    replyTo: "",
  });
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [plainTextOverride, setPlainTextOverride] = useState("");
  const [utm, setUtm] = useState<MarketingUtmConfig>({
    source: "email",
    medium: "marketing",
    campaign: "",
    content: null,
    term: null,
  });
  const [personalizationDraft, setPersonalizationDraft] = useState<Record<string, string>>(
    defaultPersonalizationSample(),
  );
  const [content, setContent] = useState<MarketingContentDocument | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [prePublish, setPrePublish] = useState<MarketingPrePublishCheckResult | null>(null);
  const [routingMode, setRoutingMode] =
    useState<MarketingRoutingPlaceholder["mode"]>("UNCONFIGURED");
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);
  const [batchPolicy, setBatchPolicy] = useState<MarketingBatchPolicy>({
    ...MARKETING_DEFAULT_BATCH_POLICY,
  });
  const [scheduleStartAt, setScheduleStartAt] = useState("");
  const [testBatchSize, setTestBatchSize] =
    useState<(typeof MARKETING_CONTROLLED_TEST_BATCH_SIZES)[number]>(5);
  const [execution, setExecution] = useState<MarketingExecutionSummary | null>(null);

  const [builderStep, setBuilderStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [audienceCategory, setAudienceCategory] = useState("");
  const [audienceEstimate, setAudienceEstimate] = useState<number | null>(null);
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [contentSourceMode, setContentSourceMode] = useState<"existing" | "new">("new");
  const [sendMode, setSendMode] = useState<"immediate" | "scheduled">("immediate");
  const [objectivePreset, setObjectivePreset] = useState("");
  const [showAdvancedTracking, setShowAdvancedTracking] = useState(false);
  const [showSimulatedBatch, setShowSimulatedBatch] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const step3PreviewTriggered = useRef(false);
  const step4PreviewTriggered = useRef(false);

  const loadList = useCallback(async () => {
    const [campRes, audRes, tplRes, senderRes, waRes] = await Promise.all([
      authenticatedJsonFetch("/api/admin/marketing/campaigns"),
      authenticatedJsonFetch("/api/admin/marketing/audiences"),
      authenticatedJsonFetch("/api/admin/marketing/campaigns?view=templates"),
      authenticatedJsonFetch("/api/admin/marketing/sender-identities"),
      authenticatedJsonFetch("/api/admin/marketing/whatsapp?activeOnly=1"),
    ]);
    const campBody = (await campRes.json()) as ApiEnvelope<{ campaigns: MarketingCampaign[] }>;
    if (!campRes.ok || !campBody.success || !campBody.data) {
      throw new Error(campBody.error?.message || "Failed to load campaigns");
    }
    setCampaigns(campBody.data.campaigns);

    if (audRes.ok) {
      const audBody = (await audRes.json()) as ApiEnvelope<{
        audiences: MarketingAudienceDefinition[];
      }>;
      if (audBody.success && audBody.data) setAudiences(audBody.data.audiences);
    }
    if (tplRes.ok) {
      const tplBody = (await tplRes.json()) as ApiEnvelope<{
        templates: MarketingContentTemplate[];
      }>;
      if (tplBody.success && tplBody.data) setTemplates(tplBody.data.templates);
    }
    if (senderRes.ok) {
      const senderBody = (await senderRes.json()) as ApiEnvelope<{
        identities: Array<{
          id: string;
          displayName: string;
          fromAddress: string;
          replyTo?: string | null;
          active: boolean;
        }>;
      }>;
      if (senderBody.success && senderBody.data) setSenderIdentities(senderBody.data.identities);
    }
    if (waRes.ok) {
      const waBody = (await waRes.json()) as ApiEnvelope<{
        templates: Array<{ id: string; name: string; approvalState: string; active: boolean }>;
      }>;
      if (waBody.success && waBody.data) setWhatsappTemplates(waBody.data.templates);
    }
  }, []);

  const loadExecution = useCallback(async (id: string) => {
    const res = await authenticatedJsonFetch(
      `/api/admin/marketing/campaigns?id=${encodeURIComponent(id)}&view=execution`,
    );
    const body = (await res.json()) as ApiEnvelope<
      CampaignDetail & { execution?: MarketingExecutionSummary }
    >;
    if (res.ok && body.success && body.data?.execution) {
      setExecution(body.data.execution);
    } else {
      setExecution(null);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await authenticatedJsonFetch(`/api/admin/marketing/campaigns?id=${encodeURIComponent(id)}`);
    const body = (await res.json()) as ApiEnvelope<CampaignDetail>;
    if (!res.ok || !body.success || !body.data) {
      throw new Error(body.error?.message || "Failed to load campaign");
    }
    const d = body.data;
    setDetail(d);
    setSelectedId(d.campaign.id);
    setName(d.campaign.name);
    setObjective(d.campaign.objective ?? "");
    setInternalDescription(d.campaign.internalDescription ?? "");
    setProduct(d.campaign.product ?? "");
    setAudienceId(d.campaign.audienceId ?? "");
    setChannel(d.campaign.channel);
    setSenderIdentityId(d.campaign.senderIdentityId ?? "");
    setWhatsappTemplateId(d.campaign.whatsappTemplateId ?? "");
    setSender(d.campaign.sender);
    setSubject(d.draft?.subject ?? "");
    setPreviewText(d.draft?.previewText ?? "");
    setDisclaimer(d.draft?.disclaimer ?? "");
    setCtaLabel(d.draft?.ctaLabel ?? "");
    setCtaUrl(d.draft?.ctaUrl ?? "");
    setTrackingEnabled(d.draft?.trackingEnabled ?? true);
    setPlainTextOverride(d.draft?.plainTextOverride ?? "");
    setUtm(
      d.draft?.utm ?? {
        source: "email",
        medium: "marketing",
        campaign: d.campaign.name || "",
        content: null,
        term: null,
      },
    );
    setPersonalizationDraft({
      ...defaultPersonalizationSample(),
      senderName: d.campaign.sender.fromName || "Rupee Catalyst Campaigns",
    });
    setContent(d.draft?.content ?? null);
    setSelectedBlockId(d.draft?.content.blocks[0]?.id ?? "");
    setRoutingMode(d.campaign.routingPlaceholder.mode);
    setNotifyInApp(d.campaign.notificationPlaceholder.inApp);
    setNotifyEmail(d.campaign.notificationPlaceholder.email);
    setNotifyWhatsapp(d.campaign.notificationPlaceholder.whatsapp);
    setBatchPolicy(d.campaign.batchPolicy ?? { ...MARKETING_DEFAULT_BATCH_POLICY });
    const startAt =
      d.campaign.schedulePlaceholder?.startAt?.slice(0, 16) ||
      d.campaign.batchPolicy?.startAt?.slice(0, 16) ||
      "";
    setScheduleStartAt(startAt);
    setPreview(null);
    setBuilderStep(1);
    setMaxStepReached(1);
    setAudienceEstimate(null);
    setAudienceCategory("");
    setTestRecipientEmail("");
    setContentSourceMode("new");
    setSendMode(startAt ? "scheduled" : "immediate");
    setObjectivePreset(resolveObjectivePreset(d.campaign.objective ?? ""));
    setPrePublish(null);
    setShowVersionHistory(false);
    await loadExecution(d.campaign.id);
  }, [loadExecution]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadList();
      if (selectedId) await loadDetail(selectedId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [loadList, loadDetail, selectedId]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  const createCampaign = async (fromTemplateId?: string) => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: "New campaign",
          channel: "EMAIL",
          templateId: fromTemplateId,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<CampaignDetail>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Create failed");
      }
      toast.success("Campaign created (draft)");
      await loadList();
      await loadDetail(body.data.campaign.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const persistCampaign = async () => {
    if (!selectedId || !content) {
      throw new Error("No campaign selected");
    }
    const syncedContent = syncCampaignFormFieldsIntoContent(content, {
      ctaLabel,
      ctaUrl,
      disclaimer,
    });
    setContent(syncedContent);
    const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        campaignId: selectedId,
        name,
        objective: objective || null,
        internalDescription: internalDescription || null,
        product: product || null,
        audienceId: audienceId || null,
        channel,
        senderIdentityId: senderIdentityId || null,
        whatsappTemplateId: channel === "WHATSAPP" ? whatsappTemplateId || null : null,
        sender,
        subject,
        previewText,
        content: syncedContent,
        disclaimer: disclaimer || null,
        trackingEnabled,
        plainTextOverride: plainTextOverride || null,
        utm,
        ctaLabel: ctaLabel || null,
        ctaUrl: ctaUrl || null,
        schedulePlaceholder: {
          enabled: Boolean(scheduleStartAt),
          startAt: scheduleStartAt ? new Date(scheduleStartAt).toISOString() : null,
          notes: detail?.campaign.schedulePlaceholder?.notes ?? null,
        },
        batchPolicy: {
          ...batchPolicy,
          startAt: scheduleStartAt ? new Date(scheduleStartAt).toISOString() : batchPolicy.startAt,
        },
        routingPlaceholder: {
          mode: routingMode,
          notes:
            routingMode === "UNCONFIGURED"
              ? "Configure assignee routing before live handoff."
              : `Campaign routing mode: ${routingMode}`,
        },
        notificationPlaceholder: {
          inApp: notifyInApp,
          email: notifyEmail,
          whatsapp: notifyWhatsapp,
          notes: "In-app uses Enterprise Notification Engine. Email/WhatsApp remain dry-run until approved.",
        },
      }),
    });
    const body = (await res.json()) as ApiEnvelope<CampaignDetail>;
    if (!res.ok || !body.success || !body.data) {
      throw new Error(body.error?.message || "Save failed");
    }
    setDetail(body.data);
    await loadList();
    return body.data;
  };

  const saveCampaign = async () => {
    setBusy(true);
    try {
      await persistCampaign();
      toast.success("Campaign saved (not published)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const runLifecycle = async (lifecycleAction: MarketingCampaignAction) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      if (lifecycleAction === "SUBMIT_FOR_REVIEW" || lifecycleAction === "APPROVE") {
        if (detail?.editPolicy?.contentEditable) await persistCampaign();
      }
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transition",
          campaignId: selectedId,
          lifecycleAction,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<CampaignDetail>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || `${lifecycleAction} failed`);
      }
      setDetail(body.data);
      await loadList();
      toast.success(`${lifecycleAction} → ${MARKETING_CAMPAIGN_STATUS_LABELS[body.data.campaign.status]}`);
      await loadExecution(selectedId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lifecycle action failed");
    } finally {
      setBusy(false);
    }
  };

  const configureExecution = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await persistCampaign().catch(() => undefined);
      const startIso = scheduleStartAt ? new Date(scheduleStartAt).toISOString() : null;
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "configure_execution",
          campaignId: selectedId,
          batchPolicy: {
            ...batchPolicy,
            startAt: startIso ?? batchPolicy.startAt,
          },
          schedulePlaceholder: {
            enabled: true,
            startAt: startIso,
            notes: "Configured for MARKETING TEST MODE pacing",
          },
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{
        campaign: MarketingCampaign;
        deliveryLabel: string;
      }>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Configure execution failed");
      }
      toast.success("Batch / schedule configured (dry-run lease)");
      await loadDetail(selectedId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Configure failed");
    } finally {
      setBusy(false);
    }
  };

  const runControlledTest = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_test_batch",
          campaignId: selectedId,
          testBatchSize,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{
        tick: {
          claimed: number;
          processed: number;
          skippedReason?: string | null;
          deliveryLabel?: string;
          actuallySent?: boolean;
        };
        deliveryLabel: string;
        actuallySent: boolean;
        execution?: MarketingExecutionSummary;
      }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Controlled test failed");
      }
      if (body.data.execution) setExecution(body.data.execution);
      const tick = body.data.tick;
      if (tick.skippedReason) {
        toast.message(`Controlled test skipped: ${tick.skippedReason}`, {
          description: "Campaign must be SCHEDULED or RUNNING. Delivery remains SIMULATED.",
        });
      } else {
        toast.success(
          `SIMULATED batch — processed ${tick.processed} (claimed ${tick.claimed}). NOT ACTUALLY SENT.`,
        );
      }
      await loadDetail(selectedId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Controlled test failed");
    } finally {
      setBusy(false);
    }
  };

  const runNextBatch = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_next_batch",
          campaignId: selectedId,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{
        tick: {
          claimed: number;
          processed: number;
          skippedReason?: string | null;
        };
        execution?: MarketingExecutionSummary;
        deliveryLabel: string;
        actuallySent: boolean;
      }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Next batch failed");
      }
      if (body.data.execution) setExecution(body.data.execution);
      const tick = body.data.tick;
      if (tick.skippedReason) {
        toast.message(`Next batch skipped: ${tick.skippedReason}`, {
          description: "Campaign must be SCHEDULED or RUNNING. Delivery remains SIMULATED.",
        });
      } else {
        toast.success(
          `SIMULATED next batch — processed ${tick.processed} (claimed ${tick.claimed}). NOT ACTUALLY SENT.`,
        );
      }
      await loadDetail(selectedId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Next batch failed");
    } finally {
      setBusy(false);
    }
  };

  const saveReusableBlock = async () => {
    if (!selectedBlock) {
      toast.error("Select a content block first");
      return;
    }
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_reusable_block",
          blockName: `${name || "Campaign"} · ${selectedBlock.type}`,
          block: selectedBlock,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<unknown>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Save reusable block failed");
      }
      toast.success("Reusable block saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save reusable block failed");
    } finally {
      setBusy(false);
    }
  };

  const loadPrePublish = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await persistCampaign().catch(() => undefined);
      const res = await authenticatedJsonFetch(
        `/api/admin/marketing/campaigns?id=${encodeURIComponent(selectedId)}&view=pre-publish`,
      );
      const body = (await res.json()) as ApiEnvelope<{ checks: MarketingPrePublishCheckResult }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Pre-publish checks failed");
      }
      setPrePublish(body.data.checks);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checks failed");
    } finally {
      setBusy(false);
    }
  };

  const runPreview = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      if (detail?.editPolicy?.contentEditable !== false) await persistCampaign();
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          campaignId: selectedId,
          personalization: personalizationDraft,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{ preview: MarketingCampaignPreviewPayload }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Preview failed");
      }
      setPreview(body.data.preview);
      await loadDetail(selectedId);
      toast.success("Preview rendered (no send)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore_version",
          campaignId: selectedId,
          versionId,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<CampaignDetail>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Restore failed");
      }
      toast.success("New draft created from version history (published version unchanged)");
      await loadDetail(body.data.campaign.id);
      await loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  const cloneCampaign = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clone", campaignId: selectedId }),
      });
      const body = (await res.json()) as ApiEnvelope<CampaignDetail>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Clone failed");
      }
      toast.success("Campaign cloned");
      await loadList();
      await loadDetail(body.data.campaign.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clone failed");
    } finally {
      setBusy(false);
    }
  };

  const saveAsTemplate = async () => {
    if (!selectedId || !templateName.trim()) {
      toast.error("Enter a template name");
      return;
    }
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_template",
          campaignId: selectedId,
          templateName,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{ template: MarketingContentTemplate }>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Template save failed");
      }
      toast.success("Saved as template");
      setTemplateName("");
      await loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Template save failed");
    } finally {
      setBusy(false);
    }
  };

  const addBlock = (type: (typeof MARKETING_CONTENT_BLOCK_TYPES)[number]) => {
    if (!content) return;
    const block = createBlock(type);
    setContent({ ...content, blocks: [...content.blocks, block] });
    setSelectedBlockId(block.id);
  };

  const updateSelectedBlockProp = (key: string, value: string) => {
    if (!content || !selectedBlockId) return;
    setContent({
      ...content,
      blocks: content.blocks.map((b) =>
        b.id === selectedBlockId ? { ...b, props: { ...b.props, [key]: value } } : b,
      ),
    });
  };

  const removeSelectedBlock = () => {
    if (!content || !selectedBlockId) return;
    const next = content.blocks.filter((b) => b.id !== selectedBlockId);
    setContent({ ...content, blocks: next });
    setSelectedBlockId(next[0]?.id ?? "");
  };

  const closeBuilder = () => {
    setSelectedId("");
    setDetail(null);
    setBuilderStep(1);
    setMaxStepReached(1);
    setPreview(null);
    setPrePublish(null);
    setExecution(null);
  };

  const loadAudienceEstimate = useCallback(async (id: string) => {
    if (!id) {
      setAudienceEstimate(null);
      return;
    }
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", audienceId: id }),
      });
      const body = (await res.json()) as ApiEnvelope<{
        preview: { counts: { eligible: number } };
      }>;
      if (res.ok && body.success && body.data?.preview) {
        setAudienceEstimate(body.data.preview.counts.eligible);
      } else {
        setAudienceEstimate(null);
      }
    } catch {
      setAudienceEstimate(null);
    }
  }, []);

  const sendTestEmail = async () => {
    if (!selectedId) return;
    if (!testRecipientEmail.trim()) {
      toast.error("Enter a test recipient email");
      return;
    }
    setBusy(true);
    try {
      if (detail?.editPolicy?.contentEditable !== false) await persistCampaign();
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_send",
          campaignId: selectedId,
          testRecipientEmail,
          personalization: personalizationDraft,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{
        preview: MarketingCampaignPreviewPayload;
        notice: string;
        actuallySent: boolean;
      }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Test send failed");
      }
      setPreview(body.data.preview);
      if (body.data.actuallySent) {
        toast.success(body.data.notice || "Test email sent");
      } else {
        toast.message(body.data.notice || "Test send completed (dry-run)", {
          description: "Rendered via the same path as Preview.",
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test send failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (audienceId) {
      void loadAudienceEstimate(audienceId);
    } else {
      setAudienceEstimate(null);
    }
  }, [audienceId, loadAudienceEstimate]);

  useEffect(() => {
    const canAutoPreview =
      (builderStep === 3 || builderStep === 4) &&
      selectedId &&
      channel === "EMAIL" &&
      !busy &&
      Boolean(content) &&
      subject.trim().length > 0;

    if (builderStep === 3 && canAutoPreview && !step3PreviewTriggered.current) {
      step3PreviewTriggered.current = true;
      void runPreview();
    }
    if (builderStep === 4 && canAutoPreview && !step4PreviewTriggered.current) {
      step4PreviewTriggered.current = true;
      void runPreview();
    }
    if (builderStep !== 3) step3PreviewTriggered.current = false;
    if (builderStep !== 4) step4PreviewTriggered.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-preview once per step entry
  }, [builderStep, selectedId, busy, channel, content, subject]);

  useEffect(() => {
    if (builderStep === 3 && content) {
      const primaryId = primaryTextBlockId(content);
      if (primaryId) setSelectedBlockId(primaryId);
    }
  }, [builderStep, content]);

  const selectedBlock = content?.blocks.find((b) => b.id === selectedBlockId) ?? null;
  const currentStepMeta = MARKETING_CAMPAIGN_BUILDER_STEPS[builderStep - 1];
  const selectedAudience = audiences.find((a) => a.id === audienceId) ?? null;
  const usedPersonalizationTokens = collectUsedPersonalizationTokens({
    subject,
    previewText,
    content,
  });
  const contentEditable =
    detail?.editPolicy?.contentEditable !== false &&
    !detail?.editPolicy?.readOnly &&
    !detail?.editPolicy?.operationalControlsOnly;

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 6 && step <= maxStepReached) {
      setBuilderStep(step);
    }
  };

  const handleContinue = async () => {
    if (builderStep >= 6) return;
    const validation = validateBuilderStep(builderStep, {
      name,
      audienceId,
      subject,
      sender,
      channel,
      contentSourceMode,
      content,
      sendMode,
      scheduleStartAt,
    });
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    if (selectedId && content && contentEditable) {
      setBusy(true);
      try {
        await persistCampaign();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not save draft — fix errors before continuing.",
        );
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    const next = builderStep + 1;
    setBuilderStep(next);
    setMaxStepReached((m) => Math.max(m, next));
  };

  const handleBack = () => {
    if (builderStep > 1) setBuilderStep((s) => s - 1);
  };

  const handleSendModeChange = (mode: "immediate" | "scheduled") => {
    setSendMode(mode);
    if (mode === "immediate") {
      setScheduleStartAt("");
    }
  };

  const renderSenderFields = () => (
    <>
      <div className="space-y-1.5">
        <Label>Sender identity</Label>
        <Select
          value={senderIdentityId || "__inline__"}
          onValueChange={(v) => {
            if (v === "__inline__") {
              setSenderIdentityId("");
              return;
            }
            setSenderIdentityId(v);
            const found = senderIdentities.find((s) => s.id === v);
            if (found) {
              setSender({
                fromName: found.displayName,
                fromAddress: found.fromAddress,
                replyTo: found.replyTo ?? null,
              });
            }
          }}
          disabled={!contentEditable}
        >
          <SelectTrigger>
            <SelectValue placeholder="Use campaign sender fields" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__inline__">Campaign sender fields</SelectItem>
            {senderIdentities
              .filter((s) => s.active)
              .map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.displayName} · {s.fromAddress}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Sender name</Label>
        <Input
          value={sender.fromName}
          disabled={!contentEditable}
          onChange={(e) => setSender({ ...sender, fromName: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Sender address</Label>
        <Input
          value={sender.fromAddress}
          disabled={!contentEditable}
          onChange={(e) => setSender({ ...sender, fromAddress: e.target.value })}
        />
      </div>
    </>
  );

  const renderBlockEditor = () => {
    const primaryId = primaryTextBlockId(content);
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm font-medium text-foreground">Email Body</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This is the main customer-facing email content. Use {"{{firstName}}"} or{" "}
            {"{{first_name}}"} for personalization. Subject, preheader, CTA, and disclaimer are
            configured separately above.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <p className="w-full text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Additional blocks (optional)
          </p>
          {MARKETING_CONTENT_BLOCK_TYPES.map((t) => (
            <Button
              key={t}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              disabled={!contentEditable}
              onClick={() => addBlock(t)}
            >
              + {MARKETING_CONTENT_BLOCK_LABELS[t]}
            </Button>
          ))}
        </div>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
          {content!.blocks.map((b) => (
            <button
              key={b.id}
              type="button"
              className={cn(
                "block w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground",
                selectedBlockId === b.id && "bg-accent text-accent-foreground",
                b.id === primaryId && "font-medium",
              )}
              onClick={() => setSelectedBlockId(b.id)}
            >
              {b.id === primaryId ? "Email Body — " : ""}
              {blockSummary(b)}
            </button>
          ))}
        </div>
        {selectedBlock ? (
          <div className="space-y-2 rounded-md border p-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">
                {selectedBlock.type === "text" && selectedBlock.id === primaryId
                  ? "Email Body"
                  : selectedBlock.type}
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={busy || !contentEditable}
                  onClick={() => void saveReusableBlock()}
                >
                  Save as reusable block
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!contentEditable || selectedBlock.id === primaryId}
                  onClick={removeSelectedBlock}
                >
                  Remove
                </Button>
              </div>
            </div>
            {Object.entries(selectedBlock.props).map(([key, val]) =>
              typeof val === "string" ? (
                <div key={key} className="space-y-1">
                  <Label className="text-[11px]">
                    {selectedBlock.type === "text" &&
                    selectedBlock.id === primaryId &&
                    key === "html"
                      ? "Email Body"
                      : key}
                  </Label>
                  {key === "html" || key === "text" || key === "body" ? (
                    <Textarea
                      rows={selectedBlock.id === primaryId && key === "html" ? 8 : 3}
                      disabled={!contentEditable}
                      value={val}
                      onChange={(e) => updateSelectedBlockProp(key, e.target.value)}
                    />
                  ) : (
                    <Input
                      disabled={!contentEditable}
                      value={val}
                      onChange={(e) => updateSelectedBlockProp(key, e.target.value)}
                    />
                  )}
                </div>
              ) : null,
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const renderEmailPreview = () => (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Live preview</p>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant={previewMode === "desktop" ? "default" : "outline"}
            onClick={() => setPreviewMode("desktop")}
          >
            <Monitor className="mr-1 h-3.5 w-3.5" />
            Desktop
          </Button>
          <Button
            type="button"
            size="sm"
            variant={previewMode === "mobile" ? "default" : "outline"}
            onClick={() => setPreviewMode("mobile")}
          >
            <Smartphone className="mr-1 h-3.5 w-3.5" />
            Mobile
          </Button>
          <Button
            type="button"
            size="sm"
            variant={previewMode === "plaintext" ? "default" : "outline"}
            onClick={() => setPreviewMode("plaintext")}
          >
            Plain text
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void runPreview()}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Refresh preview
          </Button>
        </div>
      </div>
      {preview ? (
        <>
          <div className="rounded-md border bg-muted/40 p-2 text-xs space-y-1">
            <p>
              <span className="text-muted-foreground">From:</span> {preview.sender.fromName} &lt;
              {preview.sender.fromAddress}&gt;
            </p>
            <p>
              <span className="text-muted-foreground">Subject:</span> {preview.subject}
            </p>
            <p>
              <span className="text-muted-foreground">Preheader:</span>{" "}
              {preview.preheader ?? preview.previewText}
            </p>
          </div>
          {previewMode === "plaintext" ? (
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border bg-white p-3 text-xs text-foreground">
              {preview.plaintext}
            </pre>
          ) : (
            <div
              className="mx-auto overflow-hidden rounded-md border bg-white"
              style={{ maxWidth: previewMode === "mobile" ? 360 : 600 }}
            >
              <iframe
                title="Campaign preview"
                sandbox=""
                className="h-[420px] w-full border-0"
                srcDoc={previewMode === "mobile" ? preview.htmlMobile : preview.htmlDesktop}
              />
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Preview will render when you enter this step.</p>
      )}
    </div>
  );

  const renderExecutionCard = () =>
    execution ? (
      <Card className="border-teal-500/30 bg-teal-500/[0.04]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Execution status</CardTitle>
        </CardHeader>
        <CardContent className="text-[11px] text-muted-foreground">
          <p>
            Next {execution.lease?.nextRunAt ?? "—"} · batches {execution.totalBatches} · cursor{" "}
            {execution.lease?.streamCursor ?? "start"}
          </p>
          <p className="mt-1 font-medium text-amber-800 dark:text-amber-200">
            Channel delivery: SIMULATED / NOT CONNECTED
          </p>
        </CardContent>
      </Card>
    ) : null;

  const renderBuilderFooter = () => (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/95 p-3 backdrop-blur">
      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={closeBuilder}>
        Cancel
      </Button>
      <div className="flex flex-wrap gap-2">
        {builderStep > 1 ? (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={handleBack}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || !contentEditable}
          onClick={() => void saveCampaign()}
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          Save draft
        </Button>
        {builderStep < 6 ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => void handleContinue()}>
            Continue
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <MarketingModuleNav activeId="campaigns" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Campaign Builder</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Six-step wizard for campaign authoring. Save never publishes. Controlled batches remain
            SIMULATED until live execution is authorised.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading || busy}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          {!detail ? (
            <Button size="sm" onClick={() => void createCampaign()} disabled={busy}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New campaign
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void cloneCampaign()}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Clone
            </Button>
          )}
        </div>
      </div>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex gap-2 py-3 text-sm text-amber-950 dark:text-amber-100">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            MKT-05 lifecycle governance is active. SAVE never publishes. APPROVE requires
            marketing approve permission and passing pre-publish checks. Controlled test batches are
            SIMULATED (dry-run). Live unrestricted bulk email / WhatsApp send remains OFF.
          </span>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Registry</CardTitle>
              <CardDescription className="text-xs">{campaigns.length} campaigns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {campaigns.length === 0 ? (
                <p className="text-xs text-muted-foreground">No campaigns yet.</p>
              ) : (
                campaigns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground ${
                      selectedId === c.id ? "bg-accent text-accent-foreground" : ""
                    }`}
                    onClick={() => void loadDetail(c.id)}
                  >
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-muted-foreground">
                      {MARKETING_CAMPAIGN_STATUS_LABELS[c.status]} · {c.channel}
                    </div>
                  </button>
                ))
              )}
              {templates.length > 0 ? (
                <div className="border-t pt-2 mt-2">
                  <p className="mb-1 text-[11px] font-medium text-muted-foreground">From template</p>
                  {templates.map((t) => (
                    <Button
                      key={t.id}
                      variant="ghost"
                      size="sm"
                      className="h-auto w-full justify-start px-2 py-1 text-xs"
                      disabled={busy}
                      onClick={() => void createCampaign(t.id)}
                    >
                      <LayoutTemplate className="mr-1.5 h-3 w-3" />
                      {t.name}
                    </Button>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {!detail || !content ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Select or create a campaign to open the six-step builder.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 min-w-0">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{name || "Untitled campaign"}</CardTitle>
                      <CardDescription className="text-xs">
                        Step {builderStep} of 6 · {currentStepMeta.title} ·{" "}
                        {MARKETING_CAMPAIGN_STATUS_LABELS[detail.campaign.status]}
                        {" · "}
                        MKT-05 governance active
                        {" · "}
                        {ENTERPRISE_MARKETING_EXECUTION_ENABLED
                          ? "Live execution ON"
                          : "Live bulk send OFF"}
                        {ENTERPRISE_MARKETING_EXECUTION_DRY_RUN_ENABLED ? " · dry-run enabled" : ""}
                      </CardDescription>
                    </div>
                    <p className="text-xs text-muted-foreground">Draft v{detail.draft?.versionNumber}</p>
                  </div>
                  <nav className="mt-4 flex flex-wrap gap-1" aria-label="Campaign builder steps">
                    {MARKETING_CAMPAIGN_BUILDER_STEPS.map((step) => {
                      const done = step.number < builderStep || step.number < maxStepReached;
                      const current = step.number === builderStep;
                      return (
                        <button
                          key={step.id}
                          type="button"
                          disabled={step.number > maxStepReached}
                          onClick={() => goToStep(step.number)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-left text-[11px] transition-colors",
                            current && "border-primary bg-primary/10 text-foreground",
                            done && "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer",
                            !current && !done && "border-border/60 text-muted-foreground opacity-60",
                          )}
                        >
                          {done ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <span className="font-mono text-[10px]">{step.number}</span>
                          )}
                          <span className="hidden sm:inline">{step.shortTitle}</span>
                        </button>
                      );
                    })}
                  </nav>
                </CardHeader>
              </Card>

              {builderStep === 1 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Campaign basics</CardTitle>
                    <CardDescription>{currentStepMeta.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Campaign name</Label>
                      <Input value={name} disabled={!contentEditable} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Objective</Label>
                      <Select
                        value={objectivePreset || "__none__"}
                        disabled={!contentEditable}
                        onValueChange={(v) => {
                          const preset = v === "__none__" ? "" : v;
                          setObjectivePreset(preset);
                          if (preset && preset !== "Other") setObjective(preset);
                          else if (preset === "Other") setObjective(objective && !MARKETING_CAMPAIGN_OBJECTIVE_OPTIONS.includes(objective as (typeof MARKETING_CAMPAIGN_OBJECTIVE_OPTIONS)[number]) ? objective : "");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select objective" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Not set</SelectItem>
                          {MARKETING_CAMPAIGN_OBJECTIVE_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {objectivePreset === "Other" ? (
                      <div className="space-y-1.5">
                        <Label>Other objective</Label>
                        <Input
                          value={objective}
                          disabled={!contentEditable}
                          onChange={(e) => setObjective(e.target.value)}
                          placeholder="Describe the campaign objective"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label>Product</Label>
                        <Input value={product} disabled={!contentEditable} onChange={(e) => setProduct(e.target.value)} />
                      </div>
                    )}
                    {objectivePreset === "Other" ? (
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Product</Label>
                        <Input value={product} disabled={!contentEditable} onChange={(e) => setProduct(e.target.value)} />
                      </div>
                    ) : null}
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Campaign description (internal)</Label>
                      <Textarea
                        rows={3}
                        value={internalDescription}
                        disabled={!contentEditable}
                        onChange={(e) => setInternalDescription(e.target.value)}
                        placeholder="Operator-only notes — not shown to customers"
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {builderStep === 2 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Audience</CardTitle>
                    <CardDescription>{currentStepMeta.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="mb-2 block text-xs text-muted-foreground">
                        Audience category (guide only — does not select an audience)
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {MARKETING_AUDIENCE_CATEGORY_OPTIONS.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setAudienceCategory(cat.id)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs transition-colors",
                              audienceCategory === cat.id
                                ? "border-primary bg-primary/15 text-foreground"
                                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                            )}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                      {audienceCategory ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {MARKETING_AUDIENCE_CATEGORY_OPTIONS.find((c) => c.id === audienceCategory)?.hint}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Saved audience</Label>
                      {audiences.length === 0 ? (
                        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                          <p className="font-medium text-foreground">No audience available.</p>
                          <p className="mt-1 text-muted-foreground">
                            Create an audience first in the Audiences module, then return here to link
                            it to this campaign. Category chips above are guidance only — they do not
                            create or select an audience.
                          </p>
                          <Button asChild size="sm" variant="outline" className="mt-3">
                            <Link href={ROUTES.ADMIN_MARKETING_AUDIENCES}>
                              Go to Audiences
                              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Select
                            value={audienceId || "__none__"}
                            disabled={!contentEditable}
                            onValueChange={(v) => setAudienceId(v === "__none__" ? "" : v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select audience" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Not linked</SelectItem>
                              {audiences.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Manage audiences in the{" "}
                            <Link
                              href={ROUTES.ADMIN_MARKETING_AUDIENCES}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              Audiences module
                            </Link>
                            .
                          </p>
                        </>
                      )}
                    </div>
                    {selectedAudience ? (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm">
                        <p className="font-medium">{selectedAudience.name}</p>
                        <p className="mt-1 text-muted-foreground">
                          Estimated eligible recipients:{" "}
                          <span className="font-semibold text-foreground">
                            {audienceEstimate !== null ? audienceEstimate.toLocaleString() : "Calculating…"}
                          </span>
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              {builderStep === 3 ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Channel &amp; message</CardTitle>
                      <CardDescription>{currentStepMeta.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Channel</Label>
                        <Select
                          value={channel}
                          disabled={!contentEditable}
                          onValueChange={(v) => setChannel(v as (typeof MARKETING_CHANNELS)[number])}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MARKETING_CHANNELS.map((ch) => (
                              <SelectItem key={ch} value={ch}>
                                {ch}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {renderSenderFields()}
                      {channel === "WHATSAPP" ? (
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>WhatsApp template</Label>
                          <Select
                            value={whatsappTemplateId || "__none__"}
                            disabled={!contentEditable}
                            onValueChange={(v) => setWhatsappTemplateId(v === "__none__" ? "" : v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select approved template" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Not selected</SelectItem>
                              {whatsappTemplates.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name} · {t.approvalState}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Subject</Label>
                        <Input value={subject} disabled={!contentEditable} onChange={(e) => setSubject(e.target.value)} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Preheader</Label>
                        <Input value={previewText} disabled={!contentEditable} onChange={(e) => setPreviewText(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>CTA label</Label>
                        <Input value={ctaLabel} disabled={!contentEditable} onChange={(e) => setCtaLabel(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>CTA URL</Label>
                        <Input value={ctaUrl} disabled={!contentEditable} onChange={(e) => setCtaUrl(e.target.value)} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Disclaimer</Label>
                        <Textarea rows={2} value={disclaimer} disabled={!contentEditable} onChange={(e) => setDisclaimer(e.target.value)} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Plain text override</Label>
                        <Textarea rows={2} value={plainTextOverride} disabled={!contentEditable} onChange={(e) => setPlainTextOverride(e.target.value)} />
                      </div>
                      <details className="sm:col-span-2 rounded-md border p-3" open={showAdvancedTracking} onToggle={(e) => setShowAdvancedTracking((e.target as HTMLDetailsElement).open)}>
                        <summary className="cursor-pointer text-xs font-medium">Advanced — tracking &amp; UTM</summary>
                        <div className="mt-3 space-y-3">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={trackingEnabled} disabled={!contentEditable} onChange={(e) => setTrackingEnabled(e.target.checked)} />
                            Tracking enabled
                          </label>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {(["source", "medium", "campaign", "content", "term"] as const).map((key) => (
                              <div key={key} className="space-y-1">
                                <Label className="text-[11px]">utm_{key}</Label>
                                <Input
                                  disabled={!contentEditable}
                                  value={key === "content" || key === "term" ? (utm[key] ?? "") : utm[key]}
                                  onChange={(e) =>
                                    setUtm({
                                      ...utm,
                                      [key]: key === "content" || key === "term" ? e.target.value || null : e.target.value,
                                    })
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                      <div className="sm:col-span-2 space-y-2">
                        <Label>Content source</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant={contentSourceMode === "existing" ? "default" : "outline"} onClick={() => setContentSourceMode("existing")}>
                            Select existing content
                          </Button>
                          <Button type="button" size="sm" variant={contentSourceMode === "new" ? "default" : "outline"} onClick={() => setContentSourceMode("new")}>
                            Create new content
                          </Button>
                        </div>
                      </div>
                      {contentSourceMode === "existing" ? (
                        <div className="sm:col-span-2 space-y-2 rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">Templates from Content &amp; Templates. Save this campaign as a template below.</p>
                          <ul className="space-y-1 text-xs">
                            {templates.map((t) => (
                              <li key={t.id} className="text-muted-foreground">· {t.name}</li>
                            ))}
                          </ul>
                          <div className="flex flex-wrap items-end gap-2 pt-2">
                            <div className="space-y-1">
                              <Label className="text-[11px]">Save as template</Label>
                              <Input className="h-8 w-48" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" />
                            </div>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => void saveAsTemplate()}>
                              <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />
                              Save template
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="sm:col-span-2 text-xs text-muted-foreground">
                          Email body and blocks are edited in the live preview panel below.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  {channel === "EMAIL" ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Message editor · Live preview</CardTitle>
                        <CardDescription className="text-xs">
                          Customer-facing email preview updates automatically when content is valid.
                          Save draft never publishes.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4 lg:grid-cols-2">
                        <div>
                          {contentSourceMode === "new" ? (
                            renderBlockEditor()
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Switch to Create new content to edit the email body and blocks
                              side-by-side with preview.
                            </p>
                          )}
                        </div>
                        <div>{renderEmailPreview()}</div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-4 text-sm text-muted-foreground">
                        {channel} preview uses subject and content fields above. Email iframe preview is EMAIL-only.
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null}

              {builderStep === 4 ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Personalisation</CardTitle>
                      <CardDescription>{currentStepMeta.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Sample values below are used for preview only. At send time, values come from
                        the audience source. Both {"{{firstName}}"} and {"{{first_name}}"} resolve to
                        the same first-name value.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {MARKETING_PERSONALIZATION_TOKENS.map((tok) => (
                          <div key={tok} className="space-y-1">
                            <Label className="text-xs">{personalizationTokenLabel(tok)}</Label>
                            <Input
                              value={personalizationDraft[tok] ?? ""}
                              onChange={(e) =>
                                setPersonalizationDraft({ ...personalizationDraft, [tok]: e.target.value })
                              }
                              placeholder={`{{${tok}}}`}
                            />
                          </div>
                        ))}
                      </div>
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runPreview()}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Refresh preview with samples
                      </Button>
                    </CardContent>
                  </Card>
                  {channel === "EMAIL" ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Personalised preview</CardTitle>
                        <CardDescription className="text-xs">
                          Automatically rendered using sample personalisation values.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>{renderEmailPreview()}</CardContent>
                    </Card>
                  ) : null}
                </div>
              ) : null}

              {builderStep === 5 ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Schedule &amp; delivery</CardTitle>
                      <CardDescription>{currentStepMeta.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant={sendMode === "immediate" ? "default" : "outline"} onClick={() => handleSendModeChange("immediate")}>
                          Send immediately
                        </Button>
                        <Button type="button" size="sm" variant={sendMode === "scheduled" ? "default" : "outline"} onClick={() => handleSendModeChange("scheduled")}>
                          Schedule
                        </Button>
                      </div>
                      {sendMode === "scheduled" ? (
                        <div className="space-y-1.5 max-w-sm">
                          <Label>Start date &amp; time</Label>
                          <Input type="datetime-local" value={scheduleStartAt} onChange={(e) => setScheduleStartAt(e.target.value)} />
                        </div>
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Batch size</Label>
                          <Input type="number" min={1} max={500} value={batchPolicy.batchSize} onChange={(e) => setBatchPolicy((p) => ({ ...p, batchSize: Number(e.target.value) || 1 }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Interval (hours)</Label>
                          <Input type="number" min={0.1} step={0.1} value={Number((batchPolicy.intervalMs / 3_600_000).toFixed(2))} onChange={(e) => setBatchPolicy((p) => ({ ...p, intervalMs: Math.max(60_000, Number(e.target.value) * 3_600_000) }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Daily max</Label>
                          <Input type="number" min={1} value={batchPolicy.dailyMax} onChange={(e) => setBatchPolicy((p) => ({ ...p, dailyMax: Number(e.target.value) || 1 }))} />
                        </div>
                      </div>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void configureExecution()}>
                        Configure execution
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Send test (controlled)
                      </CardTitle>
                      <CardDescription>
                        Sends one rendered test message to a single mailbox using the same preview
                        pipeline. This does not launch the campaign, schedule bulk delivery, or
                        enable live marketing execution. Bulk email / WhatsApp / SMS remain disabled
                        unless explicitly authorised under MKT-05.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Default delivery mode is dry-run — the render path is exercised; live mailbox
                        delivery requires separate Product Owner authorisation.
                      </p>
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="space-y-1 flex-1 min-w-[200px]">
                          <Label className="text-xs">Test recipient email</Label>
                          <Input
                            type="email"
                            value={testRecipientEmail}
                            onChange={(e) => setTestRecipientEmail(e.target.value)}
                            placeholder="you@example.com"
                          />
                        </div>
                        <Button size="sm" disabled={busy || !testRecipientEmail.trim()} onClick={() => void sendTestEmail()}>
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          Send test (controlled)
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  <details className="rounded-lg border" open={showSimulatedBatch} onToggle={(e) => setShowSimulatedBatch((e.target as HTMLDetailsElement).open)}>
                    <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-muted-foreground">
                      Advanced — Simulated controlled batch (operators)
                    </summary>
                    <CardContent className="space-y-3 border-t pt-3">
                      <p className="text-xs text-amber-800 dark:text-amber-200">SIMULATED — NOT ACTUALLY SENT. Separate from Send test above.</p>
                      <div className="flex flex-wrap gap-2">
                        <Select value={String(testBatchSize)} onValueChange={(v) => setTestBatchSize(Number(v) as (typeof MARKETING_CONTROLLED_TEST_BATCH_SIZES)[number])}>
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MARKETING_CONTROLLED_TEST_BATCH_SIZES.map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n} recipients
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => void runControlledTest()}>
                          Run simulated batch ({testBatchSize})
                        </Button>
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runNextBatch()}>
                          Run next batch — SIMULATED
                        </Button>
                      </div>
                    </CardContent>
                  </details>
                  {renderExecutionCard()}
                </div>
              ) : null}

              {builderStep === 6 ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Review &amp; launch</CardTitle>
                      <CardDescription>{currentStepMeta.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      {[
                        ["Campaign", name],
                        ["Objective", objective || "Not set"],
                        ["Product", product || "Not set"],
                        [
                          "Audience",
                          selectedAudience
                            ? `${selectedAudience.name}${audienceEstimate !== null ? ` (~${audienceEstimate})` : ""}`
                            : "Not linked",
                        ],
                        ["Channel", channel],
                        ["Subject", subject || "—"],
                        ["Preheader", previewText || "—"],
                        [
                          "Personalisation tokens",
                          usedPersonalizationTokens.length
                            ? usedPersonalizationTokens.map((t) => `{{${t}}}`).join(", ")
                            : "None",
                        ],
                        [
                          "Schedule",
                          sendMode === "immediate"
                            ? "Send immediately (intent only — not launched)"
                            : scheduleStartAt || "Not set",
                        ],
                        [
                          "Campaign status",
                          MARKETING_CAMPAIGN_STATUS_LABELS[detail.campaign.status],
                        ],
                        [
                          "MKT-05 governance",
                          ENTERPRISE_MARKETING_EXECUTION_ENABLED
                            ? "Live execution authorised"
                            : "Live bulk send OFF · Save never publishes · Approve/Launch governed",
                        ],
                        ["Sender", `${sender.fromName} · ${sender.fromAddress}`],
                        ["Content blocks", String(content?.blocks.length ?? 0)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border bg-muted/20 p-3">
                          <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
                          <p className="mt-1 text-sm font-medium">{value}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runPreview()}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Preview campaign
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !testRecipientEmail.trim()}
                      onClick={() => void sendTestEmail()}
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Send test (controlled)
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy || !contentEditable} onClick={() => void saveCampaign()}>
                      Save draft
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void loadPrePublish()}>
                      Pre-publish checks
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy || !MARKETING_LEGAL_TRANSITIONS[detail.campaign.status].includes("READY_FOR_REVIEW")} onClick={() => void runLifecycle("SUBMIT_FOR_REVIEW")}>
                      Submit for review
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy || !MARKETING_LEGAL_TRANSITIONS[detail.campaign.status].includes("APPROVED")} onClick={() => void runLifecycle("APPROVE")}>
                      Approve
                    </Button>
                    <Button size="sm" disabled={busy || !MARKETING_LEGAL_TRANSITIONS[detail.campaign.status].includes("SCHEDULED")} onClick={() => void runLifecycle("SCHEDULE")}>
                      Schedule launch
                    </Button>
                    <Button size="sm" disabled={busy || !MARKETING_LEGAL_TRANSITIONS[detail.campaign.status].includes("RUNNING")} onClick={() => void runLifecycle("RUN")}>
                      Run campaign
                    </Button>
                  </div>
                  {prePublish ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Pre-publish checks</CardTitle>
                        <CardDescription className="text-xs">
                          {prePublish.readyForApproval ? "Ready for approval" : `Blocking: ${prePublish.blockingCodes.join(", ") || "none"}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-1 text-xs">
                        {prePublish.checks.map((c) => (
                          <div key={c.id} className="flex gap-2">
                            <span className={c.passed ? "text-emerald-700" : "text-destructive"}>{c.passed ? "PASS" : c.severity.toUpperCase()}</span>
                            <span>{c.label}: {c.message}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : null}
                  {renderExecutionCard()}
                  <details className="rounded-lg border" open={showVersionHistory} onToggle={(e) => setShowVersionHistory((e.target as HTMLDetailsElement).open)}>
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Version history</summary>
                    <CardContent className="space-y-2 border-t pt-3">
                      {detail.versions.map((v) => (
                        <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs">
                          <div>
                            <p className="font-medium">v{v.versionNumber}{v.id === detail.campaign.currentDraftVersionId ? " · draft" : ""}{v.immutable ? " · frozen" : ""}</p>
                            <p className="text-muted-foreground truncate max-w-md">{v.subject}</p>
                          </div>
                          <Button type="button" size="sm" variant="outline" disabled={busy || v.id === detail.campaign.currentDraftVersionId || !contentEditable} onClick={() => void restoreVersion(v.id)}>
                            Use as new draft
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </details>
                </div>
              ) : null}

              {renderBuilderFooter()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
