"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { parseProductJourneyFields, reorderVisibleJourneyFields } from "@/lib/product-journey/parse";
import { resolveProductJourneyFieldLabel } from "@/lib/product-journey/display-label";
import type { ProductJourneyFieldRow, ProductJourneyApplicability } from "@/types/product-journey-definition";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  deselectFieldKeys,
  fieldIsSelected,
  listProjectedRecommendationFields,
  normalizeDraftCriterionWeights,
  recommendationProductCodesEquivalent,
  resolveProjectedField,
  sortByFriendlyDisplayLabel,
} from "@/lib/product-recommendation";
import {
  planProductJourneyDraft,
  productJourneyRejectRequest,
  productJourneyVisibleActions,
} from "@/lib/product-journey/lineage";
import { planMatchPercentDraft } from "@/lib/product-recommendation/weight-lineage";
import {
  asMatchPercentLineageRow,
  matchPercentDraftIsEditable,
  matchPercentReviewCriteria,
  matchPercentReviewIdentity,
  matchPercentReviewIsReadOnly,
  matchPercentReviewTotal,
  matchPercentSaveDraftRequest,
  matchPercentSelectValueIsInOptions,
  matchPercentTransitionRequest,
  matchPercentVisibleReviewActions,
  resolveMatchPercentDisplayedRow,
} from "@/lib/product-recommendation/weight-review";
import { AUTHORISED_CIBIL_CATEGORY_RULES } from "@/lib/home-loan-recommendation/cibil-category";
import {
  AUTHORISED_INDIVIDUAL_HOUSING_LTV_SLABS,
  AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE,
} from "@/constants/home-loan-recommendation/rbi-ltv-slabs";

type MasterRow = {
  id: string;
  lifecycleStatus: string;
  versionNumber?: number;
  productCode?: string;
  lineageId?: string;
  labelledUnapproved?: boolean;
  simulationOnly?: boolean;
  createdAt?: string;
  updatedAt?: string;
  weightsJson?: Record<string, number>;
  weightsTotal?: number;
  payloadJson?: {
    notKnownCategories?: string[];
    below700Categories?: string[];
    atOrAbove700Categories?: string[];
    belowThreshold?: number;
  };
  slabsJson?: Array<{ maxLoanAmountRupeesInclusive: number | null; maxLtvPercent: number }>;
  sourceLabel?: string;
  category?: "A" | "B" | "C";
  lenderId?: string;
  lender?: { code?: string; label?: string; displayName?: string | null };
};

type BusinessArea = "journey" | "weightage" | "categories" | "cibil" | "ltv";

function asWeightMap(value: unknown): Record<string, number> {
  const parsed = normalizeDraftCriterionWeights(value);
  if (!("error" in parsed)) return { ...parsed.selected };
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: Record<string, number> = {};
  for (const [key, weight] of Object.entries(value as Record<string, unknown>)) {
    if (typeof weight === "number" && Number.isFinite(weight)) next[key] = weight;
  }
  return next;
}

function journeyRowVisible(row: ProductJourneyFieldRow, category: ProductJourneyApplicability): boolean {
  return category === "all" || row.applicability === "all" || row.applicability === category;
}

