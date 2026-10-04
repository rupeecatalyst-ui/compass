"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { CUSTOM_FIELD_PLACEMENT_SCREENS } from "@/lib/field-control-master/custom-field-placement-catalogue";
import type { FieldControlGovernanceDefinition } from "@/lib/field-control-master/production-governance-read";
import type { PlacementRow } from "@/lib/field-control-master/custom-field-placement";
import type { ApiResponse } from "@/types/api";

const controlClass = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

export function CustomFieldPlacementPanel({
  definition,
  onCompleted,
}: {
  definition: FieldControlGovernanceDefinition;
  onCompleted: () => void;
}) {
  const screens = useMemo(
    () => CUSTOM_FIELD_PLACEMENT_SCREENS.filter((screen) => screen.owningDomain === definition.owningDomain),
    [definition.owningDomain],
  );
  const [screenKey, setScreenKey] = useState(screens[0] ? `${screens[0].screenId}:${screens[0].sectionId}` : "");
  const [showOnCreate, setShowOnCreate] = useState(true);
  const [showOnEdit, setShowOnEdit] = useState(true);
  const [showOnView, setShowOnView] = useState(true);
  const [required, setRequired] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(10);
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const first = screens[0];
    setScreenKey(first ? `${first.screenId}:${first.sectionId}` : "");
  }, [screens]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (definition.classification !== "custom_field" || definition.lifecycleStatus !== "approved") return;
      const response = await authenticatedJsonFetch(
        `/api/admin/field-control-placements?fieldLineageId=${encodeURIComponent(definition.lineageId)}`,
        { method: "GET" },
      );
      const body = (await response.json()) as ApiResponse<{ placements: PlacementRow[] }>;
      if (!cancelled && response.ok && body.success && Array.isArray(body.data?.placements)) {
        setPlacements(body.data.placements);
      }
    }
    void load().catch(() => {
      if (!cancelled) setPlacements([]);
    });
    return () => {
      cancelled = true;
    };
  }, [definition.classification, definition.lifecycleStatus, definition.lineageId, definition.updatedAt]);

  if (definition.classification !== "custom_field" || definition.lifecycleStatus !== "approved") return null;
  const selected = screens.find((screen) => `${screen.screenId}:${screen.sectionId}` === screenKey) ?? null;

  async function place() {
    if (!selected) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await authenticatedJsonFetch("/api/admin/field-control-placements", {
        method: "POST",
        body: JSON.stringify({
          fieldLineageId: definition.lineageId,
          screenId: selected.screenId,
          sectionId: selected.sectionId,
          showOnCreate,
          showOnEdit,
          showOnView,
          required,
          displayOrder,
          active: true,
        }),
      });
      const body = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !body.success) {
        setMessage(body.error?.message ?? "The placement could not be saved.");
        return;
      }
      setMessage("Placement saved.");
      onCompleted();
    } catch {
      setMessage("The placement could not be saved.");
    } finally {
      setPending(false);
    }
  }

  async function setActive(placement: PlacementRow, active: boolean) {
    setPending(true);
    setMessage(null);
    try {
      const response = await authenticatedJsonFetch(`/api/admin/field-control-placements/${encodeURIComponent(placement.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ active, expectedUpdatedAt: placement.updatedAt }),
      });
      const body = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !body.success) {
        setMessage(body.error?.message ?? "The placement could not be updated.");
        return;
      }
      onCompleted();
    } catch {
      setMessage("The placement could not be updated.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section data-placement-admin="controlled" className="mt-6 space-y-3 border-t border-border pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal placement</h3>
      <p className="text-sm text-foreground">
        Approval does not place this field. An administrator places it on a controlled screen.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
          Domain
          <select className={controlClass} value={definition.owningDomain} disabled>
            <option value={definition.owningDomain}>{definition.owningDomain}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
          Screen
          <select className={controlClass} value={screenKey} onChange={(event) => setScreenKey(event.target.value)}>
            {screens.map((screen) => (
              <option key={`${screen.screenId}:${screen.sectionId}`} value={`${screen.screenId}:${screen.sectionId}`}>
                {screen.screenLabel}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
          Section
          <select className={controlClass} value={selected?.sectionId ?? ""} disabled>
            <option value={selected?.sectionId ?? ""}>{selected?.sectionLabel ?? "Custom Fields"}</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-foreground">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showOnCreate} onChange={(event) => setShowOnCreate(event.target.checked)} />
          Show on create
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showOnEdit} onChange={(event) => setShowOnEdit(event.target.checked)} />
          Show on edit
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showOnView} onChange={(event) => setShowOnView(event.target.checked)} />
          Show on view
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
          Required
        </label>
        <label className="flex items-center gap-2">
          Display order
          <input
            className="h-9 w-20 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            type="number"
            min={0}
            value={displayOrder}
            onChange={(event) => setDisplayOrder(Number(event.target.value))}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={pending || !selected}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
        onClick={() => void place()}
      >
        Place Field
      </button>
      <ul className="space-y-2">
        {placements.map((placement) => (
          <li key={placement.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-foreground">
            <span>
              {placement.screenId} / {placement.sectionId} · {placement.active ? "Active" : "Inactive"}
            </span>
            <button
              type="button"
              disabled={pending}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
              onClick={() => void setActive(placement, !placement.active)}
            >
              {placement.active ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
      </ul>
      {message ? <p className="text-sm text-foreground">{message}</p> : null}
    </section>
  );
}
