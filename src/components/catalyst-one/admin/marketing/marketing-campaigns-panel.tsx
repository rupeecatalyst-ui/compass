"use client";

/**
 * CO-MARKETING-MKT-04 / MKT-05 / ACTIVATION-002 — Campaign Builder + controlled test execution.
 * Live unrestricted bulk send remains OFF. Controlled batches are SIMULATED (dry-run).
 */

import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  LayoutTemplate,
  Smartphone,
  Monitor,
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
  type MarketingCampaignAction,
} from "@/constants/enterprise-marketing-engine";
import { createBlock } from "@/lib/enterprise-marketing-engine/content-blocks";
import { defaultPersonalizationSample } from "@/lib/enterprise-marketing-engine/personalization";
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

export function MarketingCampaignsPanel() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [audiences, setAudiences] = useState<MarketingAudienceDefinition[]>([]);
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

  const loadList = useCallback(async () => {
    const [campRes, audRes, tplRes] = await Promise.all([
      authenticatedJsonFetch("/api/admin/marketing/campaigns"),
      authenticatedJsonFetch("/api/admin/marketing/audiences"),
      authenticatedJsonFetch("/api/admin/marketing/campaigns?view=templates"),
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
    setScheduleStartAt(
      d.campaign.schedulePlaceholder?.startAt?.slice(0, 16) ||
        d.campaign.batchPolicy?.startAt?.slice(0, 16) ||
        "",
    );
    setPreview(null);
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
        sender,
        subject,
        previewText,
        content,
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

  const selectedBlock = content?.blocks.find((b) => b.id === selectedBlockId) ?? null;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <MarketingModuleNav activeId="campaigns" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Campaign Builder</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Block-document authoring with email-safe desktop/mobile preview. Save never sends.
            Personalization tokens:{" "}
            {MARKETING_PERSONALIZATION_TOKENS.map((t) => `{{${t}}}`).join(", ")}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading || busy}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => void createCampaign()} disabled={busy}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New campaign
          </Button>
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
                Select or create a campaign to open the builder.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Campaign</CardTitle>
                  <CardDescription className="text-xs">
                    {MARKETING_CAMPAIGN_STATUS_LABELS[detail.campaign.status]} · Draft v
                    {detail.draft?.versionNumber}
                    {detail.draft?.immutable ? " (frozen)" : ""} · Versions:{" "}
                    {detail.versions.length}
                    {detail.editPolicy?.readOnly ? " · Read-only" : ""}
                    {detail.editPolicy?.operationalControlsOnly
                      ? " · Operational controls only"
                      : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Objective</Label>
                    <Input value={objective} onChange={(e) => setObjective(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Product</Label>
                    <Input value={product} onChange={(e) => setProduct(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Internal description</Label>
                    <Textarea
                      rows={2}
                      value={internalDescription}
                      onChange={(e) => setInternalDescription(e.target.value)}
                      placeholder="Operator-only notes — not shown in customer email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Audience</Label>
                    <Select
                      value={audienceId || "__none__"}
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
                  </div>
                  <div className="space-y-1.5">
                    <Label>Channel</Label>
                    <Select
                      value={channel}
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
                  <div className="space-y-1.5">
                    <Label>Sender name</Label>
                    <Input
                      value={sender.fromName}
                      onChange={(e) => setSender({ ...sender, fromName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sender address</Label>
                    <Input
                      value={sender.fromAddress}
                      onChange={(e) => setSender({ ...sender, fromAddress: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Subject</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Preheader (inbox preview text)</Label>
                    <Input value={previewText} onChange={(e) => setPreviewText(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CTA label</Label>
                    <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CTA URL</Label>
                    <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Disclaimer / footer signature</Label>
                    <Textarea
                      rows={2}
                      value={disclaimer}
                      onChange={(e) => setDisclaimer(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Plain text fallback (optional override)</Label>
                    <Textarea
                      rows={3}
                      value={plainTextOverride}
                      onChange={(e) => setPlainTextOverride(e.target.value)}
                      placeholder="Leave empty to auto-derive from content blocks"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={trackingEnabled}
                      onChange={(e) => setTrackingEnabled(e.target.checked)}
                    />
                    Tracking enabled — append UTM params to CTA/links in preview/render
                  </label>
                  <div className="grid gap-2 rounded-md border p-3 sm:col-span-2 sm:grid-cols-3">
                    <p className="text-xs font-medium sm:col-span-3">UTM configuration</p>
                    <div className="space-y-1">
                      <Label className="text-[11px]">utm_source</Label>
                      <Input
                        value={utm.source}
                        onChange={(e) => setUtm({ ...utm, source: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">utm_medium</Label>
                      <Input
                        value={utm.medium}
                        onChange={(e) => setUtm({ ...utm, medium: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">utm_campaign</Label>
                      <Input
                        value={utm.campaign}
                        onChange={(e) => setUtm({ ...utm, campaign: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">utm_content</Label>
                      <Input
                        value={utm.content ?? ""}
                        onChange={(e) => setUtm({ ...utm, content: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">utm_term</Label>
                      <Input
                        value={utm.term ?? ""}
                        onChange={(e) => setUtm({ ...utm, term: e.target.value || null })}
                      />
                    </div>
                  </div>
                  <div className="rounded-md border p-3 text-xs sm:col-span-2 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Post-qualification routing</Label>
                        <Select
                          value={routingMode}
                          onValueChange={(v) =>
                            setRoutingMode(v as MarketingRoutingPlaceholder["mode"])
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNCONFIGURED">Unconfigured</SelectItem>
                            <SelectItem value="SINGLE_USER">Specific user</SelectItem>
                            <SelectItem value="TEAM">Specific team</SelectItem>
                            <SelectItem value="ROUND_ROBIN">Round-robin</SelectItem>
                            <SelectItem value="RULE_BASED">Routing rule</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Internal notification channels</Label>
                        <div className="flex flex-wrap gap-3 pt-1">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={notifyInApp}
                              onChange={(e) => setNotifyInApp(e.target.checked)}
                            />
                            Catalyst One
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={notifyEmail}
                              onChange={(e) => setNotifyEmail(e.target.checked)}
                            />
                            Email
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={notifyWhatsapp}
                              onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                            />
                            WhatsApp
                          </label>
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      Assignee pools and closed rules are edited on Responses. Clicking an in-app
                      alert opens the Opportunity (or Contact) record.
                    </p>
                    <p className="text-muted-foreground">
                      Tokens: {MARKETING_PERSONALIZATION_TOKENS.map((t) => `{{${t}}}`).join(" · ")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-teal-500/30 bg-teal-500/[0.04]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Schedule · batch pacing · MARKETING TEST MODE</CardTitle>
                  <CardDescription className="text-xs">
                    Default policy is 100 recipients / 2.5 hours. Controlled tests use 5 / 10 / 20.
                    Delivery is <strong>SIMULATED</strong> — never shown as ACTUALLY SENT while live
                    execution remains off.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Start (local)</Label>
                      <Input
                        type="datetime-local"
                        className="h-8"
                        value={scheduleStartAt}
                        onChange={(e) => setScheduleStartAt(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Batch size</Label>
                      <Input
                        type="number"
                        className="h-8"
                        min={1}
                        max={500}
                        value={batchPolicy.batchSize}
                        onChange={(e) =>
                          setBatchPolicy((p) => ({
                            ...p,
                            batchSize: Number(e.target.value) || 1,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Interval (hours)</Label>
                      <Input
                        type="number"
                        className="h-8"
                        min={0.1}
                        step={0.1}
                        value={Number((batchPolicy.intervalMs / 3_600_000).toFixed(2))}
                        onChange={(e) =>
                          setBatchPolicy((p) => ({
                            ...p,
                            intervalMs: Math.max(60_000, Number(e.target.value) * 3_600_000),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Daily max</Label>
                      <Input
                        type="number"
                        className="h-8"
                        min={1}
                        value={batchPolicy.dailyMax}
                        onChange={(e) =>
                          setBatchPolicy((p) => ({
                            ...p,
                            dailyMax: Number(e.target.value) || 1,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Send window start</Label>
                      <Input
                        className="h-8"
                        value={batchPolicy.sendWindowStart}
                        onChange={(e) =>
                          setBatchPolicy((p) => ({ ...p, sendWindowStart: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Send window end</Label>
                      <Input
                        className="h-8"
                        value={batchPolicy.sendWindowEnd}
                        onChange={(e) =>
                          setBatchPolicy((p) => ({ ...p, sendWindowEnd: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Timezone</Label>
                      <Input
                        className="h-8"
                        value={batchPolicy.timezone}
                        onChange={(e) =>
                          setBatchPolicy((p) => ({ ...p, timezone: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Controlled test size</Label>
                      <Select
                        value={String(testBatchSize)}
                        onValueChange={(v) =>
                          setTestBatchSize(Number(v) as (typeof MARKETING_CONTROLLED_TEST_BATCH_SIZES)[number])
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MARKETING_CONTROLLED_TEST_BATCH_SIZES.map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} recipients (test)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void configureExecution()}>
                      Save pacing / lease
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => void runControlledTest()}>
                      Run controlled test ({testBatchSize}) — SIMULATED
                    </Button>
                  </div>
                  {execution ? (
                    <div className="rounded-md border bg-background/60 p-3 text-[11px] text-muted-foreground">
                      <p>
                        <span className="font-semibold text-foreground">Execution:</span>{" "}
                        next {execution.lease?.nextRunAt ?? "—"} · batches {execution.totalBatches} ·
                        cursor {execution.lease?.streamCursor ?? "start"} · daily{" "}
                        {execution.lease?.dailyProcessedCount ?? 0}/
                        {execution.lease?.batchPolicy.dailyMax ?? "—"}
                      </p>
                      <p className="mt-1">
                        Ledger touched: processed {execution.ledgerCounts.processed ?? 0} · failed{" "}
                        {execution.ledgerCounts.failed ?? 0} · suppressed{" "}
                        {execution.ledgerCounts.suppressed ?? 0} · skipped{" "}
                        {execution.ledgerCounts.skipped ?? 0}
                      </p>
                      <p className="mt-1 font-medium text-amber-800 dark:text-amber-200">
                        Channel delivery: SIMULATED / NOT CONNECTED for live providers
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Content blocks</CardTitle>
                    <CardDescription className="text-xs">
                      Extensible block document — email-safe render on preview.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {MARKETING_CONTENT_BLOCK_TYPES.map((t) => (
                        <Button
                          key={t}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => addBlock(t)}
                        >
                          + {MARKETING_CONTENT_BLOCK_LABELS[t]}
                        </Button>
                      ))}
                    </div>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                      {content.blocks.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className={`block w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground ${
                            selectedBlockId === b.id ? "bg-accent text-accent-foreground" : ""
                          }`}
                          onClick={() => setSelectedBlockId(b.id)}
                        >
                          {blockSummary(b)}
                        </button>
                      ))}
                    </div>
                    {selectedBlock ? (
                      <div className="space-y-2 rounded-md border p-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium">{selectedBlock.type}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={removeSelectedBlock}
                          >
                            Remove
                          </Button>
                        </div>
                        {Object.entries(selectedBlock.props).map(([key, val]) =>
                          typeof val === "string" ? (
                            <div key={key} className="space-y-1">
                              <Label className="text-[11px]">{key}</Label>
                              {key === "html" || key === "text" || key === "body" ? (
                                <Textarea
                                  rows={3}
                                  value={val}
                                  onChange={(e) => updateSelectedBlockProp(key, e.target.value)}
                                />
                              ) : (
                                <Input
                                  value={val}
                                  onChange={(e) => updateSelectedBlockProp(key, e.target.value)}
                                />
                              )}
                            </div>
                          ) : null,
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm">Preview</CardTitle>
                        <CardDescription className="text-xs">
                          Desktop · Mobile · Plain text · Subject · Preheader · Personalization
                        </CardDescription>
                      </div>
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
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 rounded-md border p-2 sm:grid-cols-2">
                      <p className="text-[11px] font-medium sm:col-span-2">
                        Personalization preview sample (test-recipient render — no send)
                      </p>
                      {MARKETING_PERSONALIZATION_TOKENS.map((tok) => (
                        <div key={tok} className="space-y-1">
                          <Label className="text-[11px]">{`{{${tok}}}`}</Label>
                          <Input
                            value={personalizationDraft[tok] ?? ""}
                            onChange={(e) =>
                              setPersonalizationDraft({
                                ...personalizationDraft,
                                [tok]: e.target.value,
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                    {preview ? (
                      <>
                        <div className="rounded-md border bg-muted/40 p-2 text-xs space-y-1">
                          <p>
                            <span className="text-muted-foreground">From:</span>{" "}
                            {preview.sender.fromName} &lt;{preview.sender.fromAddress}&gt;
                          </p>
                          <p>
                            <span className="text-muted-foreground">Subject:</span> {preview.subject}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Preheader:</span>{" "}
                            {preview.preheader ?? preview.previewText}
                          </p>
                          <p className="text-muted-foreground">{preview.notice}</p>
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
                              srcDoc={
                                previewMode === "mobile" ? preview.htmlMobile : preview.htmlDesktop
                              }
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Save + Preview to render email-safe HTML / plaintext (no send).
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Version history</CardTitle>
                  <CardDescription className="text-xs">
                    Frozen / published versions are immutable. Restoring creates a new draft — never
                    alters a running campaign&apos;s published content.
                    {detail.campaign.activePublishedVersionId
                      ? ` Active published: ${detail.campaign.activePublishedVersionId}`
                      : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {detail.versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="font-medium">
                          v{v.versionNumber}
                          {v.id === detail.campaign.currentDraftVersionId ? " · current draft" : ""}
                          {v.id === detail.campaign.activePublishedVersionId
                            ? " · published"
                            : ""}
                          {v.immutable ? " · frozen" : " · editable"}
                        </p>
                        <p className="text-muted-foreground truncate max-w-md">{v.subject}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          busy ||
                          v.id === detail.campaign.currentDraftVersionId ||
                          detail.editPolicy?.readOnly ||
                          detail.editPolicy?.operationalControlsOnly
                        }
                        onClick={() => void restoreVersion(v.id)}
                      >
                        Use as new draft
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-end gap-2">
                <Button
                  size="sm"
                  disabled={busy || detail.editPolicy?.readOnly || detail.editPolicy?.operationalControlsOnly}
                  onClick={() => void saveCampaign()}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save draft
                </Button>
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runPreview()}>
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void loadPrePublish()}
                >
                  Pre-publish checks
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !MARKETING_LEGAL_TRANSITIONS[detail.campaign.status].includes("READY_FOR_REVIEW")}
                  onClick={() => void runLifecycle("SUBMIT_FOR_REVIEW")}
                >
                  Submit for review
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !MARKETING_LEGAL_TRANSITIONS[detail.campaign.status].includes("APPROVED")}
                  onClick={() => void runLifecycle("APPROVE")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !MARKETING_LEGAL_TRANSITIONS[detail.campaign.status].includes("DRAFT")}
                  onClick={() => void runLifecycle("REOPEN_DRAFT")}
                >
                  Reopen draft
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !MARKETING_LEGAL_TRANSITIONS[detail.campaign.status].includes("SCHEDULED")}
                  onClick={() => void runLifecycle("SCHEDULE")}
                >
                  Schedule
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !MARKETING_LEGAL_TRANSITIONS[detail.campaign.status].includes("RUNNING")}
                  onClick={() => void runLifecycle("RUN")}
                >
                  Run
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !MARKETING_LEGAL_TRANSITIONS[detail.campaign.status].includes("PAUSED")}
                  onClick={() => void runLifecycle("PAUSE")}
                >
                  Pause
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || detail.campaign.status !== "PAUSED"}
                  onClick={() => void runLifecycle("RESUME")}
                >
                  Resume
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !MARKETING_LEGAL_TRANSITIONS[detail.campaign.status].includes("COMPLETED")}
                  onClick={() => void runLifecycle("COMPLETE")}
                >
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !MARKETING_LEGAL_TRANSITIONS[detail.campaign.status].includes("STOPPED")}
                  onClick={() => void runLifecycle("STOP")}
                >
                  Stop
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void cloneCampaign()}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Clone
                </Button>
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Save as template</Label>
                    <Input
                      className="h-8 w-40"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name"
                    />
                  </div>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void saveAsTemplate()}>
                    <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />
                    Save template
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void runControlledTest()}
                  title="Runs a capped dry-run batch. Never ACTUALLY SENT while live execution is off."
                >
                  Controlled test ({testBatchSize}) — SIMULATED
                </Button>
              </div>

              {prePublish ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Pre-publish checks</CardTitle>
                    <CardDescription className="text-xs">
                      {prePublish.readyForApproval
                        ? "Ready for approval (no send)"
                        : `Blocking: ${prePublish.blockingCodes.join(", ") || "none"}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    {prePublish.checks.map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <span className={c.passed ? "text-emerald-700" : "text-destructive"}>
                          {c.passed ? "PASS" : c.severity.toUpperCase()}
                        </span>
                        <span>
                          {c.label}: {c.message}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              {detail.campaign.stateHistory.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Audit / state history</CardTitle>
                    <CardDescription className="text-xs">
                      Created by {detail.campaign.governance.createdByUserId ?? "—"} · Modified by{" "}
                      {detail.campaign.governance.modifiedByUserId ?? "—"} · Submitted by{" "}
                      {detail.campaign.governance.submittedByUserId ?? "—"} · Approved by{" "}
                      {detail.campaign.governance.approvedByUserId ?? "—"} · Scheduled by{" "}
                      {detail.campaign.governance.scheduledByUserId ?? "—"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-40 space-y-1 overflow-y-auto text-xs">
                    {[...detail.campaign.stateHistory].reverse().map((h) => (
                      <div key={h.id}>
                        {h.at} · {h.action}: {h.from} → {h.to}
                        {h.actorUserId ? ` · ${h.actorUserId}` : ""}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
