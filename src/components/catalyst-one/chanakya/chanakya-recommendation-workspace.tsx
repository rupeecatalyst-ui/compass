"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { RecommendationGroup } from "@/components/catalyst-one/credit-bench/chanakya-opportunity-recommendation-panel";
import { CitySelect } from "@/components/catalyst-one/shared/city-select";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  chanakyaContextIdentityFromOpportunity,
  formatChanakyaOpportunityContextLine,
} from "@/lib/chanakya/opportunity-context-line";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import {
  CHANAKYA_FACT_INPUTS,
  chanakyaSubmitValue,
} from "@/lib/opportunity-assessment/chanakya-fact-inputs";
import { selectStandardRecommendationPresentation } from "@/lib/opportunity-assessment/standard-presentation";
import type { CompassRecommendationHistoryVersion } from "@/lib/compass-customer-gateway/recommendation-history";
import type { RecommendationClientMessage } from "@/lib/compass-customer-gateway/recommendation-client-message";
import { classifyStoredRecommendationOutcome } from "@/lib/compass-customer-gateway/recommendation-version-outcome";
import type { ChanakyaRecommendationWorkspaceDto } from "@/types/chanakya-recommendation-workspace";

type Envelope = {
  success?: boolean;
  data?: ChanakyaRecommendationWorkspaceDto;
  error?: { message?: string; code?: string };
};

