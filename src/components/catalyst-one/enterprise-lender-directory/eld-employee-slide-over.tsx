"use client";

/**
 * CO-ARCH-ELD-EMP — Lender Employee Workspace (View / Edit).
 * Employment → ECM banker profile + ELR institution · Products → Product Master · Audit → EAF.
 */

import { useEffect, useState } from "react";
import {
  Check,
  Mail,
  MessageCircle,
  Phone,
  Pencil,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ELD_EMPLOYEE_STATUS_OPTIONS,
  ELD_EMPLOYEE_WORKSPACE_SECTIONS,
  type EldEmployeeWorkspaceSectionId,
} from "@/constants/enterprise-lender-directory";
import { parseBankerProductsHandled } from "@/lib/enterprise-contact-master";
import { normalizeEnterpriseRegionId } from "@/constants/enterprise-region-master";
import { saveEldLenderEmployeeEmployment } from "@/lib/enterprise-lender-directory";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type {
  EldLenderEmployeeRow,
  EldLenderEmployeeStatus,
} from "@/types/enterprise-lender-directory-ops";
import {
  BankerBranchSelect,
  BankerCitySelect,
  BankerInstitutionSelect,
  BankerProductsHandledMultiSelect,
} from "@/components/catalyst-one/contacts/banker-lender-registry-fields";
import { EcmMasterSelect } from "@/components/catalyst-one/contacts/ecm-master-select";
import { ReportingManagerPicker } from "@/components/catalyst-one/contacts/reporting-manager-picker";
import { useAuthContext } from "@/components/providers/auth-provider";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function telHref(mobile?: string | null) {
  const digits = (mobile ?? "").replace(/\D/g, "");
  return digits ? `tel:${digits}` : undefined;
}

function mailHref(email?: string | null) {
  const e = (email ?? "").trim();
  if (!e || e === "Not Specified") return undefined;
  return `mailto:${e}`;
}

