"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { getAccessToken } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatInrFromRupees, percentDisplayToRate, rateToPercentDisplay } from "@/lib/compass-advantage/exact-decimal";
import type {
  CompassAdvantageRangeInput,
  CompassAdvantageScheduleInput,
  CompassAdvantageWorkspaceProductSummary,
} from "@/types/compass-advantage-commercial";

type WorkspacePayload = {
  productCode: string;
  productLabel: string;
  current: CompassAdvantageScheduleInput | null;
  draft: CompassAdvantageScheduleInput | null;
  history: CompassAdvantageScheduleInput[];
  validation: { ok: boolean; errors: string[]; uncoveredGaps: Array<{ fromRupees: string; toRupees: string | null }> } | null;
};

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };
}

function emptyRange(order: number): CompassAdvantageRangeInput {
  return {
    rangeFromRupees: "0",
    rangeToRupees: "",
    noUpperLimit: false,
    percentageRate: "0",
    customerDescription: "",
    internalNote: "",
    active: true,
    displayOrder: order,
    fixedBenefits: [],
  };
}

export function CompassAdvantageRulesWorkspace() {
  const [products, setProducts] = useState<CompassAdvantageWorkspaceProductSummary[]>([]);
  const [productCode, setProductCode] = useState("HOME_LOAN");
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [ranges, setRanges] = useState<CompassAdvantageRangeInput[]>([]);
  const [advantageActive, setAdvantageActive] = useState(true);
  const [changeReason, setChangeReason] = useState("");
  const [copyFromProductCode, setCopyFromProductCode] = useState("HOME_LOAN_BT");
  const [previewAmount, setPreviewAmount] = useState("5000000");
  const [previewDate, setPreviewDate] = useState(new Date().toISOString().slice(0, 16));
  const [previewResult, setPreviewResult] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const schedule = workspace?.draft ?? workspace?.current ?? null;
  const editable = schedule?.status === "draft";

  const load = useCallback(async (code = productCode) => {
    setLoading(true);
    try {
      const [listRes, detailRes] = await Promise.all([
        fetch("/api/admin/compass-advantage", { headers: authHeaders(), cache: "no-store" }),
        fetch(`/api/admin/compass-advantage?productCode=${encodeURIComponent(code)}`, {
          headers: authHeaders(),
          cache: "no-store",
        }),
      ]);
      const listJson = await listRes.json();
      const detailJson = await detailRes.json();
      if (!listRes.ok || !listJson.success) throw new Error(listJson?.error?.message || "Unable to load products");
      if (!detailRes.ok || !detailJson.success) throw new Error(detailJson?.error?.message || "Unable to load schedule");
      setProducts(listJson.data.products);
      const data = detailJson.data as WorkspacePayload;
      setWorkspace(data);
      const editing = data.draft ?? data.current;
      setRanges(editing?.ranges ?? []);
      setAdvantageActive(editing?.advantageActive ?? true);
      setChangeReason(editing?.changeReason ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [productCode]);

  useEffect(() => {
    void load(productCode);
  }, [load, productCode]);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/admin/compass-advantage", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json?.error?.message || "Action failed");
    return json.data;
  };

  const onSaveDraft = async () => {
    if (!schedule || !editable) return;
    setSaving(true);
    try {
      await post({
        action: "save_draft",
        scheduleId: schedule.id,
        advantageActive,
        changeReason,
        ranges,
      });
      toast.success("Draft saved");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const published = workspace?.history.find((item) => item.status === "published" && !item.effectiveTo);

  const gaps = workspace?.validation?.uncoveredGaps ?? [];
  const errors = workspace?.validation?.errors ?? [];

  const productLabel = useMemo(
    () => products.find((item) => item.productCode === productCode)?.productLabel ?? productCode,
    [products, productCode],
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="advantage-product">Applicable product</Label>
          <select
            id="advantage-product"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={productCode}
            onChange={(event) => setProductCode(event.target.value)}
          >
            {products.map((product) => (
              <option key={product.productCode} value={product.productCode}>
                {product.productLabel}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Advantage active</Label>
          <div className="flex h-9 items-center gap-2">
            <Switch checked={advantageActive} onCheckedChange={setAdvantageActive} disabled={!editable} />
            <span className="text-sm text-muted-foreground">{advantageActive ? "Active" : "Inactive"}</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Current published version</Label>
          <p className="flex h-9 items-center text-sm font-medium">
            {published ? `v${published.versionNumber}` : "None"}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <p className="flex h-9 items-center text-sm font-medium capitalize">
            {schedule?.status ?? "No configuration"}
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Effective from</Label>
          <p className="text-sm text-muted-foreground">
            {published?.effectiveFrom ? new Date(published.effectiveFrom).toLocaleString("en-IN") : "Not published"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 md:col-span-2">
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void post({
                action: "create_draft",
                productCode,
                reason: "New draft version",
              }).then(() => load());
            }}
          >
            Create new version
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void post({
                action: "create_draft",
                productCode,
                copyFromProductCode,
                reason: `Copied from ${copyFromProductCode}`,
              }).then(() => load());
            }}
          >
            Copy from another product
          </Button>
          <select
            className="flex h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            value={copyFromProductCode}
            onChange={(event) => setCopyFromProductCode(event.target.value)}
          >
            {products
              .filter((product) => product.productCode !== productCode)
              .map((product) => (
                <option key={product.productCode} value={product.productCode}>
                  {product.productLabel}
                </option>
              ))}
          </select>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Range table · {productLabel}</h2>
            <p className="text-sm text-muted-foreground">
              Range From is inclusive. Range To is exclusive. Gaps are allowed. Overlaps are not.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!editable}
            onClick={() => setRanges((current) => [...current, emptyRange(current.length + 1)])}
          >
            <Plus className="h-4 w-4" />
            Add range
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2">From</th>
                <th className="py-2 pr-2">To</th>
                <th className="py-2 pr-2">No upper limit</th>
                <th className="py-2 pr-2">% of loan</th>
                <th className="py-2 pr-2">Active</th>
                <th className="py-2 pr-2">Customer description</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ranges.map((range, index) => (
                <tr key={range.id ?? index} className="border-b align-top">
                  <td className="py-2 pr-2">
                    <Input
                      value={range.rangeFromRupees}
                      disabled={!editable}
                      onChange={(event) => {
                        const value = event.target.value;
                        setRanges((current) =>
                          current.map((item, i) => (i === index ? { ...item, rangeFromRupees: value } : item)),
                        );
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      value={range.noUpperLimit ? "" : range.rangeToRupees ?? ""}
                      disabled={!editable || range.noUpperLimit}
                      onChange={(event) => {
                        const value = event.target.value;
                        setRanges((current) =>
                          current.map((item, i) => (i === index ? { ...item, rangeToRupees: value } : item)),
                        );
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Switch
                      checked={range.noUpperLimit}
                      disabled={!editable}
                      onCheckedChange={(checked) => {
                        setRanges((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, noUpperLimit: checked, rangeToRupees: checked ? null : item.rangeToRupees } : item,
                          ),
                        );
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      value={range.percentageRate ? rateToPercentDisplay(range.percentageRate) : ""}
                      disabled={!editable}
                      onChange={(event) => {
                        const value = event.target.value;
                        setRanges((current) =>
                          current.map((item, i) => {
                            if (i !== index) return item;
                            try {
                              return { ...item, percentageRate: value.trim() ? percentDisplayToRate(value) : "0" };
                            } catch {
                              return item;
                            }
                          }),
                        );
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Switch
                      checked={range.active}
                      disabled={!editable}
                      onCheckedChange={(checked) => {
                        setRanges((current) =>
                          current.map((item, i) => (i === index ? { ...item, active: checked } : item)),
                        );
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      value={range.customerDescription ?? ""}
                      disabled={!editable}
                      onChange={(event) => {
                        const value = event.target.value;
                        setRanges((current) =>
                          current.map((item, i) => (i === index ? { ...item, customerDescription: value } : item)),
                        );
                      }}
                    />
                    <div className="mt-2 space-y-2">
                      {range.fixedBenefits.map((benefit, benefitIndex) => (
                        <div key={benefit.id ?? benefitIndex} className="grid grid-cols-2 gap-2">
                          <Input
                            value={benefit.name}
                            disabled={!editable}
                            onChange={(event) => {
                              const value = event.target.value;
                              setRanges((current) =>
                                current.map((item, i) =>
                                  i === index
                                    ? {
                                        ...item,
                                        fixedBenefits: item.fixedBenefits.map((entry, j) =>
                                          j === benefitIndex ? { ...entry, name: value } : entry,
                                        ),
                                      }
                                    : item,
                                ),
                              );
                            }}
                          />
                          <Input
                            value={benefit.amountRupees}
                            disabled={!editable}
                            onChange={(event) => {
                              const value = event.target.value;
                              setRanges((current) =>
                                current.map((item, i) =>
                                  i === index
                                    ? {
                                        ...item,
                                        fixedBenefits: item.fixedBenefits.map((entry, j) =>
                                          j === benefitIndex ? { ...entry, amountRupees: value } : entry,
                                        ),
                                      }
                                    : item,
                                ),
                              );
                            }}
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={!editable}
                        onClick={() => {
                          setRanges((current) =>
                            current.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    fixedBenefits: [
                                      ...item.fixedBenefits,
                                      {
                                        name: "",
                                        amountRupees: "0",
                                        active: true,
                                        displayOrder: item.fixedBenefits.length + 1,
                                        customerDescription: "",
                                      },
                                    ],
                                  }
                                : item,
                            ),
                          );
                        }}
                      >
                        Add fixed benefit
                      </Button>
                    </div>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={!editable || index === 0}
                        onClick={() => {
                          setRanges((current) => {
                            const next = [...current];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            return next.map((item, i) => ({ ...item, displayOrder: i + 1 }));
                          });
                        }}
                      >
                        Move up
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={!editable}
                        onClick={() => {
                          setRanges((current) =>
                            current.map((item, i) => (i === index ? { ...item, active: false } : item)),
                          );
                        }}
                      >
                        Deactivate
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <Label htmlFor="change-reason">Change reason</Label>
          <Input
            id="change-reason"
            value={changeReason}
            disabled={!editable}
            onChange={(event) => setChangeReason(event.target.value)}
          />
        </div>

        {errors.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        {gaps.length > 0 ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium">Uncovered amount ranges (gaps are allowed)</p>
            <ul className="mt-1 list-disc pl-5">
              {gaps.map((gap) => (
                <li key={`${gap.fromRupees}-${gap.toRupees}`}>
                  {formatInrFromRupees(gap.fromRupees)} → {gap.toRupees ? formatInrFromRupees(gap.toRupees) : "no upper bound"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void onSaveDraft()} disabled={!editable || saving}>
            <Save className="h-4 w-4" />
            Save draft
          </Button>
          <Button
            type="button"
            disabled={!editable || !schedule}
            onClick={() => {
              void post({
                action: "publish",
                scheduleId: schedule?.id,
                effectiveFrom: new Date().toISOString(),
                changeReason,
              }).then(() => {
                toast.success("Published");
                return load();
              });
            }}
          >
            Publish
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!published}
            onClick={() => {
              void post({ action: "suspend", scheduleId: published?.id, reason: changeReason || "Suspended" }).then(() => load());
            }}
          >
            Suspend
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!published}
            onClick={() => {
              void post({ action: "retire", scheduleId: published?.id, reason: changeReason || "Retired" }).then(() => load());
            }}
          >
            Retire
          </Button>
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Preview calculation</h2>
          <p className="text-sm text-muted-foreground">
            Preview does not create a Contact, Opportunity, customer journey, or customer offer.
          </p>
          <Label htmlFor="preview-amount">Requested loan amount (₹)</Label>
          <Input id="preview-amount" value={previewAmount} onChange={(event) => setPreviewAmount(event.target.value)} />
          <Label htmlFor="preview-date">Case-received / effective date</Label>
          <Input
            id="preview-date"
            type="datetime-local"
            value={previewDate}
            onChange={(event) => setPreviewDate(event.target.value)}
          />
          <Button
            type="button"
            onClick={() => {
              void post({
                action: "preview",
                productCode,
                requestedLoanAmount: previewAmount,
                caseReceivedAt: new Date(previewDate).toISOString(),
              }).then((data) => {
                setPreviewResult(JSON.stringify(data.result, null, 2));
              });
            }}
          >
            Preview calculation
          </Button>
        </div>
        <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">{previewResult || "No preview yet."}</pre>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Version history</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(workspace?.history ?? []).map((item) => (
            <li key={item.id} className="rounded-md border border-border px-3 py-2">
              v{item.versionNumber} · {item.status} · effective {new Date(item.effectiveFrom).toLocaleString("en-IN")}
              {item.effectiveTo ? ` → ${new Date(item.effectiveTo).toLocaleString("en-IN")}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
