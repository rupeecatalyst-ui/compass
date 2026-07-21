"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, Search } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthContext } from "@/components/providers/auth-provider";
import { getAccessToken } from "@/lib/api-client";
import { ROLES, type Role } from "@/constants/roles";
import { cn } from "@/lib/utils";

type UserAdminRecord = {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  mobile: string | null;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  reportingManagerId: string | null;
  reportingManagerName: string | null;
  createdAt: string;
  updatedAt: string;
};

async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body?.error?.message || `Request failed (${res.status})`);
  }
  return body.data as T;
}

const ROLE_OPTIONS = Object.values(ROLES) as Role[];

export function PrismaUserAdminWorkspace() {
  const { user: actor } = useAuthContext();
  const [users, setUsers] = useState<UserAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserAdminRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [tempPasswordNotice, setTempPasswordNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    employeeId: "",
    mobile: "",
    role: "VIEWER" as Role,
    reportingManagerId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const data = await adminFetch<{ users: UserAdminRecord[] }>(
        `/api/admin/users?${params.toString()}`,
      );
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const managerOptions = useMemo(
    () => users.filter((u) => u.isActive && u.id !== editing?.id),
    [users, editing],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      fullName: "",
      email: "",
      employeeId: "",
      mobile: "",
      role: "VIEWER",
      reportingManagerId: "",
    });
    setTempPasswordNotice(null);
    setDialogOpen(true);
  };

  const openEdit = (user: UserAdminRecord) => {
    setEditing(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      employeeId: user.employeeId ?? "",
      mobile: user.mobile ?? "",
      role: user.role,
      reportingManagerId: user.reportingManagerId ?? "",
    });
    setTempPasswordNotice(null);
    setDialogOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setTempPasswordNotice(null);
    try {
      if (editing) {
        await adminFetch(`/api/admin/users/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            fullName: form.fullName,
            email: form.email,
            employeeId: form.employeeId || null,
            mobile: form.mobile || null,
            role: form.role,
            reportingManagerId: form.reportingManagerId || null,
          }),
        });
      } else {
        const result = await adminFetch<{
          user: UserAdminRecord;
          temporaryPassword: string;
        }>("/api/admin/users", {
          method: "POST",
          body: JSON.stringify({
            fullName: form.fullName,
            email: form.email,
            employeeId: form.employeeId || undefined,
            mobile: form.mobile || undefined,
            role: form.role,
            reportingManagerId: form.reportingManagerId || null,
          }),
        });
        setTempPasswordNotice(
          `Temporary password for ${result.user.email}: ${result.temporaryPassword}`,
        );
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: UserAdminRecord) => {
    try {
      await adminFetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: user.isActive ? "deactivate" : "activate",
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    }
  };

  const resetPassword = async (user: UserAdminRecord) => {
    try {
      const result = await adminFetch<{
        user: UserAdminRecord;
        temporaryPassword: string;
      }>(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "resetPassword" }),
      });
      setTempPasswordNotice(
        `Temporary password for ${result.user.email}: ${result.temporaryPassword}`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 space-y-1">
          <Label htmlFor="user-search">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="user-search"
              className="pl-8"
              placeholder="Name, email, employee ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="w-[160px] space-y-1">
          <Label>Role</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[160px] space-y-1">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {tempPasswordNotice ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {tempPasswordNotice}
          <span className="mt-1 block text-xs">
            Share securely. User must change password on next login.
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Employee ID</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Manager</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Loading users from database…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{u.fullName}</div>
                    {u.mustChangePassword ? (
                      <div className="text-xs text-amber-700">Temp password</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.employeeId || "—"}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">{u.reportingManagerName || "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex rounded px-2 py-0.5 text-xs font-medium",
                        u.isActive
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-slate-200 text-slate-700",
                      )}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void toggleActive(u)}>
                        {u.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void resetPassword(u)}>
                        Reset Password
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Signed in as {actor?.email}. Users persist in PostgreSQL (Supabase). No localStorage.
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Employee ID</Label>
                <Input
                  value={form.employeeId}
                  onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Mobile</Label>
                <Input
                  value={form.mobile}
                  onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reporting Manager (optional)</Label>
              <Select
                value={form.reportingManagerId || "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, reportingManagerId: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {managerOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName} ({m.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving || !form.fullName || !form.email}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
