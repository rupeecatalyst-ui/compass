"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityButtonLink } from "@/components/catalyst-one/shared/entity-link";
import { EntityMasterSearch } from "@/components/catalyst-one/shared/entity-master-search";
import { ProgressiveContactCreateModal } from "@/components/catalyst-one/contacts/progressive-contact-create-modal";
import {
  createParticipantId,
  getParticipantRowLabel,
  searchParticipantEntities,
} from "@/lib/loan-participants";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { cn } from "@/lib/utils";
import {
  MAX_LOAN_PARTICIPANTS,
  type LoanParticipant,
  type LoanParticipantEntityType,
  type ParticipantEntityOption,
} from "@/types/loan-participant";

export interface LoanParticipantsPanelProps {
  participants: LoanParticipant[];
  entityOptions: ParticipantEntityOption[];
  onChange: (participants: LoanParticipant[]) => void;
  onOpenEntity?: (entityId: string, entityType: LoanParticipantEntityType) => void;
  maxParticipants?: number;
  className?: string;
  onContactCreated?: (contact: EcmContact) => void;
}

/**
 * UX-02 — Reusable Loan Participants panel + Progressive Contact Creation.
 */
export function LoanParticipantsPanel({
  participants,
  entityOptions,
  onChange,
  onOpenEntity,
  maxParticipants = MAX_LOAN_PARTICIPANTS,
  className,
  onContactCreated,
}: LoanParticipantsPanelProps) {
  const canAdd = participants.length < maxParticipants;
  const [extraOptions, setExtraOptions] = useState<ParticipantEntityOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForId, setCreateForId] = useState<string | null>(null);
  const [createPrefill, setCreatePrefill] = useState("");

  const mergedOptions = useMemo(() => {
    const byId = new Map<string, ParticipantEntityOption>();
    for (const o of [...entityOptions, ...extraOptions]) {
      byId.set(`${o.entityType}:${o.id}`, o);
    }
    return [...byId.values()];
  }, [entityOptions, extraOptions]);

  const addParticipant = () => {
    if (!canAdd) return;
    onChange([
      ...participants,
      {
        id: createParticipantId(),
        entityType: "individual",
        entityId: "",
        name: "",
        role: "co_applicant",
        status: "active",
      },
    ]);
  };

  const updateParticipant = (id: string, patch: Partial<LoanParticipant>) => {
    onChange(participants.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removeParticipant = (id: string) => {
    onChange(participants.filter((p) => p.id !== id));
  };

  const handleCreated = (contact: EcmContact) => {
    const option: ParticipantEntityOption = {
      id: contact.id,
      name: contact.name,
      mobile: contact.mobilePrimary?.startsWith("pending-") ? undefined : contact.mobilePrimary,
      email: contact.personalEmail || contact.officialEmail,
      entityType: "individual",
    };
    setExtraOptions((prev) => (prev.some((p) => p.id === option.id) ? prev : [...prev, option]));
    if (createForId) {
      updateParticipant(createForId, {
        entityId: contact.id,
        name: contact.name,
        mobile: option.mobile,
        email: option.email,
        role: "co_applicant",
        status: "active",
      });
    }
    setCreateForId(null);
    onContactCreated?.(contact);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {participants.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No additional participants. Add co-applicants or company entities linked to this loan.
        </p>
      ) : (
        participants.map((participant) => (
          <ParticipantRow
            key={participant.id}
            participant={participant}
            label={getParticipantRowLabel(participant, participants)}
            entityOptions={mergedOptions}
            onChange={(patch) => updateParticipant(participant.id, patch)}
            onRemove={() => removeParticipant(participant.id)}
            onOpenEntity={onOpenEntity}
            onCreateNew={
              participant.entityType === "individual"
                ? (q) => {
                    setCreateForId(participant.id);
                    setCreatePrefill(q);
                    setCreateOpen(true);
                  }
                : undefined
            }
          />
        ))
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        disabled={!canAdd}
        onClick={addParticipant}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add Participant
      </Button>
      {!canAdd && (
        <p className="text-[10px] text-muted-foreground">
          Maximum {maxParticipants} additional participants reached (10 entities including primary
          applicant).
        </p>
      )}

      <ProgressiveContactCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialName={createPrefill}
        participantKind="co_applicant"
        onCreated={handleCreated}
      />
    </div>
  );
}

function ParticipantRow({
  participant,
  label,
  entityOptions,
  onChange,
  onRemove,
  onOpenEntity,
  onCreateNew,
}: {
  participant: LoanParticipant;
  label: string;
  entityOptions: ParticipantEntityOption[];
  onChange: (patch: Partial<LoanParticipant>) => void;
  onRemove: () => void;
  onOpenEntity?: (entityId: string, entityType: LoanParticipantEntityType) => void;
  onCreateNew?: (query: string) => void;
}) {
  const options = useMemo(
    () =>
      searchParticipantEntities("", entityOptions, participant.entityType).map((o) => ({
        id: o.id,
        label: o.name,
        sublabel: o.mobile ?? o.constitution,
      })),
    [entityOptions, participant.entityType],
  );

  return (
    <div className="rounded-lg border border-border/70 bg-muted/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ParticipantField label="Participant Type">
          <Select
            value={participant.entityType}
            onValueChange={(v) =>
              onChange({
                entityType: v as LoanParticipantEntityType,
                entityId: "",
                name: "",
                mobile: undefined,
                email: undefined,
                constitution: undefined,
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual" className="text-xs">
                Individual
              </SelectItem>
              <SelectItem value="company" className="text-xs">
                Company
              </SelectItem>
            </SelectContent>
          </Select>
        </ParticipantField>

        <ParticipantField
          label={
            participant.entityType === "company"
              ? "Search Existing Company"
              : "Search Existing Contact"
          }
          className="sm:col-span-2"
        >
          <EntityMasterSearch
            placeholder={
              participant.name ||
              `Search ${participant.entityType === "company" ? "company" : "contact"}…`
            }
            selectedId={participant.entityId}
            selectedLabel={participant.name || undefined}
            options={options}
            allowCreateNew={participant.entityType === "individual"}
            onCreateNew={onCreateNew}
            onSelect={(opt) => {
              const option = entityOptions.find(
                (o) => o.id === opt.id && o.entityType === participant.entityType,
              );
              if (!option) return;
              onChange({
                entityId: option.id,
                name: option.name,
                mobile: option.mobile,
                email: option.email,
                constitution: option.constitution,
              });
            }}
          />
        </ParticipantField>

        <ParticipantField label="Name">
          <Input className="h-8 bg-muted/40 text-xs" value={participant.name} readOnly />
        </ParticipantField>

        <ParticipantField label="Mobile">
          <Input
            className="h-8 bg-muted/40 text-xs"
            value={participant.mobile ?? "—"}
            readOnly
          />
        </ParticipantField>

        <ParticipantField label="Email" className="sm:col-span-2">
          <Input
            className="h-8 bg-muted/40 text-xs"
            value={participant.email ?? "—"}
            readOnly
          />
        </ParticipantField>

        {participant.entityType === "company" && participant.constitution && (
          <ParticipantField label="Constitution">
            <Input className="h-8 bg-muted/40 text-xs" value={participant.constitution} readOnly />
          </ParticipantField>
        )}
      </div>

      {participant.entityId && onOpenEntity && (
        <EntityButtonLink
          label={
            participant.entityType === "company"
              ? "Open company workspace"
              : "Open contact workspace"
          }
          className="mt-3 text-xs"
          onClick={() => onOpenEntity(participant.entityId, participant.entityType)}
        />
      )}
    </div>
  );
}

function ParticipantField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
