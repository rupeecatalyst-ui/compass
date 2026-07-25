"use client";

/**
 * BAT #12 — Opportunity Creation · Loan Structure tab.
 * Left: manage participants (Contact Registry). Right: live structure preview.
 */

import { useMemo, useState } from "react";
import { Home, Trash2, UserRound, Users } from "lucide-react";
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
  buildDefaultParticipantEntityOptions,
  createParticipantId,
} from "@/lib/loan-participants";
import type {
  LoanParticipant,
  LoanParticipantRole,
  ParticipantEntityOption,
} from "@/types/loan-participant";
import type { LoanFile } from "@/types/catalyst-one";
import type { ProgressiveParticipantKind } from "@/lib/enterprise-contact-master";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { cn } from "@/lib/utils";

type AssignableRole = "primary_applicant" | "co_applicant" | "guarantor";

const ASSIGNABLE_ROLES: { value: AssignableRole; label: string }[] = [
  { value: "primary_applicant", label: "Primary Applicant" },
  { value: "co_applicant", label: "Co-Applicant" },
  { value: "guarantor", label: "Guarantor" },
];

function toProgressiveKind(role: AssignableRole): ProgressiveParticipantKind {
  if (role === "guarantor") return "guarantor";
  if (role === "primary_applicant") return "primary_applicant";
  return "co_applicant";
}

