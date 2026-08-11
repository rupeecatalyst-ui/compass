"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  CCC_INSTITUTION_TYPES,
  CCC_INSTITUTION_TYPE_LABELS,
  CCC_PACKAGE_KINDS,
  CCC_PACKAGE_KIND_LABELS,
  type CccInstitutionType,
  type CccPackageKind,
} from "@/constants/corporate-compliance-center";
import { cccApi } from "@/lib/corporate-compliance-center";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddLegalEntityButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    legalName: "",
    brandName: "",
    gst: "",
    pan: "",
    cin: "",
    tan: "",
    isPrimary: false,
  });

  const submit = async () => {
    if (!form.code.trim() || !form.legalName.trim()) {
      toast.error("Code and legal name are required.");
      return;
    }
    setSaving(true);
    try {
      await cccApi.createEntity({
        code: form.code.trim().toUpperCase(),
        legalName: form.legalName.trim(),
        brandName: form.brandName.trim() || undefined,
        gst: form.gst.trim() || undefined,
        pan: form.pan.trim() || undefined,
        cin: form.cin.trim() || undefined,
        tan: form.tan.trim() || undefined,
        isPrimary: form.isPrimary,
      });
      toast.success("Legal entity registered.");
      setOpen(false);
      setForm({
        code: "",
        legalName: "",
        brandName: "",
        gst: "",
        pan: "",
        cin: "",
        tan: "",
        isPrimary: false,
      });
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create entity");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add Entity
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Legal Entity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="RC"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Brand name</Label>
              <Input
                value={form.brandName}
                onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Legal name</Label>
              <Input
                value={form.legalName}
                onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
                placeholder="Rupee Catalyst Financial Services Private Limited"
              />
            </div>
            <div className="space-y-1.5">
              <Label>GST</Label>
              <Input
                value={form.gst}
                onChange={(e) => setForm((f) => ({ ...f, gst: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>PAN</Label>
              <Input
                value={form.pan}
                onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CIN</Label>
              <Input
                value={form.cin}
                onChange={(e) => setForm((f) => ({ ...f, cin: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>TAN</Label>
              <Input
                value={form.tan}
                onChange={(e) => setForm((f) => ({ ...f, tan: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.isPrimary}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isPrimary: v === true }))}
              />
              Primary legal entity
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AddInstitutionButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    institutionType: "bank" as CccInstitutionType,
    contactName: "",
    contactEmail: "",
    notes: "",
  });

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Institution name is required.");
      return;
    }
    setSaving(true);
    try {
      await cccApi.createInstitution({
        name: form.name.trim(),
        institutionType: form.institutionType,
        contactName: form.contactName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success("Institution registered.");
      setOpen(false);
      setForm({
        name: "",
        institutionType: "bank",
        contactName: "",
        contactEmail: "",
        notes: "",
      });
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create institution");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add Institution
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Institution</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.institutionType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, institutionType: v as CccInstitutionType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CCC_INSTITUTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {CCC_INSTITUTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contact name</Label>
              <Input
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact email</Label>
              <Input
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AddPackageDefinitionButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    packageKind: "new_lender_onboarding" as CccPackageKind,
    description: "",
    itemTypes: "legal_gst, legal_pan, legal_coi",
  });

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required.");
      return;
    }
    setSaving(true);
    try {
      const itemSpecs = form.itemTypes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((documentTypeId) => ({
          documentTypeId,
          required: true,
        }));
      await cccApi.createPackage({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        packageKind: form.packageKind,
        description: form.description.trim() || undefined,
        itemSpecs,
      });
      toast.success("Package definition created.");
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create package");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New Package
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Package Definition</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="LENDER_ONBOARD"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select
                value={form.packageKind}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, packageKind: v as CccPackageKind }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CCC_PACKAGE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {CCC_PACKAGE_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Document type IDs (comma-separated)</Label>
              <Input
                value={form.itemTypes}
                onChange={(e) => setForm((f) => ({ ...f, itemTypes: e.target.value }))}
                placeholder="legal_gst, legal_pan, legal_coi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BuildPackageButton({
  packages,
  entities,
  onBuilt,
}: {
  packages: { id: string; name: string; code: string }[];
  entities: { id: string; legalName: string }[];
  onBuilt: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [definitionId, setDefinitionId] = useState("");
  const [legalEntityId, setLegalEntityId] = useState("");
  const [name, setName] = useState("");

  const submit = async () => {
    if (!definitionId) {
      toast.error("Select a package definition.");
      return;
    }
    setSaving(true);
    try {
      await cccApi.buildPackageInstance(definitionId, {
        legalEntityId: legalEntityId || undefined,
        name: name.trim() || undefined,
      });
      toast.success("Package built from latest approved documents.");
      setOpen(false);
      onBuilt();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to build package");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Build Package
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Build Document Package</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Definition</Label>
              <Select value={definitionId} onValueChange={setDefinitionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Legal entity</Label>
              <Select value={legalEntityId} onValueChange={setLegalEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional entity scope" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.legalName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Instance name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Build
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
