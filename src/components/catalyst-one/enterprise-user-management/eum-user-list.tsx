"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  KeyRound,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  EUM_BRANCHES,
  EUM_DEPARTMENTS,
  EUM_LOGIN_STATUS_LABELS,
  EUM_OPERATIONAL_ROLES,
  EUM_PLATFORM_ACCESS_LABELS,
  EUM_STATUS_LABELS,
} from "@/constants/enterprise-user-management";
import { ROUTES } from "@/constants/routes";
import {
  exportEnterpriseUsersCsv,
  filterEnterpriseUsers,
  grantPlatformAccessFromContact,
  listEnterpriseUsers,
  setEnterpriseUserRoles,
  setEnterpriseUserTemplates,
  sortEnterpriseUsers,
  type GrantablePlatformAccess,
} from "@/lib/enterprise-user-management";
import { activateEnterpriseUserWithLogin } from "@/lib/enterprise-user-management/provision-auth-user";
import { listOperationalEcmContacts } from "@/lib/enterprise-registry";
import { useEnterpriseRegistry } from "@/hooks/use-enterprise-registry";
import { listRpeRoles, listRpeTemplates } from "@/lib/roles-permissions-engine";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import type {
  EnterpriseUserListFilters,
  EnterpriseUserSortField,
  EnterpriseUserStatus,
} from "@/types/enterprise-user-management";

const PAGE_SIZE = 10;

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

function StatusBadge({ status }: { status: EnterpriseUserStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
        status === "active" && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
        status === "suspended" && "bg-rose-500/15 text-rose-800 dark:text-rose-200",
        status === "on_leave" && "bg-amber-500/15 text-amber-900 dark:text-amber-200",
        status === "resigned" && "bg-slate-500/15 text-slate-700 dark:text-slate-200",
        status === "archived" && "bg-muted text-muted-foreground",
      )}
    >
      {EUM_STATUS_LABELS[status]}
    </span>
  );
}

