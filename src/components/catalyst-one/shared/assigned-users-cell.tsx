"use client";

import { useEffect, useId, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { Check, Loader2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  canManageRegistryAssignments,
  formatAssignedUsersLabel,
  listEligibleAssignedUsers,
  type AssignedUserRef,
} from "@/lib/assigned-users";
import { cn } from "@/lib/utils";
import type { Role } from "@/constants/roles";

export interface AssignedUsersCellProps {
  users: AssignedUserRef[];
  canEdit: boolean;
  busy?: boolean;
  onSave: (next: AssignedUserRef[]) => void | Promise<void>;
  className?: string;
}

/**
 * BAT #17 — Inline Assigned Users cell for Opportunity / Deal registries.
 * Compact label; click opens multi-select of Enterprise User Registry employees.
 */
export function AssignedUsersCell({
  users,
  canEdit,
  busy = false,
  onSave,
  className,
}: AssignedUsersCellProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<AssignedUserRef[]>(users);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setDraft(users);
  }, [users, open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const eligible = useMemo(() => listEligibleAssignedUsers(query), [query]);
  const selectedIds = useMemo(() => new Set(draft.map((u) => u.id)), [draft]);
  const label = formatAssignedUsersLabel(users);
  const title = users.map((u) => u.name).join(", ") || "Unassigned";

  const stopRow = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  const toggle = (user: AssignedUserRef) => {
    setDraft((prev) => {
      if (prev.some((p) => p.id === user.id)) {
        return prev.filter((p) => p.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const remove = (id: string) => {
    setDraft((prev) => prev.filter((p) => p.id !== id));
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setOpen(false);
      setQuery("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative min-w-0", className)}
      onClick={stopRow}
      onMouseDown={stopRow}
    >
      <button
        type="button"
        disabled={busy || saving}
        title={title}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] transition-colors",
          canEdit
            ? "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            : "cursor-default",
          users.length === 0 && "text-muted-foreground",
        )}
        onClick={() => {
          if (!canEdit) return;
          setOpen((o) => !o);
        }}
      >
        <Users className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate font-medium">{label}</span>
      </button>

      {open && canEdit ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Manage assigned users"
          className="absolute left-0 top-full z-[80] mt-1 w-[min(20rem,70vw)] rounded-md border border-border bg-popover p-2 shadow-md"
        >
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Assigned Users
          </p>

          {draft.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1">
              {draft.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex max-w-full items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px]"
                >
                  <span className="truncate">{u.name}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    aria-label={`Remove ${u.name}`}
                    onClick={() => remove(u.id)}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mb-2 text-[11px] text-muted-foreground">No users assigned.</p>
          )}

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search internal users…"
            className="mb-1.5 h-8 text-xs"
            autoFocus
          />

          <div className="max-h-40 overflow-y-auto overscroll-contain rounded border border-border/60">
            {eligible.length === 0 ? (
              <p className="px-2 py-2 text-[11px] text-muted-foreground">
                No eligible internal users found.
              </p>
            ) : (
              eligible.map((user) => {
                const selected = selectedIds.has(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] hover:bg-muted/60",
                      selected && "bg-muted/40",
                    )}
                    onClick={() => toggle(user)}
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        selected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{user.name}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-2 flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              disabled={saving}
              onClick={() => {
                setOpen(false);
                setQuery("");
                setDraft(users);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 px-2.5 text-[11px]"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function useCanEditAssignedUsers(role?: Role | string | null): boolean {
  return canManageRegistryAssignments(role);
}
