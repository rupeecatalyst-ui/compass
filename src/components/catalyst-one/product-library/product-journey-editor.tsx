"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/api-client";
import { ProductLibraryShell } from "@/components/catalyst-one/product-library/product-library-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Purpose = "" | "identity" | "recommendation" | "application" | "document" | "enrichment";

type Stage = { stageId: string; kind: string; label: string; sequence: number };
type Field = {
  fieldId: string;
  stageId: string;
  label: string;
  helpText?: string;
  fieldType: string;
  required: boolean;
  sequence: number;
  purpose: Purpose;
  optionsText?: string;
  visibleField?: string;
  visibleValue?: string;
  requiredField?: string;
  requiredValue?: string;
  min?: string;
  max?: string;
};

const PURPOSES: Purpose[] = ["", "identity", "recommendation", "application", "document", "enrichment"];
const FIELD_TYPES = [
  "short_text",
  "long_text",
  "mobile",
  "email",
  "number",
  "currency",
  "percentage",
  "date",
  "date_of_birth",
  "single_select",
  "multi_select",
  "yes_no",
  "radio",
  "searchable_master",
  "location",
  "document_link",
  "consent",
  "informational",
  "calculated",
];

function headers(): HeadersInit {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function stagesForMobileOtp(
  stages: Stage[],
  mobileCapture: "required" | "optional" | "off",
  otpVerification: "on" | "off",
): Stage[] {
  let next = stages.filter((stage) => stage.kind !== "otp" && stage.stageId !== "otp");
  if (mobileCapture === "off") {
    next = next.filter((stage) => stage.kind !== "mobile" && stage.stageId !== "mobile");
  }
  if (otpVerification === "on") {
    const mobileIndex = next.findIndex((stage) => stage.kind === "mobile" || stage.stageId === "mobile");
    const insertAt = mobileIndex >= 0 ? mobileIndex + 1 : 0;
    next = [
      ...next.slice(0, insertAt),
      { stageId: "otp", kind: "otp", label: "Verification", sequence: insertAt + 1 },
      ...next.slice(insertAt),
    ];
  }
  return next.map((stage, index) => ({ ...stage, sequence: index + 1 }));
}

function emptyField(sequence: number): Field {
  return {
    fieldId: "",
    stageId: "",
    label: "",
    fieldType: "short_text",
    required: false,
    sequence,
    purpose: "",
  };
}

export function ProductJourneyEditor() {
  const [productCode, setProductCode] = useState("");
  const [products, setProducts] = useState<Array<{ code: string; name: string }>>([]);
  const [productLabel, setProductLabel] = useState("");
  const [publiclyEnabled, setPubliclyEnabled] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [consentVersion, setConsentVersion] = useState("consent-v1");
  const [confirmationTitle, setConfirmationTitle] = useState("Application received");
  const [confirmationBody, setConfirmationBody] = useState("Your application reference is ready.");
  const [publishedOrder, setPublishedOrder] = useState("");
  const [stages, setStages] = useState<Stage[]>([
    { stageId: "mobile", kind: "mobile", label: "Mobile", sequence: 1 },
    { stageId: "name", kind: "name", label: "Name", sequence: 2 },
    { stageId: "questions", kind: "questions", label: "Questions", sequence: 3 },
    { stageId: "email", kind: "email", label: "Email", sequence: 4 },
  ]);
  const [fields, setFields] = useState<Field[]>([emptyField(1)]);
  const [advantageEnabled, setAdvantageEnabled] = useState(false);
  const [mobileCapture, setMobileCapture] = useState<"required" | "optional" | "off">("required");
  const [otpVerification, setOtpVerification] = useState<"on" | "off">("off");
  const [message, setMessage] = useState("");
  const [versions, setVersions] = useState<Array<{ journeyVersion: number; lifecycle: string; effectiveFrom: string }>>([]);
  const [legacyNote, setLegacyNote] = useState("");
  const [journeyStatus, setJourneyStatus] = useState("Select a Product Master product to see whether a public journey exists.");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/product-registry/products?presentation=canonical&pageSize=200", {
          headers: headers(),
          cache: "no-store",
        });
        const body = await response.json();
        const items = body?.data?.items;
        if (!cancelled && Array.isArray(items)) {
          setProducts(
            items
              .map((item: { code?: string; name?: string }) => ({
                code: String(item.code ?? ""),
                name: String(item.name ?? item.code ?? ""),
              }))
              .filter((item: { code: string }) => item.code),
          );
        }
      } catch {
        if (!cancelled) setProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function call(action: string, extra?: Record<string, unknown>) {
    const response = await fetch("/api/admin/product-journey", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action, productCode, ...extra }),
    });
    const body = await response.json();
    if (!response.ok || body.success === false) {
      throw new Error(body?.error?.message || "The journey action was not accepted.");
    }
    return body.data;
  }

  function draftPayload() {
    return {
      productCode,
      productLabel,
      lifecycle: "draft" as const,
      previewed: false,
      publiclyEnabled,
      effectiveFrom: effectiveFrom || undefined,
      advantageEnabled,
      mobileCapture,
      otpVerification,
      recommendationBinding: "unavailable" as const,
      consentVersion,
      lodSource: "opportunity_lod" as const,
      confirmation: {
        title: confirmationTitle,
        body: confirmationBody,
      },
      stages: stagesForMobileOtp(stages, mobileCapture, otpVerification),
      fields: fields.map((field) => ({
        fieldId: field.fieldId,
        stageId: field.stageId,
        label: field.label,
        helpText: field.helpText,
        fieldType: field.fieldType,
        required: field.required,
        sequence: field.sequence,
        purpose: field.purpose,
        options: field.optionsText
          ? field.optionsText.split(",").map((item) => {
              const value = item.trim();
              return { value, label: value };
            })
          : undefined,
        visibleWhen:
          field.visibleField && field.visibleValue
            ? { op: "equals" as const, fieldId: field.visibleField, value: field.visibleValue }
            : undefined,
        requiredWhen:
          field.requiredField && field.requiredValue
            ? { op: "equals" as const, fieldId: field.requiredField, value: field.requiredValue }
            : undefined,
        min: field.min === "" || field.min == null ? undefined : Number(field.min),
        max: field.max === "" || field.max == null ? undefined : Number(field.max),
      })),
    };
  }

  async function load() {
    setMessage("");
    const response = await fetch(`/api/admin/product-journey?productCode=${encodeURIComponent(productCode)}`, {
      headers: headers(),
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok || body.success === false) {
      throw new Error(body?.error?.message || "Unable to load the journey.");
    }
    const data = body.data;
    setVersions(data.versions ?? []);
    setPubliclyEnabled(data.publiclyEnabled !== false);
    const publishedFields = (data.published?.fields ?? []) as Array<{ fieldId: string; sequence: number }>;
    const draftFields = (data.draft?.fields ?? []) as Array<{ fieldId: string; sequence: number }>;
    setPublishedOrder(
      publishedFields.length
        ? `Published: ${[...publishedFields].sort((a, b) => a.sequence - b.sequence).map((field) => field.fieldId).join(" → ")}. Draft: ${[...draftFields].sort((a, b) => a.sequence - b.sequence).map((field) => field.fieldId).join(" → ") || "none"}.`
        : "No published version is stored for this product.",
    );
    if (data.draft?.confirmation) {
      setConfirmationTitle(data.draft.confirmation.title ?? "");
      setConfirmationBody(data.draft.confirmation.body ?? "");
    }
    const fallback = data.legacyJourneyRoleFallback;
    if (fallback?.compatibilityOnly) {
      setLegacyNote(
        `Unclassified keys still use compatibility mapping: identity ${fallback.identity.join(", ")}; recommendation ${fallback.recommendation.join(", ")}; enrichment ${fallback.enrichment.join(", ")}; document prefix ${fallback.documentPrefix}; otherwise ${fallback.otherwise}. Publication rejects a required field without an explicit purpose.`,
      );
    }
    if (data.draft) {
      setProductLabel(data.draft.productLabel ?? "");
      setConsentVersion(data.draft.consentVersion ?? "consent-v1");
      setStages(data.draft.stages ?? []);
      setAdvantageEnabled(Boolean(data.draft.advantageEnabled));
      setMobileCapture(data.draft.mobileCapture === "optional" || data.draft.mobileCapture === "off" ? data.draft.mobileCapture : "required");
      setOtpVerification(data.draft.otpVerification === "on" ? "on" : "off");
      setFields(
        (data.draft.fields ?? []).map((field: Field & {
          visibleWhen?: { fieldId?: string; value?: string };
          requiredWhen?: { fieldId?: string; value?: string };
          min?: number;
          max?: number;
        }) => ({
          ...field,
          purpose: field.purpose || "",
          visibleField: field.visibleWhen?.fieldId,
          visibleValue: field.visibleWhen?.value == null ? "" : String(field.visibleWhen.value),
          requiredField: field.requiredWhen?.fieldId,
          requiredValue: field.requiredWhen?.value == null ? "" : String(field.requiredWhen.value),
          min: field.min == null ? "" : String(field.min),
          max: field.max == null ? "" : String(field.max),
        })),
      );
    }
    setMessage(
      data.effectiveVersion
        ? `A public journey exists. Effective version ${data.effectiveVersion}. ${data.draft ? "A draft is also saved and is not live." : "No draft is saved."}`
        : data.draft
          ? "A draft exists. It is not published, so COMPASS does not use it."
          : "No public journey exists for this Product Master product.",
    );
    setJourneyStatus(
      data.effectiveVersion
        ? `Published version ${data.effectiveVersion}${data.publiclyEnabled === false ? " (not publicly enabled)" : ""}.`
        : "No effective published version.",
    );
  }

  return (
    <ProductLibraryShell
      title="Public Journey"
      description="Customer Product Journey. This is not Product Master, not a Lender Programme, and not a Policy Version. Drafts do not change COMPASS. Import does not publish."
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="journey-product">Product Master product</Label>
              <select
                id="journey-product"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={productCode}
                onChange={(event) => setProductCode(event.target.value)}
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.code} value={product.code}>
                    {product.name} ({product.code})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-muted-foreground">{journeyStatus}</p>
            </div>
            <div>
              <Label htmlFor="journey-label">Public label</Label>
              <Input id="journey-label" value={productLabel} onChange={(event) => setProductLabel(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="journey-effective">Effective date</Label>
              <Input id="journey-effective" type="datetime-local" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="journey-consent">Consent version</Label>
              <Input id="journey-consent" value={consentVersion} onChange={(event) => setConsentVersion(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="journey-confirm-title">Confirmation title</Label>
              <Input id="journey-confirm-title" value={confirmationTitle} onChange={(event) => setConfirmationTitle(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="journey-confirm-body">Confirmation copy</Label>
              <Input id="journey-confirm-body" value={confirmationBody} onChange={(event) => setConfirmationBody(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="journey-lod">Checklist source</Label>
              <Input id="journey-lod" value="Opportunity checklist" readOnly />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publiclyEnabled} onChange={(event) => setPubliclyEnabled(event.target.checked)} />
              Publicly enabled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={advantageEnabled} onChange={(event) => setAdvantageEnabled(event.target.checked)} />
              Advantage enabled
            </label>
            <div>
              <Label htmlFor="journey-mobile-capture">Mobile capture</Label>
              <select
                id="journey-mobile-capture"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={mobileCapture}
                onChange={(event) => setMobileCapture(event.target.value as "required" | "optional" | "off")}
              >
                <option value="required">Required</option>
                <option value="optional">Optional</option>
                <option value="off">Off</option>
              </select>
            </div>
            <div>
              <Label htmlFor="journey-otp">OTP verification</Label>
              <select
                id="journey-otp"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={otpVerification}
                onChange={(event) => setOtpVerification(event.target.value as "on" | "off")}
              >
                <option value="off">Off</option>
                <option value="on">On</option>
              </select>
              <p className="mt-2 text-sm text-muted-foreground">
                Off collects the mobile number and does not open verification. On uses the governed OTP provider and stops if that provider is unavailable.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => load().catch((error) => setMessage(error.message))}>
                Load
              </Button>
              <Button type="button" variant="outline" onClick={() => call("import").then((data) => setMessage(data.alreadyPublished ? "A published version already exists. Import did not publish again." : "Draft imported from Initial Data Collection. It is not published.")).catch((error) => setMessage(error.message))}>
                Import draft
              </Button>
              <Button
                type="button"
                onClick={() =>
                  call("draft", { draft: draftPayload() })
                    .then(() => setMessage("Draft saved. COMPASS is unchanged."))
                    .catch((error) => setMessage(error.message))
                }
              >
                Save draft
              </Button>
              <Button type="button" variant="outline" onClick={() => call("validate").then((data) => setMessage(data.ok ? "Validated." : data.errors.join(", "))).catch((error) => setMessage(error.message))}>
                Validate
              </Button>
              <Button type="button" variant="outline" onClick={() => call("preview", { answers: {} }).then((data) => setMessage(JSON.stringify(data))).catch((error) => setMessage(error.message))}>
                Preview
              </Button>
              <Button type="button" onClick={() => call("publish").then((data) => setMessage(data.ok ? `Published version ${data.journey.journeyVersion}.` : data.errors.join(", "))).catch((error) => setMessage(error.message))}>
                Publish
              </Button>
              <Button type="button" variant="outline" onClick={() => call("retire").then(() => setMessage("Retired. New sessions are blocked.")).catch((error) => setMessage(error.message))}>
                Retire
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stages.map((stage, index) => (
              <div key={`${stage.stageId}-${index}`} className="grid gap-2 md:grid-cols-4">
                <Input value={stage.stageId} onChange={(event) => setStages(stages.map((item, itemIndex) => itemIndex === index ? { ...item, stageId: event.target.value } : item))} placeholder="Stage id" />
                <Input value={stage.kind} onChange={(event) => setStages(stages.map((item, itemIndex) => itemIndex === index ? { ...item, kind: event.target.value } : item))} placeholder="Kind" />
                <Input value={stage.label} onChange={(event) => setStages(stages.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="Label" />
                <Input type="number" value={stage.sequence} onChange={(event) => setStages(stages.map((item, itemIndex) => itemIndex === index ? { ...item, sequence: Number(event.target.value) } : item))} />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setStages([...stages, { stageId: "", kind: "questions", label: "", sequence: stages.length + 1 }])}>
              Add stage
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, index) => (
              <div key={`${field.fieldId}-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-4">
                <Input value={field.fieldId} placeholder="Field key" onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, fieldId: event.target.value } : item))} />
                <Input value={field.label} placeholder="Customer label" onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} />
                <Input value={field.helpText ?? ""} placeholder="Help text" onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, helpText: event.target.value } : item))} />
                <Input value={field.stageId} placeholder="Stage id" onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, stageId: event.target.value } : item))} />
                <select className="h-9 rounded-md border bg-background px-2 text-sm" value={field.fieldType} onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, fieldType: event.target.value } : item))}>
                  {FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <select className="h-9 rounded-md border bg-background px-2 text-sm" value={field.purpose} onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, purpose: event.target.value as Purpose } : item))}>
                  {PURPOSES.map((purpose) => <option key={purpose || "unclassified"} value={purpose}>{purpose || "Unclassified"}</option>)}
                </select>
                <Input type="number" value={field.sequence} onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, sequence: Number(event.target.value) } : item))} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={field.required} onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, required: event.target.checked } : item))} />
                  Required
                </label>
                <Input value={field.optionsText ?? ""} placeholder="Options, comma separated" onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, optionsText: event.target.value } : item))} />
                <Input value={field.visibleField ?? ""} placeholder="Visible when field" onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, visibleField: event.target.value } : item))} />
                <Input value={field.visibleValue ?? ""} placeholder="Visible when value" onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, visibleValue: event.target.value } : item))} />
                <Input value={field.requiredField ?? ""} placeholder="Required when field" onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, requiredField: event.target.value } : item))} />
                <Input value={field.requiredValue ?? ""} placeholder="Required when value" onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, requiredValue: event.target.value } : item))} />
                <Input value={field.min ?? ""} placeholder="Minimum" onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, min: event.target.value } : item))} />
                <Input value={field.max ?? ""} placeholder="Maximum" onChange={(event) => setFields(fields.map((item, itemIndex) => itemIndex === index ? { ...item, max: event.target.value } : item))} />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setFields([...fields, emptyField(fields.length + 1)])}>
              Add field
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Published versions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {versions.length === 0 ? <p className="text-sm text-muted-foreground">No published version is loaded.</p> : null}
            {versions.map((version) => (
              <div key={version.journeyVersion} className="flex items-center justify-between gap-3 text-sm">
                <span>Version {version.journeyVersion} · {version.lifecycle} · {version.effectiveFrom}</span>
                <Button type="button" variant="outline" onClick={() => call("rollback", { version: version.journeyVersion }).then(() => setMessage(`Version ${version.journeyVersion} is effective again.`)).catch((error) => setMessage(error.message))}>
                  Roll back
                </Button>
              </div>
            ))}
            {publishedOrder ? <p className="text-sm text-muted-foreground">{publishedOrder}</p> : null}
            {legacyNote ? <p className="text-sm text-muted-foreground">{legacyNote}</p> : null}
            {message ? <p className="text-sm">{message}</p> : null}
          </CardContent>
        </Card>
      </div>
    </ProductLibraryShell>
  );
}
