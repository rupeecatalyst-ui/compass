"use client";

/**
 * BAT #12 — Opportunity Creation · Loan Structure tab.
 * Left: manage participants (Contact Registry). Right: live structure preview.
 */

import { useMemo, useState } from "react";
import { Building2, Home, Trash2, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LiveEntityMasterSearch } from "@/components/catalyst-one/shared/live-entity-master-search";
import type { EntityMasterOption } from "@/components/catalyst-one/shared/entity-master-search";
import { ProgressiveContactCreateModal } from "@/components/catalyst-one/contacts/progressive-contact-create-modal";
import {
  buildDefaultParticipantEntityOptions,
  createParticipantId,
} from "@/lib/loan-participants";
import type {
  LoanParticipant,
  LoanParticipantEntityType,
  LoanParticipantRole,
  ParticipantEntityOption,
} from "@/types/loan-participant";
import type { LoanFile } from "@/types/catalyst-one";
import type { ProgressiveParticipantKind } from "@/lib/enterprise-contact-master";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { EnterpriseCompanyOption } from "@/lib/enterprise-registry/companies";
import type { EnterpriseContactOption } from "@/lib/enterprise-registry/contacts";
import { cn } from "@/lib/utils";

type AssignableRole = "primary_applicant" | "co_applicant" | "guarantor" | "company";

const INDIVIDUAL_ROLES: { value: AssignableRole; label: string }[] = [
  { value: "primary_applicant", label: "Primary Applicant" },
  { value: "co_applicant", label: "Co-Applicant" },
  { value: "guarantor", label: "Guarantor" },
];

