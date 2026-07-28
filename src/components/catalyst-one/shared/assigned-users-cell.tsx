"use client";

/**
 * CO-UX-004 — Assigned Users cell with dedicated Edit Assignment (pencil → modal).
 * Assignment logic / permissions / APIs unchanged — UX only.
 */

import { useEffect, useId, useMemo, useState, type SyntheticEvent } from "react";
import { Check, Crown, Loader2, Pencil, User, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  canManageRegistryAssignments,
  formatAssignedUsersLabel,
  searchAssignableUsers,
  type AssignableUserOption,
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
 * Assigned Users cell — Primary Owner (single) + Assigned Users (multiple).
 * Directory = ACTIVE Enterprise User Registry accounts (no eligibility filters).
 * Edit opens a centred Assign Users modal (never an inline dropdown).
 */
export function AssignedUsersCell({
  users,
  canEdit,
  busy = false,
  onSave,
  className,
}: AssignedUsersCellProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<AssignedUserRef[]>(users);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [options, setOptions] = useState<AssignableUserOption[]>([]);

  useEffect(() => {
    if (!open) setDraft(normalizeDraft(users));
  }, [users, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      void searchAssignableUsers(query)
        .then((rows) => {
          if (!cancelled) setOptions(rows);
        })
        .catch((err) => {
          if (!cancelled) {
            setOptions([]);
            setLoadError(err instanceof Error ? err.message : "Failed to load users");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, query.trim() ? 200 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query]);

  const selectedIds = useMemo(() => new Set(draft.map((u) => u.id)), [draft]);
  const primaryId = useMemo(
    () => draft.find((u) => u.isPrimaryOwner)?.id ?? draft[0]?.id ?? null,
    [draft],
  );
  const label = formatAssignedUsersLabel(users);
  const title =
    users
      .map((u) => (u.isPrimaryOwner ? `${u.name} (Primary Owner)` : u.name))
      .join(", ") || "Unassigned";
  const PeopleIcon = users.length > 1 ? Users : User;

  const stopRow = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  const openEditor = () => {
    if (!canEdit || busy || saving) return;
    setDraft(normalizeDraft(users));
    setQuery("");
    setOpen(true);
  };

  const closeEditor = () => {
    setOpen(false);
    setQuery("");
    setDraft(normalizeDraft(users));
  };

  const toggle = (user: AssignableUserOption) => {
    setDraft((prev) => {
      if (prev.some((p) => p.id === user.id)) {
        const next = prev.filter((p) => p.id !== user.id);
        return ensurePrimary(next);
      }
      const next: AssignedUserRef[] = [
        ...prev,
        {
          id: user.id,
          name: user.fullName,
          email: user.email,
          employeeId: user.employeeId ?? undefined,
          isPrimaryOwner: prev.length === 0,
        },
      ];
      return ensurePrimary(next);
    });
  };

  const setPrimary = (id: string) => {
    setDraft((prev) =>
      prev.map((u) => ({
        ...u,
        isPrimaryOwner: u.id === id,
      })),
    );
  };

  const remove = (id: string) => {
    setDraft((prev) => ensurePrimary(prev.filter((p) => p.id !== id)));
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(ensurePrimary(draft));
      setOpen(false);
      setQuery("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn("flex min-w-0 items-center gap-0.5", className)}
      onClick={stopRow}
      onMouseDown={stopRow}
    >
      <span
        title={title}
        className={cn(
          "flex min-w-0 max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[11px]",
          users.length === 0 && "text-muted-foreground",
        )}
      >
        <PeopleIcon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate font-medium">{label}</span>
      </span>

      {canEdit ? (
        <button
          type="button"
          disabled={busy || saving}
          title="Edit Assignment"
          aria-label="Edit Assignment"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          className={cn(
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors",
            "hover:bg-muted/70 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
          onClick={openEditor}
        >
          <Pencil className="h-3 w-3" aria-hidden />
        </button>
      ) : null}

      <Dialog
        open={open && canEdit}
        onOpenChange={(next) => {
          if (!next) closeEditor();
          else setOpen(true);
        }}
      >
        <DialogContent
          id={panelId}
          className="flex max-h-[min(90dvh,42rem)] max-w-md flex-col gap-3 overflow-hidden sm:max-w-md"
          onClick={stopRow}
          onMouseDown={stopRow}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>Assign Users</DialogTitle>
            <DialogDescription>
              Primary Owner · Assigned Users. All active employees. Supervisors inherit visibility
              automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-0.5">
          {draft.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {draft.map((u) => {
                const isPrimary = u.id === primaryId;
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-1 rounded border border-border/60 bg-muted/30 px-1.5 py-1"
                  >
                    <button
                      type="button"
                      className={cn(
                        "inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-semibold uppercase",
                        isPrimary
                          ? "bg-amber-500/20 text-amber-900 dark:text-amber-200"
                          : "text-muted-foreground hover:bg-background hover:text-foreground",
                      )}
                      title={isPrimary ? "Primary Owner" : "Set as Primary Owner"}
                      onClick={() => setPrimary(u.id)}
                    >
                      <Crown className="h-2.5 w-2.5" />
                      {isPrimary ? "Primary" : "Make primary"}
                    </button>
                    <span className="min-w-0 flex-1 truncate text-[10px] font-medium">
                      {u.name}
                    </span>
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                      aria-label={`Remove ${u.name}`}
                      onClick={() => remove(u.id)}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">No users assigned.</p>
          )}

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Employee Search
            </p>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, employee code, or email…"
              className="h-8 text-xs"
              autoFocus
            />

            <div className="max-h-44 overflow-y-auto overscroll-contain rounded border border-border/60">
              {loading ? (
                <p className="flex items-center gap-1.5 px-2 py-2 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading users…
                </p>
              ) : loadError ? (
                <p className="px-2 py-2 text-[11px] text-destructive">{loadError}</p>
              ) : options.length === 0 ? (
                <p className="px-2 py-2 text-[11px] text-muted-foreground">
                  {query.trim()
                    ? "No active users match this search."
                    : "No active users in Enterprise User Registry."}
                </p>
              ) : (
                options.map((user) => {
                  const selected = selectedIds.has(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-2 px-2 py-1.5 text-left text-[11px] hover:bg-muted/60",
                        selected && "bg-muted/40",
                      )}
                      onClick={() => toggle(user)}
                    >
                      <Check
                        className={cn(
                          "mt-0.5 h-3.5 w-3.5 shrink-0",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{user.fullName}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {[user.employeeId, user.email].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          </div>

          <DialogFooter className="shrink-0 gap-1.5 sm:gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={saving}
              onClick={closeEditor}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1 px-3 text-xs"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function normalizeDraft(users: AssignedUserRef[]): AssignedUserRef[] {
  return ensurePrimary(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      employeeId: u.employeeId,
      isPrimaryOwner: u.isPrimaryOwner,
    })),
  );
}

function ensurePrimary(users: AssignedUserRef[]): AssignedUserRef[] {
  if (users.length === 0) return [];
  if (users.some((u) => u.isPrimaryOwner)) {
    const primaryId = users.find((u) => u.isPrimaryOwner)!.id;
    return users.map((u) => ({ ...u, isPrimaryOwner: u.id === primaryId }));
  }
  return users.map((u, i) => ({ ...u, isPrimaryOwner: i === 0 }));
}

export function useCanEditAssignedUsers(role?: Role | string | null): boolean {
  return canManageRegistryAssignments(role);
}
