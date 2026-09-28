"use client";

import { useCallback, useEffect, useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import type { DealCustomFieldView } from "@/lib/field-control-master/deal-workspace-custom-fields";
import { CustomFieldInput } from "@/components/catalyst-one/deal-workspace/custom-field-input";
import type { ApiResponse } from "@/types/api";

export function DealCustomFieldsSection({ dealId }: { dealId: string }) {
  const [fields, setFields] = useState<DealCustomFieldView[]>([]);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    setMessage(null);
    try {
      const response = await authenticatedJsonFetch(`/api/internal/deals/${encodeURIComponent(dealId)}/custom-fields`, {
        method: "GET",
      });
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
  }, [dealId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      for (const field of fields) {
        if (!field.editable) continue;
        const response = await authenticatedJsonFetch(`/api/internal/deals/${encodeURIComponent(dealId)}/custom-fields`, {
          method: "PUT",
          body: JSON.stringify({ fieldLineageId: field.fieldLineageId, value: drafts[field.fieldLineageId] ?? null }),
        });
        const body = (await response.json()) as ApiResponse<unknown>;
        if (!response.ok || !body.success) {
          setMessage(body.error?.message ?? "Custom fields could not be saved.");
          return;
        }
      }
      await load();
      setMessage("Custom fields saved.");
    } catch {
      setMessage("Custom fields could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      data-custom-fields-section="custom_fields"
      data-custom-fields-screen="deal_workspace"
      data-custom-fields-domain="deal"
      className="shrink-0 rounded-md border border-border/70 bg-card/50"
    >
      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
        <h2 className="text-[11px] font-semibold text-foreground">Custom Fields</h2>
        <button
          type="button"
          className="h-7 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
          disabled={pending || phase !== "ready" || fields.every((field) => !field.editable)}
          onClick={() => void save()}
        >
          Save custom fields
        </button>
      </div>
      <div className="max-h-40 space-y-2 overflow-y-auto px-2 pb-2">
        {phase === "loading" ? <p className="text-xs text-muted-foreground">Loading custom fields…</p> : null}
        {phase === "error" ? <p className="text-xs text-foreground">Custom fields could not be loaded.</p> : null}
        {phase === "ready" && fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">No custom fields are placed on this Deal.</p>
        ) : null}
        {fields.map((field) => (
          <label key={field.fieldLineageId} className="block space-y-1" data-custom-field-lineage={field.fieldLineageId}>
            <span className="text-xs font-medium text-foreground">
              {field.friendlyLabel}
              {field.required ? <span className="text-destructive"> *</span> : null}
            </span>
            <CustomFieldInput
              field={field}
              value={drafts[field.fieldLineageId]}
              onChange={(next) => setDrafts((current) => ({ ...current, [field.fieldLineageId]: next }))}
            />
          </label>
        ))}
        {message ? <p className="text-xs text-foreground">{message}</p> : null}
      </div>
    </section>
  );
}
