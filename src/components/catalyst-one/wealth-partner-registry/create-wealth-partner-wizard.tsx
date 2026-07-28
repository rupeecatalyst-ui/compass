"use client";

/**
 * CO-WP-001 — Create Wealth Partner wizard.
 * Search Contact / Company → Convert → Select Type → Open Workspace.
 */

import { useState } from "react";
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
} from "@/constants/enterprise-wealth-partner-registry";
import { wealthPartnerApiClient } from "@/lib/enterprise-wealth-partner-registry";
import type {
  WealthPartnerIdentityKind,
  WealthPartnerTypeCode,
} from "@/types/enterprise-wealth-partner-registry";
import { cn } from "@/lib/utils";

interface CreateWealthPartnerWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateWealthPartnerWizard({
  open,
  onOpenChange,
  onCreated,
}: CreateWealthPartnerWizardProps) {
  const router = useRouter();
  const [identityKind, setIdentityKind] = useState<WealthPartnerIdentityKind>("contact");
  const [selected, setSelected] = useState<EntityMasterOption | null>(null);
  const [partnerType, setPartnerType] = useState<WealthPartnerTypeCode | "">("");
  const [saving, setSaving] = useState(false);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [createQuery, setCreateQuery] = useState("");

  function reset() {
    setIdentityKind("contact");
    setSelected(null);
    setPartnerType("");
    setSaving(false);
    setCreateContactOpen(false);
    setCreateCompanyOpen(false);
    setCreateQuery("");
  }

  async function handleCreate() {
    if (!selected?.id) {
      toast.error("Select a Contact or Company from the Enterprise Registry.");
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
      toast.error(err instanceof Error ? err.message : "Could not create Wealth Partner.");
    } finally {
      setSaving(false);
    }
  }

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
            <DialogTitle>Create Wealth Partner</DialogTitle>
            <DialogDescription>
              Convert an existing Contact or Company into a Wealth Partner relationship. Master
              identity stays in Contact / Company registries.
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
                }}
              >
                <Building2 className="h-3.5 w-3.5" />
                Company
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>
                Search Enterprise {identityKind === "contact" ? "Contact" : "Company"} Registry
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
                  identityKind === "contact" ? "Create New Contact" : "Create New Company"
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
                </p>
              ) : null}
            </div>

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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || !selected || !partnerType}
              onClick={() => void handleCreate()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Convert to Wealth Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProgressiveContactCreateModal
        open={createContactOpen}
        onOpenChange={setCreateContactOpen}
        initialName={createQuery}
        participantKind="other"
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
