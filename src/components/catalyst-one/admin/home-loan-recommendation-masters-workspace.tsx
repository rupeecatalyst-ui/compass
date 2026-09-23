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

type BusinessArea = "weightage" | "categories" | "cibil" | "ltv";

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
  return known?.label ?? code;
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
    authorisedCibilRules?: typeof AUTHORISED_CIBIL_CATEGORY_RULES;
    libraryLtvDefault?: {
      slabs: typeof AUTHORISED_INDIVIDUAL_HOUSING_LTV_SLABS;
      source: typeof AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE;
    };
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [area, setArea] = useState<BusinessArea>("weightage");
  const [productCode, setProductCode] = useState<string>("HOME_LOAN");
  const [historyVersionId, setHistoryVersionId] = useState<string | null>(null);
  const [draftWeights, setDraftWeights] = useState<Record<string, number>>({});

  const reload = async () => {
    const res = await authenticatedJsonFetch("/api/admin/home-loan-recommendation-masters");
    const body = await res.json();
    setData(body.data ?? body);
  };

  useEffect(() => {
    void reload();
  }, []);

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
    // Id + stored weights are the edit surface; selectedRow object identity changes on list reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRow?.id, selectedRow?.weightsJson]);

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
        <h1 className="text-xl font-semibold">Home Loan Recommendation Masters</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Configure how Home Loan recommendations are weighted. Lender categories, CIBIL rules and regulatory LTV are
          shown as they already exist. Versioning stays under Version History / Audit Details.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={area === "weightage" ? "default" : "outline"} onClick={() => setArea("weightage")}>
          Recommendation Weightage
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

      {area === "weightage" ? (
        <Card className="space-y-4 p-4">
          <div>
            <p className="text-sm font-medium">Product</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRODUCT_CHOICES.map((choice) => (
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
          </div>

          <div>
            <h2 className="text-base font-semibold">Fields used for Match %</h2>
            <p className="text-sm text-muted-foreground">
              These fields are discovered automatically for {productLabel(productCode)}. Select any number and enter
              weights manually.
            </p>
          </div>

          {availableFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No governed fields were discovered for this product.</p>
          ) : (
            <div className="space-y-1">
              {availableFields.map((field) => {
                const selected = fieldIsSelected(draftWeights, field);
                const storedKey = Object.prototype.hasOwnProperty.call(draftWeights, field.id)
                  ? field.id
                  : (field.aliases.find((alias) => Object.prototype.hasOwnProperty.call(draftWeights, alias)) ??
                    field.id);
                const canEdit = !historyVersionId;
                return (
                  <div key={field.id} className="flex flex-wrap items-center gap-3 border-b border-border/60 py-2">
                    <Checkbox
                      checked={selected}
                      disabled={busy || !canEdit}
                      onCheckedChange={(value) => {
                        if (value === true) {
                          setDraftWeights((current) =>
                            fieldIsSelected(current, field) ? current : { ...current, [field.id]: 0 },
                          );
                        } else {
                          setDraftWeights((current) => deselectFieldKeys(current, field));
                        }
                      }}
                    />
                    <Label className="min-w-56" title={field.id}>
                      {field.label}
                    </Label>
                    <Badge variant="outline">{field.sourceKind === "derived" ? "Derived" : "Raw"}</Badge>
                    {field.scoreability !== "fully_scorable" ? (
                      <Badge variant="outline">{scoreabilityLabel(field.scoreability)}</Badge>
                    ) : null}
                    {selected ? (
                      <Input
                        type="number"
                        className="w-24"
                        disabled={busy || !canEdit}
                        value={Number.isFinite(draftWeights[storedKey]) ? String(draftWeights[storedKey]) : ""}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          setDraftWeights((current) => ({
                            ...current,
                            [storedKey]: Number.isFinite(next) ? next : 0,
                          }));
                        }}
                      />
                    ) : null}
                    {selected ? <span className="text-xs text-muted-foreground">%</span> : null}
                  </div>
                );
              })}
            </div>
          )}

          <p className={`text-sm font-medium ${total === 100 ? "text-emerald-300" : "text-amber-200"}`}>
            Total Weight: {total}%
            {total === 100
              ? " — approve/activate only if every selected field is scoreable"
              : " — draft may be saved at any total"}
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
