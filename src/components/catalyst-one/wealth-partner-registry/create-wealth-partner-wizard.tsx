"use client";

/**
 * CO-WP-001 / CO-WP-006 — Create Wealth Partner wizard.
 * Search Contact / Company → Convert → Select Type → Open Workspace.
 * Already-registered Contacts open the existing Wealth Partner (no dead-end toast).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Building2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ProgressiveCompanyCreateModal } from "@/components/catalyst-one/companies/progressive-company-create-modal";
import {
  WEALTH_PARTNER_TYPE_OPTIONS,
  buildWealthPartnerWorkspaceHref,
  wealthPartnerTypeLabel,
} from "@/constants/enterprise-wealth-partner-registry";
import { WEALTH_PARTNER_ONBOARD_COPY } from "@/constants/enterprise-identity-model";
import {
  WealthPartnerApiError,
  wealthPartnerApiClient,
} from "@/lib/enterprise-wealth-partner-registry";
import type {
  ExistingWealthPartnerSummary,
  WealthPartnerIdentityKind,
  WealthPartnerTypeCode,
} from "@/types/enterprise-wealth-partner-registry";
import { cn } from "@/lib/utils";

interface CreateWealthPartnerWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  /** Called when an existing WP should be highlighted in the registry list. */
  onOpenExisting?: (partner: ExistingWealthPartnerSummary) => void;
}

