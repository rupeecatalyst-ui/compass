"use client";

/**
 * CO-LEND-001 — Public lender program update portal (product-driven).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
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
import {
  emptyPayloadForTemplate,
  LENDER_PROGRAM_DOCUMENT_KINDS,
  resolveProgramTemplateForProductCode,
} from "@/constants/lender-program-portal";
import { lenderProgramPortalPublicClient } from "@/lib/lender-program-portal";
import {
  uploadDocumentToRegistry,
} from "@/lib/document-registry";
import type {
  LenderProgramDocumentLink,
  LenderProgramPayload,
  LenderProgramVerifier,
} from "@/types/lender-program-portal";

type Step = "verify" | "otp" | "product" | "form" | "done";

export function LenderProgramUpdatePortal({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lenderId, setLenderId] = useState("");
  const [lenderName, setLenderName] = useState("");
  const [products, setProducts] = useState<Array<{ code: string; label: string }>>([]);
  const [otpVerified, setOtpVerified] = useState(false);
  const [step, setStep] = useState<Step>("verify");
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [emailOtpPreview, setEmailOtpPreview] = useState<string | null>(null);
  const [mobileOtpPreview, setMobileOtpPreview] = useState<string | null>(null);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [mobileOtpCode, setMobileOtpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [productCode, setProductCode] = useState("");
  const [payload, setPayload] = useState<LenderProgramPayload>({});
  const [docs, setDocs] = useState<LenderProgramDocumentLink[]>([]);
  const [verifier, setVerifier] = useState<LenderProgramVerifier>({
    lenderName: "",
    employeeName: "",
    employeeId: "",
    officialEmail: "",
    officialMobile: "",
    designation: "",
    branch: "",
    region: "",
  });

  const template = useMemo(
    () => resolveProgramTemplateForProductCode(productCode),
    [productCode],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void lenderProgramPortalPublicClient
      .resolve(token)
      .then((data) => {
        if (cancelled) return;
        setLenderId(data.lenderId);
        setLenderName(data.lenderName);
        setProducts(data.products);
        setOtpVerified(data.otpVerified);
        setVerifier((v) => ({ ...v, lenderName: data.lenderName }));
        setStep(data.otpVerified ? "product" : "verify");
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!productCode) return;
    setPayload((prev) => ({
      ...emptyPayloadForTemplate(template),
      ...prev,
      programName:
        typeof prev.programName === "string" && prev.programName
          ? prev.programName
          : `${lenderName} · ${template.label}`,
    }));
  }, [productCode, template, lenderName]);

  const requestOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await lenderProgramPortalPublicClient.requestOtp(token, {
        ...verifier,
        lenderName: lenderName || verifier.lenderName,
      });
      setEmailOtpPreview(res.emailOtpPreview ?? null);
      setMobileOtpPreview(res.mobileOtpPreview ?? null);
      setOtpPreview(res.otpPreview ?? res.emailOtpPreview ?? null);
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP request failed");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      await lenderProgramPortalPublicClient.verifyOtp(token, {
        emailCode: emailOtpCode,
        mobileCode: mobileOtpCode,
      });
      setOtpVerified(true);
      setStep("product");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP verification failed");
    } finally {
      setBusy(false);
    }
  };

  const onUploadDoc = useCallback(
    async (kind: string, file: File) => {
      const kindLabel =
        LENDER_PROGRAM_DOCUMENT_KINDS.find((k) => k.id === kind)?.label || kind;
      const uploaded = await uploadDocumentToRegistry({
        file,
        typeRef: `lender-program:${kind}`,
        categoryLabel: kindLabel,
        uploadedBy: verifier.employeeName || "Lender",
        links: {
          documentScope: "lender",
          lenderId: lenderId || undefined,
        },
        uploadSource: "lender_portal",
      });
      setDocs((prev) => [
        ...prev,
        {
          id: uploaded.record.id,
          kind,
          label: kindLabel,
          registryRecordId: uploaded.record.id,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      ]);
    },
    [verifier.employeeName, lenderId],
  );

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await lenderProgramPortalPublicClient.submit(token, {
        productCode,
        programName: String(payload.programName || template.label),
        payload,
        documentLinks: docs,
        verifier: { ...verifier, lenderName },
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <ChanakyaLoadingExperience
        module="enterprise"
        statusLabel="Preparing lender program portal..."
        density="panel"
      />
    );
  }

  if (error && step !== "otp" && step !== "verify" && step !== "form" && step !== "product") {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-lg font-semibold text-foreground">Link unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-background px-4 py-8 dark:from-zinc-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700">
            Rupee Catalyst · Lender Program Portal
          </p>
          <h1 className="text-xl font-semibold text-foreground">{lenderName}</h1>
          <p className="text-sm text-muted-foreground">
            Product-driven program update · Administrator approval required before publishing
          </p>
        </header>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {step === "verify" ? (
          <section className="space-y-4 rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold">Submitter identity</h2>
            <p className="text-xs text-muted-foreground">
              Official Email and Mobile will be verified with OTP. Matching Contacts in the
              Enterprise Directory are reused (no duplicates).
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["employeeName", "Full Name *"],
                  ["employeeId", "Employee ID"],
                  ["officialEmail", "Official Email ID *"],
                  ["officialMobile", "Official Mobile Number *"],
                  ["designation", "Designation"],
                  ["branch", "Branch"],
                  ["region", "Region"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label>{label}</Label>
                  <Input
                    value={String(verifier[key] ?? "")}
                    onChange={(e) =>
                      setVerifier((v) => ({ ...v, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            <Button disabled={busy} onClick={() => void requestOtp()}>
              {busy ? "Sending OTPs…" : "Send Email & Mobile OTP"}
            </Button>
          </section>
        ) : null}

        {step === "otp" ? (
          <section className="space-y-3 rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold">Verify Official Email & Mobile</h2>
            {(emailOtpPreview || mobileOtpPreview || otpPreview) && (
              <div className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
                {emailOtpPreview ? (
                  <p>
                    Certification Email OTP: <strong>{emailOtpPreview}</strong>
                  </p>
                ) : null}
                {mobileOtpPreview ? (
                  <p>
                    Certification Mobile OTP: <strong>{mobileOtpPreview}</strong>
                  </p>
                ) : null}
                {!emailOtpPreview && otpPreview ? (
                  <p>
                    Certification OTP preview: <strong>{otpPreview}</strong>
                  </p>
                ) : null}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Email OTP *</Label>
                <Input
                  placeholder="6-digit email OTP"
                  value={emailOtpCode}
                  onChange={(e) => setEmailOtpCode(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Mobile OTP *</Label>
                <Input
                  placeholder="6-digit mobile OTP"
                  value={mobileOtpCode}
                  onChange={(e) => setMobileOtpCode(e.target.value)}
                />
              </div>
            </div>
            <Button
              disabled={busy || emailOtpCode.length < 4 || mobileOtpCode.length < 4}
              onClick={() => void verifyOtp()}
            >
              Verify Email & Mobile OTP
            </Button>
          </section>
        ) : null}

        {step === "product" && otpVerified ? (
          <section className="space-y-3 rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold">Select product</h2>
            <p className="text-xs text-muted-foreground">
              The form is product-specific — not lender-specific. Template loads from Product Master mapping.
            </p>
            <Select
              value={productCode}
              onValueChange={(v) => {
                setProductCode(v);
                setStep("form");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        ) : null}

        {step === "form" ? (
          <section className="space-y-4 rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">{template.label}</h2>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep("product")}>
                Change product
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {template.fields.map((field) => (
                <div
                  key={field.key}
                  className={
                    field.type === "textarea" ? "space-y-1 sm:col-span-2" : "space-y-1"
                  }
                >
                  <Label>
                    {field.label}
                    {field.required ? " *" : ""}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      value={String(payload[field.key] ?? "")}
                      onChange={(e) =>
                        setPayload((p) => ({ ...p, [field.key]: e.target.value }))
                      }
                    />
                  ) : field.type === "boolean" ? (
                    <Select
                      value={payload[field.key] ? "yes" : "no"}
                      onValueChange={(v) =>
                        setPayload((p) => ({ ...p, [field.key]: v === "yes" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : field.type === "select" ? (
                    <Select
                      value={String(payload[field.key] ?? "")}
                      onValueChange={(v) =>
                        setPayload((p) => ({ ...p, [field.key]: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options ?? []).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={
                        field.type === "number" ||
                        field.type === "percent" ||
                        field.type === "currency"
                          ? "number"
                          : field.type === "date"
                            ? "date"
                            : "text"
                      }
                      value={String(payload[field.key] ?? "")}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          [field.key]:
                            field.type === "number" ||
                            field.type === "percent" ||
                            field.type === "currency"
                              ? e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                              : e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold">Supporting documents</h3>
              <p className="text-xs text-muted-foreground">
                Uploads enter the Enterprise Document Repository.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {LENDER_PROGRAM_DOCUMENT_KINDS.map((kind) => (
                  <label
                    key={kind.id}
                    className="flex cursor-pointer flex-col gap-1 rounded-md border border-dashed px-3 py-2 text-xs"
                  >
                    <span className="font-medium">{kind.label}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*,.doc,.docx"
                      className="text-[11px]"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onUploadDoc(kind.id, file);
                      }}
                    />
                  </label>
                ))}
              </div>
              {docs.length > 0 ? (
                <ul className="text-xs text-muted-foreground">
                  {docs.map((d) => (
                    <li key={d.id}>
                      {d.label}: {d.fileName}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <Button disabled={busy} onClick={() => void submit()}>
              {busy ? "Submitting…" : "Submit for administrator approval"}
            </Button>
          </section>
        ) : null}

        {step === "done" ? (
          <section className="rounded-xl border bg-card p-6 text-center">
            <h2 className="text-base font-semibold">Submission received</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your program update is pending Rupee Catalyst administrator review. It will not
              publish to Catalyst One until approved.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
