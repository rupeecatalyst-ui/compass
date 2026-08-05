"use client";

/**
 * CO-LENDER-HIERARCHY-REMEDIATION-001
 * Hierarchy chart — projection of ECM Lender Employees (reports_to).
 * No localStorage, demo seed, or hardcoded vacant ranks.
 */

import { useMemo, useState } from "react";
import {
  GitBranch,
  Mail,
  Pencil,
  Phone,
  Plus,
  UserPlus,
  UserRound,
} from "lucide-react";
import { ReportingManagerPicker } from "@/components/catalyst-one/contacts/reporting-manager-picker";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  assignExistingContactToInstitution,
  createLenderEmployeeForInstitution,
} from "@/lib/enterprise-lender-directory/hierarchy-actions";
import { setBankerReportingManager } from "@/lib/enterprise-contact-master";
import {
  findOperationalEcmContactById,
  liveSearchOperationalEcmContacts,
} from "@/lib/enterprise-registry";
import type { EldLenderEmployeeRow } from "@/types/enterprise-lender-directory-ops";
import type {
  EldHierarchyEmployeeAction,
  EldHierarchyForest,
  EldHierarchyTreeNode,
} from "@/types/enterprise-lender-hierarchy";
import type { EldEmployeeWorkspaceSectionId } from "@/constants/enterprise-lender-directory";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function HierarchyCard({
  node,
  onAction,
}: {
  node: EldHierarchyTreeNode;
  onAction: (action: EldHierarchyEmployeeAction, node: EldHierarchyTreeNode) => void;
}) {
  return (
    <div
      className={cn(
        "w-[min(100%,280px)] shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm",
        "transition-shadow hover:shadow-md",
      )}
      style={{ marginLeft: Math.min(node.depth, 6) * 16 }}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-teal-700 to-teal-500" />
      <div className="space-y-2.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">{node.employeeName}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{node.designationLabel}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-teal-500/30 bg-teal-500/10 text-xs font-semibold text-teal-900 dark:text-teal-100">
            {initials(node.employeeName) || <UserRound className="h-4 w-4" />}
          </div>
        </div>
        <div className="space-y-0.5 text-[11px] text-muted-foreground">
          <p>Department · {node.departmentLabel}</p>
          <p>
            Status · <span className="font-medium text-foreground">{node.statusLabel}</span>
          </p>
          <p>Reporting Manager · {node.reportingManagerName || "Not Specified"}</p>
          {node.directReportCount > 0 ? (
            <p>Direct reports · {node.directReportCount}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px]"
            onClick={() => onAction("open_workspace", node)}
          >
            Open Workspace
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px]"
            onClick={() => onAction("view_profile", node)}
          >
            Profile
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px]"
            onClick={() => onAction("edit_assignment", node)}
          >
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px]"
            onClick={() => onAction("change_reporting_manager", node)}
          >
            Change RM
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px]"
            onClick={() => onAction("view_performance", node)}
          >
            Performance
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px]"
            onClick={() => onAction("view_pipeline", node)}
          >
            Pipeline
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px]"
            onClick={() => onAction("view_communication", node)}
          >
            Communication
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-dashed px-2 text-[10px]"
            onClick={() => onAction("add_report", node)}
          >
            <Plus className="h-3 w-3" />
            Add Report
          </Button>
          {node.mobile && node.mobile !== "Not Specified" ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px]"
              asChild
            >
              <a href={`tel:${node.mobile.replace(/\D/g, "")}`}>
                <Phone className="mr-1 h-3 w-3" />
                Call
              </a>
            </Button>
          ) : null}
          {node.email && node.email !== "Not Specified" ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px]"
              asChild
            >
              <a href={`mailto:${node.email}`}>
                <Mail className="mr-1 h-3 w-3" />
                Email
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function renderTree(
  nodes: EldHierarchyTreeNode[],
  onAction: (action: EldHierarchyEmployeeAction, node: EldHierarchyTreeNode) => void,
) {
  return nodes.map((node) => (
    <div key={node.contactId} className="flex flex-col items-start gap-0">
      {node.depth > 0 ? (
        <div className="ml-2 flex h-5 items-center text-muted-foreground" aria-hidden>
          <GitBranch className="mr-1 h-3.5 w-3.5 opacity-60" />
        </div>
      ) : null}
      <HierarchyCard node={node} onAction={onAction} />
      {node.children.length > 0 ? (
        <div className="mt-2 flex flex-col gap-2">{renderTree(node.children, onAction)}</div>
      ) : null}
    </div>
  ));
}

type AssignMode = "assign" | "create";

