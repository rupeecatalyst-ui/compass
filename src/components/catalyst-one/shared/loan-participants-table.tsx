"use client";

import { useMemo, useState, useEffect } from "react";
import { Plus, Search, Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LoanParticipant, LoanParticipantEntityType, LoanParticipantRole } from "@/types/loan-participant";
import { LOAN_PARTICIPANT_ROLE_LABELS } from "@/types/loan-participant";
import type { ParticipantEntityOption } from "@/types/loan-participant";
import { searchParticipantEntities, createParticipantId } from "@/lib/loan-participants";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityMasterSearch } from "@/components/catalyst-one/shared/entity-master-search";
import { ProgressiveContactCreateModal } from "@/components/catalyst-one/contacts/progressive-contact-create-modal";
import type { ProgressiveParticipantKind } from "@/lib/enterprise-contact-master";
import type { EcmContact } from "@/types/enterprise-contact-master";

type SortKey = "role" | "name" | "city";

const ROLE_ORDER: Record<string, number> = {
  primary_applicant: 0,
  co_applicant: 1,
  guarantor: 2,
  company: 3,
  other: 4,
};

function roleLabel(role?: string): string {
  if (role && role in LOAN_PARTICIPANT_ROLE_LABELS) {
    return LOAN_PARTICIPANT_ROLE_LABELS[role as LoanParticipantRole];
  }
  return "Participant";
}

function roleStyle(role?: string): string {
  switch (role) {
    case "primary_applicant":
      return "bg-emerald-600/10 text-emerald-800 border-emerald-600/25 dark:text-emerald-200";
    case "co_applicant":
      return "bg-amber-500/10 text-amber-900 border-amber-500/25 dark:text-amber-100";
    case "guarantor":
      return "bg-blue-600/10 text-blue-800 border-blue-600/25 dark:text-blue-200";
    case "company":
      return "bg-slate-500/10 text-slate-800 border-slate-500/25 dark:text-slate-200";
    default:
      return "bg-muted/30 text-muted-foreground border-border";
  }
}

