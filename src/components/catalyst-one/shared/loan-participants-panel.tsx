"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
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
import {
  createParticipantId,
  getParticipantRowLabel,
  searchParticipantEntities,
} from "@/lib/loan-participants";
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
}

/**
 * UX-02 — Reusable Loan Participants panel.
 * Future: Customer 360, CAM, Sanction Management, Document Collection, Legal Verification.
 */
export function LoanParticipantsPanel({
  participants,
  entityOptions,
  onChange,
  onOpenEntity,
  maxParticipants = MAX_LOAN_PARTICIPANTS,
  className,
}: LoanParticipantsPanelProps) {
  const canAdd = participants.length < maxParticipants;

  const addParticipant = () => {
    if (!canAdd) return;
    onChange([
      ...participants,
      {
        id: createParticipantId(),
        entityType: "individual",
        entityId: "",
        name: "",
      },
    ]);
  };

  const updateParticipant = (id: string, patch: Partial<LoanParticipant>) => {
    onChange(participants.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removeParticipant = (id: string) => {
    onChange(participants.filter((p) => p.id !== id));
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
            entityOptions={entityOptions}
            onChange={(patch) => updateParticipant(participant.id, patch)}
            onRemove={() => removeParticipant(participant.id)}
            onOpenEntity={onOpenEntity}
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
          Maximum {maxParticipants} additional participants reached (10 entities including primary applicant).
        </p>
      )}
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
}: {
  participant: LoanParticipant;
  label: string;
  entityOptions: ParticipantEntityOption[];
  onChange: (patch: Partial<LoanParticipant>) => void;
  onRemove: () => void;
  onOpenEntity?: (entityId: string, entityType: LoanParticipantEntityType) => void;
}) {
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
          <ParticipantEntitySearch
            entityType={participant.entityType}
            entityOptions={entityOptions}
            selectedId={participant.entityId}
            onSelect={(option) =>
              onChange({
                entityId: option.id,
                name: option.name,
                mobile: option.mobile,
                email: option.email,
                constitution: option.constitution,
              })
            }
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

function ParticipantEntitySearch({
  entityType,
  entityOptions,
  selectedId,
  onSelect,
}: {
  entityType: LoanParticipantEntityType;
  entityOptions: ParticipantEntityOption[];
  selectedId?: string;
  onSelect: (option: ParticipantEntityOption) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => searchParticipantEntities(query, entityOptions, entityType),
    [query, entityOptions, entityType],
  );
  const selected = entityOptions.find((o) => o.id === selectedId && o.entityType === entityType);
  const showList = query.length > 0;

  return (
    <div className="space-y-1.5">
      <Input
        className="h-8 text-xs"
        placeholder={selected?.name ?? `Search ${entityType === "company" ? "company" : "contact"}...`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {showList && (
        <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-popover shadow-sm">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No match found.</p>
          ) : (
            results.map((option) => (
              <button
                key={`${option.entityType}-${option.id}`}
                type="button"
                onClick={() => {
                  onSelect(option);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60",
                  selectedId === option.id && "bg-muted/40",
                )}
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    selectedId === option.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="flex-1">{option.name}</span>
                {option.mobile && (
                  <span className="text-muted-foreground">{option.mobile}</span>
                )}
              </button>
            ))
          )}
        </div>
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