export function EldHierarchyChart({
  lenderId,
  lenderName,
  forest,
  onOpenEmployee,
  onChanged,
}: {
  lenderId: string;
  lenderName: string;
  forest: EldHierarchyForest;
  onOpenEmployee: (
    row: EldLenderEmployeeRow,
    opts?: { section?: EldEmployeeWorkspaceSectionId; editing?: boolean },
  ) => void;
  onChanged: () => void;
}) {
  const { user } = useAuthContext();
  const actorId = user?.id || user?.email || "ui";
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<AssignMode>("create");
  const [managerForNew, setManagerForNew] = useState<EcmContact | null>(null);
  const [rmTarget, setRmTarget] = useState<EldHierarchyTreeNode | null>(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [assignQuery, setAssignQuery] = useState("");
  const [assignResults, setAssignResults] = useState<EcmContact[]>([]);
  const [selectedAssign, setSelectedAssign] = useState<EcmContact | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empty = forest.employeeCount === 0;

  const openAssign = (mode: AssignMode, manager: EcmContact | null) => {
    setPanelMode(mode);
    setManagerForNew(manager);
    setName("");
    setMobile("");
    setEmail("");
    setAssignQuery("");
    setAssignResults([]);
    setSelectedAssign(null);
    setError(null);
    setPanelOpen(true);
  };

  const onAction = (action: EldHierarchyEmployeeAction, node: EldHierarchyTreeNode) => {
    const row = node.employee;
    switch (action) {
      case "open_workspace":
        onOpenEmployee(row);
        break;
      case "view_profile":
        onOpenEmployee(row, { section: "profile" });
        break;
      case "edit_assignment":
        onOpenEmployee(row, { section: "profile", editing: true });
        break;
      case "change_reporting_manager":
        setRmTarget(node);
        break;
      case "view_performance":
        onOpenEmployee(row, { section: "performance" });
        break;
      case "view_pipeline":
        onOpenEmployee(row, { section: "pipeline" });
        break;
      case "view_communication":
        onOpenEmployee(row, { section: "communication" });
        break;
      case "add_report": {
        const manager =
          findOperationalEcmContactById(node.contactId) ??
          ({ id: node.contactId, name: node.employeeName } as EcmContact);
        openAssign("create", manager);
        break;
      }
      default:
        break;
    }
  };

  const runSearch = (q: string) => {
    setAssignQuery(q);
    if (!q.trim()) {
      setAssignResults([]);
      return;
    }
    void (async () => {
      try {
        const rows = await liveSearchOperationalEcmContacts(q.trim(), {
          pageSize: 20,
          roles: ["lender_employee"],
        });
        setAssignResults(rows.slice(0, 10));
      } catch {
        setAssignResults([]);
      }
    })();
  };

  const submitPanel = async () => {
    setBusy(true);
    setError(null);
    try {
      if (panelMode === "create") {
        await createLenderEmployeeForInstitution({
          name,
          mobile,
          email,
          institutionId: lenderId,
          institutionLabel: lenderName,
          reportingManager: managerForNew,
          actorId,
        });
        toast.success("Lender employee created in Enterprise Contact Registry.");
      } else {
        if (!selectedAssign) throw new Error("Select an existing employee.");
        await assignExistingContactToInstitution({
          contactId: selectedAssign.id,
          institutionId: lenderId,
          institutionLabel: lenderName,
          reportingManager: managerForNew,
          actorId,
        });
        toast.success("Employee assigned to this lender.");
      }
      setPanelOpen(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save employee.");
    } finally {
      setBusy(false);
    }
  };

  const trees = useMemo(() => forest.trees, [forest]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Relationship Hierarchy</h3>
          <p className="text-xs text-muted-foreground">
            Projection of Enterprise Contact Registry (lender employees) · reporting via{" "}
            <code className="text-[10px]">reports_to</code>
            {forest.employeeCount > 0
              ? ` · ${forest.employeeCount} employee${forest.employeeCount === 1 ? "" : "s"}`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => openAssign("assign", null)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Assign Employee
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => openAssign("create", null)}
          >
            <Plus className="h-3.5 w-3.5" />
            Create Employee
          </Button>
        </div>
      </div>

      {empty ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center">
          <p className="text-sm font-medium">No lender employees linked to this institution yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Assign an existing Enterprise Contact or create a new lender employee. Hierarchy
            builds automatically from reporting relationships — no static vacant ranks.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => openAssign("assign", null)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Assign Existing Employee
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => openAssign("create", null)}
            >
              <Plus className="h-3.5 w-3.5" />
              Create Employee
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max flex-col gap-3 px-1 py-2">
            {renderTree(trees, onAction)}
          </div>
        </div>
      )}

      <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {panelMode === "create" ? "Create Lender Employee" : "Assign Existing Employee"}
            </DialogTitle>
            <DialogDescription>
              Saves to Enterprise Contact Registry for {lenderName}
              {managerForNew ? ` · reports to ${managerForNew.name}` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {panelMode === "create" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mobile</Label>
                  <Input value={mobile} onChange={(e) => setMobile(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email (optional)</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Search lender employees</Label>
                <Input
                  value={assignQuery}
                  onChange={(e) => runSearch(e.target.value)}
                  placeholder="Type name or mobile…"
                  className="h-9"
                />
                {assignResults.length > 0 ? (
                  <ul className="max-h-40 overflow-y-auto rounded-md border border-border/60">
                    {assignResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className={cn(
                            "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/40",
                            selectedAssign?.id === c.id && "bg-teal-500/10",
                          )}
                          onClick={() => setSelectedAssign(c)}
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {c.mobilePrimary || "—"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {selectedAssign ? (
                  <p className="text-[11px] text-muted-foreground">
                    Selected · {selectedAssign.name}
                  </p>
                ) : null}
              </div>
            )}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPanelOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={() => void submitPanel()}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rmTarget != null} onOpenChange={(o) => !o && setRmTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Reporting Manager</DialogTitle>
            <DialogDescription>
              {rmTarget ? `Update reports_to for ${rmTarget.employeeName}.` : null}
            </DialogDescription>
          </DialogHeader>
          {rmTarget ? (
            <ReportingManagerPicker
              valueContactId={rmTarget.reportingManagerContactId}
              valueName={
                rmTarget.reportingManagerName !== "Not Specified"
                  ? rmTarget.reportingManagerName
                  : undefined
              }
              excludeContactId={rmTarget.contactId}
              actorId={actorId}
              onChange={(contact) => {
                void (async () => {
                  try {
                    await setBankerReportingManager({
                      bankerContactId: rmTarget.contactId,
                      manager: contact,
                      actorId,
                    });
                    toast.success("Reporting manager updated.");
                    setRmTarget(null);
                    onChanged();
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : "Unable to update reporting manager.",
                    );
                  }
                })();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** @deprecated Use EldHierarchyChart — kept export alias during cutover */
export { EldHierarchyChart as ElwHierarchyChart };
