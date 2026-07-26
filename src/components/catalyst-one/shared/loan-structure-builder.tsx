"use client";

/**
 * Loan Structure Builder — dedicated editing workspace for transaction participants.
 * View stays in the drawer; structural changes happen only here.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Plus,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityMasterSearch } from "@/components/catalyst-one/shared/entity-master-search";
import { ProgressiveContactCreateModal } from "@/components/catalyst-one/contacts/progressive-contact-create-modal";
import {
  getAssignableLoanStructureRoles,
  getLoanStructureRoleLabel,
} from "@/constants/loan-structure";
import {
  buildDefaultParticipantEntityOptions,
  createParticipantId,
  syncParticipantLegacyFields,
} from "@/lib/loan-participants";
import { syncLoanStructureRelationships } from "@/lib/loan-structure";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";
import type {
  LoanParticipant,
  LoanParticipantEntityType,
  LoanParticipantRole,
  ParticipantEntityOption,
} from "@/types/loan-participant";
import type { ProgressiveParticipantKind } from "@/lib/enterprise-contact-master";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { MAX_LOAN_PARTICIPANTS } from "@/types/loan-participant";

export interface LoanStructureBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: LoanFile;
  participants: LoanParticipant[];
  onSave: (next: LoanParticipant[]) => void;
}

function toProgressiveKind(role: LoanParticipantRole): ProgressiveParticipantKind {
  if (role === "guarantor") return "guarantor";
  if (role === "primary_applicant") return "primary_applicant";
  return "co_applicant";
}

function roleToEntityType(role: LoanParticipantRole): LoanParticipantEntityType {
  return role === "company" ? "company" : "individual";
}

export function LoanStructureBuilder({
  open,
  onOpenChange,
  file,
  participants,
  onSave,
}: LoanStructureBuilderProps) {
  const [draft, setDraft] = useState<LoanParticipant[]>([]);
  const [addRole, setAddRole] = useState<LoanParticipantRole>("co_applicant");
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState("");
  const [extraOptions, setExtraOptions] = useState<ParticipantEntityOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const assignableRoles = useMemo(
    () =>
      getAssignableLoanStructureRoles().filter(
        (r) => r.code !== "primary_applicant" && r.code !== "property" && r.code !== "existing_lender",
      ),
    [],
  );

  const entityOptions = useMemo(() => {
    const live = buildDefaultParticipantEntityOptions();
    const byKey = new Map<string, ParticipantEntityOption>();
    for (const row of [...live, ...extraOptions]) {
      byKey.set(`${row.entityType}:${row.id}`, row);
    }
    return [...byKey.values()];
  }, [extraOptions, open]);

  useEffect(() => {
    if (!open) return;
    setDraft(participants.map((p) => ({ ...p })));
    setAddRole("co_applicant");
    setError(null);
    setCreateOpen(false);
  }, [open, participants]);

  const pickerOptions = useMemo(() => {
    const wantType = roleToEntityType(addRole);
    return entityOptions
      .filter((o) => o.entityType === wantType)
      .filter((o) => !draft.some((p) => p.entityId && p.entityId === o.id))
      .map((o) => ({
        id: o.id,
        label: o.name,
        sublabel: o.mobile || o.constitution,
      }));
  }, [entityOptions, addRole, draft]);

  const addExisting = (option: ParticipantEntityOption) => {
    if (draft.length >= MAX_LOAN_PARTICIPANTS) {
      setError(`Maximum ${MAX_LOAN_PARTICIPANTS} participants allowed.`);
      return;
    }
    const next: LoanParticipant = {
      id: createParticipantId(),
      entityType: option.entityType,
      entityId: option.id,
      name: option.name,
      mobile: option.mobile,
      email: option.email,
      constitution: option.constitution,
      role: option.entityType === "company" ? "company" : addRole,
      status: "active",
    };
    setDraft((prev) => [...prev, next]);
    setError(null);
  };

  const removeAt = (id: string) => {
    setDraft((prev) => prev.filter((p) => p.id !== id));
  };

  const changeRole = (id: string, role: LoanParticipantRole) => {
    setDraft((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              role: role === "company" ? "company" : role,
              entityType: role === "company" ? "company" : p.entityType === "company" ? "individual" : p.entityType,
            }
          : p,
      ),
    );
  };

  const move = (id: string, dir: -1 | 1) => {
    setDraft((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const [row] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, row);
      return copy;
    });
  };

  const handleSave = () => {
    const synced = syncParticipantLegacyFields(draft, file.businessDetails);
    syncLoanStructureRelationships({ ...file, ...synced }, synced.participants);
    onSave(synced.participants);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] w-[min(920px,96vw)] max-w-[920px] flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
          <DialogHeader className="shrink-0 space-y-1 border-b border-border/60 px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Users className="h-4 w-4 text-teal-700 dark:text-teal-300" aria-hidden />
              Loan Structure Builder
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify participants for {file.customerName || "this loan"}. Roles come from the Loan
              Structure Role Master. Contacts come from the Enterprise Contact Registry.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <section className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Primary Borrower
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{file.customerName || "—"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {file.customerMobile || "—"} · Re-order applies to co-participants below
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">Participants</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Add, remove, change role, or re-order. No inline edits in the drawer.
                  </p>
                </div>
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {draft.length} / {MAX_LOAN_PARTICIPANTS}
                </p>
              </div>

              {draft.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
                  No participants yet. Select an existing contact or create a new one.
                </p>
              ) : (
                <ul className="space-y-2">
                  {draft.map((p, index) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
                        {p.entityType === "company" ? (
                          <Building2 className="h-3.5 w-3.5" />
                        ) : (
                          <UserRound className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name || "Unnamed"}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {p.mobile || p.email || p.constitution || "Registry linked"}
                        </p>
                      </div>
                      <Select
                        value={p.role ?? (p.entityType === "company" ? "company" : "co_applicant")}
                        onValueChange={(v) => changeRole(p.id, v as LoanParticipantRole)}
                      >
                        <SelectTrigger className="h-8 w-[160px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoles.map((role) => (
                            <SelectItem key={role.code} value={role.code} className="text-xs">
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          disabled={index === 0}
                          onClick={() => move(p.id, -1)}
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          disabled={index === draft.length - 1}
                          onClick={() => move(p.id, 1)}
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => removeAt(p.id)}
                          aria-label="Remove participant"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2 rounded-xl border border-border/70 bg-muted/10 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Add Participant
              </p>
              <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                <div className="space-y-1">
                  <Label className="text-[11px]">Role</Label>
                  <Select
                    value={addRole}
                    onValueChange={(v) => setAddRole(v as LoanParticipantRole)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((role) => (
                        <SelectItem key={role.code} value={role.code} className="text-xs">
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">
                    Select existing {addRole === "company" ? "company" : "contact"}
                  </Label>
                  <EntityMasterSearch
                    key={`add-${addRole}-${draft.length}`}
                    placeholder={
                      addRole === "company"
                        ? "Search companies…"
                        : "Search Enterprise Contact Registry…"
                    }
                    options={pickerOptions}
                    allowCreateNew={addRole !== "company"}
                    onCreateNew={(query) => {
                      setCreatePrefill(query);
                      setCreateOpen(true);
                    }}
                    onSelect={(opt) => {
                      const option = entityOptions.find(
                        (o) => o.id === opt.id && o.entityType === roleToEntityType(addRole),
                      );
                      if (option) addExisting(option);
                    }}
                  />
                </div>
              </div>
              {addRole !== "company" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => {
                    setCreatePrefill("");
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create New Contact · Assign {getLoanStructureRoleLabel(addRole)}
                </Button>
              )}
              {error ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">{error}</p>
              ) : null}
            </section>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-5 py-3 sm:justify-between">
            <Button type="button" variant="ghost" className="h-9" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className={cn("h-9 gap-1.5 bg-teal-700 hover:bg-teal-600")}
              onClick={handleSave}
            >
              Save Loan Structure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProgressiveContactCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialName={createPrefill}
        participantKind={toProgressiveKind(addRole)}
        onCreated={(contact: EcmContact) => {
          setExtraOptions((prev) => [
            ...prev,
            {
              id: contact.id,
              name: contact.name,
              mobile: contact.mobilePrimary,
              email: contact.personalEmail || contact.officialEmail,
              entityType: "individual",
            },
          ]);
          addExisting({
            id: contact.id,
            name: contact.name,
            mobile: contact.mobilePrimary,
            email: contact.personalEmail || contact.officialEmail,
            entityType: "individual",
          });
          setCreateOpen(false);
        }}
        onOpenExisting={(contact) => {
          addExisting({
            id: contact.id,
            name: contact.name,
            mobile: contact.mobilePrimary,
            email: contact.personalEmail || contact.officialEmail,
            entityType: "individual",
          });
          setCreateOpen(false);
        }}
      />
    </>
  );
}