function StructureGroup({ title, names }: { title: string; names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-1">
        {names.map((name, idx) => (
          <li
            key={`${title}-${name}-${idx}`}
            className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-1.5 text-sm font-medium text-foreground"
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OpportunityLoanStructureTab({
  file,
  participants,
  onChange,
  readOnly = false,
  headerAction,
}: {
  file: LoanFile;
  participants: LoanParticipant[];
  onChange: (next: LoanParticipant[]) => void;
  /** BAT #19 — summary view until Modify opens the editor. */
  readOnly?: boolean;
  headerAction?: React.ReactNode;
}) {
  const [addRole, setAddRole] = useState<AssignableRole>("co_applicant");
  const [addAsPropertyOwner, setAddAsPropertyOwner] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState("");
  const [extraOptions, setExtraOptions] = useState<ParticipantEntityOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const entityOptions = useMemo(() => {
    const live = buildDefaultParticipantEntityOptions();
    const byKey = new Map<string, ParticipantEntityOption>();
    for (const row of [...live, ...extraOptions]) {
      byKey.set(`${row.entityType}:${row.id}`, row);
    }
    return [...byKey.values()].filter((o) => o.entityType === "individual");
  }, [extraOptions]);

  const active = useMemo(
    () => participants.filter((p) => p.status !== "inactive"),
    [participants],
  );

  const pickerOptions = useMemo(
    () =>
      entityOptions
        .filter((o) => !active.some((p) => p.entityId === o.id))
        .map((o) => ({
          id: o.id,
          label: o.name,
          sublabel: o.mobile || o.email,
        })),
    [entityOptions, active],
  );

  const structurePreview = useMemo(() => {
    const primary = active
      .filter((p) => p.role === "primary_applicant")
      .map((p) => p.name);
    const cos = active.filter((p) => p.role === "co_applicant").map((p) => p.name);
    const guars = active.filter((p) => p.role === "guarantor").map((p) => p.name);
    const owners = active.filter((p) => p.isPropertyOwner).map((p) => p.name);
    return { primary, cos, guars, owners };
  }, [active]);

  const enforceSinglePrimary = (
    list: LoanParticipant[],
    primaryId: string,
  ): LoanParticipant[] =>
    list.map((p) =>
      p.id !== primaryId && p.role === "primary_applicant"
        ? { ...p, role: "co_applicant" as LoanParticipantRole }
        : p,
    );

  const addExisting = (option: ParticipantEntityOption) => {
    if (active.some((p) => p.entityId === option.id)) {
      setError("This contact is already in the Loan Structure.");
      return;
    }
    const row: LoanParticipant = {
      id: createParticipantId(),
      entityType: "individual",
      entityId: option.id,
      name: option.name,
      mobile: option.mobile,
      email: option.email,
      role: addRole,
      status: "active",
      isPropertyOwner: addAsPropertyOwner,
    };
    let next = [...participants, row];
    if (row.role === "primary_applicant") {
      next = enforceSinglePrimary(next, row.id);
    }
    onChange(next);
    setError(null);
  };

  const removeParticipant = (id: string) => {
    const target = participants.find((p) => p.id === id);
    if (target?.role === "primary_applicant" && target.entityId === file.customerId) {
      setError("Primary Applicant is required for this Opportunity.");
      return;
    }
    onChange(participants.filter((p) => p.id !== id));
    setError(null);
  };

  const changeRole = (id: string, role: AssignableRole) => {
    let next = participants.map((p) => (p.id === id ? { ...p, role } : p));
    if (role === "primary_applicant") {
      next = enforceSinglePrimary(next, id);
    }
    onChange(next);
    setError(null);
  };

  const togglePropertyOwner = (id: string) => {
    onChange(
      participants.map((p) =>
        p.id === id ? { ...p, isPropertyOwner: !p.isPropertyOwner } : p,
      ),
    );
    setError(null);
  };

  return (
    <>
      <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600/15 text-teal-800 dark:text-teal-200">
            <Users className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">Loan Structure</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Build the participant structure for this Opportunity. Contacts come from the
              Enterprise Contact Registry — no duplicate customers.
            </p>
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>

        {readOnly ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <StructureGroup
              title="Primary Applicant"
              names={active
                .filter((p) => p.role === "primary_applicant")
                .map((p) => p.name)}
            />
            <StructureGroup
              title="Co-Applicants"
              names={active.filter((p) => p.role === "co_applicant").map((p) => p.name)}
            />
            <StructureGroup
              title="Guarantors"
              names={active.filter((p) => p.role === "guarantor").map((p) => p.name)}
            />
            <StructureGroup
              title="Property Owners"
              names={active.filter((p) => p.isPropertyOwner).map((p) => p.name)}
            />
            {active.length === 0 ? (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                No participants yet. Click Modify to add contacts.
              </p>
            ) : null}
          </div>
        ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Available Participants
            </p>

            <ul className="space-y-2">
              {active.length === 0 ? (
                <li className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
                  No participants yet. Add a contact below.
                </li>
              ) : (
                active.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-xl border border-border/70 bg-card px-3 py-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
                        <UserRound className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {p.mobile || p.email || "Registry linked"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Select
                            value={
                              p.role === "primary_applicant" ||
                              p.role === "guarantor" ||
                              p.role === "co_applicant"
                                ? p.role
                                : "co_applicant"
                            }
                            onValueChange={(v) => changeRole(p.id, v as AssignableRole)}
                          >
                            <SelectTrigger className="h-8 w-[150px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ASSIGNABLE_ROLES.map((role) => (
                                <SelectItem
                                  key={role.value}
                                  value={role.value}
                                  className="text-xs"
                                >
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            variant={p.isPropertyOwner ? "default" : "outline"}
                            className={cn(
                              "h-8 gap-1 text-[11px]",
                              p.isPropertyOwner &&
                                "bg-teal-600 text-white hover:bg-teal-600",
                            )}
                            onClick={() => togglePropertyOwner(p.id)}
                          >
                            <Home className="h-3 w-3" />
                            Property Owner
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeParticipant(p.id)}
                        aria-label={`Remove ${p.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>

            <div className="space-y-2 border-t border-border/60 pt-3">
              <Label className="text-[11px] text-muted-foreground">Add participant</Label>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-[150px]">
                  <Select
                    value={addRole}
                    onValueChange={(v) => setAddRole(v as AssignableRole)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value} className="text-xs">
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 flex-1">
                  <EntityMasterSearch
                    key={`add-${addRole}-${active.length}`}
                    options={pickerOptions}
                    placeholder="Search Contact Registry…"
                    onSelect={(opt) => {
                      const full = entityOptions.find((o) => o.id === opt.id);
                      if (full) addExisting(full);
                    }}
                    onCreateNew={(q) => {
                      setCreatePrefill(q);
                      setCreateOpen(true);
                    }}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  checked={addAsPropertyOwner}
                  onChange={(e) => setAddAsPropertyOwner(e.target.checked)}
                />
                Also mark new participant as Property Owner
              </label>
            </div>

            {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
          </div>

          <div className="space-y-3 rounded-xl border border-teal-500/25 bg-teal-500/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800 dark:text-teal-200">
              Loan Structure
            </p>
            <p className="text-[11px] text-muted-foreground">
              Updates immediately as participants are added, removed, or reassigned.
            </p>
            <div className="space-y-3">
              <StructureGroup title="Primary Applicant" names={structurePreview.primary} />
              <StructureGroup title="Co-Applicant" names={structurePreview.cos} />
              <StructureGroup title="Guarantor" names={structurePreview.guars} />
              <StructureGroup title="Property Owner" names={structurePreview.owners} />
              {structurePreview.primary.length === 0 &&
                structurePreview.cos.length === 0 &&
                structurePreview.guars.length === 0 &&
                structurePreview.owners.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-xs text-muted-foreground">
                    Structure is empty. Add participants on the left.
                  </p>
                )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Save Draft stores this structure on the Opportunity for Deal, Documents, Credit
              Workbench, and LIFE.
            </p>
          </div>
        </div>
        )}
      </section>

      <ProgressiveContactCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        participantKind={toProgressiveKind(addRole)}
        initialName={createPrefill}
        onCreated={(contact: EcmContact) => {
          const option: ParticipantEntityOption = {
            id: contact.id,
            name: contact.name,
            mobile: contact.mobilePrimary,
            email: contact.personalEmail || contact.officialEmail,
            entityType: "individual",
          };
          setExtraOptions((prev) => [...prev, option]);
          addExisting(option);
          setCreateOpen(false);
        }}
      />
    </>
  );
}
