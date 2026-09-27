"use client";

import { useMemo, useState } from "react";
import {
  classificationLabel,
  fieldTypeLabel,
  owningDomainLabel,
} from "@/lib/field-control-master/governance-presentation";
import {
  listDraftSourceAllowlistEntries,
  type DraftSourceAllowlistEntry,
} from "@/lib/field-control-master/draft-source-allowlist";
import {
  CREATE_FIELD_ACTION_LABEL,
  CREATE_FIELD_DIALOG_TITLE,
  CREATE_FIELD_SAFETY_COPY,
  DESIGN_NEW_FIELD_LABEL,
  DESIGN_NEW_FIELD_NOTE,
  DRAFT_CREATE_PATH,
  DRAFT_EMPTY_ALLOWLIST_MESSAGE,
  DRAFT_SAVED_MESSAGE,
  draftOwnershipReviewLabel,
  draftSourceBindingLabel,
  EXISTING_APPLICATION_FIELD_LABEL,
  EXISTING_DERIVED_CALCULATOR_LABEL,
  LOCKED_DRAFT_OUTCOME,
  REGISTER_EXISTING_FIELD_LABEL,
  SAVE_DRAFT_LABEL,
} from "@/lib/field-control-master/draft-creation-presentation";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ApiResponse } from "@/types/api";

type SourceMode = DraftSourceAllowlistEntry["mode"];

const EMPTY_COPY = {
  friendlyLabel: "",
  description: "",
  helpText: "",
  validationSummary: "",
  presentationSummary: "",
};

export function CreateFieldDraftDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SourceMode>("raw_canonical");
  const [allowlistEntryId, setAllowlistEntryId] = useState("");
  const [copy, setCopy] = useState(EMPTY_COPY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entries = useMemo(() => listDraftSourceAllowlistEntries(mode), [mode]);
  const selected = entries.find((entry) => entry.allowlistEntryId === allowlistEntryId) ?? null;
  const copyReady = Object.values(copy).every((value) => value.trim().length > 0);

  function selectMode(next: SourceMode) {
    setMode(next);
    setAllowlistEntryId("");
    setError(null);
    setMessage(null);
  }

  async function saveDraft() {
    if (!selected || !copyReady || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await authenticatedJsonFetch(DRAFT_CREATE_PATH, {
        method: "POST",
        body: JSON.stringify({
          mode,
          allowlistEntryId: selected.allowlistEntryId,
          friendlyLabel: copy.friendlyLabel,
          description: copy.description,
          helpText: copy.helpText,
          validationSummary: copy.validationSummary,
          presentationSummary: copy.presentationSummary,
        }),
      });
      const body = (await response.json()) as ApiResponse<{ definition: { ownershipReview: string } }>;
      if (!response.ok || !body.success) {
        setError(body.error?.message ?? "Field Control definition could not be created.");
        return;
      }
      setMessage(DRAFT_SAVED_MESSAGE);
      setCopy(EMPTY_COPY);
      setAllowlistEntryId("");
    } catch {
      setError("Field Control definition could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="h-9 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {CREATE_FIELD_ACTION_LABEL}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{CREATE_FIELD_DIALOG_TITLE}</DialogTitle>
          <DialogDescription>{CREATE_FIELD_SAFETY_COPY}</DialogDescription>
        </DialogHeader>

        <div role="status" className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
          {CREATE_FIELD_SAFETY_COPY}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-card px-3 py-3 text-card-foreground" data-create-mode="register-existing">
            <div className="text-sm font-medium text-foreground">{REGISTER_EXISTING_FIELD_LABEL}</div>
            <p className="mt-1 text-xs text-muted-foreground">Enabled. Registers governance metadata for an existing source.</p>
          </div>
          <button
            type="button"
            disabled
            aria-disabled="true"
            data-design-new-field="disabled"
            className="rounded-md border border-border bg-muted px-3 py-3 text-left text-muted-foreground"
          >
            <div className="text-sm font-medium">{DESIGN_NEW_FIELD_LABEL}</div>
            <p className="mt-1 text-xs">{DESIGN_NEW_FIELD_NOTE}</p>
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void saveDraft();
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-foreground">Source type</legend>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="sourceType"
                checked={mode === "raw_canonical"}
                onChange={() => selectMode("raw_canonical")}
              />
              {EXISTING_APPLICATION_FIELD_LABEL}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="sourceType"
                checked={mode === "derived"}
                onChange={() => selectMode("derived")}
              />
              {EXISTING_DERIVED_CALCULATOR_LABEL}
            </label>
          </fieldset>

          <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
            Source
            {entries.length === 0 ? (
              <p className="text-sm font-normal text-muted-foreground">{DRAFT_EMPTY_ALLOWLIST_MESSAGE}</p>
            ) : (
              <select
                value={allowlistEntryId}
                onChange={(event) => setAllowlistEntryId(event.target.value)}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="">Select a source</option>
                {entries.map((entry) => (
                  <option key={entry.allowlistEntryId} value={entry.allowlistEntryId}>
                    {entry.fieldId}
                  </option>
                ))}
              </select>
            )}
          </label>

          {selected ? (
            <dl className="grid grid-cols-1 gap-2 rounded-md border border-border px-3 py-3 text-sm sm:grid-cols-2">
              <PreviewItem label="Field ID" value={selected.fieldId} mono />
              <PreviewItem label="Classification" value={classificationLabel(selected.classification)} />
              <PreviewItem label="Owning domain" value={owningDomainLabel(selected.owningDomain)} />
              <PreviewItem label="Field type" value={fieldTypeLabel(selected.fieldType)} />
              <PreviewItem label="Source binding" value={draftSourceBindingLabel(selected)} mono />
            </dl>
          ) : null}

          <CopyField label="Friendly label" value={copy.friendlyLabel} onChange={(friendlyLabel) => setCopy((current) => ({ ...current, friendlyLabel }))} />
          <CopyField label="Description" value={copy.description} multiline onChange={(description) => setCopy((current) => ({ ...current, description }))} />
          <CopyField label="Help text" value={copy.helpText} multiline onChange={(helpText) => setCopy((current) => ({ ...current, helpText }))} />
          <CopyField label="Validation summary" value={copy.validationSummary} multiline onChange={(validationSummary) => setCopy((current) => ({ ...current, validationSummary }))} />
          <CopyField label="Presentation summary" value={copy.presentationSummary} multiline onChange={(presentationSummary) => setCopy((current) => ({ ...current, presentationSummary }))} />

          <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Locked outcome</h3>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              {LOCKED_DRAFT_OUTCOME.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm text-foreground">
                    {label === "Ownership review" ? draftOwnershipReviewLabel() : value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-foreground">
              {error}
            </p>
          ) : null}
          {message ? (
            <p role="status" className="text-sm text-foreground">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            data-submit="save-draft"
            disabled={!selected || !copyReady || saving}
            className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
          >
            {SAVE_DRAFT_LABEL}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreviewItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-foreground" : "text-sm text-foreground"}>{value}</dd>
    </div>
  );
}

function CopyField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const className = "rounded-md border border-border bg-background px-3 py-2 text-sm font-normal text-foreground";
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
      {label}
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className={className} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={`h-9 ${className}`} />
      )}
    </label>
  );
}
