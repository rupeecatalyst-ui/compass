"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deselectFieldKeys,
  fieldIsSelected,
  listProjectedRecommendationFields,
  recommendationProductCodesEquivalent,
} from "@/lib/product-recommendation";
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
  labelledUnapproved?: boolean;
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

const PRODUCT_CHOICES = [
  { code: "HOME_LOAN", label: "Home Loan" },
  { code: "HOME_LOAN_BT", label: "Home Loan Balance Transfer" },
] as const;

function asWeightMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: Record<string, number> = {};
  for (const [key, weight] of Object.entries(value as Record<string, unknown>)) {
    if (typeof weight === "number" && Number.isFinite(weight)) next[key] = weight;
  }
  return next;
}

function scoreabilityLabel(value: string): string {
  if (value === "fully_scorable") return "Fully scorable";
  if (value === "inputs_wired_scoring_contract_pending") return "Scoring contract pending";
  if (value === "not_implemented") return "Not implemented";
  return value.replaceAll("_", " ");
}

function productLabel(code: string | undefined): string {
  if (!code) return "Not specified";
  const known = PRODUCT_CHOICES.find((item) => recommendationProductCodesEquivalent(item.code, code));
  if (known) return known.label;
  return code.replaceAll("_", " ");
}

function pickWorkingWeightRow(rows: MasterRow[], productCode: string): MasterRow | null {
  return (
    rows.find(
      (row) =>
        recommendationProductCodesEquivalent(row.productCode, productCode) && row.lifecycleStatus === "draft",
    ) ?? null
  );
}