export function LoanParticipantsTable({
  primaryApplicant,
  participants,
  entityOptions,
  onChange,
  onTimeline,
  onOpenEntity,
  readOnly,
  className,
  onContactCreated,
  focusParticipantId,
}: {
  primaryApplicant: {
    id: string;
    name: string;
    mobile: string;
    email: string;
    city: string;
    employmentType: string;
  };
  participants: LoanParticipant[];
  entityOptions: ParticipantEntityOption[];
  onChange: (next: LoanParticipant[]) => void;
  onTimeline: (note: string) => void;
  onOpenEntity?: (entityId: string, entityType: LoanParticipantEntityType) => void;
  readOnly?: boolean;
  className?: string;
  /** Called after progressive create so parent can refresh ECM options. */
  onContactCreated?: (contact: EcmContact) => void;
  /** When set from Loan Structure card click, open that row for editing. */
  focusParticipantId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("role");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForId, setCreateForId] = useState<string | null>(null);
  const [createPrefill, setCreatePrefill] = useState("");
  const [createKind, setCreateKind] = useState<ProgressiveParticipantKind>("co_applicant");
  const [extraOptions, setExtraOptions] = useState<ParticipantEntityOption[]>([]);

  useEffect(() => {
    if (focusParticipantId) setEditingId(focusParticipantId);
  }, [focusParticipantId]);

  const mergedOptions = useMemo(() => {
    const byId = new Map<string, ParticipantEntityOption>();
    for (const o of [...entityOptions, ...extraOptions]) {
      if (o.entityType === "individual") byId.set(o.id, o);
    }
    const companies = entityOptions.filter((o) => o.entityType === "company");
    return [...byId.values(), ...companies];
  }, [entityOptions, extraOptions]);

  const addRow = (type: LoanParticipantEntityType) => {
    const next: LoanParticipant = {
      id: createParticipantId(),
      entityType: type,
      entityId: "",
      name: "",
      role: type === "company" ? "company" : "co_applicant",
      status: "active",
    };
    onChange([...participants, next]);
    onTimeline(`Participant added: ${type === "company" ? "Company" : "Individual"}`);
    setEditingId(next.id);
  };

  const updateRow = (id: string, patch: Partial<LoanParticipant>, note: string) => {
    onChange(participants.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    onTimeline(note);
  };

  const openProgressiveCreate = (participantId: string, query: string, role?: string) => {
    setCreateForId(participantId);
    setCreatePrefill(query);
    setCreateKind(role === "guarantor" ? "guarantor" : role === "other" ? "other" : "co_applicant");
    setCreateOpen(true);
  };

  const handleProgressiveCreated = (contact: EcmContact) => {
    const option: ParticipantEntityOption = {
      id: contact.id,
      name: contact.name,
      mobile: contact.mobilePrimary?.startsWith("pending-") ? undefined : contact.mobilePrimary,
      email: contact.personalEmail || contact.officialEmail,
      entityType: "individual",
    };
    setExtraOptions((prev) => {
      if (prev.some((p) => p.id === option.id)) return prev;
      return [...prev, option];
    });
    if (createForId) {
      updateRow(
        createForId,
        {
          entityId: contact.id,
          name: contact.name,
          mobile: option.mobile,
          email: option.email,
          status: "active",
        },
        `Progressive contact created and linked: ${contact.name}`,
      );
      setEditingId(null);
    }
    setCreateForId(null);
    onContactCreated?.(contact);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = participants.filter((p) => {
      if (!q) return true;
      const hay = [
        p.name,
        p.mobile ?? "",
        p.email ?? "",
        p.relationship ?? "",
        p.role ?? "",
        p.status ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    const sorted = [...list].sort((a, b) => {
      if (sortKey === "role") {
        return (ROLE_ORDER[a.role ?? "other"] ?? 9) - (ROLE_ORDER[b.role ?? "other"] ?? 9);
      }
      if (sortKey === "name") return (a.name ?? "").localeCompare(b.name ?? "");
      return 0;
    });

    const individuals = sorted.filter((p) => p.entityType === "individual");
    const companies = sorted.filter((p) => p.entityType === "company");

    const coApps = individuals.filter((p) => p.role === "co_applicant");
    const other = individuals.filter((p) => p.role !== "co_applicant");
    const comps = companies;

    return [...coApps, ...comps, ...other];
  }, [participants, query, sortKey]);

  const primaryRow = {
    role: "primary_applicant",
    name: primaryApplicant.name,
    mobile: primaryApplicant.mobile,
    email: primaryApplicant.email,
    city: primaryApplicant.city,
    employmentType: primaryApplicant.employmentType,
    relationship: "Self",
    status: "Active",
  };

  return (
    <div className={cn("space-y-3", className)}>
      {!readOnly && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" className="h-8 text-xs" onClick={() => addRow("individual")}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Individual
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => addRow("company")}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Company
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-[260px]">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-8 pl-8 text-xs"
                placeholder="Search participant..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="role" className="text-xs">Sort: Role</SelectItem>
                <SelectItem value="name" className="text-xs">Sort: Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <Th>Role</Th>
              <Th>Name</Th>
              <Th>Mobile</Th>
              <Th>Email</Th>
              <Th>Employment</Th>
              <Th>Relationship</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="text-xs">
            <ParticipantStaticRow row={primaryRow} />
            {filtered.map((p) => (
              <ParticipantRow
                key={p.id}
                participant={p}
                entityOptions={mergedOptions}
                isEditing={!readOnly && (editingId === p.id || !p.entityId)}
                readOnly={readOnly}
                onEdit={() => setEditingId(p.id)}
                onDone={() => setEditingId(null)}
                onUpdate={(patch, note) => updateRow(p.id, patch, note)}
                onOpenEntity={onOpenEntity}
                onCreateNewContact={
                  p.entityType === "individual"
                    ? (q) => openProgressiveCreate(p.id, q, p.role)
                    : undefined
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      <ProgressiveContactCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialName={createPrefill}
        participantKind={createKind}
        onCreated={handleProgressiveCreated}
      />
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 align-middle", className)}>{children}</td>;
}

function ParticipantStaticRow({
  row,
}: {
  row: {
    role: string;
    name: string;
    mobile: string;
    email: string;
    city: string;
    employmentType: string;
    relationship: string;
    status: string;
  };
}) {
  return (
    <tr className="border-b border-border/60">
      <Td>
        <Badge variant="outline" className={cn("h-5 text-[10px] border", roleStyle(row.role))}>
          {roleLabel(row.role)}
        </Badge>
      </Td>
      <Td className="font-semibold">{row.name}</Td>
      <Td>{row.mobile}</Td>
      <Td className="max-w-[240px] truncate">{row.email}</Td>
      <Td>{row.employmentType}</Td>
      <Td className="text-muted-foreground">{row.relationship}</Td>
      <Td className="text-right">
        <span className="text-[10px] text-muted-foreground">Locked</span>
      </Td>
    </tr>
  );
}

function ParticipantRow({
  participant,
  entityOptions,
  isEditing,
  readOnly,
  onEdit,
  onDone,
  onUpdate,
  onOpenEntity,
  onCreateNewContact,
}: {
  participant: LoanParticipant;
  entityOptions: ParticipantEntityOption[];
  isEditing: boolean;
  readOnly?: boolean;
  onEdit: () => void;
  onDone: () => void;
  onUpdate: (patch: Partial<LoanParticipant>, note: string) => void;
  onOpenEntity?: (entityId: string, entityType: LoanParticipantEntityType) => void;
  onCreateNewContact?: (query: string) => void;
}) {
  const options = useMemo(() => {
    return searchParticipantEntities("", entityOptions, participant.entityType);
  }, [entityOptions, participant.entityType]);

  const selected = entityOptions.find(
    (o) => o.id === participant.entityId && o.entityType === participant.entityType,
  );

  return (
    <tr className="border-b border-border/60 hover:bg-muted/20">
      <Td>
        {isEditing && participant.entityType === "individual" ? (
          <Select
            value={participant.role === "guarantor" || participant.role === "other" ? participant.role : "co_applicant"}
            onValueChange={(v) =>
              onUpdate(
                { role: v as LoanParticipantRole },
                `Participant role updated: ${participant.name || participant.id}`,
              )
            }
          >
            <SelectTrigger className="h-7 w-[120px] text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="co_applicant" className="text-xs">
                Co-Borrower
              </SelectItem>
              <SelectItem value="guarantor" className="text-xs">
                Guarantor
              </SelectItem>
              <SelectItem value="other" className="text-xs">
                Other
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className={cn("h-5 text-[10px] border", roleStyle(participant.role))}>
            {roleLabel(participant.role)}
          </Badge>
        )}
      </Td>
      <Td className="min-w-[240px]">
        {isEditing ? (
          <EntityMasterSearch
            placeholder={participant.entityType === "company" ? "Search company…" : "Search contact…"}
            selectedId={participant.entityId}
            selectedLabel={participant.name || selected?.name}
            options={options.map((o) => ({ id: o.id, label: o.name, sublabel: o.mobile ?? o.constitution }))}
            allowCreateNew={participant.entityType === "individual"}
            onCreateNew={onCreateNewContact}
            onSelect={(opt) => {
              const option = entityOptions.find((o) => o.id === opt.id && o.entityType === participant.entityType);
              if (!option) return;
              onUpdate(
                {
                  entityId: option.id,
                  name: option.name,
                  mobile: option.mobile,
                  email: option.email,
                  status: participant.status ?? "active",
                },
                `Participant selected: ${option.name}`,
              );
              onDone();
            }}
          />
        ) : (
          <span className="font-medium">{participant.name || "—"}</span>
        )}
      </Td>
      <Td>{participant.mobile ?? "—"}</Td>
      <Td className="max-w-[240px] truncate">{participant.email ?? "—"}</Td>
      <Td className="text-muted-foreground">—</Td>
      <Td className="min-w-[160px]">
        {isEditing ? (
          <Input
            className="h-8 text-xs"
            placeholder="e.g. Brother / Director / Partner"
            value={participant.relationship ?? ""}
            onChange={(e) => onUpdate({ relationship: e.target.value }, `Participant relationship updated: ${participant.name || participant.id}`)}
          />
        ) : (
          <span className="text-muted-foreground">{participant.relationship ?? "—"}</span>
        )}
      </Td>
      <Td className="text-right">
        <div className="inline-flex items-center gap-1">
          {participant.entityId && onOpenEntity && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onOpenEntity(participant.entityId, participant.entityType)}
              aria-label="View"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {!readOnly && (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} aria-label="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Td>
    </tr>
  );
}