const COMPANY_ROLES: { value: AssignableRole; label: string }[] = [
  { value: "company", label: "Company / Business Entity" },
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
  const [addEntityType, setAddEntityType] =
    useState<LoanParticipantEntityType>("individual");
  const [addRole, setAddRole] = useState<AssignableRole>("co_applicant");
  const [addAsPropertyOwner, setAddAsPropertyOwner] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState("");
  const [extraOptions, setExtraOptions] = useState<ParticipantEntityOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const roleOptions = addEntityType === "company" ? COMPANY_ROLES : INDIVIDUAL_ROLES;

  const entityOptions = useMemo(() => {
    const live = buildDefaultParticipantEntityOptions();
    const byKey = new Map<string, ParticipantEntityOption>();
    for (const row of [...live, ...extraOptions]) {
      byKey.set(`${row.entityType}:${row.id}`, row);
    }
    return [...byKey.values()];
  }, [extraOptions]);

  const active = useMemo(
    () => participants.filter((p) => p.status !== "inactive"),
    [participants],
  );

  const fallbackPickerOptions = useMemo(
    () =>
      entityOptions
        .filter((o) => o.entityType === addEntityType)
        .filter(
          (o) =>
            !active.some(
              (p) => p.entityId === o.id && p.entityType === addEntityType,
            ),
        )
        .map((o) => ({
          id: o.id,
          label: o.name,
          sublabel: o.mobile || o.constitution || o.email,
        })),
    [entityOptions, active, addEntityType],
  );

  const structurePreview = useMemo(() => {
    const primary = active
      .filter((p) => p.role === "primary_applicant")
      .map((p) => p.name);
    const cos = active.filter((p) => p.role === "co_applicant").map((p) => p.name);
    const guars = active.filter((p) => p.role === "guarantor").map((p) => p.name);
    const companies = active
      .filter((p) => p.entityType === "company" || p.role === "company")
      .filter((p) => p.role !== "co_applicant" && p.role !== "guarantor")
      .map((p) => p.name);
    const owners = active.filter((p) => p.isPropertyOwner).map((p) => p.name);
    return { primary, cos, guars, companies, owners };
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

  const setParticipantType = (next: LoanParticipantEntityType) => {
    setAddEntityType(next);
    setAddRole(next === "company" ? "company" : "co_applicant");
    setError(null);
  };

  const addExisting = (option: ParticipantEntityOption) => {
    if (
      active.some(
        (p) => p.entityId === option.id && p.entityType === option.entityType,
      )
    ) {
      setError(
        option.entityType === "company"
          ? "This company is already in the Loan Structure."
          : "This contact is already in the Loan Structure.",
      );
      return;
    }
    const role: LoanParticipantRole =
      option.entityType === "company" &&
      (addRole === "co_applicant" || addRole === "guarantor")
        ? addRole
        : option.entityType === "company"
          ? "company"
          : addRole;
    const row: LoanParticipant = {
      id: createParticipantId(),
      entityType: option.entityType,
      entityId: option.id,
      name: option.name,
      mobile: option.mobile,
      email: option.email,
      constitution: option.constitution,
      role,
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

  const addFromLiveSelect = (opt: EntityMasterOption) => {
    if (addEntityType === "company") {
      const company = opt as EnterpriseCompanyOption;
      addExisting({
        id: opt.id,
        name: opt.label,
        constitution: company.constitution,
        entityType: "company",
      });
      return;
    }
    const contact = opt as EnterpriseContactOption;
    const fromCache = entityOptions.find(
      (o) => o.id === opt.id && o.entityType === "individual",
    );
    addExisting({
      id: opt.id,
      name: fromCache?.name || opt.label,
      mobile: fromCache?.mobile || contact.mobile,
      email: fromCache?.email || contact.email,
      entityType: "individual",
    });
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
              Build the participant structure for this Opportunity. Individuals come from the
              Enterprise Contact Registry; companies from the Enterprise Company Registry.
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
              title="Borrowing Entity / Company"
              names={active
                .filter((p) => p.entityType === "company" || p.role === "company")
                .filter((p) => p.role !== "co_applicant" && p.role !== "guarantor")
                .map((p) => p.name)}
            />
            <StructureGroup
              title="Property Owners"
              names={active.filter((p) => p.isPropertyOwner).map((p) => p.name)}
            />
            {active.length === 0 ? (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                No participants yet. Click Modify to add contacts or companies.
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
                  No participants yet. Add a contact or company below.
                </li>
              ) : (
                active.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-xl border border-border/70 bg-card px-3 py-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
                        {p.entityType === "company" ? (
                          <Building2 className="h-3.5 w-3.5" />
                        ) : (
                          <UserRound className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {p.entityType === "company" ? "Company" : "Individual"}
                          {" · "}
                          {p.mobile || p.email || p.constitution || "Registry linked"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Select
                            value={
                              p.role === "primary_applicant" ||
                              p.role === "guarantor" ||
                              p.role === "co_applicant" ||
                              p.role === "company"
                                ? p.role
                                : p.entityType === "company"
                                  ? "company"
                                  : "co_applicant"
                            }
                            onValueChange={(v) => changeRole(p.id, v as AssignableRole)}
                          >
                            <SelectTrigger className="h-8 w-[170px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[...INDIVIDUAL_ROLES, ...COMPANY_ROLES]
                                .filter(
                                  (r, i, arr) =>
                                    arr.findIndex((x) => x.value === r.value) === i,
                                )
                                .map((role) => (
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
                <div className="w-[170px]">
                  <Label className="mb-1 block text-[10px] text-muted-foreground">
                    Participant Type
                  </Label>
                  <Select
                    value={addEntityType}
                    onValueChange={(v) =>
                      setParticipantType(v as LoanParticipantEntityType)
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual" className="text-xs">
                        Individual
                      </SelectItem>
                      <SelectItem value="company" className="text-xs">
                        Company / Business Entity
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[150px]">
                  <Label className="mb-1 block text-[10px] text-muted-foreground">
                    Role
                  </Label>
                  <Select
                    value={addRole}
                    onValueChange={(v) => setAddRole(v as AssignableRole)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value} className="text-xs">
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 flex-1">
                  <Label className="mb-1 block text-[10px] text-muted-foreground">
                    {addEntityType === "company"
                      ? "Company Registry"
                      : "Contact Registry"}
                  </Label>
                  <LiveEntityMasterSearch
                    key={`add-${addEntityType}-${addRole}-${active.length}`}
                    kind={addEntityType === "company" ? "company" : "contact"}
                    fallbackOptions={fallbackPickerOptions}
                    placeholder={
                      addEntityType === "company"
                        ? "Search Company Registry…"
                        : "Search Contact Registry…"
                    }
                    allowCreateNew={addEntityType === "individual"}
                    onSelect={addFromLiveSelect}
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
              <StructureGroup
                title="Borrowing Entity / Company"
                names={structurePreview.companies}
              />
              <StructureGroup title="Guarantor" names={structurePreview.guars} />
              <StructureGroup title="Property Owner" names={structurePreview.owners} />
              {structurePreview.primary.length === 0 &&
                structurePreview.cos.length === 0 &&
                structurePreview.companies.length === 0 &&
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
        participantKind={toProgressiveKind(
          addRole === "company" ? "co_applicant" : addRole,
        )}
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
