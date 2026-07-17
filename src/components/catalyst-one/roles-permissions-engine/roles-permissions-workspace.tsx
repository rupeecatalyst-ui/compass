"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  GitCompare,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  RPE_PERMISSION_MODULES,
  RPE_PLATFORM_ACCESS_LABELS,
  RPE_USER_TYPE_LABELS,
  clonePermissionMatrix,
  emptyPermissionMatrix,
  matrixTouchesSensitiveAdmin,
} from "@/constants/roles-permissions-engine";
import { ROLES } from "@/constants/roles";
import {
  cloneRpeRole,
  compareRpeRoles,
  createRpeRole,
  createRpeTemplate,
  deleteRpeRole,
  deleteRpeTemplate,
  getRpeRole,
  grantRpeDelegation,
  listRpeAudit,
  listRpeDelegations,
  listRpeRoles,
  listRpeTemplates,
  revokeRpeDelegation,
  setRpeRoleStatus,
  updateRpeRole,
  updateRpeTemplate,
} from "@/lib/roles-permissions-engine";
import { listEnterpriseUsers } from "@/lib/enterprise-user-management";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  RpePermissionMatrixRow,
  RpePlatformAccess,
  RpeRoleDefinition,
  RpeUserType,
} from "@/types/roles-permissions-engine";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RolesPermissionsWorkspace() {
  const { user } = useAuthContext();
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const actor = {
    id: user?.id ?? "ui",
    name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Platform Admin",
  };

  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  // tick forces re-read from localStorage after mutations
  const roles = useMemo(() => {
    void tick;
    return listRpeRoles();
  }, [tick]);
  const templates = useMemo(() => {
    void tick;
    return listRpeTemplates();
  }, [tick]);
  const delegations = useMemo(() => {
    void tick;
    return listRpeDelegations();
  }, [tick]);
  const audit = useMemo(() => {
    void tick;
    return listRpeAudit();
  }, [tick]);
  const users = useMemo(() => {
    void tick;
    return listEnterpriseUsers();
  }, [tick]);

  const [query, setQuery] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(roles[0]?.id ?? null);
  const selectedRole = selectedRoleId ? getRpeRole(selectedRoleId) : undefined;

  const filteredRoles = roles.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [r.name, r.code, r.description].join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList className="h-auto flex-wrap bg-muted/50 p-1">
          <TabsTrigger value="roles" className="text-xs">
            Roles
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">
            Permission Templates
          </TabsTrigger>
          <TabsTrigger value="compare" className="text-xs">
            Role Comparison
          </TabsTrigger>
          <TabsTrigger value="delegation" className="text-xs">
            Delegation
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">
            Audit Trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-8 text-sm"
                placeholder="Search roles…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <CreateRoleButton actor={actor} onCreated={(id) => { refresh(); setSelectedRoleId(id); }} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
            <Card className="glass-card border-border/60 overflow-hidden">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Role Registry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-2 pt-0 max-h-[70vh] overflow-y-auto">
                {filteredRoles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoleId(r.id)}
                    className={cn(
                      "flex w-full flex-col rounded-lg border px-3 py-2 text-left transition-colors",
                      selectedRoleId === r.id
                        ? "border-teal-500/40 bg-teal-500/10"
                        : "border-transparent hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{r.name}</span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                          r.status === "active"
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {r.status}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{r.code}</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {selectedRole ? (
              <RoleEditor
                key={selectedRole.id + tick}
                role={selectedRole}
                actor={actor}
                onChanged={refresh}
              />
            ) : (
              <Card className="glass-card border-border/60">
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  Select a role to edit its matrix, platform access, and lifecycle.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesPanel actor={actor} templates={templates} onChanged={refresh} />
        </TabsContent>

        <TabsContent value="compare">
          <ComparePanel roles={roles} />
        </TabsContent>

        <TabsContent value="delegation">
          <DelegationPanel
            actor={actor}
            isSuperAdmin={Boolean(isSuperAdmin)}
            users={users}
            delegations={delegations}
            onChanged={refresh}
          />
        </TabsContent>

        <TabsContent value="audit">
          <AuditPanel events={audit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateRoleButton({
  actor,
  onCreated,
}: {
  actor: { id: string; name: string };
  onCreated: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  return (
    <>
      <Button type="button" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Create Role
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Role</DialogTitle>
            <DialogDescription>
              Roles are independent of permissions and platform access. Configure the matrix after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Role Name</Label>
              <Input className="h-9" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Code</Label>
              <Input
                className="h-9 font-mono text-xs"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. BRANCH_OPS"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!name.trim() || !code.trim()}
              onClick={() => {
                try {
                  const role = createRpeRole({
                    name,
                    code,
                    description: "",
                    permissions: emptyPermissionMatrix(),
                    platformAccess: "catalyst_one",
                    defaultUserType: "normal_employee",
                    actor,
                  });
                  toast.success(`Role ${role.name} created`);
                  setOpen(false);
                  setName("");
                  setCode("");
                  onCreated(role.id);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Create failed");
                }
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RoleEditor({
  role,
  actor,
  onChanged,
}: {
  role: RpeRoleDefinition;
  actor: { id: string; name: string };
  onChanged: () => void;
}) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [platformAccess, setPlatformAccess] = useState<RpePlatformAccess>(role.platformAccess);
  const [userType, setUserType] = useState<RpeUserType>(role.defaultUserType);
  const [matrix, setMatrix] = useState(clonePermissionMatrix(role.permissions));
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setLevel = (
    moduleId: string,
    key: "view" | "createEdit" | "admin",
    value: boolean,
  ) => {
    setMatrix((prev) =>
      prev.map((row) => (row.moduleId === moduleId ? { ...row, [key]: value } : row)),
    );
  };

  const save = (sensitiveConfirmed: boolean) => {
    try {
      updateRpeRole(
        role.id,
        {
          name,
          description,
          platformAccess,
          defaultUserType: userType,
          permissions: matrix,
        },
        actor,
        { reason: reason || undefined, sensitiveConfirmed },
      );
      toast.success("Role saved");
      setConfirmOpen(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const attemptSave = () => {
    const sensitive = matrixTouchesSensitiveAdmin(matrix);
    if (sensitive.length) setConfirmOpen(true);
    else save(false);
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card border-border/60">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 py-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              {role.name}
              {role.isSuperAdminRole ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-800 dark:text-violet-200">
                  <Shield className="h-3 w-3" />
                  Super Admin
                </span>
              ) : null}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground font-mono">{role.code}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              onClick={() => {
                try {
                  const cloned = cloneRpeRole(role.id, actor);
                  toast.success(`Cloned as ${cloned.name}`);
                  onChanged();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Clone failed");
                }
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Clone
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                try {
                  setRpeRoleStatus(
                    role.id,
                    role.status === "active" ? "inactive" : "active",
                    actor,
                  );
                  toast.success(
                    role.status === "active" ? "Role deactivated" : "Role activated",
                  );
                  onChanged();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Status change failed");
                }
              }}
            >
              {role.status === "active" ? "Deactivate" : "Activate"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs text-rose-600"
              disabled={role.isSystem || role.isSuperAdminRole}
              onClick={() => {
                try {
                  deleteRpeRole(role.id, actor);
                  toast.success("Role deleted");
                  onChanged();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Delete failed");
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Name</Label>
            <Input className="h-9" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={cn(
                "min-h-[60px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm",
                "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Platform Access (independent)</Label>
            <Select
              value={platformAccess}
              onValueChange={(v) => setPlatformAccess(v as RpePlatformAccess)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RPE_PLATFORM_ACCESS_LABELS) as RpePlatformAccess[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {RPE_PLATFORM_ACCESS_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Default User Type (independent)</Label>
            <Select
              value={userType}
              onValueChange={(v) => setUserType(v as RpeUserType)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RPE_USER_TYPE_LABELS) as RpeUserType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {RPE_USER_TYPE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Change reason (optional)</Label>
            <Input
              className="h-9"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Audit reason"
            />
          </div>
        </CardContent>
      </Card>

      <PermissionMatrixTable
        matrix={matrix}
        onChange={setLevel}
        onBulk={(key, value) =>
          setMatrix((prev) => prev.map((row) => ({ ...row, [key]: value })))
        }
      />

      <Button type="button" size="sm" className="h-8 gap-1.5" onClick={attemptSave}>
        <Save className="h-3.5 w-3.5" />
        Save Role
      </Button>

      <SensitiveConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        modules={matrixTouchesSensitiveAdmin(matrix)}
        onConfirm={() => save(true)}
      />
    </div>
  );
}

function PermissionMatrixTable({
  matrix,
  onChange,
  onBulk,
}: {
  matrix: RpePermissionMatrixRow[];
  onChange: (moduleId: string, key: "view" | "createEdit" | "admin", value: boolean) => void;
  /** Bulk assign a permission level across all modules. */
  onBulk?: (key: "view" | "createEdit" | "admin", value: boolean) => void;
}) {
  return (
    <Card className="glass-card border-border/60 overflow-hidden">
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Permission Matrix</CardTitle>
        <p className="text-xs text-muted-foreground">
          View · Create/Edit · Admin per module. Configurable — never hardcoded at runtime.
        </p>
        {onBulk ? (
          <div className="flex flex-wrap gap-1.5 pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[10px]"
              onClick={() => onBulk("view", true)}
            >
              Grant View (all)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[10px]"
              onClick={() => onBulk("createEdit", true)}
            >
              Grant Create/Edit (all)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[10px]"
              onClick={() => {
                onBulk("view", false);
                onBulk("createEdit", false);
                onBulk("admin", false);
              }}
            >
              Clear all
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-left">
              <th className="px-3 py-2 font-medium">Module</th>
              <th className="px-3 py-2 font-medium">View</th>
              <th className="px-3 py-2 font-medium">Create / Edit</th>
              <th className="px-3 py-2 font-medium">Admin</th>
            </tr>
          </thead>
          <tbody>
            {RPE_PERMISSION_MODULES.map((mod) => {
              const row = matrix.find((m) => m.moduleId === mod.id) ?? {
                moduleId: mod.id,
                view: false,
                createEdit: false,
                admin: false,
              };
              return (
                <tr key={mod.id} className="border-b border-border/40">
                  <td className="px-3 py-2 font-medium">{mod.label}</td>
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={row.view}
                      onCheckedChange={(c) => onChange(mod.id, "view", Boolean(c))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={row.createEdit}
                      onCheckedChange={(c) => onChange(mod.id, "createEdit", Boolean(c))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={row.admin}
                      onCheckedChange={(c) => onChange(mod.id, "admin", Boolean(c))}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SensitiveConfirmDialog({
  open,
  onOpenChange,
  modules,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  modules: string[];
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sensitive Permission Warning</DialogTitle>
          <DialogDescription>
            You are granting Admin access to critical security modules. Confirm explicitly before
            saving.
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {modules.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onConfirm}>
            Confirm & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplatesPanel({
  actor,
  templates,
  onChanged,
}: {
  actor: { id: string; name: string };
  templates: ReturnType<typeof listRpeTemplates>;
  onChanged: () => void;
}) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? null);
  const selected = templates.find((t) => t.id === selectedId);
  const [matrix, setMatrix] = useState(
    selected ? clonePermissionMatrix(selected.permissions) : emptyPermissionMatrix(),
  );
  const [name, setName] = useState(selected?.name ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSelectedId(id);
    setName(t.name);
    setMatrix(clonePermissionMatrix(t.permissions));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => {
            try {
              const tpl = createRpeTemplate({
                name: "New Permission Template",
                description: "Custom reusable permission set",
                permissions: emptyPermissionMatrix(),
                platformAccess: "catalyst_one",
                defaultUserType: "normal_employee",
                actor,
              });
              toast.success("Template created");
              onChanged();
              load(tpl.id);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Create Template
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="glass-card border-border/60">
          <CardContent className="space-y-1 p-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => load(t.id)}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left text-xs font-medium",
                  selectedId === t.id ? "bg-teal-500/15" : "hover:bg-muted/50",
                )}
              >
                {t.name}
              </button>
            ))}
          </CardContent>
        </Card>
        {selected ? (
          <div className="space-y-3">
            <Input className="h-9" value={name} onChange={(e) => setName(e.target.value)} />
            <PermissionMatrixTable
              matrix={matrix}
              onChange={(moduleId, key, value) =>
                setMatrix((prev) =>
                  prev.map((row) =>
                    row.moduleId === moduleId ? { ...row, [key]: value } : row,
                  ),
                )
              }
              onBulk={(key, value) =>
                setMatrix((prev) => prev.map((row) => ({ ...row, [key]: value })))
              }
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1"
                onClick={() => {
                  const sensitive = matrixTouchesSensitiveAdmin(matrix);
                  if (sensitive.length) setConfirmOpen(true);
                  else {
                    updateRpeTemplate(selected.id, { name, permissions: matrix }, actor);
                    toast.success("Template saved");
                    onChanged();
                  }
                }}
              >
                <Save className="h-3.5 w-3.5" />
                Save Template
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-rose-600"
                onClick={() => {
                  deleteRpeTemplate(selected.id, actor);
                  toast.success("Template deleted");
                  onChanged();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
            <SensitiveConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              modules={matrixTouchesSensitiveAdmin(matrix)}
              onConfirm={() => {
                updateRpeTemplate(selected.id, { name, permissions: matrix }, actor, true);
                toast.success("Template saved");
                setConfirmOpen(false);
                onChanged();
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ComparePanel({ roles }: { roles: RpeRoleDefinition[] }) {
  const [aId, setAId] = useState(roles[0]?.id ?? "");
  const [bId, setBId] = useState(roles[1]?.id ?? roles[0]?.id ?? "");
  const rows = useMemo(() => {
    if (!aId || !bId || aId === bId) return [];
    try {
      return compareRpeRoles(aId, bId);
    } catch {
      return [];
    }
  }, [aId, bId]);

  const a = roles.find((r) => r.id === aId);
  const b = roles.find((r) => r.id === bId);

  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <GitCompare className="h-4 w-4" />
          Role Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select value={aId} onValueChange={setAId}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue placeholder="Role A" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bId} onValueChange={setBId}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue placeholder="Role B" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>{a?.name ?? "A"} View/Edit/Admin</TableHead>
                <TableHead>{b?.name ?? "B"} View/Edit/Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const label =
                  RPE_PERMISSION_MODULES.find((m) => m.id === row.moduleId)?.label ??
                  row.moduleId;
                const diff =
                  row.a.view !== row.b.view ||
                  row.a.createEdit !== row.b.createEdit ||
                  row.a.admin !== row.b.admin;
                return (
                  <TableRow key={row.moduleId} className={diff ? "bg-amber-500/5" : undefined}>
                    <TableCell className="text-xs font-medium">{label}</TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {flag(row.a.view)}/{flag(row.a.createEdit)}/{flag(row.a.admin)}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {flag(row.b.view)}/{flag(row.b.createEdit)}/{flag(row.b.admin)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function flag(v: boolean) {
  return v ? "Y" : "—";
}

function DelegationPanel({
  actor,
  isSuperAdmin,
  users,
  delegations,
  onChanged,
}: {
  actor: { id: string; name: string };
  isSuperAdmin: boolean;
  users: ReturnType<typeof listEnterpriseUsers>;
  delegations: ReturnType<typeof listRpeDelegations>;
  onChanged: () => void;
}) {
  const [delegateId, setDelegateId] = useState("");
  const superAdmin =
    users.find((u) => u.isSystemProtected) ??
    users.find((u) => u.roles.some((r) => r.roleId === "super_admin"));

  const level1 = users.filter(
    (u) =>
      superAdmin &&
      u.id !== superAdmin.id &&
      u.reportingManagerIds.includes(superAdmin.id) &&
      u.status === "active",
  );

  return (
    <div className="space-y-4">
      <Card className="glass-card border-border/60">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Role Administration Delegation</CardTitle>
          <p className="text-xs text-muted-foreground">
            Super Administrator may delegate Role Administration only to a Level-1 direct report.
            Delegation is not recursive. Only Super Administrator can revoke.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Level-1 employee</Label>
            <Select value={delegateId} onValueChange={setDelegateId}>
              <SelectTrigger className="h-9 w-[240px]">
                <SelectValue placeholder="Select delegate" />
              </SelectTrigger>
              <SelectContent>
                {level1.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1"
            disabled={!isSuperAdmin || !delegateId || !superAdmin}
            onClick={() => {
              try {
                grantRpeDelegation({
                  delegateUserId: delegateId,
                  superAdminUserId: superAdmin!.id,
                  actor,
                });
                toast.success("Role Administration delegated");
                onChanged();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Delegation failed");
              }
            }}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Grant Delegation
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delegate</TableHead>
                <TableHead>Granted By</TableHead>
                <TableHead>Granted At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delegations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No delegations yet.
                  </TableCell>
                </TableRow>
              ) : (
                delegations.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm font-medium">{d.delegateUserName}</TableCell>
                    <TableCell className="text-xs">{d.delegatedByUserName}</TableCell>
                    <TableCell className="text-xs">{formatDate(d.grantedAt)}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          d.active
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {d.active ? "Active" : "Revoked"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {d.active ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={!isSuperAdmin}
                          onClick={() => {
                            try {
                              revokeRpeDelegation(d.id, actor, isSuperAdmin);
                              toast.success("Delegation revoked");
                              onChanged();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Revoke failed");
                            }
                          }}
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditPanel({ events }: { events: ReturnType<typeof listRpeAudit> }) {
  return (
    <Card className="glass-card border-border/60 overflow-hidden">
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Security Audit Trail</CardTitle>
        <p className="text-xs text-muted-foreground">
          Permanent, non-editable history of every Roles & Permissions change.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Previous</TableHead>
              <TableHead>New</TableHead>
              <TableHead>Changed By</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No security events recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-[11px]">
                    {formatDate(e.at)}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {e.action.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-xs">{e.entityLabel}</TableCell>
                  <TableCell className="max-w-[120px] truncate text-[11px] text-muted-foreground">
                    {e.previousValue ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate text-[11px]">
                    {e.newValue ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">{e.changedByUserName}</TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {e.reason ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
