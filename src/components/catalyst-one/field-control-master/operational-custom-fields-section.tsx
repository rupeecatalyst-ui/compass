"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { CustomFieldInput } from "@/components/catalyst-one/deal-workspace/custom-field-input";
import type { DealCustomFieldView } from "@/lib/field-control-master/deal-workspace-custom-fields";
import type {
  OperationalCustomFieldDomain,
  OperationalCustomFieldMode,
  OperationalCustomFieldSubmission,
} from "@/lib/field-control-master/operational-custom-fields";
import type { ApiResponse } from "@/types/api";

function query(input: {
  domain: OperationalCustomFieldDomain;
  mode: OperationalCustomFieldMode;
  entityId?: string | null;
  productCode?: string | null;
  employmentTypeCode?: string | null;
}) {
  const params = new URLSearchParams({ domain: input.domain, mode: input.mode });
  if (input.entityId) params.set("entityId", input.entityId);
  if (input.productCode) params.set("productCode", input.productCode);
  if (input.domain === "opportunity") params.set("employmentTypeCode", input.employmentTypeCode ?? "");
  return `/api/internal/field-control/operational-fields?${params.toString()}`;
}

export function OperationalCustomFieldsCollector({
  domain,
  productCode,
  employmentTypeCode,
  entityId,
  onState,
}: {
  domain: OperationalCustomFieldDomain;
  productCode?: string | null;
  employmentTypeCode?: string | null;
  entityId?: string | null;
  onState: (state: { submissions: OperationalCustomFieldSubmission[]; blocked: boolean }) => void;
}) {
  const [fields, setFields] = useState<DealCustomFieldView[]>([]);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [blocked, setBlocked] = useState(true);
  const onStateRef = useRef(onState);
  onStateRef.current = onState;

  const publish = useCallback(
    (nextFields: DealCustomFieldView[], nextDrafts: Record<string, unknown>, nextBlocked: boolean) => {
      const submissions = nextFields.map((field) => ({
        fieldLineageId: field.fieldLineageId,
        value: nextDrafts[field.fieldLineageId] ?? null,
      }));
      const missingRequired = nextFields.some(
        (field) =>
          field.required &&
          (nextDrafts[field.fieldLineageId] === undefined ||
            nextDrafts[field.fieldLineageId] === null ||
            nextDrafts[field.fieldLineageId] === "" ||
            (Array.isArray(nextDrafts[field.fieldLineageId]) &&
              (nextDrafts[field.fieldLineageId] as unknown[]).length === 0)),
      );
      onStateRef.current({ submissions, blocked: nextBlocked || missingRequired });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setBlocked(true);
    publish([], {}, true);
    void authenticatedJsonFetch(
      query({ domain, mode: "create", productCode, employmentTypeCode, entityId }),
      { method: "GET" },
    )
      .then(async (response) => {
        const body = (await response.json()) as ApiResponse<{ fields: DealCustomFieldView[] }>;
        if (cancelled) return;
        if (!response.ok || !body.success || !Array.isArray(body.data?.fields)) {
          setFields([]);
          setBlocked(true);
          publish([], {}, true);
          return;
        }
        setFields(body.data.fields);
        const nextDrafts = Object.fromEntries(body.data.fields.map((field) => [field.fieldLineageId, field.value]));
        setDrafts(nextDrafts);
        setBlocked(false);
        publish(body.data.fields, nextDrafts, false);
      })
      .catch(() => {
        if (cancelled) return;
        setFields([]);
        setBlocked(true);
        publish([], {}, true);
      });
    return () => {
      cancelled = true;
    };
  }, [domain, productCode, employmentTypeCode, entityId, publish]);

  if (!blocked && fields.length === 0) return null;

  return (
    <>
      {blocked && fields.length === 0 ? (
        <p className="text-xs text-muted-foreground sm:col-span-2">Additional questions are loading.</p>
      ) : null}
      {fields.map((field) => (
        <label key={field.fieldLineageId} className="block space-y-1.5">
          <span className="text-xs font-medium text-foreground">
            {field.friendlyLabel}
            {field.required ? <span className="text-destructive"> *</span> : null}
          </span>
          <CustomFieldInput
            field={{ ...field, editable: true }}
            value={drafts[field.fieldLineageId]}
            onChange={(value) => {
              const next = { ...drafts, [field.fieldLineageId]: value };
              setDrafts(next);
              publish(fields, next, blocked);
            }}
          />
        </label>
      ))}
    </>
  );
}

export function OperationalCustomFieldsSection({
  domain,
  entityId,
  mode,
  productCode,
  employmentTypeCode,
}: {
  domain: OperationalCustomFieldDomain;
  entityId: string;
  mode: "edit" | "view";
  productCode?: string | null;
  employmentTypeCode?: string | null;
}) {
  const [fields, setFields] = useState<DealCustomFieldView[]>([]);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    setMessage(null);
    try {
      const response = await authenticatedJsonFetch(
        query({ domain, mode, entityId, productCode, employmentTypeCode }),
        { method: "GET" },
      );
      const body = (await response.json()) as ApiResponse<{ fields: DealCustomFieldView[] }>;
      if (!response.ok || !body.success || !Array.isArray(body.data?.fields)) {
        setFields([]);
        setPhase("error");
        return;
      }
      setFields(body.data.fields);
      setDrafts(Object.fromEntries(body.data.fields.map((field) => [field.fieldLineageId, field.value])));
      setPhase("ready");
    } catch {
      setFields([]);
      setPhase("error");
    }
  }, [domain, entityId, mode, productCode, employmentTypeCode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      for (const field of fields) {
        if (!field.editable) continue;
        const response = await authenticatedJsonFetch("/api/internal/field-control/operational-fields", {
          method: "PUT",
          body: JSON.stringify({
            domain,
            entityId,
            fieldLineageId: field.fieldLineageId,
            value: drafts[field.fieldLineageId] ?? null,
            productCode: productCode ?? null,
            employmentTypeCode: domain === "opportunity" ? (employmentTypeCode ?? null) : null,
          }),
        });
        const body = (await response.json()) as ApiResponse<unknown>;
        if (!response.ok || !body.success) {
          setMessage(body.error?.message ?? "These questions could not be saved.");
          return;
        }
      }
      await load();
      setMessage("Saved.");
    } catch {
      setMessage("These questions could not be saved.");
    } finally {
      setPending(false);
    }
  }

  if (phase === "ready" && fields.length === 0) return null;

  return (
    <div
      data-field-control-domain={domain}
      data-field-control-mode={mode}
      className="space-y-3"
    >
      {mode === "edit" ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="h-8 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
            disabled={pending || phase !== "ready" || fields.every((field) => !field.editable)}
            onClick={() => void save()}
          >
            Save
          </button>
        </div>
      ) : null}
      {phase === "loading" ? <p className="text-xs text-muted-foreground">Loading questions.</p> : null}
      {phase === "error" ? <p className="text-xs text-destructive">Questions could not be loaded.</p> : null}
      {fields.map((field) => (
        <label key={field.fieldLineageId} className="block space-y-1.5">
          <span className="text-xs font-medium text-foreground">
            {field.friendlyLabel}
            {field.required ? <span className="text-destructive"> *</span> : null}
          </span>
          <CustomFieldInput
            field={field}
            value={drafts[field.fieldLineageId]}
            onChange={(value) => setDrafts((current) => ({ ...current, [field.fieldLineageId]: value }))}
          />
        </label>
      ))}
      {message ? <p className="text-[11px] text-muted-foreground">{message}</p> : null}
    </div>
  );
}
