"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  KeyRound,
  Save,
  Shield,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import {
  EUM_BRANCHES,
  EUM_BUSINESS_UNITS,
  EUM_DEPARTMENTS,
  EUM_LANDING_PAGES,
  EUM_LOGIN_STATUS_LABELS,
  EUM_PERMISSION_MODULES,
  EUM_PLATFORM_ACCESS_LABELS,
  EUM_STATUS_LABELS,
  EUM_TEAMS,
} from "@/constants/enterprise-user-management";
import { ROUTES } from "@/constants/routes";
import {
  allocateEnterpriseLicense,
  buildEffectiveAccessPreview,
  explainPermission,
  getEnterpriseUser,
  listEnterpriseUsers,
  removeEnterpriseLicense,
  setEnterpriseUserPermissions,
  setEnterpriseUserPreferences,
  setEnterpriseUserRoles,
  setEnterpriseUserStatus,
  setEnterpriseUserTemplates,
  setUserLoginStatus,
  syncUserPlatformAccess,
  updateEnterpriseUser,
  type PermissionLevelKey,
} from "@/lib/enterprise-user-management";
import { activateEnterpriseUserWithLogin } from "@/lib/enterprise-user-management/provision-auth-user";
import { listRpeRoles, listRpeTemplates } from "@/lib/roles-permissions-engine";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  EnterpriseLoginStatus,
  EnterpriseManagedUser,
  EnterpriseModulePermission,
  EnterprisePlatformAccess,
  EnterpriseUserPreferences,
  EnterpriseUserStatus,
} from "@/types/enterprise-user-management";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Access Profile = Permission Template (UI label). */
function accessProfileLabel(id: string): string {
  return listRpeTemplates().find((t) => t.id === id)?.name ?? id;
}

