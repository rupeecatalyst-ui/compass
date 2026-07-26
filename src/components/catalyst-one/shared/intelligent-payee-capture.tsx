"use client";

/**
 * Intelligent Payee Capture — Chanakya guided prompt + selection panel.
 * Non-blocking: Remind Me Later always available. Exactly one Payee (Individual XOR Company).
 */

import { useEffect, useMemo, useState } from "react";
import { Building2, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { ProgressiveCompanyCreateModal } from "@/components/catalyst-one/companies/progressive-company-create-modal";
import { buildDefaultParticipantEntityOptions } from "@/lib/loan-participants";
import {
  applyPayeeSelection,
  deferPayeeCapture,
  markPayeePromptShown,
  shouldOfferPayeePrompt,
  type PayeeEntityType,
  type PayeeRelationshipHint,
  type PayeeSelection,
} from "@/lib/loan-payee";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";
import type { ParticipantEntityOption } from "@/types/loan-participant";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { EcmCompany } from "@/types/enterprise-company-master";
import { getEcmContactRegistryVersion } from "@/lib/enterprise-contact-master";

const RELATIONSHIP_OPTIONS: { value: PayeeRelationshipHint; label: string }[] = [
  { value: "payee", label: "Disbursement Payee" },
  { value: "builder", label: "Builder" },
  { value: "seller", label: "Seller" },
  { value: "existing_lender", label: "Existing Lender" },
  { value: "company_payee", label: "Company Payee" },
];

/** Non-blocking Chanakya prompt after opportunity / loan initiation. */
export function ChanakyaPayeePromptDialog({
  open,
  onOpenChange,
  customerName,
  onSelectPayee,
  onRemindLater,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName?: string;
  onSelectPayee: () => void;
  onRemindLater: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-teal-600" aria-hidden />
            CHANAKYA
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-foreground/80">
            Before proceeding further, please identify who will receive the loan disbursement
            {customerName ? (
              <>
                {" "}
                for <span className="font-medium text-foreground">{customerName}</span>
              </>
            ) : null}
            . This helps us prepare the transaction correctly for lender processing.
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-lg border border-teal-500/20 bg-teal-500/[0.06] px-3 py-2 text-[11px] text-muted-foreground">
          Guidance only — your workflow is not blocked. You can continue and capture the Payee later.
        </p>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            className="h-9 w-full bg-teal-700 hover:bg-teal-600"
            onClick={() => {
              onSelectPayee();
            }}
          >
            Select Payee
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full"
            onClick={() => {
              onRemindLater();
              onOpenChange(false);
            }}
          >
            Remind Me Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Compact side panel — Individual XOR Company Payee selection. */
export function PayeeCapturePanel({
  open,
  onOpenChange,
  file,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: LoanFile;
  onSave: (patch: Partial<LoanFile>) => void;
}) {
  const [entityType, setEntityType] = useState<PayeeEntityType>("individual");
  const [relationship, setRelationship] = useState<PayeeRelationshipHint>("payee");
  const [selected, setSelected] = useState<ParticipantEntityOption | null>(null);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState("");
  const [extraOptions, setExtraOptions] = useState<ParticipantEntityOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const registryVersion = getEcmContactRegistryVersion();

  useEffect(() => {
    if (!open) return;
    setEntityType(file.payeeEntityType === "company" ? "company" : "individual");
    setRelationship((file.payeeRelationshipCode as PayeeRelationshipHint) || "payee");
    setSelected(
      file.payeeEntityId && file.payeeName
        ? {
            id: file.payeeEntityId,
            name: file.payeeName,
            entityType: file.payeeEntityType === "company" ? "company" : "individual",
          }
        : null,
    );
    setError(null);
    setExtraOptions([]);
  }, [open, file.id]);

  const options = useMemo(() => {
    void registryVersion;
    const live = buildDefaultParticipantEntityOptions();
    const byKey = new Map<string, ParticipantEntityOption>();
    for (const row of [...live, ...extraOptions]) {
      byKey.set(`${row.entityType}:${row.id}`, row);
    }
    return [...byKey.values()].filter((o) => o.entityType === entityType);
  }, [entityType, extraOptions, registryVersion, open]);

  const pickType = (next: PayeeEntityType) => {
    setEntityType(next);
    setSelected(null);
    setError(null);
    if (next === "company" && relationship === "payee") {
      setRelationship("company_payee");
    }
    if (next === "individual" && relationship === "company_payee") {
      setRelationship("payee");
    }
  };

  const save = () => {
    if (!selected?.id || !selected.name) {
      setError("Select an Individual or Company as the Payee.");
      return;
    }
    const selection: PayeeSelection = {
      entityType,
      entityId: selected.id,
      name: selected.name,
      mobile: selected.mobile,
      email: selected.email,
      constitution: selected.constitution,
      relationshipCode: relationship,
    };
    const patch = applyPayeeSelection(file, selection);
    onSave(patch);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          allowOutsideClose
          className={cn(
            "flex w-[min(100vw,400px)] flex-col gap-0 border-l border-border/70 bg-background p-0 shadow-2xl",
            "z-[90] sm:max-w-[400px]",
          )}
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 px-4 py-3 pr-12 text-left">
            <SheetTitle className="text-sm font-semibold tracking-tight">Select Payee</SheetTitle>
            <SheetDescription className="text-[11px] leading-relaxed">
              Exactly one disbursement recipient — Individual or Company, never both.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Who is the Payee?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => pickType("individual")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition",
                    entityType === "individual"
                      ? "border-teal-600 bg-teal-500/10 text-foreground ring-1 ring-teal-600/40"
                      : "border-border/70 text-muted-foreground hover:bg-muted/40",
                  )}
                  aria-pressed={entityType === "individual"}
                >
                  <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    <span className="block font-semibold text-foreground">Individual</span>
                    <span className="text-[10px]">Contact Registry</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => pickType("company")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition",
                    entityType === "company"
                      ? "border-teal-600 bg-teal-500/10 text-foreground ring-1 ring-teal-600/40"
                      : "border-border/70 text-muted-foreground hover:bg-muted/40",
                  )}
                  aria-pressed={entityType === "company"}
                >
                  <Building2 className="h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    <span className="block font-semibold text-foreground">Company</span>
                    <span className="text-[10px]">Company Registry</span>
                  </span>
                </button>
              </div>
            </section>

            <section className="space-y-1.5">
              <Label className="text-[11px]">Relationship</Label>
              <Select
                value={relationship}
                onValueChange={(v) => setRelationship(v as PayeeRelationshipHint)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <section className="space-y-1.5">
              <Label className="text-[11px]">
                {entityType === "company" ? "Search Company…" : "Search Individual…"}
              </Label>
              <EntityMasterSearch
                key={`payee-${entityType}-${options.length}`}
                placeholder={
                  entityType === "company" ? "Search Company Registry…" : "Search Contact Registry…"
                }
                selectedId={selected?.id}
                selectedLabel={selected?.name}
                options={options.map((o) => ({
                  id: o.id,
                  label: o.name,
                  sublabel: o.mobile || o.constitution,
                }))}
                allowCreateNew
                createNewLabel={
                  entityType === "company" ? "Create New Company" : "Create New Contact"
                }
                onCreateNew={(query) => {
                  setCreatePrefill(query);
                  if (entityType === "company") setCreateCompanyOpen(true);
                  else setCreateContactOpen(true);
                }}
                onSelect={(opt) => {
                  const row = options.find((o) => o.id === opt.id);
                  if (!row) return;
                  setSelected(row);
                  setError(null);
                }}
              />
              {selected ? (
                <p className="rounded-lg border border-teal-600/30 bg-teal-500/5 px-2.5 py-2 text-[11px]">
                  Selected Payee:{" "}
                  <span className="font-semibold text-foreground">{selected.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {entityType === "company" ? "Company" : "Individual"}
                  </span>
                </p>
              ) : null}
            </section>

            {error ? (
              <p className="text-xs text-amber-800 dark:text-amber-200">{error}</p>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-border/60 px-4 py-3">
            <Button
              type="button"
              className="h-9 w-full bg-teal-700 hover:bg-teal-600"
              onClick={save}
            >
              Save Payee
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ProgressiveContactCreateModal
        open={createContactOpen}
        onOpenChange={setCreateContactOpen}
        initialName={createPrefill}
        participantKind="other"
        onCreated={(contact: EcmContact) => {
          const option: ParticipantEntityOption = {
            id: contact.id,
            name: contact.name,
            mobile: contact.mobilePrimary,
            email: contact.personalEmail || contact.officialEmail,
            entityType: "individual",
          };
          setExtraOptions((prev) => [...prev, option]);
          setSelected(option);
          setEntityType("individual");
          setCreateContactOpen(false);
        }}
      />

      <ProgressiveCompanyCreateModal
        open={createCompanyOpen}
        onOpenChange={setCreateCompanyOpen}
        initialName={createPrefill}
        onCreated={(company: EcmCompany) => {
          const option: ParticipantEntityOption = {
            id: company.id,
            name: company.companyName,
            constitution: company.constitution,
            entityType: "company",
          };
          setExtraOptions((prev) => [...prev, option]);
          setSelected(option);
          setEntityType("company");
          setCreateCompanyOpen(false);
        }}
      />
    </>
  );
}

/**
 * Host for Loan Workspace — shows Chanakya prompt when payee missing, then capture panel.
 */
export function IntelligentPayeeCaptureHost({
  file,
  onUpdateFile,
}: {
  file: LoanFile | null;
  onUpdateFile: (patch: Partial<LoanFile>) => void;
}) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (!file) return;
    if (shouldOfferPayeePrompt(file)) {
      setPromptOpen(true);
      markPayeePromptShown(file.id);
    }
  }, [file?.id, file?.payeeStatus, file?.payeeEntityId]);

  if (!file) return null;

  return (
    <>
      <ChanakyaPayeePromptDialog
        open={promptOpen}
        onOpenChange={setPromptOpen}
        customerName={file.customerName}
        onSelectPayee={() => {
          setPromptOpen(false);
          setPanelOpen(true);
        }}
        onRemindLater={() => {
          onUpdateFile(deferPayeeCapture(file));
        }}
      />
      <PayeeCapturePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        file={file}
        onSave={onUpdateFile}
      />
    </>
  );
}
