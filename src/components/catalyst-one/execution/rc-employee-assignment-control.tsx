"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthContext } from "@/components/providers/auth-provider";
import { canManageRegistryAssignments, searchAssignableUsers } from "@/lib/assigned-users";
import { getEnterpriseUser } from "@/lib/enterprise-user-management";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { formatRcEmployeeDesignation } from "@/lib/enterprise-deal/rc-employee-assignment";
import type { AssignableUserOption } from "@/types/assigned-users";
import { toast } from "sonner";

export function RcEmployeeAssignmentControl({
  dealId,
  rowVersion,
  selectedUserId,
  selectedName,
  source,
  onAssigned,
}: {
  dealId: string;
  rowVersion: number;
  selectedUserId?: string | null;
  selectedName?: string | null;
  source?: "inherited" | "override" | string | null;
  onAssigned: (next: {
    userId: string | null;
    name: string | null;
    source: "inherited" | "override";
    rowVersion: number;
  }) => void;
}) {
  const { user } = useAuthContext();
  const assignmentPermissions = user?.eumUserId
    ? getEnterpriseUser(user.eumUserId)?.permissions
    : undefined;
  const canEdit = canManageRegistryAssignments(user?.role, assignmentPermissions);
  const [options, setOptions] = useState<AssignableUserOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void searchAssignableUsers("", { authorised: true })
      .then((rows) => {
        if (!cancelled) setOptions(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load employees");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = selectedUserId?.trim() || "__none__";
  const sourceLabel = source === "override" ? "Deal override" : "Inherited from Opportunity";

  const optionLabel = (row: AssignableUserOption) => {
    const designation = formatRcEmployeeDesignation({
      role: row.role,
      department: row.department,
    });
    return designation ? `${row.fullName} · ${designation}` : row.fullName;
  };

  const currentLabel = useMemo(() => {
    const match = options.find((row) => row.id === selectedUserId);
    if (match) return optionLabel(match);
    return selectedName?.trim() || "Unassigned";
  }, [options, selectedName, selectedUserId]);

  async function persist(mode: "override" | "restore_inheritance", userId?: string | null) {
    if (!canEdit || busy) return;
    setBusy(true);
    try {
      const updated = await enterpriseDealApiClient.updateDeal(dealId, {
        rowVersion,
        rcEmployeeAssignment: { mode, userId: userId ?? null },
      });
      onAssigned({
        userId: updated.relationshipManagerUserId ?? null,
        name: updated.relationshipManagerName ?? null,
        source: (updated.rcEmployeeAssignmentSource ??
          updated.assignmentMode ??
          (mode === "override" ? "override" : "inherited")) as "inherited" | "override",
        rowVersion: updated.rowVersion,
      });
      toast.success("Rupee Catalyst Employee updated.");
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 403) {
        toast.error("You are not authorised to change this assignment.");
      } else {
        toast.error(err instanceof Error ? err.message : "Assignment update failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[10px] uppercase text-muted-foreground">
          Rupee Catalyst Employee
        </Label>
        <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-medium">
          {sourceLabel}
        </Badge>
      </div>
      <Select
        value={selected}
        disabled={!canEdit || busy}
        onValueChange={(value) => {
          if (value === "__none__" || value === selectedUserId) return;
          void persist("override", value);
        }}
      >
        <SelectTrigger className="h-8 text-xs" aria-label="Rupee Catalyst Employee">
          <SelectValue placeholder="Select employee">{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__" className="text-xs" disabled>
            {selectedName?.trim() ? currentLabel : "Unassigned"}
          </SelectItem>
          {options.map((row) => (
            <SelectItem key={row.id} value={row.id} className="text-xs">
              {optionLabel(row)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loadError ? (
        <p className="text-[10px] text-destructive">{loadError}</p>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          Active authorised RC employees only. A Deal override does not change the Opportunity.
        </p>
      )}
      {source === "override" && canEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px]"
          disabled={busy}
          onClick={() => void persist("restore_inheritance")}
        >
          Restore Opportunity inheritance
        </Button>
      ) : null}
    </div>
  );
}