export function EnterpriseUserWorkspace({ userId }: { userId: string }) {
  const router = useRouter();
  const { user: sessionUser } = useAuthContext();
  const actor = {
    id: sessionUser?.id ?? "ui",
    name:
      [sessionUser?.firstName, sessionUser?.lastName].filter(Boolean).join(" ") ||
      "Platform Admin",
  };

  const [tick, setTick] = useState(0);
  const record = useMemo(() => {
    void tick;
    return getEnterpriseUser(userId);
  }, [userId, tick]);
  const allUsers = useMemo(() => {
    void tick;
    return listEnterpriseUsers();
  }, [tick]);

  if (!record) {
    return (
      <Card className="glass-card border-border/60">
        <CardContent className="space-y-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">User not found.</p>
          <Button asChild size="sm" variant="outline">
            <Link href={ROUTES.ADMIN_USERS}>Back to Users</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const refresh = () => setTick((t) => t + 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 px-2"
            onClick={() => router.push(ROUTES.ADMIN_USERS)}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Users
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
            {record.avatarInitials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{record.fullName}</h2>
              {record.isSystemProtected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-800 dark:text-violet-200">
                  <Shield className="h-3 w-3" />
                  Protected
                </span>
              ) : null}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  record.loginStatus === "active"
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {EUM_LOGIN_STATUS_LABELS[record.loginStatus]}
              </span>
              <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-900 dark:text-teal-100">
                {EUM_PLATFORM_ACCESS_LABELS[record.platformAccess]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {record.employeeId} · Directory Contact {record.contactId} · {record.email}
            </p>
          </div>
        </div>
        <LifecycleActions user={record} actor={actor} onChanged={refresh} />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Work primarily with <strong className="text-foreground">Roles</strong> and{" "}
        <strong className="text-foreground">Access Profile</strong>. Overrides are Advanced only.
      </p>

      <Tabs defaultValue="identity" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/50 p-1">
          <TabsTrigger value="identity" className="text-xs">
            Identity
          </TabsTrigger>
          <TabsTrigger value="platform" className="text-xs">
            Platform Access
          </TabsTrigger>
          <TabsTrigger value="roles" className="text-xs">
            Roles
          </TabsTrigger>
          <TabsTrigger value="access-profile" className="text-xs">
            Access Profile
          </TabsTrigger>
          <TabsTrigger value="overrides" className="text-xs">
            User Overrides
          </TabsTrigger>
          <TabsTrigger value="effective" className="text-xs">
            Effective Access
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">
            Activity & Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <IdentityTab user={record} allUsers={allUsers} actor={actor} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="platform">
          <PlatformAccessTab user={record} actor={actor} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="roles">
          <RolesOnlyTab user={record} actor={actor} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="access-profile">
          <AccessProfileTab user={record} actor={actor} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="overrides">
          <UserOverridesAdvancedTab user={record} actor={actor} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="effective">
          <EffectiveAccessTab user={record} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityAuditTab user={record} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LifecycleActions({
  user,
  actor,
  onChanged,
}: {
  user: EnterpriseManagedUser;
  actor: { id: string; name: string };
  onChanged: () => void;
}) {
  const applyStatus = (status: EnterpriseUserStatus) => {
    try {
      const { transfer } = setEnterpriseUserStatus(user.id, status, actor);
      if (transfer) {
        toast.success(`Status → ${EUM_STATUS_LABELS[status]}`, {
          description: `Work transferred to ${transfer.transferredToManagerName}.`,
        });
      } else {
        toast.success(`Status → ${EUM_STATUS_LABELS[status]}`);
      }
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to update status");
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {user.loginStatus === "pending_invitation" ? (
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => {
            void activateEnterpriseUserWithLogin(user.id, actor)
              .then((creds) => {
                if (creds.temporaryPassword) {
                  toast.success("User activated — temporary password generated", {
                    description: `${creds.email} · ${creds.temporaryPassword} (share securely; first login requires change)`,
                    duration: 20000,
                  });
                } else {
                  toast.success("User activated");
                }
                onChanged();
              })
              .catch((e) => {
                toast.error(e instanceof Error ? e.message : "Activation failed");
              });
          }}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          Activate User
        </Button>
      ) : null}
      {!user.license.allocated ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          onClick={() => {
            try {
              allocateEnterpriseLicense(user.id, "Producer", actor);
              toast.success("License allocated");
              onChanged();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "License error");
            }
          }}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          Allocate License
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          disabled={user.isSystemProtected}
          onClick={() => {
            try {
              removeEnterpriseLicense(user.id, actor);
              toast.success("License removed");
              onChanged();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "License error");
            }
          }}
        >
          <KeyRound className="h-3.5 w-3.5" />
          Remove License
        </Button>
      )}
      <Select value={user.status} onValueChange={(v) => applyStatus(v as EnterpriseUserStatus)}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(EUM_STATUS_LABELS) as EnterpriseUserStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {EUM_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function IdentityTab({
  user,
  allUsers,
  actor,
  onSaved,
}: {
  user: EnterpriseManagedUser;
  allUsers: EnterpriseManagedUser[];
  actor: { id: string; name: string };
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [mobile, setMobile] = useState(user.mobile);
  const [designation, setDesignation] = useState(user.designation);
  const [department, setDepartment] = useState(user.department);
  const [branch, setBranch] = useState(user.branch);
  const [dateJoined, setDateJoined] = useState(user.dateJoined);
  const [branches, setBranches] = useState(user.branches);
  const [departments, setDepartments] = useState(user.departments);
  const [teams, setTeams] = useState(user.teams);
  const [businessUnits, setBusinessUnits] = useState(user.businessUnits);
  const [managerIds, setManagerIds] = useState(user.reportingManagerIds);
  const [prefs, setPrefs] = useState<EnterpriseUserPreferences>(user.preferences);

  const toggle = (list: string[], value: string, set: (v: string[]) => void) => {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Identity</CardTitle>
          <p className="text-xs text-muted-foreground">
            Linked to Directory Contact <span className="font-mono">{user.contactId}</span>. Identity
            remains in Directory; this is the operational profile.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Employee ID (Auto)">
            <Input className="h-9 font-mono text-xs" value={user.employeeId} disabled />
          </Field>
          <Field label="First Name">
            <Input className="h-9" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Last Name">
            <Input className="h-9" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input
              className="h-9"
              value={email}
              disabled={user.isSystemProtected}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Mobile">
            <Input className="h-9" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </Field>
          <Field label="Designation">
            <Input
              className="h-9"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </Field>
          <Field label="Primary Department">
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EUM_DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Primary Branch">
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EUM_BRANCHES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date Joined">
            <Input
              className="h-9"
              type="date"
              value={dateJoined}
              onChange={(e) => setDateJoined(e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MultiCheck
            title="Branches"
            options={[...EUM_BRANCHES]}
            selected={branches}
            onToggle={(v) => toggle(branches, v, setBranches)}
          />
          <MultiCheck
            title="Departments"
            options={[...EUM_DEPARTMENTS]}
            selected={departments}
            onToggle={(v) => toggle(departments, v, setDepartments)}
          />
          <MultiCheck
            title="Teams"
            options={[...EUM_TEAMS]}
            selected={teams}
            onToggle={(v) => toggle(teams, v, setTeams)}
          />
          <MultiCheck
            title="Business Units"
            options={[...EUM_BUSINESS_UNITS]}
            selected={businessUnits}
            onToggle={(v) => toggle(businessUnits, v, setBusinessUnits)}
          />
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Reporting Managers
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {allUsers
                .filter((u) => u.id !== user.id)
                .map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-xs"
                  >
                    <Checkbox
                      checked={managerIds.includes(u.id)}
                      onCheckedChange={() => toggle(managerIds, u.id, setManagerIds)}
                    />
                    {u.fullName}
                  </label>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Default Landing Page">
            <Select
              value={prefs.defaultLandingPage}
              onValueChange={(v) => setPrefs((p) => ({ ...p, defaultLandingPage: v }))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EUM_LANDING_PAGES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Theme">
            <Select
              value={prefs.theme}
              onValueChange={(v) =>
                setPrefs((p) => ({ ...p, theme: v as EnterpriseUserPreferences["theme"] }))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Button
        type="button"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => {
          try {
            const names = managerIds
              .map((id) => allUsers.find((u) => u.id === id)?.fullName)
              .filter(Boolean) as string[];
            updateEnterpriseUser(
              user.id,
              {
                firstName,
                lastName,
                email,
                mobile,
                designation,
                department,
                branch,
                dateJoined,
                branches,
                departments,
                teams,
                businessUnits,
                reportingManagerIds: managerIds,
                reportingManagerNames: names,
              },
              actor,
            );
            setEnterpriseUserPreferences(user.id, prefs, actor);
            toast.success("Identity saved");
            onSaved();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Save failed");
          }
        }}
      >
        <Save className="h-3.5 w-3.5" />
        Save Identity
      </Button>
    </div>
  );
}

function PlatformAccessTab({
  user,
  actor,
  onSaved,
}: {
  user: EnterpriseManagedUser;
  actor: { id: string; name: string };
  onSaved: () => void;
}) {
  const [platformAccess, setPlatformAccess] = useState<EnterprisePlatformAccess>(
    user.platformAccess,
  );
  const [loginStatus, setLoginStatus] = useState<EnterpriseLoginStatus>(user.loginStatus);

  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Platform Access</CardTitle>
        <p className="text-xs text-muted-foreground">
          Independent of roles and permissions. Synced to the Directory Contact. Removing access
          disables login — the Contact is never deleted.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Field label="Platform Access">
          <Select
            value={platformAccess}
            onValueChange={(v) => setPlatformAccess(v as EnterprisePlatformAccess)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="catalyst_one">Catalyst One</SelectItem>
              <SelectItem value="compass">COMPASS</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Login Status">
          <Select
            value={loginStatus}
            onValueChange={(v) => setLoginStatus(v as EnterpriseLoginStatus)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(EUM_LOGIN_STATUS_LABELS) as EnterpriseLoginStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {EUM_LOGIN_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              try {
                syncUserPlatformAccess(user.id, platformAccess, actor);
                setUserLoginStatus(user.id, loginStatus, actor);
                toast.success("Platform Access saved");
                onSaved();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Save failed");
              }
            }}
          >
            <Save className="h-3.5 w-3.5" />
            Save Platform Access
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RolesOnlyTab({
  user,
  actor,
  onSaved,
}: {
  user: EnterpriseManagedUser;
  actor: { id: string; name: string };
  onSaved: () => void;
}) {
  const rpeRoles = listRpeRoles().filter((r) => r.status === "active");
  const [roleIds, setRoleIds] = useState(user.roles.map((r) => r.roleId));

  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Roles</CardTitle>
        <p className="text-xs text-muted-foreground">
          Unlimited roles define business responsibility. Final security is computed in Effective
          Access.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rpeRoles.map((r) => (
            <label
              key={r.id}
              className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-2 text-xs"
            >
              <Checkbox
                checked={roleIds.includes(r.id)}
                onCheckedChange={(checked) => {
                  setRoleIds((prev) =>
                    checked ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                  );
                }}
              />
              <span>
                <span className="font-medium">{r.name}</span>
                {r.description ? (
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {r.description}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => {
            try {
              setEnterpriseUserRoles(user.id, roleIds, actor);
              toast.success("Roles updated");
              onSaved();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Update failed");
            }
          }}
        >
          <Save className="h-3.5 w-3.5" />
          Save Roles
        </Button>
      </CardContent>
    </Card>
  );
}

function AccessProfileTab({
  user,
  actor,
  onSaved,
}: {
  user: EnterpriseManagedUser;
  actor: { id: string; name: string };
  onSaved: () => void;
}) {
  const templates = listRpeTemplates();
  const [templateIds, setTemplateIds] = useState(user.permissionTemplateIds);

  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Access Profile</CardTitle>
        <p className="text-xs text-muted-foreground">
          Reusable permission templates applied after roles and before any user overrides. Most
          administrators only need Roles + Access Profile.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No Access Profiles yet. Create them under Administration → Roles & Permissions.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-2 text-xs"
              >
                <Checkbox
                  checked={templateIds.includes(t.id)}
                  onCheckedChange={(checked) => {
                    setTemplateIds((prev) =>
                      checked ? [...prev, t.id] : prev.filter((id) => id !== t.id),
                    );
                  }}
                />
                <span>
                  <span className="font-medium">{t.name}</span>
                  {t.description ? (
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {t.description}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        )}
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => {
            setEnterpriseUserTemplates(user.id, templateIds, actor);
            toast.success("Access Profile updated");
            onSaved();
          }}
        >
          <Save className="h-3.5 w-3.5" />
          Save Access Profile
        </Button>
      </CardContent>
    </Card>
  );
}

function UserOverridesAdvancedTab({
  user,
  actor,
  onSaved,
}: {
  user: EnterpriseManagedUser;
  actor: { id: string; name: string };
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(user.permissionOverrides.length > 0);
  const [matrix, setMatrix] = useState<EnterpriseModulePermission[]>(
    () => buildEffectiveAccessPreview(user).effectivePermissions,
  );

  const setLevel = (
    moduleId: string,
    key: "view" | "createEdit" | "admin",
    value: boolean,
  ) => {
    setMatrix((prev) =>
      prev.map((row) => (row.moduleId === moduleId ? { ...row, [key]: value } : row)),
    );
  };

  return (
    <Card className="glass-card border-border/60 overflow-hidden">
      <CardHeader className="pb-2">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-2 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              {open ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Advanced · User Overrides
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Rarely needed. Override individual permissions without changing Roles or Access
              Profile. Most users should never require overrides.
            </p>
          </div>
          {user.permissionOverrides.length > 0 ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:text-amber-200">
              {user.permissionOverrides.length} active
            </span>
          ) : null}
        </button>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-3 p-0 pt-0">
          <div className="overflow-x-auto border-t border-border/50">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-left">
                  <th className="px-3 py-2 font-medium">Module</th>
                  <th className="px-3 py-2 font-medium">View</th>
                  <th className="px-3 py-2 font-medium">Create/Edit</th>
                  <th className="px-3 py-2 font-medium">Admin</th>
                </tr>
              </thead>
              <tbody>
                {EUM_PERMISSION_MODULES.map((mod) => {
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
                          onCheckedChange={(c) => setLevel(mod.id, "view", Boolean(c))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={row.createEdit}
                          onCheckedChange={(c) => setLevel(mod.id, "createEdit", Boolean(c))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={row.admin}
                          onCheckedChange={(c) => setLevel(mod.id, "admin", Boolean(c))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3">
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => {
                setEnterpriseUserPermissions(user.id, matrix, actor);
                toast.success("User overrides saved");
                onSaved();
              }}
            >
              <Save className="h-3.5 w-3.5" />
              Save Overrides
            </Button>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

function EffectiveAccessTab({ user }: { user: EnterpriseManagedUser }) {
  const preview = buildEffectiveAccessPreview(user);
  const [why, setWhy] = useState<{
    moduleId: string;
    level: PermissionLevelKey;
  } | null>(null);

  const whyDetail = why ? explainPermission(user, why.moduleId, why.level) : null;
  const profiles = preview.permissionTemplateIds.map(accessProfileLabel);

  return (
    <div className="space-y-4">
      <Card className="glass-card border-teal-500/20 border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BadgeCheck className="h-4 w-4 text-teal-700 dark:text-teal-300" />
            Effective Access
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Read-only. This is the final computed access enforced by the application.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryTile
            label="Platform Access"
            value={EUM_PLATFORM_ACCESS_LABELS[preview.platformAccess]}
          />
          <SummaryTile
            label="Login Status"
            value={EUM_LOGIN_STATUS_LABELS[preview.loginStatus]}
          />
          <SummaryTile
            label="Assigned Roles"
            value={
              preview.assignedRoles.length
                ? preview.assignedRoles.map((r) => r.roleLabel).join(", ")
                : "None"
            }
          />
          <SummaryTile
            label="Access Profile"
            value={profiles.length ? profiles.join(", ") : "None"}
          />
          <SummaryTile
            label="Overrides"
            value={
              preview.overrideModuleIds.length
                ? `${preview.overrideModuleIds.length} module(s)`
                : "None"
            }
          />
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Effective Permissions</CardTitle>
          <p className="text-xs text-muted-foreground">
            Use Why? on any level to see Role, Access Profile, Override, and last change provenance.
          </p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-left">
                <th className="px-3 py-2 font-medium">Module</th>
                <th className="px-3 py-2 font-medium">View</th>
                <th className="px-3 py-2 font-medium">Create/Edit</th>
                <th className="px-3 py-2 font-medium">Admin</th>
              </tr>
            </thead>
            <tbody>
              {preview.effectivePermissions.map((p) => {
                const label =
                  EUM_PERMISSION_MODULES.find((m) => m.id === p.moduleId)?.label ?? p.moduleId;
                return (
                  <tr key={p.moduleId} className="border-b border-border/40">
                    <td className="px-3 py-2 font-medium">{label}</td>
                    {(["view", "createEdit", "admin"] as PermissionLevelKey[]).map((level) => (
                      <td key={level} className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "font-mono",
                              p[level] ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
                            )}
                          >
                            {p[level] ? "Y" : "—"}
                          </span>
                          <button
                            type="button"
                            className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => setWhy({ moduleId: p.moduleId, level })}
                            title="Why?"
                          >
                            <CircleHelp className="h-3 w-3" />
                            Why?
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(why)} onOpenChange={(o) => !o && setWhy(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Why this permission?</DialogTitle>
            <DialogDescription>
              {why
                ? `${EUM_PERMISSION_MODULES.find((m) => m.id === why.moduleId)?.label ?? why.moduleId} · ${
                    why.level === "createEdit"
                      ? "Create/Edit"
                      : why.level === "admin"
                        ? "Admin"
                        : "View"
                  }`
                : null}
            </DialogDescription>
          </DialogHeader>
          {whyDetail ? (
            <ul className="space-y-2 text-sm">
              {whyDetail.summaryLines.map((line) => (
                <li
                  key={line}
                  className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs"
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => setWhy(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-snug">{value}</p>
    </div>
  );
}

function ActivityAuditTab({ user }: { user: EnterpriseManagedUser }) {
  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Activity & Audit</CardTitle>
        <p className="text-xs text-muted-foreground">
          Permanent security and lifecycle history — never editable or deletable.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {user.audit.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">No audit events yet.</li>
          ) : (
            user.audit.map((e) => (
              <li
                key={e.id}
                className="flex gap-3 rounded-md border border-border/50 px-3 py-2 text-xs"
              >
                <UserMinus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{e.summary}</p>
                  <p className="text-muted-foreground">
                    {e.action.replace(/_/g, " ")} · {e.actorName} · {formatDate(e.at)}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
        <div className="mt-4 grid gap-2 rounded-md border border-border/50 bg-muted/20 p-3 text-[11px] text-muted-foreground sm:grid-cols-3">
          <div>
            <span className="font-semibold text-foreground">Presence:</span>{" "}
            {user.productivity.presenceStatus}
          </div>
          <div>
            <span className="font-semibold text-foreground">Last login:</span>{" "}
            {formatDate(user.lastLoginAt)}
          </div>
          <div>
            <span className="font-semibold text-foreground">Last active:</span>{" "}
            {formatDate(user.lastActiveAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MultiCheck({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((o) => (
          <label
            key={o}
            className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-xs"
          >
            <Checkbox checked={selected.includes(o)} onCheckedChange={() => onToggle(o)} />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