function formatCreatedAt(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CreateWealthPartnerWizard({
  open,
  onOpenChange,
  onCreated,
  onOpenExisting,
}: CreateWealthPartnerWizardProps) {
  const router = useRouter();
  const [identityKind, setIdentityKind] = useState<WealthPartnerIdentityKind>("contact");
  const [selected, setSelected] = useState<EntityMasterOption | null>(null);
  const [partnerType, setPartnerType] = useState<WealthPartnerTypeCode | "">("");
  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [existing, setExisting] = useState<ExistingWealthPartnerSummary | null>(null);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [createQuery, setCreateQuery] = useState("");

  function reset() {
    setIdentityKind("contact");
    setSelected(null);
    setPartnerType("");
    setSaving(false);
    setLookupLoading(false);
    setExisting(null);
    setCreateContactOpen(false);
    setCreateCompanyOpen(false);
    setCreateQuery("");
  }

  useEffect(() => {
    if (!open || !selected?.id) {
      setExisting(null);
      return;
    }
    let cancelled = false;
    setLookupLoading(true);
    void (async () => {
      try {
        const found = await wealthPartnerApiClient.findByIdentity({
          contactId: identityKind === "contact" ? selected.id : null,
          companyId: identityKind === "company" ? selected.id : null,
        });
        if (cancelled) return;
        if (found) {
          setExisting({
            partnerId: found.id,
            code: found.code,
            displayName: found.displayName,
            partnerType: found.partnerType,
            status: found.status,
            lifecycleStatus: found.lifecycleStatus,
            operationalStatus: found.operationalStatus,
            createdAt: found.createdAt,
            identityKind: found.identityKind,
            reason: "already_registered",
          });
        } else {
          setExisting(null);
        }
      } catch {
        if (!cancelled) setExisting(null);
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selected?.id, identityKind]);

  function openExistingPartner(partner: ExistingWealthPartnerSummary) {
    onOpenExisting?.(partner);
    onOpenChange(false);
    reset();
    router.push(buildWealthPartnerWorkspaceHref(partner.partnerId));
  }

  async function handleCreate() {
    if (!selected?.id) {
      toast.error("Select a Contact or Company from the Enterprise Registry.");
      return;
    }
    if (existing) {
      openExistingPartner(existing);
      return;
    }
    if (!partnerType) {
      toast.error("Select a Wealth Partner Type.");
      return;
    }
    setSaving(true);
    try {
      const created = await wealthPartnerApiClient.createPartner({
        identityKind,
        contactId: identityKind === "contact" ? selected.id : null,
        companyId: identityKind === "company" ? selected.id : null,
        identityLabel: selected.label,
        displayName: selected.label,
        partnerType,
      });
      toast.success(`Wealth Partner ${created.code} created.`);
      onOpenChange(false);
      onCreated?.();
      reset();
      router.push(buildWealthPartnerWorkspaceHref(created.id));
    } catch (err) {
      if (err instanceof WealthPartnerApiError && err.existingWealthPartner) {
        setExisting(err.existingWealthPartner);
        toast.message("Already registered", {
          description: err.message,
        });
        return;
      }
      toast.error(err instanceof Error ? err.message : "Could not create Wealth Partner.");
    } finally {
      setSaving(false);
    }
  }

  const convertDisabled =
    saving || lookupLoading || !selected || (!existing && !partnerType);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) reset();
          onOpenChange(next);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{WEALTH_PARTNER_ONBOARD_COPY.wizardTitle}</DialogTitle>
            <DialogDescription>
              {WEALTH_PARTNER_ONBOARD_COPY.wizardDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={identityKind === "contact" ? "default" : "outline"}
                className="gap-1.5"
                onClick={() => {
                  setIdentityKind("contact");
                  setSelected(null);
                  setExisting(null);
                }}
              >
                <UserRound className="h-3.5 w-3.5" />
                Contact
              </Button>
              <Button
                type="button"
                size="sm"
                variant={identityKind === "company" ? "default" : "outline"}
                className="gap-1.5"
                onClick={() => {
                  setIdentityKind("company");
                  setSelected(null);
                  setExisting(null);
                }}
              >
                <Building2 className="h-3.5 w-3.5" />
                Company
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>
                {identityKind === "contact"
                  ? WEALTH_PARTNER_ONBOARD_COPY.searchLabel
                  : "Search Enterprise Company Registry"}
              </Label>
              <LiveEntityMasterSearch
                key={identityKind}
                kind={identityKind}
                warmOnMount
                selectedId={selected?.id}
                selectedLabel={selected?.label}
                placeholder={
                  identityKind === "contact"
                    ? "Type to search contacts…"
                    : "Type to search companies…"
                }
                onSelect={(opt) => setSelected(opt)}
                allowCreateNew
                createNewLabel={
                  identityKind === "contact"
                    ? WEALTH_PARTNER_ONBOARD_COPY.createContactCta
                    : "Create New Company"
                }
                onCreateNew={(q) => {
                  setCreateQuery(q);
                  if (identityKind === "contact") setCreateContactOpen(true);
                  else setCreateCompanyOpen(true);
                }}
              />
              {selected ? (
                <p className={cn("text-xs text-muted-foreground")}>
                  Selected: <span className="font-medium text-foreground">{selected.label}</span>
                  {lookupLoading ? " · Checking registry…" : null}
                </p>
              ) : null}
            </div>

            {existing ? (
              <div
                className="space-y-2 rounded-lg border border-amber-500/35 bg-amber-500/5 px-3 py-3"
                data-wp="already-registered"
                role="status"
              >
                <p className="text-sm font-semibold text-foreground">
                  {identityKind === "company"
                    ? "This Company is already registered as a Wealth Partner."
                    : WEALTH_PARTNER_ONBOARD_COPY.alreadyRegistered}
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="capitalize">
                    {existing.lifecycleStatus}
                    {existing.status ? ` · ${existing.status}` : ""}
                    {existing.operationalStatus
                      ? ` · ${existing.operationalStatus}`
                      : ""}
                  </dd>
                  <dt className="text-muted-foreground">Wealth Partner Code</dt>
                  <dd className="font-mono font-medium">{existing.code}</dd>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium">
                    {existing.partnerType
                      ? wealthPartnerTypeLabel(String(existing.partnerType))
                      : "—"}
                  </dd>
                  <dt className="text-muted-foreground">Created Date</dt>
                  <dd>{formatCreatedAt(existing.createdAt)}</dd>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{existing.displayName}</dd>
                </dl>
                {existing.reason === "orphan_identity_missing" ? (
                  <p className="text-[11px] text-muted-foreground">
                    The linked Contact/Company row may be missing. Do not create another Wealth
                    Partner — open the existing record instead.
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openExistingPartner(existing)}
                  >
                    Open Wealth Partner
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Wealth Partner Type</Label>
                <Select
                  value={partnerType}
                  onValueChange={(v) => setPartnerType(v as WealthPartnerTypeCode)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEALTH_PARTNER_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {!existing ? (
              <Button
                type="button"
                disabled={convertDisabled}
                onClick={() => void handleCreate()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {WEALTH_PARTNER_ONBOARD_COPY.convertCta}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProgressiveContactCreateModal
        open={createContactOpen}
        onOpenChange={setCreateContactOpen}
        initialName={createQuery}
        participantKind="other"
        identityIntent="wealth_partner_onboarding"
        onCreated={(contact) => {
          setSelected({
            id: contact.id,
            label: contact.name,
            sublabel: contact.mobilePrimary,
          });
          setCreateContactOpen(false);
        }}
      />

      <ProgressiveCompanyCreateModal
        open={createCompanyOpen}
        onOpenChange={setCreateCompanyOpen}
        initialName={createQuery}
        onCreated={(company) => {
          setSelected({
            id: company.id,
            label: company.companyName,
          });
          setCreateCompanyOpen(false);
        }}
      />
    </>
  );
}