export function ChanakyaRecommendationWorkspace({
  opportunityId,
  open,
  onClose,
}: {
  opportunityId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [model, setModel] = useState<ChanakyaRecommendationWorkspaceDto | null>(null);
  const [contextLine, setContextLine] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recalculateOpen, setRecalculateOpen] = useState(false);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);
  const [emailPreview, setEmailPreview] = useState<{
    recipient: string | null;
    duplicate: boolean;
    message: RecommendationClientMessage;
    opportunityReference: string;
  } | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await authenticatedJsonFetch(
        `/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/chanakya-recommendation`,
      );
      const body = (await response.json()) as Envelope;
      if (!response.ok || !body.success || !body.data) {
        setError(body.error?.message || "Recommendation could not be opened.");
        setModel(null);
        return;
      }
      setModel(body.data);
      setEmailPreview(null);
      setEmailNotice(null);
    } catch {
      setError("Recommendation could not be opened.");
      setModel(null);
    } finally {
      setBusy(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void enterpriseOpportunityApiClient.getOpportunity(opportunityId)
      .then((opportunity) => {
        if (cancelled) return;
        setContextLine(
          formatChanakyaOpportunityContextLine(chanakyaContextIdentityFromOpportunity(opportunity)),
        );
      })
      .catch(() => {
        if (!cancelled) setContextLine(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, opportunityId]);

  useEffect(() => {
    const versions = model?.compassHistory?.versions ?? [];
    if (versions.length === 0) return;
    if (!versions.some((version) => version.versionNumber === selectedVersionNumber)) {
      setSelectedVersionNumber(versions[0]?.versionNumber ?? null);
    }
  }, [model, selectedVersionNumber]);

  if (!open) return null;

  const compass = model?.compassHistory ?? null;
  const compassOrigin = compass?.compassOrigin === true;
  const formKeys = compassOrigin && recalculateOpen && compass
    ? [...compass.prefill.map((item) => item.key), ...compass.missingFactKeys]
    : model?.missingFactKeys ?? [];
  const missingKeys = [...new Set(formKeys)];
  const inputs = missingKeys.reduce<Array<{ key: string; input: (typeof CHANAKYA_FACT_INPUTS)[string] }>>(
    (rows, key) => {
      const input = CHANAKYA_FACT_INPUTS[key];
      if (!input) return rows;
      if (input.control === "city" && rows.some((row) => row.input.control === "city")) return rows;
      rows.push({ key, input });
      return rows;
    },
    [],
  );
  const informationComplete =
    model?.workspaceState === "INFORMATION_COMPLETE" || model?.workspaceState === "NO_ELIGIBLE_PROGRAMMES";
  const presentation = selectStandardRecommendationPresentation(
    model?.result?.recommendations ?? [],
    model?.result?.presentation,
  );
  const hasCards = presentation.recommended.length + presentation.additional.length > 0;

  const submit = async () => {
    const payload: Record<string, string | number | boolean> = {};
    for (const row of inputs) {
      if (row.input.control === "city") {
        const city = values[`${row.key}:city`] ?? "";
        const state = values[`${row.key}:state`] ?? "";
        if (!city || !state) {
          setError("Select a property city.");
          return;
        }
        payload.cityLabel = city;
        payload.stateLabel = state;
        continue;
      }
      const parsed = chanakyaSubmitValue(row.input.control, values[row.key] ?? "");
      if (parsed == null) {
        setError(`Enter ${row.input.label}.`);
        return;
      }
      payload[row.input.patchKey] = parsed;
    }
    if (compassOrigin) payload.recalculate = true;
    setBusy(true);
    setError(null);
    try {
      const response = await authenticatedJsonFetch(
        `/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/chanakya-recommendation`,
        { method: "POST", body: JSON.stringify(payload) },
      );
      const body = (await response.json()) as Envelope;
      if (!response.ok || !body.success || !body.data) {
        setError(body.error?.message || "The details could not be saved.");
        return;
      }
      setModel(body.data);
      setValues({});
      setRecalculateOpen(false);
    } catch {
      setError("The details could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const openRecalculate = () => {
    const next: Record<string, string> = {};
    for (const item of compass?.prefill ?? []) {
      next[item.key] = item.value;
      if (item.key === "property.propertyCity") {
        next[`${item.key}:city`] = item.value;
        if (item.state) next[`${item.key}:state`] = item.state;
      }
    }
    setValues(next);
    setError(null);
    setRecalculateOpen(true);
  };
  const showFactForm = (compassOrigin && recalculateOpen) || (!compassOrigin && model?.panel === "information_required");
  const selectedVersion = compass?.versions.find((version) => version.versionNumber === selectedVersionNumber)
    ?? compass?.versions[0]
    ?? null;
  const selectedOutcome = selectedVersion ? classifyStoredRecommendationOutcome(selectedVersion) : null;

  const previewEmail = async () => {
    if (!selectedVersion) return;
    setBusy(true);
    setEmailNotice(null);
    try {
      const response = await authenticatedJsonFetch(
        `/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/chanakya-recommendation/client-email`,
        { method: "POST", body: JSON.stringify({ versionNumber: selectedVersion.versionNumber }) },
      );
      const body = (await response.json()) as Envelope & {
        data?: {
          recipient: string | null;
          duplicate: boolean;
          message: RecommendationClientMessage;
          opportunityReference: string;
        };
      };
      if (!response.ok || !body.success || !body.data?.message) {
        setEmailNotice(body.error?.message || "The email preview could not be opened.");
        return;
      }
      setEmailPreview(body.data);
    } catch {
      setEmailNotice("The email preview could not be opened.");
    } finally {
      setBusy(false);
    }
  };

  const confirmEmail = async (resend: boolean) => {
    if (!selectedVersion) return;
    setBusy(true);
    setEmailNotice(null);
    try {
      const response = await authenticatedJsonFetch(
        `/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/chanakya-recommendation/client-email`,
        { method: "POST", body: JSON.stringify({ versionNumber: selectedVersion.versionNumber, confirm: true, resend }) },
      );
      const body = (await response.json()) as Envelope & { data?: { deliveryStatus?: string; providerAccepted?: boolean } };
      if (!response.ok || !body.success) {
        setEmailNotice(body.error?.message || "The recommendation email was not sent.");
        return;
      }
      const accepted = body.data?.providerAccepted === true;
      setEmailNotice(accepted
        ? "The email provider accepted this message. Inbox delivery is not confirmed."
        : "The send was recorded. The provider did not accept the message.");
      setEmailPreview(null);
    } catch {
      setEmailNotice("The recommendation email was not sent.");
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    if (!selectedVersion) return;
    setBusy(true);
    setEmailNotice(null);
    try {
      const response = await authenticatedJsonFetch(
        `/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/chanakya-recommendation/pdf?version=${selectedVersion.versionNumber}`,
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as Envelope;
        setEmailNotice(body.error?.message || "The PDF could not be downloaded.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `recommendation-${selectedVersion.versionNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setEmailNotice("The PDF could not be downloaded.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-label="CHANAKYA Recommendation">
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-teal-700" />
            <h2 className="text-sm font-semibold">CHANAKYA Recommendation</h2>
          </div>
          {contextLine ? (
            <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{contextLine}</p>
          ) : null}
        </div>
        <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
          Close
        </Button>
      </header>
      {compassOrigin && compass && selectedVersion ? (
        <VersionSelector
          versions={compass.versions}
          selected={selectedVersion}
          onSelect={(versionNumber) => {
            setSelectedVersionNumber(versionNumber);
            setEmailPreview(null);
            setEmailNotice(null);
          }}
        />
      ) : null}
      <div className="grid min-h-0 flex-1 md:grid-cols-2">
        <section className="min-h-0 overflow-y-auto border-b p-4 md:border-b-0 md:border-r">
          <h3 className="text-sm font-semibold">Information</h3>
          {busy && !model ? <p className="mt-3 text-sm text-muted-foreground">Reading saved Opportunity facts…</p> : null}
          {informationComplete && !compassOrigin ? (
            <p className="mt-3 text-sm text-foreground">Information complete</p>
          ) : null}
          {compassOrigin && selectedVersion ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold">{selectedVersion.title}</p>
              <p className="text-xs text-muted-foreground">
                {selectedVersion.kind === "compass_original" ? "Original COMPASS recommendation" : "Employee recalculation"}
                {selectedVersion.recordedAt ? ` · ${selectedVersion.recordedAt}` : ""}
                {selectedVersion.actorUserId ? ` · ${selectedVersion.actorName || "Employee"}` : ""}
              </p>
              {selectedOutcome?.explanation ? (
                <p className="text-sm text-foreground">{selectedOutcome.explanation}</p>
              ) : null}
              {selectedVersion.assessment.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assessment details were saved for this version.</p>
              ) : selectedVersion.assessment.map((line) => (
                <p key={`${selectedVersion.versionNumber}-${line.label}`} className="text-sm text-foreground">
                  {line.label}: {line.value}
                </p>
              ))}
              {selectedVersion.selectedLenders.length > 0 ? (
                <p className="text-sm text-foreground">
                  Customer preferences: {selectedVersion.selectedLenders.map((lender, index) => `Preference ${index + 1} ${lender.lenderName}`).join(", ")}
                </p>
              ) : null}
              {!recalculateOpen ? (
                <Button type="button" disabled={busy} onClick={openRecalculate}>
                  Recalculate
                </Button>
              ) : null}
            </div>
          ) : null}
          {showFactForm ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm font-medium">
                {inputs.length} detail{inputs.length === 1 ? "" : "s"} required
              </p>
              {inputs.map((row) => (
                <div key={row.key} className="space-y-1">
                  <Label htmlFor={`chanakya-${row.key}`}>{row.input.label}</Label>
                  {row.input.control === "city" ? (
                    <CitySelect
                      city={values[`${row.key}:city`]}
                      state={values[`${row.key}:state`]}
                      onSelect={(entry) =>
                        setValues((prev) => ({
                          ...prev,
                          [`${row.key}:city`]: entry.city,
                          [`${row.key}:state`]: entry.state,
                        }))
                      }
                    />
                  ) : row.input.control === "select" ? (
                    <Select
                      value={values[row.key] ?? ""}
                      onValueChange={(value) => setValues((prev) => ({ ...prev, [row.key]: value }))}
                    >
                      <SelectTrigger id={`chanakya-${row.key}`}>
                        <SelectValue placeholder={`Select ${row.input.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(row.input.options ?? []).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`chanakya-${row.key}`}
                      inputMode={
                        row.input.control === "date"
                          ? undefined
                          : row.input.control === "age" || row.input.control === "count" || row.input.control === "months"
                            ? "numeric"
                            : "decimal"
                      }
                      type={row.input.control === "date" ? "date" : "text"}
                      value={values[row.key] ?? ""}
                      placeholder={row.input.control === "money" || row.input.control === "money_or_zero" ? "₹" : ""}
                      onChange={(event) => setValues((prev) => ({ ...prev, [row.key]: event.target.value }))}
                    />
                  )}
                </div>
              ))}
              <Button type="button" disabled={busy || inputs.length === 0} onClick={() => void submit()}>
                {compassOrigin ? "Recalculate" : "Submit & Get Recommendation"}
              </Button>
            </div>
          ) : null}
          {model?.panel === "unsupported" ? (
            <p className="mt-3 text-sm text-foreground">{model.guidance}</p>
          ) : null}
          {model?.workspaceState === "UNSUPPORTED_CANONICAL_FACT" ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-foreground">{model.guidance}</p>
              {model.blockers.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  {model.blockers.map((item) => (
                    <li key={item.factKey}>{item.displayLabel}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : model?.panel === "blocked" ? (
            <p className="mt-3 text-sm text-foreground">{model.guidance}</p>
          ) : null}
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </section>
        <section className="min-h-0 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold">CHANAKYA Recommendation</h3>
          {busy ? (
            <ChanakyaLoadingExperience
              module="credit"
              statusLabel="Preparing the lender recommendation..."
              density="inline"
              useEbiSignals={false}
            />
          ) : null}
          {!busy && compassOrigin && selectedVersion ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={busy} onClick={() => void previewEmail()}>
                  Send Lender Recommendations to Client
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => void downloadPdf()}>
                  Download PDF
                </Button>
              </div>
              {emailNotice ? <p className="text-sm text-foreground">{emailNotice}</p> : null}
              {emailPreview ? (
                <EmailPreview
                  preview={emailPreview}
                  busy={busy}
                  onCancel={() => setEmailPreview(null)}
                  onConfirm={(resend) => void confirmEmail(resend)}
                />
              ) : null}
              <ComparisonTable version={selectedVersion} />
            </div>
          ) : null}
          {!busy && !compassOrigin && model?.panel === "information_required" ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Recommendation will appear after the required information is submitted.
            </p>
          ) : null}
          {!busy && !compassOrigin && model?.workspaceState === "NO_ELIGIBLE_PROGRAMMES" ? (
            <p className="mt-3 text-sm text-foreground">{model.guidance}</p>
          ) : null}
          {!busy && !compassOrigin && hasCards ? (
            <div className="mt-3 space-y-3">
              <RecommendationGroup label="Recommended" rows={presentation.recommended} />
              <RecommendationGroup label="Additional options" rows={presentation.additional} />
            </div>
          ) : null}
          {!busy && !compassOrigin && model?.workspaceState === "UNSUPPORTED_CANONICAL_FACT" ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-foreground">{model.guidance}</p>
              {model.blockers.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  {model.blockers.map((item) => (
                    <li key={item.factKey}>{item.displayLabel}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : !busy && !compassOrigin && model?.panel === "blocked" ? (
            <p className="mt-3 text-sm text-muted-foreground">{model.guidance}</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function VersionSelector({
  versions,
  selected,
  onSelect,
}: {
  versions: CompassRecommendationHistoryVersion[];
  selected: CompassRecommendationHistoryVersion;
  onSelect: (versionNumber: number) => void;
}) {
  if (versions.length > 4) {
    return (
      <div className="border-b px-4 py-2">
        <Label htmlFor="recommendation-version">Recommendation version</Label>
        <Select value={String(selected.versionNumber)} onValueChange={(value) => onSelect(Number(value))}>
          <SelectTrigger id="recommendation-version" className="mt-1 max-w-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {versions.map((version) => (
              <SelectItem key={version.versionNumber} value={String(version.versionNumber)}>
                {version.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  return (
    <div className="flex gap-2 overflow-x-auto border-b px-4 py-2" role="tablist" aria-label="Recommendation versions">
      {versions.map((version) => {
        const active = version.versionNumber === selected.versionNumber;
        return (
          <button
            key={version.versionNumber}
            type="button"
            role="tab"
            aria-selected={active}
            className={active
              ? "shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              : "shrink-0 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground"}
            onClick={() => onSelect(version.versionNumber)}
          >
            Recommendation {version.versionNumber}
          </button>
        );
      })}
    </div>
  );
}

function ComparisonTable({ version }: { version: CompassRecommendationHistoryVersion }) {
  const outcome = classifyStoredRecommendationOutcome(version);
  return (
    <div className="space-y-2">
      {outcome.kind !== "recommended" && outcome.explanation ? (
        <p className="text-sm text-foreground">{outcome.explanation}</p>
      ) : null}
      {version.cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">No lender recommendations were saved for this version.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                {["Lender", "Rank", "Preference", "Eligible offer", "Interest", "EMI", "Tenure", "Processing", "Programme"].map((heading) => (
                  <th key={heading} className="px-2 py-2 font-semibold text-foreground">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {version.cards.map((card) => (
                <tr key={`${card.rank}-${card.lenderRef || card.displayName}`} className="border-b align-top">
                  <td className="px-2 py-2 font-medium text-foreground">{card.displayName}</td>
                  <td className="px-2 py-2 text-foreground">{card.rank}</td>
                  <td className="px-2 py-2 text-foreground">{card.customerPreference ? `Preference ${card.customerPreference}` : "Not available"}</td>
                  <td className="px-2 py-2 text-foreground">{card.tentativeOfferLabel || "Not available"}</td>
                  <td className="px-2 py-2 text-foreground">{card.interestRateLabel || "Not available"}</td>
                  <td className="px-2 py-2 text-foreground">{card.estimatedEmiLabel || "Not available"}</td>
                  <td className="px-2 py-2 text-foreground">{card.tenureLabel || "Not available"}</td>
                  <td className="px-2 py-2 text-foreground">{card.processingTimeLabel || "Not available"}</td>
                  <td className="px-2 py-2 text-foreground">{card.programmeVersion != null ? `Version ${card.programmeVersion}` : "Not available"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmailPreview({
  preview,
  busy,
  onCancel,
  onConfirm,
}: {
  preview: {
    recipient: string | null;
    duplicate: boolean;
    message: RecommendationClientMessage;
    opportunityReference: string;
  };
  busy: boolean;
  onCancel: () => void;
  onConfirm: (resend: boolean) => void;
}) {
  const deliveredHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${preview.message.htmlBody}</body></html>`;
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm text-foreground">Recipient: {preview.recipient || "No customer email is saved on this Opportunity."}</p>
      <p className="text-sm text-foreground">Subject: {preview.message.subject}</p>
      <iframe
        title="Customer email preview"
        sandbox=""
        srcDoc={deliveredHtml}
        className="h-96 w-full rounded-md border bg-white"
      />
      {preview.duplicate ? (
        <p className="text-sm text-foreground">This version was already sent to this recipient. A resend is recorded separately.</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy || !preview.recipient} onClick={() => onConfirm(preview.duplicate)}>
          {preview.duplicate ? "Resend this version" : "Confirm and send"}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