export function EnterpriseUserList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const actor = {
    id: user?.id ?? "ui",
    name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Platform Admin",
  };

  const [tick, setTick] = useState(0);
  const users = useMemo(() => {
    void tick;
    return listEnterpriseUsers();
  }, [tick]);
  const [filters, setFilters] = useState<EnterpriseUserListFilters>({
    query: "",
    branch: "all",
    department: "all",
    roleId: "all",
    status: "all",
    managerId: "all",
  });
  const [sortField, setSortField] = useState<EnterpriseUserSortField>("fullName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [grantOpen, setGrantOpen] = useState(false);
  const [preselectContactId, setPreselectContactId] = useState<string | null>(null);

  useEffect(() => {
    const grantContact = searchParams.get("grantContact");
    if (grantContact) {
      setPreselectContactId(grantContact);
      setGrantOpen(true);
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    const f = filterEnterpriseUsers(users, filters);
    return sortEnterpriseUsers(f, sortField, sortDir);
  }, [users, filters, sortField, sortDir]);

  const managers = useMemo(
    () => users.filter((u) => u.roles.some((r) => /manager|admin|management/i.test(r.roleLabel))),
    [users],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const toggleSort = (field: EnterpriseUserSortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const onExport = () => {
    const csv = exportEnterpriseUsersCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalyst-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("User export downloaded");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-8 text-sm"
            placeholder="Search users…"
            value={filters.query}
            onChange={(e) => {
              setPage(0);
              setFilters((f) => ({ ...f, query: e.target.value }));
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.branch}
            onValueChange={(v) => {
              setPage(0);
              setFilters((f) => ({ ...f, branch: v }));
            }}
          >
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {EUM_BRANCHES.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.department}
            onValueChange={(v) => {
              setPage(0);
              setFilters((f) => ({ ...f, department: v }));
            }}
          >
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {EUM_DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.roleId}
            onValueChange={(v) => {
              setPage(0);
              setFilters((f) => ({ ...f, roleId: v }));
            }}
          >
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {EUM_OPERATIONAL_ROLES.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(v) => {
              setPage(0);
              setFilters((f) => ({ ...f, status: v as EnterpriseUserStatus | "all" }));
            }}
          >
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(EUM_STATUS_LABELS) as EnterpriseUserStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {EUM_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.managerId}
            onValueChange={(v) => {
              setPage(0);
              setFilters((f) => ({ ...f, managerId: v }));
            }}
          >
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All managers</SelectItem>
              {managers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5 text-xs" onClick={onExport}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => {
              setPreselectContactId(null);
              setGrantOpen(true);
            }}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Grant Platform Access
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        User Accounts are created only from Contacts. Never create users directly.{" "}
        <Link href={ROUTES.CONTACTS} className="text-primary underline-offset-2 hover:underline">
          Open Contacts
        </Link>
      </p>

      <Card className="glass-card border-border/60 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortBtn label="Employee ID" onClick={() => toggleSort("employeeId")} />
                </TableHead>
                <TableHead>Photo</TableHead>
                <TableHead>
                  <SortBtn label="Full Name" onClick={() => toggleSort("fullName")} />
                </TableHead>
                <TableHead>
                  <SortBtn label="Designation" onClick={() => toggleSort("designation")} />
                </TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Reporting Manager</TableHead>
                <TableHead>
                  <SortBtn label="Status" onClick={() => toggleSort("status")} />
                </TableHead>
                <TableHead>
                  <SortBtn label="Last Login" onClick={() => toggleSort("lastLoginAt")} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                    No users match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((u) => (
                  <TableRow
                    key={u.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`${ROUTES.ADMIN_USERS}/${u.id}`)}
                  >
                    <TableCell className="font-mono text-xs">{u.employeeId}</TableCell>
                    <TableCell>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                        {u.avatarInitials}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.fullName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{u.designation}</TableCell>
                    <TableCell className="text-[11px]">
                      {EUM_PLATFORM_ACCESS_LABELS[u.platformAccess]}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {EUM_LOGIN_STATUS_LABELS[u.loginStatus]}
                    </TableCell>
                    <TableCell className="max-w-[140px]">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.slice(0, 2).map((r) => (
                          <span
                            key={r.roleId}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                          >
                            {r.roleLabel}
                          </span>
                        ))}
                        {u.roles.length > 2 ? (
                          <span className="text-[10px] text-muted-foreground">+{u.roles.length - 2}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.reportingManagerNames.join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">
                      {formatDate(u.lastLoginAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filtered.length} user{filtered.length === 1 ? "" : "s"} · page {page + 1} of {pageCount}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <GrantPlatformAccessDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        preselectContactId={preselectContactId}
        onGranted={(userId) => {
          setTick((t) => t + 1);
          setGrantOpen(false);
          router.push(`${ROUTES.ADMIN_USERS}/${userId}`);
        }}
        actor={actor}
      />
    </div>
  );
}

function SortBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1 text-left font-medium hover:text-foreground"
    >
      {label}
      <ArrowUpDown className="h-3 w-3 opacity-50" />
    </button>
  );
}

function GrantPlatformAccessDialog({
  open,
  onOpenChange,
  preselectContactId,
  onGranted,
  actor,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  preselectContactId: string | null;
  onGranted: (userId: string) => void;
  actor: { id: string; name: string };
}) {
  const { registryVersion } = useEnterpriseRegistry({
    hydrateOnMount: true,
    refreshOnOpen: true,
    open,
  });
  const contacts = useMemo(() => {
    void registryVersion;
    return listOperationalEcmContacts();
  }, [open, registryVersion]);
  const eligible = contacts.filter(
    (c) =>
      c.platformAccess === "no_access" ||
      !c.linkedUserId ||
      c.id === preselectContactId,
  );
  const rpeRoles = useMemo(() => listRpeRoles().filter((r) => r.status === "active"), [open]);
  const templates = useMemo(() => listRpeTemplates(), [open]);

  const [step, setStep] = useState(0);
  const [contactId, setContactId] = useState("");
  const [platformAccess, setPlatformAccess] =
    useState<GrantablePlatformAccess>("catalyst_one");
  const [userId, setUserId] = useState<string | null>(null);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [templateIds, setTemplateIds] = useState<string[]>([]);
  const [activateNow, setActivateNow] = useState(true);

  const steps = [
    "Contact",
    "Platform Access",
    "Roles",
    "Access Profile",
    "Activate",
  ];

  useEffect(() => {
    if (open) {
      setStep(0);
      setContactId(preselectContactId ?? eligible[0]?.id ?? "");
      setPlatformAccess("catalyst_one");
      setUserId(null);
      setRoleIds([]);
      setTemplateIds([]);
      setActivateNow(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectContactId]);

  const selected = contacts.find((c) => c.id === contactId);

  const createAccount = () => {
    const created = grantPlatformAccessFromContact({
      contactId,
      platformAccess,
      actor,
    });
    setUserId(created.id);
    return created;
  };

  const finish = async () => {
    if (!userId) throw new Error("User Account not created");
    if (roleIds.length) setEnterpriseUserRoles(userId, roleIds, actor);
    setEnterpriseUserTemplates(userId, templateIds, actor);
    if (activateNow) {
      const creds = await activateEnterpriseUserWithLogin(userId, actor);
      if (creds.temporaryPassword) {
        toast.success("User activated — temporary password generated", {
          description: `${creds.email} · ${creds.temporaryPassword} (share securely; first login requires change)`,
          duration: 20000,
        });
      } else {
        toast.success("User activated with Roles and Access Profile");
      }
    } else {
      toast.success("User Account created (Pending Invitation)");
    }
    onGranted(userId);
  };

  const next = () => {
    try {
      if (step === 0) {
        if (!contactId) {
          toast.error("Select a Contact");
          return;
        }
        setStep(1);
        return;
      }
      if (step === 1) {
        const created = createAccount();
        toast.success(`User Account created · ${created.employeeId}`);
        setStep(2);
        return;
      }
      if (step === 2) {
        setStep(3);
        return;
      }
      if (step === 3) {
        setStep(4);
        return;
      }
      void finish().catch((e) => {
        toast.error(e instanceof Error ? e.message : "Step failed");
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Step failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Grant Platform Access
          </DialogTitle>
          <DialogDescription>
            Never create users directly. Contact → Access → Account → Roles → Access Profile →
            Activate.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex flex-wrap gap-1.5 text-[10px]">
          {steps.map((label, i) => (
            <li
              key={label}
              className={cn(
                "rounded-full px-2 py-0.5 font-medium",
                i === step
                  ? "bg-teal-500/20 text-teal-900 dark:text-teal-100"
                  : i < step
                    ? "bg-muted text-foreground"
                    : "bg-muted/40 text-muted-foreground",
              )}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Select Existing Contact</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {(eligible.length ? eligible : contacts).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.officialEmail || c.personalEmail
                        ? ` · ${c.officialEmail || c.personalEmail}`
                        : " · (no email)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selected ? (
              <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                Mobile: {selected.mobilePrimary || "—"} · Current:{" "}
                {EUM_PLATFORM_ACCESS_LABELS[selected.platformAccess ?? "no_access"]}
              </p>
            ) : null}
            <Button asChild variant="link" className="h-auto p-0 text-xs">
              <Link href={ROUTES.CONTACTS}>Open Contacts to create a Contact first</Link>
            </Button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Select Platform Access</Label>
              <Select
                value={platformAccess}
                onValueChange={(v) => setPlatformAccess(v as GrantablePlatformAccess)}
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
            </div>
            <p className="text-[11px] text-muted-foreground">
              Continuing creates the linked User Account (Pending Invitation).
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <Label className="text-xs">Assign Roles (unlimited)</Label>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border/60 p-2">
              {rpeRoles.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/40"
                >
                  <Checkbox
                    checked={roleIds.includes(r.id)}
                    onCheckedChange={(c) =>
                      setRoleIds((prev) =>
                        c ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                      )
                    }
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <Label className="text-xs">Assign Access Profile</Label>
            <p className="text-[11px] text-muted-foreground">
              Optional. User Overrides can be set later under Advanced in the User Workspace.
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border/60 p-2">
              {templates.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">No profiles configured.</p>
              ) : (
                templates.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={templateIds.includes(t.id)}
                      onCheckedChange={(c) =>
                        setTemplateIds((prev) =>
                          c ? [...prev, t.id] : prev.filter((id) => id !== t.id),
                        )
                      }
                    />
                    {t.name}
                  </label>
                ))
              )}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={activateNow}
                onCheckedChange={(c) => setActivateNow(Boolean(c))}
              />
              Activate User now (otherwise remains Pending Invitation)
            </label>
            <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
              Contact → {EUM_PLATFORM_ACCESS_LABELS[platformAccess]} · Roles:{" "}
              {roleIds.length || "none"} · Access Profile: {templateIds.length || "none"}
            </p>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={step === 0 || (step === 2 && !userId)}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={next}>
              {step === 4 ? "Finish" : step === 1 ? "Create User Account" : "Continue"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EnterpriseUserListHint() {
  return (
    <p className="text-[11px] text-muted-foreground">
      Grant Platform Access from a Contact, then manage Roles and Access Profile. User
      Overrides stay Advanced.
    </p>
  );
}