function waHref(mobile?: string | null) {
  const digits = (mobile ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : undefined;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

type EldEmployeeEditDraft = {
  institutionId: string;
  institutionLabel: string;
  branchId: string;
  cityId: string;
  regionId: string;
  designationId: string;
  productsHandled: string;
  mobile: string;
  email: string;
  status: EldLenderEmployeeStatus;
  reportingManagerContactId?: string;
  reportingManagerName: string;
  reportingManager: EcmContact | null;
  reportingManagerTouched: boolean;
};

function draftFromRow(row: EldLenderEmployeeRow): EldEmployeeEditDraft {
  return {
    institutionId: row.institutionId || "",
    institutionLabel:
      row.institutionName !== "Not Specified" ? row.institutionName : "",
    branchId: row.branchId || "",
    cityId: row.cityId || "",
    // CO-MASTER-REGION-001 — map legacy lender-scoped region ids to Enterprise Region Master
    regionId: normalizeEnterpriseRegionId(row.regionId) || "",
    designationId: row.designationId || "",
    productsHandled: row.productCodes.join(","),
    mobile: row.mobile !== "Not Specified" ? row.mobile : "",
    email: row.email !== "Not Specified" ? row.email : "",
    status: row.status,
    reportingManagerContactId: row.reportingManagerContactId,
    reportingManagerName:
      row.reportingManagerName !== "Not Specified"
        ? row.reportingManagerName
        : "",
    reportingManager: null,
    reportingManagerTouched: false,
  };
}

export function EldLenderEmployeeSlideOver({
  open,
  onOpenChange,
  row,
  onSaved,
  initialSection = "profile",
  initialEditing = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: EldLenderEmployeeRow | null;
  /** Called after successful save so the directory can refresh. */
  onSaved?: () => void;
  initialSection?: EldEmployeeWorkspaceSectionId;
  initialEditing?: boolean;
}) {
  const { user } = useAuthContext();
  const [section, setSection] = useState<EldEmployeeWorkspaceSectionId>(initialSection);
  const [editing, setEditing] = useState(initialEditing);
  const [draft, setDraft] = useState<EldEmployeeEditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSection("profile");
      setEditing(false);
      setDraft(null);
      setSaveError(null);
      return;
    }
    if (row) {
      setDraft(draftFromRow(row));
      setSection(initialSection);
      setEditing(initialEditing);
      setSaveError(null);
    }
  }, [open, row?.contactId, initialSection, initialEditing]);

  const activeDraft = draft ?? (row ? draftFromRow(row) : null);

  const patchDraft = (patch: Partial<EldEmployeeEditDraft>) => {
    setDraft((prev) => {
      const base = prev ?? (row ? draftFromRow(row) : null);
      if (!base) return prev;
      return { ...base, ...patch };
    });
  };

  const startEdit = () => {
    if (!row) return;
    setDraft(draftFromRow(row));
    setEditing(true);
    setSaveError(null);
    if (section === "communication" || section === "pipeline" || section === "hierarchy") {
      setSection("profile");
    }
  };

  const cancelEdit = () => {
    if (row) setDraft(draftFromRow(row));
    setEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!row || !activeDraft) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveEldLenderEmployeeEmployment({
        contactId: row.contactId,
        actorId: user?.id || user?.email || "ui",
        institutionId: activeDraft.institutionId,
        institutionLabel: activeDraft.institutionLabel,
        branchId: activeDraft.branchId,
        cityId: activeDraft.cityId,
        regionId: activeDraft.regionId,
        designationId: activeDraft.designationId,
        productCodes: parseBankerProductsHandled(activeDraft.productsHandled),
        mobile: activeDraft.mobile,
        officialEmail: activeDraft.email,
        status: activeDraft.status,
        reportingManager: activeDraft.reportingManager,
        reportingManagerTouched: activeDraft.reportingManagerTouched,
      });
      toast.success("Lender employee updated.");
      setEditing(false);
      onSaved?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to save lender employee.";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const viewMobile = editing ? activeDraft?.mobile : row?.mobile;
  const viewEmail = editing ? activeDraft?.email : row?.email;
  const call = telHref(viewMobile);
  const emailHref = mailHref(viewEmail);
  const wa = waHref(viewMobile);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && editing) {
          cancelEdit();
        }
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        allowOutsideClose={!editing}
        className={cn(
          "flex h-full w-full flex-col gap-0 border-l border-border/60 bg-background p-0 shadow-2xl",
          "z-[95] duration-[250ms] data-[state=open]:duration-[250ms] data-[state=closed]:duration-200",
          "sm:max-w-[min(100vw,70vw)] md:max-w-[65vw]",
        )}
        overlayClassName="bg-black/40 duration-200"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 px-4 py-3 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/40">
                <UserRound className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
                  Lender Employee Workspace
                  {editing ? " · Edit Mode" : " · View Mode"}
                </p>
                <SheetTitle className="truncate text-base">
                  {row?.employeeName ?? "Employee"}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {row?.designationLabel}
                  {row?.institutionName ? ` · ${row.institutionName}` : ""}
                  {editing
                    ? " · Save updates employment mapping only — historical deals stay intact"
                    : " · Directory stays open behind this panel"}
                </SheetDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {editing ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={saving}
                    onClick={cancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={saving}
                    onClick={() => void handleSave()}
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  disabled={!row}
                  onClick={startEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  if (editing) cancelEdit();
                  onOpenChange(false);
                }}
                aria-label="Close employee workspace"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {saveError ? (
            <p className="text-[11px] text-destructive">{saveError}</p>
          ) : null}
          <div className="flex flex-wrap gap-1 pt-1">
            {ELD_EMPLOYEE_WORKSPACE_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={cn(
                  "h-7 rounded-md border px-2 text-[10px] font-medium",
                  section === s.id
                    ? "border-teal-500/50 bg-teal-500/15 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {!row || !activeDraft ? null : section === "profile" ? (
            editing ? (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Employment Details
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Institution (Lender)</Label>
                      <BankerInstitutionSelect
                        value={activeDraft.institutionId}
                        selectedName={activeDraft.institutionLabel}
                        onChange={(id, option) =>
                          patchDraft({
                            institutionId: id,
                            institutionLabel: option?.label || activeDraft.institutionLabel,
                            // Cascade clear location when transferring lenders
                            cityId: "",
                            branchId: "",
                          })
                        }
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Changing institution transfers current employment only. Historical
                        opportunities and deals are not modified.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Region</Label>
                      <EcmMasterSelect
                        domain="region"
                        value={activeDraft.regionId}
                        placeholder="Select region"
                        onChange={(id) =>
                          patchDraft({ regionId: id, cityId: "", branchId: "" })
                        }
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Enterprise Region Master · North · South · East · West
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">City</Label>
                      <BankerCitySelect
                        institutionId={activeDraft.institutionId}
                        regionId={activeDraft.regionId}
                        value={activeDraft.cityId}
                        onChange={(id) => patchDraft({ cityId: id, branchId: "" })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Branch</Label>
                      <BankerBranchSelect
                        institutionId={activeDraft.institutionId}
                        regionId={activeDraft.regionId}
                        cityId={activeDraft.cityId}
                        value={activeDraft.branchId}
                        onChange={(id) => patchDraft({ branchId: id })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Designation</Label>
                      <EcmMasterSelect
                        domain="designation"
                        value={activeDraft.designationId}
                        placeholder="Select designation"
                        onChange={(id) => patchDraft({ designationId: id })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Employee Status</Label>
                      <Select
                        value={activeDraft.status}
                        onValueChange={(v) =>
                          patchDraft({ status: v as EldLenderEmployeeStatus })
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ELD_EMPLOYEE_STATUS_OPTIONS.filter((s) => s.id !== "all").map(
                            (s) => (
                              <SelectItem key={s.id} value={s.id} className="text-sm">
                                {s.label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Reporting Manager</Label>
                      <ReportingManagerPicker
                        valueContactId={activeDraft.reportingManagerContactId}
                        valueName={activeDraft.reportingManagerName}
                        excludeContactId={row.contactId}
                        actorId={user?.id || "ui"}
                        onChange={(contact) =>
                          patchDraft({
                            reportingManager: contact,
                            reportingManagerContactId: contact?.id,
                            reportingManagerName: contact?.name || "",
                            reportingManagerTouched: true,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Contact Information
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Mobile Number</Label>
                      <Input
                        value={activeDraft.mobile}
                        onChange={(e) => patchDraft({ mobile: e.target.value })}
                        className="h-9 text-sm"
                        placeholder="Official mobile"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Official Email</Label>
                      <Input
                        type="email"
                        value={activeDraft.email}
                        onChange={(e) => patchDraft({ email: e.target.value })}
                        className="h-9 text-sm"
                        placeholder="name@bank.com"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">
                        Alternate Mobile
                      </Label>
                      <Input
                        disabled
                        value=""
                        placeholder="Future capability"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ProfileField label="Name" value={row.employeeName} />
                  <ProfileField label="Photo" value="Future" />
                  <ProfileField label="Designation" value={row.designationLabel} />
                  <ProfileField label="Institution" value={row.institutionName} />
                  <ProfileField label="Branch" value={row.branchLabel} />
                  <ProfileField label="City" value={row.cityLabel} />
                  <ProfileField label="Region" value={row.regionLabel} />
                  <ProfileField label="Reporting Manager" value={row.reportingManagerName} />
                  <ProfileField label="Mobile" value={row.mobile} />
                  <ProfileField label="Email" value={row.email} />
                  <ProfileField label="Status" value={row.statusLabel} />
                </div>
              </div>
            )
          ) : section === "products" ? (
            <div className="space-y-2">
              {editing ? (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    Products from Enterprise Product Master. Add or remove as needed.
                  </p>
                  <BankerProductsHandledMultiSelect
                    value={activeDraft.productsHandled}
                    onChange={(next) => patchDraft({ productsHandled: next })}
                  />
                </>
              ) : row.productCodes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No products mapped on this banker profile yet.
                </p>
              ) : (
                row.productsHandledLabel.split(", ").map((label) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm"
                  >
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    <span className="font-medium">{label}</span>
                  </div>
                ))
              )}
            </div>
          ) : section === "performance" ? (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Metric label="Active Opportunities" value={String(row.activeOpportunities)} />
                <Metric label="Active Deals" value={String(row.activeDeals)} />
                <Metric label="Sanctions" value={String(row.totalSanctions)} />
                <Metric label="Disbursements" value={String(row.totalDisbursements)} />
                <Metric label="Approval Ratio" value={row.approvalRatioLabel} />
                <Metric label="Average TAT" value={row.averageTatLabel} />
                <Metric label="Performance Score" value={row.performanceScoreLabel} />
                <Metric label="Customer Satisfaction Score" value="Future" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pipeline counts are projected from Enterprise Deal Registry. Institution transfer
                does not rewrite historical deal ownership.
              </p>
            </div>
          ) : section === "hierarchy" ? (
            <div className="space-y-3">
              {editing ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Reporting Manager</Label>
                  <ReportingManagerPicker
                    valueContactId={activeDraft.reportingManagerContactId}
                    valueName={activeDraft.reportingManagerName}
                    excludeContactId={row.contactId}
                    actorId={user?.id || "ui"}
                    onChange={(contact) =>
                      patchDraft({
                        reportingManager: contact,
                        reportingManagerContactId: contact?.id,
                        reportingManagerName: contact?.name || "",
                        reportingManagerTouched: true,
                      })
                    }
                  />
                </div>
              ) : null}
              <p className="text-[11px] text-muted-foreground">
                Reporting structure from Enterprise Contact relationships (`reports_to`) — levels
                are not hardcoded.
              </p>
              {row.hierarchy.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reporting chain captured yet.</p>
              ) : (
                <ol className="space-y-0">
                  {row.hierarchy.map((node, index) => (
                    <li key={node.contactId} className="relative pl-1">
                      {index > 0 ? (
                        <div
                          className="mb-1 ml-5 flex h-5 items-center text-muted-foreground"
                          aria-hidden
                        >
                          ↓
                        </div>
                      ) : null}
                      <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
                        <p className="text-sm font-semibold">{node.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {node.designationLabel} · {node.mobile}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : section === "pipeline" ? (
            <div className="space-y-2">
              {row.pipeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active deals currently linked to this lender employee.
                </p>
              ) : (
                row.pipeline.map((item) => (
                  <article
                    key={item.dealId}
                    className="rounded-lg border border-border/60 bg-card px-3 py-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.customerName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.dealNumber}
                          {item.opportunityNumber ? ` · ${item.opportunityNumber}` : ""}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-teal-700 dark:text-teal-300">
                        {item.stageLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {item.productLabel} · {item.amountLabel}
                    </p>
                  </article>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {call ? (
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
                    <a href={call}>
                      <Phone className="h-3.5 w-3.5" />
                      Call
                    </a>
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled>
                    <Phone className="h-3.5 w-3.5" />
                    Call
                  </Button>
                )}
                {emailHref ? (
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
                    <a href={emailHref}>
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </a>
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled>
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Button>
                )}
                {wa ? (
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
                    <a href={wa} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled>
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </Button>
                )}
              </div>
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-3 py-4">
                <p className="text-sm font-medium">Meeting History</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Future capability.</p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