function formatLoanAmount(value: number | null): string {
  if (value == null) return "No upper limit";
  if (value >= 100000 && value % 100000 === 0) return `₹${value / 100000} lakh`;
  return `₹${value.toLocaleString("en-IN")}`;
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
      lifecycleStatus: string;
      versionNumber?: number;
      fieldsJson?: unknown;
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
  const [draftFields, setDraftFields] = useState<
    Array<{
      fieldId: string;
      applicability: "all" | "salaried" | "self_employed";
      capture: boolean;
      mandatoryForRecommendation: boolean;
      displayOrder: number;
    }>
  >([]);
  const [addFieldId, setAddFieldId] = useState("");
  const [addFieldQuery, setAddFieldQuery] = useState("");
  const [addCriterionId, setAddCriterionId] = useState("");
  const [addCriterionQuery, setAddCriterionQuery] = useState("");

  const reload = async () => {
    const res = await authenticatedJsonFetch("/api/admin/home-loan-recommendation-masters");
    const body = await res.json();
    setData(body.data ?? body);
  };

  useEffect(() => {
    void reload();
  }, []);

  const productChoices = data?.products?.length ? data.products : [...PRODUCT_CHOICES];
  const journeyRows = useMemo(
    () =>
      (data?.definitions ?? []).filter((row) =>
        recommendationProductCodesEquivalent(row.productCode, productCode),
      ),
    [data?.definitions, productCode],
  );
  const journeyDraft =
    journeyRows.find((row) => row.lifecycleStatus === "draft") ??
    journeyRows.find((row) => row.lifecycleStatus === "active") ??
    null;
  const productRows = useMemo(
    () => (data?.weights ?? []).filter((row) => recommendationProductCodesEquivalent(row.productCode, productCode)),
    [data?.weights, productCode],
  );
  const workingRow = useMemo(() => pickWorkingWeightRow(data?.weights ?? [], productCode), [data?.weights, productCode]);
  const selectedRow =
    (historyVersionId ? productRows.find((row) => row.id === historyVersionId) : null) ?? workingRow;
  const total = useMemo(
    () => Object.values(draftWeights).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0),
    [draftWeights],
  );
  const availableFields = useMemo(
    () => listProjectedRecommendationFields({ productCode }),
    [productCode],
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
    const source =
      journeyDraft?.fieldsJson ??
      data?.bootstrap?.[productCode] ??
      data?.bootstrap?.HOME_LOAN ??
      [];
    if (!Array.isArray(source)) {
      setDraftFields([]);
      return;
    }
    setDraftFields(
      source.map((row: { fieldId?: string; applicability?: string; capture?: boolean; mandatoryForRecommendation?: boolean; displayOrder?: number }, index: number) => ({
        fieldId: String(row.fieldId ?? ""),
        applicability:
          row.applicability === "salaried" || row.applicability === "self_employed" ? row.applicability : "all",
        capture: row.capture !== false,
        mandatoryForRecommendation: row.mandatoryForRecommendation === true,
        displayOrder: typeof row.displayOrder === "number" ? row.displayOrder : index * 10,
      })).filter((row) => row.fieldId),
    );
  }, [journeyDraft?.id, journeyDraft?.fieldsJson, data?.bootstrap, productCode]);

  const post = async (payload: Record<string, unknown>, success = "Saved.") => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await authenticatedJsonFetch("/api/admin/home-loan-recommendation-masters", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Request failed.");
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
    let draftId = selectedRow?.lifecycleStatus === "draft" ? selectedRow.id : null;
    if (!draftId) {
      const created = await post(
        { intent: "ensure_weight_draft", productCode },
        "Draft opened for this product.",
      );
      draftId = created && typeof created === "object" && "id" in created ? String(created.id) : null;
    }
    if (!draftId) return;
    await post(
      { intent: "save_weight_draft", id: draftId, weightsJson: draftWeights },
      "Draft weights saved. Percentages were not auto-balanced.",
    );
  };

  const saveJourney = async () => {
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

  const selectedWeightRows = availableFields.filter((field) => fieldIsSelected(draftWeights, field));
  const unselectedFields = availableFields.filter((field) => !fieldIsSelected(draftWeights, field));
  const unconfiguredJourneyFields = availableFields.filter((field) => {
    if (draftFields.some((row) => row.fieldId === field.id)) return false;
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
          {kind && row.lifecycleStatus === "draft" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void post({ intent: "transition", kind, id: row.id, action: "submit_review" }, "Submitted for checker.")}
            >
              Submit for checker
            </Button>
          ) : null}
          {kind && row.lifecycleStatus === "checker_review" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void post({ intent: "transition", kind, id: row.id, action: "approve" }, "Approved.")}
            >
              Approve
            </Button>
          ) : null}
          {kind && row.lifecycleStatus === "approved" ? (
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

      {message ? <p className="text-sm">{message}</p> : null}

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

      {area === "journey" ? (
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="text-base font-semibold">Configured fields for {productLabel(productCode)}</h2>
            <p className="text-sm text-muted-foreground">
              Only configured rows appear. Add Field uses canonical discovery. Capture, mandatory-for-recommendation, and
              Match % are separate settings.
            </p>
          </div>
          {draftFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fields configured for this product yet.</p>
          ) : (
            draftFields.map((row, index) => (
              <div key={`${row.fieldId}-${index}`} className="grid gap-2 border-b border-border/60 py-2 md:grid-cols-6">
                <p className="text-sm font-medium md:col-span-2" title={row.fieldId}>
                  {availableFields.find((field) => field.id === row.fieldId)?.label ?? row.fieldId}
                </p>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
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
                  Capture
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
            ))
          )}
          <div className="flex flex-wrap items-end gap-2">
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
                    fieldId: addFieldId,
                    applicability: "all",
                    capture: true,
                    mandatoryForRecommendation: false,
                    displayOrder: (current.at(-1)?.displayOrder ?? 0) + 10,
                  },
                ]);
                setAddFieldId("");
              }}
            >
              + Add Field
            </Button>
          </div>
          <Button disabled={busy} onClick={() => void saveJourney()}>
            Save Journey Draft
          </Button>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Journey version lineage. Activation replaces the TypeScript bootstrap for this product.</p>
            {journeyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bootstrap in effect until a version is saved and activated.</p>
            ) : (
              journeyRows.map((row) => (
                <div key={row.id} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{productLabel(row.productCode)}</span>
                  <span>Version {row.versionNumber ?? 1}</span>
                  <span>{row.lifecycleStatus}</span>
                  {row.lifecycleStatus === "draft" ? (
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
                  {row.lifecycleStatus === "checker_review" ? (
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
                  {row.lifecycleStatus === "approved" ? (
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
              ))
            )}
          </div>
        </Card>
      ) : null}

      {area === "weightage" ? (
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="text-base font-semibold">Match % criteria</h2>
            <p className="text-sm text-muted-foreground">
              Only selected criteria appear. Weights are manual. Activation requires exactly 100%. No silent balancing.
            </p>
          </div>
          {selectedWeightRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Match % criteria selected.</p>
          ) : (
            selectedWeightRows.map((field) => {
              const storedKey = Object.prototype.hasOwnProperty.call(draftWeights, field.id)
                ? field.id
                : (field.aliases.find((alias) => Object.prototype.hasOwnProperty.call(draftWeights, alias)) ?? field.id);
              return (
                <div key={field.id} className="flex flex-wrap items-center gap-3 border-b border-border/60 py-2">
                  <Label className="min-w-56" title={field.id}>
                    {field.label}
                  </Label>
                  <Badge variant="outline">{field.sourceKind === "derived" ? "Derived" : "Raw"}</Badge>
                  <Input
                    type="number"
                    className="w-24"
                    disabled={busy || Boolean(historyVersionId)}
                    value={Number.isFinite(draftWeights[storedKey]) ? String(draftWeights[storedKey]) : ""}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setDraftWeights((current) => ({
                        ...current,
                        [storedKey]: Number.isFinite(next) ? next : 0,
                      }));
                    }}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy || Boolean(historyVersionId)}
                    onClick={() => setDraftWeights((current) => deselectFieldKeys(current, field))}
                  >
                    Remove
                  </Button>
                </div>
              );
            })
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-72">
              <p className="text-xs text-muted-foreground">Select criteria</p>
              <Input
                className="mt-1"
                placeholder="Search governed criteria"
                value={addCriterionQuery}
                disabled={Boolean(historyVersionId)}
                onChange={(event) => setAddCriterionQuery(event.target.value)}
              />
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={addCriterionId}
                disabled={Boolean(historyVersionId)}
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
              disabled={!addCriterionId || Boolean(historyVersionId)}
              onClick={() => {
                setDraftWeights((current) => ({ ...current, [addCriterionId]: 0 }));
                setAddCriterionId("");
              }}
            >
              + Add Criteria
            </Button>
          </div>
          <p className={`text-sm font-medium ${total === 100 ? "text-emerald-300" : "text-amber-200"}`}>
            TOTAL WEIGHTAGE: {total}%
            {total === 100 ? " — activation allowed" : " — draft may be saved at any total"}
          </p>
          {!historyVersionId ? (
            <Button disabled={busy} onClick={() => void saveDraft()}>
              Save Draft
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Viewing a historical version. Return to the current draft from Version History to save weights.
            </p>
          )}
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