function formatLoanAmount(value: number | null): string {
  if (value == null) return "No upper limit";
  if (value >= 100000 && value % 100000 === 0) return `₹${value / 100000} lakh`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatJourneyTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function categoryList(values: string[] | undefined): string {
  if (!values?.length) return "none";
  if (values.length === 1) return `Category ${values[0]} only`;
  return `Category ${values.join(" + ")}`;
}

function lenderName(row: MasterRow): string {
  return row.lender?.displayName || row.lender?.label || row.lender?.code || "Lender";
}

function workingCategoryAssignments(rows: MasterRow[]): MasterRow[] {
  const byLender = new Map<string, MasterRow[]>();
  for (const row of rows) {
    const key = row.lenderId ?? row.id;
    const list = byLender.get(key) ?? [];
    list.push(row);
    byLender.set(key, list);
  }
  return [...byLender.values()].map((list) => list.find((row) => row.lifecycleStatus === "draft") ?? list[0]);
}

export function HomeLoanRecommendationMastersWorkspace() {
  const [data, setData] = useState<{
    weights?: MasterRow[];
    cibil?: MasterRow[];
    ltv?: MasterRow[];
    categories?: MasterRow[];
    products?: Array<{ code: string; label: string; sortOrder: number }>;
    definitions?: Array<{
      id: string;
      productCode: string;
      lineageId?: string;
      lifecycleStatus: string;
      versionNumber?: number;
      fieldsJson?: unknown;
      createdAt?: string;
      updatedAt?: string;
    }>;
    bootstrap?: Record<string, Array<{ fieldId: string; applicability: "all" | "salaried" | "self_employed"; capture: boolean; mandatoryForRecommendation: boolean; displayOrder: number }>>;
    authorisedCibilRules?: typeof AUTHORISED_CIBIL_CATEGORY_RULES;
    libraryLtvDefault?: {
      slabs: typeof AUTHORISED_INDIVIDUAL_HOUSING_LTV_SLABS;
      source: typeof AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE;
    };
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [area, setArea] = useState<BusinessArea>("journey");
  const [productCode, setProductCode] = useState<string>("HOME_LOAN");
  const [historyVersionId, setHistoryVersionId] = useState<string | null>(null);
  const [draftWeights, setDraftWeights] = useState<Record<string, number>>({});
  const [draftFields, setDraftFields] = useState<ProductJourneyFieldRow[]>([]);
  const [customerCategory, setCustomerCategory] = useState<ProductJourneyApplicability>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [showCriterionPicker, setShowCriterionPicker] = useState(false);
  const [addFieldId, setAddFieldId] = useState("");
  const [addFieldQuery, setAddFieldQuery] = useState("");
  const [addCriterionId, setAddCriterionId] = useState("");
  const [addCriterionQuery, setAddCriterionQuery] = useState("");
  const [dragVisibleIndex, setDragVisibleIndex] = useState<number | null>(null);

  const reload = async () => {
    const res = await authenticatedJsonFetch("/api/admin/home-loan-recommendation-masters");
    const body = await res.json();
    if (!res.ok || body.success === false) throw new Error(body?.error?.message || "Unable to load Product Journey Master.");
    setData(body.data ?? body);
  };

  useEffect(() => {
    void reload().catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to load masters.")).finally(() => setLoading(false));
  }, []);

  const productChoices = useMemo(() => data?.products ?? [], [data?.products]);
  const productLabel = (code: string | undefined) =>
    productChoices.find((item) => recommendationProductCodesEquivalent(item.code, code))?.label ?? code?.replaceAll("_", " ") ?? "Not specified";
  useEffect(() => {
    if (productChoices.length && !productChoices.some((item) => recommendationProductCodesEquivalent(item.code, productCode))) {
      setProductCode(productChoices[0]!.code);
    }
  }, [productChoices, productCode]);
  const journeyRows = useMemo(
    () =>
      [...(data?.definitions ?? [])]
        .filter((row) => recommendationProductCodesEquivalent(row.productCode, productCode))
        .sort((left, right) => {
          const versionDelta = (right.versionNumber ?? 1) - (left.versionNumber ?? 1);
          if (versionDelta !== 0) return versionDelta;
          return new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime();
        }),
    [data?.definitions, productCode],
  );
  const journeyPlan = useMemo(
    () =>
      planProductJourneyDraft(
        journeyRows.map((row) => ({
          id: row.id,
          organizationId: "",
          productCode: row.productCode,
          lineageId: row.lineageId ?? row.id,
          versionNumber: row.versionNumber ?? 1,
          lifecycleStatus: row.lifecycleStatus,
          makerUserId: "",
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
        productCode,
      ),
    [journeyRows, productCode],
  );
  const journeyDraft =
    journeyRows.find((row) => row.lifecycleStatus === "draft") ?? null;
  const journeyFieldSource =
    journeyDraft ??
    journeyRows.find((row) => row.lifecycleStatus === "checker_review") ??
    journeyRows.find((row) => row.lifecycleStatus === "approved") ??
    journeyRows.find((row) => row.lifecycleStatus === "active") ??
    null;
  const journeySaveBlocked = journeyPlan.action === "refuse_in_flight";
  const productRows = useMemo(
    () => (data?.weights ?? []).filter((row) => recommendationProductCodesEquivalent(row.productCode, productCode)),
    [data?.weights, productCode],
  );
  const weightPlan = useMemo(
    () =>
      planMatchPercentDraft(
        productRows.map((row) => ({
          id: row.id,
          organizationId: "",
          productCode: row.productCode ?? productCode,
          lineageId: row.lineageId ?? row.id,
          versionNumber: row.versionNumber ?? 1,
          lifecycleStatus: row.lifecycleStatus,
          makerUserId: "",
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
        productCode,
      ),
    [productRows, productCode],
  );
  const weightLineageRows = useMemo(
    () => (data?.weights ?? []).map((row) => asMatchPercentLineageRow(row, productCode)),
    [data?.weights, productCode],
  );
  const selectedLineageRow = useMemo(
    () =>
      resolveMatchPercentDisplayedRow({
        rows: weightLineageRows,
        productCode,
        selectedVersionId: historyVersionId,
      }),
    [weightLineageRows, productCode, historyVersionId],
  );
  const selectedRow = selectedLineageRow
    ? (productRows.find((row) => row.id === selectedLineageRow.id) ?? null)
    : null;
  const weightEditorEditable = matchPercentDraftIsEditable({
    row: selectedLineageRow,
    selectedVersionId: historyVersionId,
    productRows: weightLineageRows,
  });
  const weightReviewActions = matchPercentVisibleReviewActions({
    lifecycleStatus: selectedRow?.lifecycleStatus ?? "",
    editable: weightEditorEditable,
  });
  const weightSaveBlocked = weightPlan.action === "refuse_in_flight" && !weightEditorEditable;
  const total = useMemo(
    () => Object.values(draftWeights).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0),
    [draftWeights],
  );
  const availableFields = useMemo(
    () => listProjectedRecommendationFields({ productCode }),
    [productCode],
  );
  const pickerFields = useMemo(() => sortByFriendlyDisplayLabel(availableFields), [availableFields]);
  const availableCaptureFields = useMemo(
    () => sortByFriendlyDisplayLabel(availableFields.filter((field) => field.fieldKind === "assessment_fact")),
    [availableFields],
  );
  const cibilRules = data?.authorisedCibilRules ?? AUTHORISED_CIBIL_CATEGORY_RULES;
  const ltvSlabs = data?.libraryLtvDefault?.slabs ?? AUTHORISED_INDIVIDUAL_HOUSING_LTV_SLABS;
  const categoryGroups = useMemo(() => {
    const working = workingCategoryAssignments(data?.categories ?? []);
    return {
      A: working.filter((row) => row.category === "A"),
      B: working.filter((row) => row.category === "B"),
      C: working.filter((row) => row.category === "C"),
    };
  }, [data?.categories]);

  useEffect(() => {
    setHistoryVersionId(null);
    setShowFieldPicker(false);
    setShowCriterionPicker(false);
    setAddFieldId("");
    setAddCriterionId("");
    setAddFieldQuery("");
    setAddCriterionQuery("");
  }, [productCode]);

  useEffect(() => {
    if (!selectedRow) {
      setDraftWeights({});
      return;
    }
    setDraftWeights(asWeightMap(selectedRow.weightsJson));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRow?.id, selectedRow?.weightsJson]);

  useEffect(() => {
    const source = journeyFieldSource?.fieldsJson ?? data?.bootstrap?.[productCode] ?? [];
    setDraftFields(parseProductJourneyFields(source));
  }, [journeyFieldSource?.id, journeyFieldSource?.fieldsJson, data?.bootstrap, productCode]);

  const post = async (payload: Record<string, unknown>, success = "Saved.") => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await authenticatedJsonFetch("/api/admin/home-loan-recommendation-masters", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || body.success === false) throw new Error(body?.error?.message || "Request failed.");
      setMessage(success);
      await reload();
      return body.data ?? body;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!selectedRow || selectedRow.lifecycleStatus !== "draft" || !weightEditorEditable) {
      setMessage("Select the exact draft from Version History before saving Match % weights.");
      return;
    }
    await post(
      matchPercentSaveDraftRequest(selectedRow.id, draftWeights),
      "Draft weights saved. Percentages were not auto-balanced.",
    );
  };

  const saveJourney = async () => {
    if (journeyPlan.action === "refuse_in_flight") {
      setMessage(journeyPlan.reason);
      return;
    }
    let draftId = journeyDraft?.lifecycleStatus === "draft" ? journeyDraft.id : null;
    if (!draftId) {
      const created = await post({ intent: "ensure_journey_draft", productCode }, "Journey draft opened.");
      draftId = created && typeof created === "object" && "id" in created ? String(created.id) : null;
    }
    if (!draftId) return;
    await post(
      { intent: "save_journey_draft", id: draftId, fieldsJson: draftFields },
      "Journey fields saved. Capture, mandatory-for-recommendation, and Match % remain separate.",
    );
  };

  const visibleJourneyRows = draftFields
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => journeyRowVisible(row, customerCategory));

  const reviewCriteria = matchPercentReviewCriteria(weightEditorEditable ? draftWeights : selectedRow?.weightsJson);
  const unselectedFields = pickerFields.filter((field) => !fieldIsSelected(draftWeights, field));
  const unconfiguredJourneyFields = availableCaptureFields.filter((field) => {
    if (draftFields.some((row) => row.fieldId === field.id && (row.applicability === "all" || customerCategory === "all" || row.applicability === customerCategory))) return false;
    if (!addFieldQuery.trim()) return true;
    const query = addFieldQuery.trim().toLowerCase();
    return field.label.toLowerCase().includes(query) || field.id.toLowerCase().includes(query);
  });
  const unselectedSearchFields = unselectedFields.filter((field) => {
    if (!addCriterionQuery.trim()) return true;
    const query = addCriterionQuery.trim().toLowerCase();
    return field.label.toLowerCase().includes(query) || field.id.toLowerCase().includes(query);
  });

  const VersionList = ({
    title,
    kind,
    rows,
  }: {
    title: string;
    kind: "weights" | "cibil" | "ltv" | null;
    rows?: MasterRow[];
  }) => (
    <details className="rounded-md border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">Version History / Audit Details</summary>
      <p className="mt-2 text-xs text-muted-foreground">{title}</p>
      {(rows ?? []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No versions yet.</p> : null}
      {(rows ?? []).map((row) => (
        <div key={row.id} className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{productLabel(row.productCode)}</span>
          <span>Version {row.versionNumber ?? 1}</span>
          <span>{row.lifecycleStatus}</span>
          {row.labelledUnapproved ? <span>Demonstration draft</span> : null}
          <span className="font-mono">{row.id.slice(0, 8)}</span>
          {kind === "weights" ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setHistoryVersionId(row.id)}>
              View this version
            </Button>
          ) : null}
          {kind && kind !== "weights" && row.lifecycleStatus === "draft" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void post({ intent: "transition", kind, id: row.id, action: "submit_review" }, "Submitted for checker.")}
            >
              Submit for checker
            </Button>
          ) : null}
          {kind && kind !== "weights" && row.lifecycleStatus === "checker_review" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void post({ intent: "transition", kind, id: row.id, action: "approve" }, "Approved.")}
            >
              Approve
            </Button>
          ) : null}
          {kind && kind !== "weights" && row.lifecycleStatus === "approved" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void post({ intent: "transition", kind, id: row.id, action: "activate" }, "Activated.")}
            >
              Activate
            </Button>
          ) : null}
        </div>
      ))}
    </details>
  );

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Product Journey & Recommendation Master</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          One screen for product questions, recommendation-mandatory facts, and Match % weights. Product tabs come from
          Product Master. Capture, mandatory-for-recommendation, and Match % stay separate.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={area === "journey" ? "default" : "outline"} onClick={() => setArea("journey")}>
          Product Journey
        </Button>
        <Button size="sm" variant={area === "weightage" ? "default" : "outline"} onClick={() => setArea("weightage")}>
          Match %
        </Button>
        <Button size="sm" variant={area === "categories" ? "default" : "outline"} onClick={() => setArea("categories")}>
          Lender Categories
        </Button>
        <Button size="sm" variant={area === "cibil" ? "default" : "outline"} onClick={() => setArea("cibil")}>
          CIBIL Rules
        </Button>
        <Button size="sm" variant={area === "ltv" ? "default" : "outline"} onClick={() => setArea("ltv")}>
          Regulatory LTV
        </Button>
      </div>

      {message ? <p role="status" className="text-sm">{message}</p> : null}
      {loadError ? <p role="alert">{loadError}</p> : null}
      {loading ? <p role="status">Loading Product Journey Master...</p> : null}

      {area === "journey" || area === "weightage" ? (
        <div className="flex flex-wrap gap-2">
          {productChoices.map((choice) => (
            <Button
              key={choice.code}
              size="sm"
              variant={recommendationProductCodesEquivalent(productCode, choice.code) ? "default" : "outline"}
              onClick={() => setProductCode(choice.code)}
            >
              {choice.label}
            </Button>
          ))}
        </div>
      ) : null}

      {!loading && !loadError && area === "journey" ? (
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="text-base font-semibold">Configured fields for {productLabel(productCode)}</h2>
            <p className="text-sm text-muted-foreground">
              Only configured rows appear. Add Field uses canonical discovery. Capture, mandatory-for-recommendation, and
              Match % are separate settings.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            Customer category
            <select aria-label="Customer category" value={customerCategory} onChange={(event) => { setCustomerCategory(event.target.value as ProductJourneyApplicability); setAddFieldId(""); }}>
              <option value="all">All categories</option>
              <option value="salaried">Salaried</option>
              <option value="self_employed">Self-employed</option>
            </select>
          </label>
          {visibleJourneyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fields configured for this product yet.</p>
          ) : (
            <>
            <div className="hidden gap-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-7">
              <span>Order</span>
              <span className="md:col-span-2">Field</span>
              <span>Customer Category</span>
              <span>Show/Capture</span>
              <span>Mandatory for Recommendation</span>
              <span>Remove</span>
            </div>
            {visibleJourneyRows.map(({ row, index }, visibleIndex) => (
              <div
                role="group"
                aria-label={`Configured field ${row.fieldId}`}
                key={`${row.fieldId}-${index}`}
                className="grid gap-2 border-b border-border/60 py-2 md:grid-cols-7"
                draggable
                onDragStart={() => setDragVisibleIndex(visibleIndex)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragVisibleIndex == null) return;
                  setDraftFields((current) =>
                    reorderVisibleJourneyFields(
                      current,
                      (item) => journeyRowVisible(item, customerCategory),
                      dragVisibleIndex,
                      visibleIndex,
                    ),
                  );
                  setDragVisibleIndex(null);
                }}
                onDragEnd={() => setDragVisibleIndex(null)}
              >
                <div className="flex items-center gap-1">
                  <span className="cursor-grab text-xs text-muted-foreground" aria-hidden="true">↕</span>
                  <Input
                    aria-label={`Order for ${row.fieldId}`}
                    className="h-9 w-16"
                    type="number"
                    min={1}
                    value={String(row.displayOrder)}
                    onChange={(event) => {
                      const nextOrder = Number(event.target.value);
                      setDraftFields((current) =>
                        parseProductJourneyFields(
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, displayOrder: Number.isFinite(nextOrder) ? nextOrder : item.displayOrder }
                              : item,
                          ),
                        ),
                      );
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Move ${row.fieldId} up`}
                    disabled={visibleIndex === 0}
                    onClick={() =>
                      setDraftFields((current) =>
                        reorderVisibleJourneyFields(
                          current,
                          (item) => journeyRowVisible(item, customerCategory),
                          visibleIndex,
                          visibleIndex - 1,
                        ),
                      )
                    }
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Move ${row.fieldId} down`}
                    disabled={visibleIndex === visibleJourneyRows.length - 1}
                    onClick={() =>
                      setDraftFields((current) =>
                        reorderVisibleJourneyFields(
                          current,
                          (item) => journeyRowVisible(item, customerCategory),
                          visibleIndex,
                          visibleIndex + 1,
                        ),
                      )
                    }
                  >
                    ↓
                  </Button>
                </div>
                <select className="h-9 rounded-md border border-input bg-background px-2 text-sm md:col-span-2"
                  aria-label={`Field for ${row.fieldId}`} value={row.fieldId}
                  onChange={(event) => setDraftFields((current) => current.map((item, itemIndex) => itemIndex === index ? {
                    ...item, fieldId: event.target.value,
                    label: undefined, captureStepId: undefined, idcKeys: undefined, seedReason: undefined,
                    ...data?.bootstrap?.[productCode]?.find((field) => field.fieldId === event.target.value),
                    applicability: item.applicability, capture: item.capture, mandatoryForRecommendation: item.mandatoryForRecommendation, displayOrder: item.displayOrder,
                  } : item))}>
                  {!availableCaptureFields.some((field) => field.id === row.fieldId) ? <option value={row.fieldId}>{resolveProductJourneyFieldLabel(row.fieldId, row.label)}</option> : null}
                  {availableCaptureFields.filter((field) => field.id === row.fieldId || !draftFields.some((item) => item.fieldId === field.id && (item.applicability === row.applicability || item.applicability === "all" || row.applicability === "all"))).map((field) => <option key={field.id} value={field.id}>{resolveProductJourneyFieldLabel(field.id, field.label)}</option>)}
                </select>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  aria-label={`Customer category for ${row.fieldId}`}
                  value={row.applicability}
                  onChange={(event) =>
                    setDraftFields((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, applicability: event.target.value as "all" | "salaried" | "self_employed" }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="all">All</option>
                  <option value="salaried">Salaried</option>
                  <option value="self_employed">Self-employed</option>
                </select>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={row.capture}
                    onCheckedChange={(value) =>
                      setDraftFields((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, capture: value === true } : item,
                        ),
                      )
                    }
                  />
                  Show/Capture
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={row.mandatoryForRecommendation}
                    onCheckedChange={(value) =>
                      setDraftFields((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, mandatoryForRecommendation: value === true } : item,
                        ),
                      )
                    }
                  />
                  Mandatory for recommendation
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraftFields((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowFieldPicker((open) => !open)}>+ Add Field</Button>
          {showFieldPicker ? <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-72">
              <p className="text-xs text-muted-foreground">Add Field</p>
              <Input
                className="mt-1"
                placeholder="Search canonical fields"
                value={addFieldQuery}
                onChange={(event) => setAddFieldQuery(event.target.value)}
              />
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Canonical field"
                value={addFieldId}
                onChange={(event) => setAddFieldId(event.target.value)}
              >
                <option value="">Select a canonical field</option>
                {unconfiguredJourneyFields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.label} ({field.id})
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              disabled={!addFieldId}
              onClick={() => {
                setDraftFields((current) => [
                  ...current,
                  {
                    ...data?.bootstrap?.[productCode]?.find((field) => field.fieldId === addFieldId),
                    fieldId: addFieldId,
                    applicability: customerCategory,
                    capture: true,
                    mandatoryForRecommendation: false,
                    displayOrder: (current.at(-1)?.displayOrder ?? 0) + 10,
                  },
                ]);
                setAddFieldId("");
                setShowFieldPicker(false);
              }}
            >
              Add selected field
            </Button>
          </div> : null}
          <Button disabled={busy || journeySaveBlocked} onClick={() => void saveJourney()}>
            Save Journey Draft
          </Button>
          {journeyPlan.action === "refuse_in_flight" ? (
            <p className="text-sm text-amber-200">{journeyPlan.reason}</p>
          ) : journeyPlan.action === "create_next" ? (
            <p className="text-sm text-muted-foreground">
              Saving opens Version {journeyPlan.versionNumber} as a draft in the same product lineage. It does not
              activate automatically.
            </p>
          ) : null}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Journey version lineage. Activation applies this version to the product journey.</p>
            {journeyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Default configuration in effect until a version is saved and activated.</p>
            ) : (
              journeyRows.map((row) => {
                const actions = productJourneyVisibleActions(row.lifecycleStatus);
                return (
                <div key={row.id} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{productLabel(row.productCode)}</span>
                  <span>Version {row.versionNumber ?? 1}</span>
                  <span>{row.lifecycleStatus}</span>
                  {formatJourneyTimestamp(row.updatedAt) ? (
                    <span>Updated {formatJourneyTimestamp(row.updatedAt)}</span>
                  ) : null}
                  {actions.submitForChecker ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void post(
                          { intent: "transition_journey", id: row.id, action: "submit_review" },
                          "Journey submitted for checker.",
                        )
                      }
                    >
                      Submit for checker
                    </Button>
                  ) : null}
                  {actions.approve ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void post({ intent: "transition_journey", id: row.id, action: "approve" }, "Journey approved.")
                      }
                    >
                      Approve
                    </Button>
                  ) : null}
                  {actions.reject ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Reject this Product Journey version? It will remain on the list as rejected and cannot be approved or activated.",
                          )
                        ) {
                          return;
                        }
                        void post(productJourneyRejectRequest(row.id), "Journey rejected.");
                      }}
                    >
                      Reject
                    </Button>
                  ) : null}
                  {actions.activate ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void post({ intent: "transition_journey", id: row.id, action: "activate" }, "Journey activated.")
                      }
                    >
                      Activate
                    </Button>
                  ) : null}
                </div>
                );
              })
            )}
          </div>
        </Card>
      ) : null}

      {!loading && !loadError && area === "weightage" ? (
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="text-base font-semibold">Match % criteria</h2>
            <p className="text-sm text-muted-foreground">
              Review is version-specific. Approve and Reject apply only to the durable row shown here.
            </p>
          </div>
          {selectedRow && selectedLineageRow ? (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm" role="status" aria-label="Match percent version identity">
              {(() => {
                const identity = matchPercentReviewIdentity(selectedLineageRow, productLabel(productCode));
                const displayedTotal = weightEditorEditable ? total : matchPercentReviewTotal(reviewCriteria);
                return (
                  <>
                    <p><span className="text-muted-foreground">Product</span> {identity.productLabel}</p>
                    <p><span className="text-muted-foreground">Version</span> {identity.versionNumber}</p>
                    <p><span className="text-muted-foreground">Lifecycle status</span> {identity.lifecycleStatus}</p>
                    <p><span className="text-muted-foreground">Durable ID</span> <span className="font-mono">{identity.shortId}</span></p>
                    <p><span className="text-muted-foreground">Total weight</span> {displayedTotal}%</p>
                    {matchPercentReviewIsReadOnly(identity.lifecycleStatus) ? (
                      <p className="mt-1 text-xs text-muted-foreground">Read-only review of this exact version.</p>
                    ) : null}
                  </>
                );
              })()}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No Match % version is selected for this product.</p>
          )}
          {reviewCriteria.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Match % criteria selected.</p>
          ) : (
            reviewCriteria.map((criterion) => {
              const selectValue = criterion.knownField && criterion.selectable ? criterion.canonicalKey : "";
              const selectOptions = availableFields.filter(
                (option) => option.id === selectValue || !fieldIsSelected(draftWeights, option),
              );
              const canUseSelect =
                weightEditorEditable &&
                criterion.selectable &&
                matchPercentSelectValueIsInOptions(selectValue, selectOptions);
              const field = resolveProjectedField(criterion.canonicalKey, availableFields);
              return (
                <div role="group" aria-label={`Match criterion ${criterion.storedKey}`} key={criterion.storedKey} className="flex flex-wrap items-center gap-3 border-b border-border/60 py-2">
                  {canUseSelect ? (
                    <select
                      className="h-9 min-w-56 rounded-md border border-input bg-background px-2 text-sm"
                      aria-label={`Criterion for ${criterion.label}`}
                      value={selectValue}
                      disabled={busy || !weightEditorEditable}
                      onChange={(event) => setDraftWeights((current) => {
                        const without = field ? deselectFieldKeys(current, field) : { ...current };
                        if (!field) delete without[criterion.storedKey];
                        const next = { ...without, [event.target.value]: current[criterion.storedKey] ?? 0 };
                        const parsed = normalizeDraftCriterionWeights(next);
                        return "error" in parsed ? next : { ...parsed.selected };
                      })}
                    >
                      {selectOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="min-w-56 text-sm font-medium">{criterion.label}</span>
                  )}
                  <Input
                    aria-label={`Weight % for ${criterion.label}`}
                    min={0}
                    max={100}
                    step="any"
                    type="number"
                    className="w-24"
                    readOnly={!weightEditorEditable}
                    disabled={busy || !weightEditorEditable}
                    value={
                      weightEditorEditable
                        ? (Number.isFinite(draftWeights[criterion.storedKey]) ? String(draftWeights[criterion.storedKey]) : "")
                        : String(criterion.weight)
                    }
                    onChange={(event) => {
                      if (!weightEditorEditable) return;
                      const next = Number(event.target.value);
                      setDraftWeights((current) => {
                        const parsed = normalizeDraftCriterionWeights({
                          ...current,
                          [criterion.storedKey]: Number.isFinite(next) ? next : 0,
                        });
                        return "error" in parsed
                          ? { ...current, [criterion.storedKey]: Number.isFinite(next) ? next : 0 }
                          : { ...parsed.selected };
                      });
                    }}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  {weightReviewActions.addOrRemoveCriteria ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setDraftWeights((current) => {
                        const next = field ? deselectFieldKeys(current, field) : { ...current };
                        if (!field) delete next[criterion.storedKey];
                        const parsed = normalizeDraftCriterionWeights(next);
                        return "error" in parsed ? next : { ...parsed.selected };
                      })}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              );
            })
          )}
          {weightReviewActions.addOrRemoveCriteria ? (
            <Button size="sm" variant="outline" onClick={() => setShowCriterionPicker((open) => !open)}>+ Add Criteria</Button>
          ) : null}
          {weightReviewActions.addOrRemoveCriteria && showCriterionPicker ? <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-72">
              <p className="text-xs text-muted-foreground">Select criteria</p>
              <Input
                className="mt-1"
                placeholder="Search governed criteria"
                value={addCriterionQuery}
                onChange={(event) => setAddCriterionQuery(event.target.value)}
              />
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Match criterion"
                value={addCriterionId}
                onChange={(event) => setAddCriterionId(event.target.value)}
              >
                <option value="">Choose a governed criterion</option>
                {unselectedSearchFields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              disabled={!addCriterionId}
              onClick={() => {
                setDraftWeights((current) => {
                  const parsed = normalizeDraftCriterionWeights({ ...current, [addCriterionId]: 0 });
                  return "error" in parsed ? { ...current, [addCriterionId]: 0 } : { ...parsed.selected };
                });
                setAddCriterionId("");
                setShowCriterionPicker(false);
              }}
            >
              Add selected criterion
            </Button>
          </div> : null}
          <p className={`text-sm font-medium ${(weightEditorEditable ? total : matchPercentReviewTotal(reviewCriteria)) === 100 ? "text-emerald-300" : "text-amber-200"}`}>
            TOTAL WEIGHTAGE: {weightEditorEditable ? total : matchPercentReviewTotal(reviewCriteria)}%
            {(weightEditorEditable ? total : matchPercentReviewTotal(reviewCriteria)) === 100 ? " — total valid; governed scoring required" : " — draft may be saved at any total"}
          </p>
          {weightReviewActions.saveDraft ? (
            <>
              {weightPlan.action === "refuse_in_flight" ? (
                <p className="text-sm text-amber-200">{weightPlan.reason}</p>
              ) : null}
              <Button disabled={busy || weightSaveBlocked} onClick={() => void saveDraft()}>
                Save Draft
              </Button>
            </>
          ) : selectedRow ? (
            <p className="text-sm text-muted-foreground">
              This version is read-only. Use Version History → View this version to open a specific draft for editing.
            </p>
          ) : null}
          {selectedRow ? (
            <div className="flex flex-wrap gap-2">
              {weightReviewActions.submitForChecker ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setHistoryVersionId(selectedRow.id);
                    void post(matchPercentTransitionRequest(selectedRow.id, "submit_review"), "Submitted for checker.");
                  }}
                >
                  Submit for checker
                </Button>
              ) : null}
              {weightReviewActions.approve ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setHistoryVersionId(selectedRow.id);
                    void post(matchPercentTransitionRequest(selectedRow.id, "approve"), "Approved.");
                  }}
                >
                  Approve
                </Button>
              ) : null}
              {weightReviewActions.reject ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Reject this Match % version? It will remain on the list as rejected and cannot be approved or activated.",
                      )
                    ) {
                      return;
                    }
                    setHistoryVersionId(selectedRow.id);
                    void post(matchPercentTransitionRequest(selectedRow.id, "reject"), "Rejected.");
                  }}
                >
                  Reject
                </Button>
              ) : null}
              {weightReviewActions.activate ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setHistoryVersionId(selectedRow.id);
                    void post(matchPercentTransitionRequest(selectedRow.id, "activate"), "Activated.");
                  }}
                >
                  Activate
                </Button>
              ) : null}
            </div>
          ) : null}
          <VersionList title="Weightage versions for this product" kind="weights" rows={productRows} />
        </Card>
      ) : null}

      {area === "categories" ? (
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="text-base font-semibold">Lender Categories</h2>
            <p className="text-sm text-muted-foreground">
              Existing Category A / B / C assignments. This screen does not change category logic.
            </p>
          </div>
          {(["A", "B", "C"] as const).map((band) => (
            <div key={band} className="space-y-1">
              <p className="text-sm font-medium">Category {band}</p>
              {categoryGroups[band].length === 0 ? (
                <p className="text-sm text-muted-foreground">No lenders assigned to Category {band}.</p>
              ) : (
                categoryGroups[band].map((row) => (
                  <p key={row.id} className="text-sm">
                    {lenderName(row)}
                  </p>
                ))
              )}
            </div>
          ))}
          <VersionList title="Lender category versions" kind={null} rows={data?.categories} />
        </Card>
      ) : null}

      {area === "cibil" ? (
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="text-base font-semibold">CIBIL Rules</h2>
            <p className="text-sm text-muted-foreground">
              These are the existing Home Loan candidate-universe rules. CIBIL category is not a Match % weight.
            </p>
          </div>
          <ul className="space-y-2 text-sm">
            <li>Not Known → {categoryList(cibilRules.notKnownCategories)}</li>
            <li>Below {cibilRules.belowThreshold} → {categoryList(cibilRules.below700Categories)}</li>
            <li>{cibilRules.belowThreshold} and above → {categoryList(cibilRules.atOrAbove700Categories)}</li>
          </ul>
          <VersionList title="CIBIL rule versions" kind="cibil" rows={data?.cibil} />
        </Card>
      ) : null}

      {area === "ltv" ? (
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="text-base font-semibold">Regulatory LTV</h2>
            <p className="text-sm text-muted-foreground">
              Existing individual housing-loan LTV ceilings. This is a regulatory library default unless an Active
              master version overrides it. Logic is unchanged.
            </p>
          </div>
          <ul className="space-y-2 text-sm">
            {ltvSlabs.map((slab, index) => (
              <li key={`${slab.maxLtvPercent}-${index}`}>
                {slab.maxLoanAmountRupeesInclusive == null
                  ? `Above previous slab → ${slab.maxLtvPercent}% LTV`
                  : `Loan amount up to ${formatLoanAmount(slab.maxLoanAmountRupeesInclusive)} → ${slab.maxLtvPercent}% LTV`}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            {data?.libraryLtvDefault?.source.sourceLabel ?? AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE.sourceLabel}
          </p>
          <VersionList title="Regulatory LTV versions" kind="ltv" rows={data?.ltv} />
        </Card>
      ) : null}
    </div>
  );
}
