"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Download,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  listEcmContacts,
  queryEcmContacts,
  registerEcmContact,
  archiveEcmContact,
  updateEcmContact,
} from "@/lib/enterprise-contact-master";
import { getEcmRoleLabel } from "@/constants/enterprise-contact-master";
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";
import { ContactRoleChips } from "@/components/catalyst-one/contacts/contact-role-chips";
import { ContactWorkspaceModal } from "@/components/catalyst-one/contacts/contact-workspace-modal";
import {
  EnterpriseDataGrid,
  type EnterpriseGridColumnDef,
} from "@/components/catalyst-one/enterprise-grid";
import { PageHeader } from "@/components/design-system/page-header";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES } from "@/constants/roles";
import { cn } from "@/lib/utils";

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function seedEnterpriseContactsIfEmpty() {
  if (listEcmContacts().length > 0) return;

  const seeds: Array<{
    name: string;
    mobilePrimary: string;
    roles: EcmContactRole[];
    personalEmail?: string;
    officialEmail?: string;
    ownerName: string;
    daysAgo: number;
  }> = [
    {
      name: "Suresh Patel",
      mobilePrimary: "9811100001",
      roles: ["customer", "investor"],
      personalEmail: "suresh.patel@demo.in",
      ownerName: "Platform Admin",
      daysAgo: 1,
    },
    {
      name: "Meera Iyer",
      mobilePrimary: "9811100002",
      roles: ["employee"],
      officialEmail: "meera.iyer@rupeecatalyst.demo",
      ownerName: "Platform Admin",
      daysAgo: 2,
    },
    {
      name: "Ankit Shah",
      mobilePrimary: "9811100004",
      roles: ["builder", "partner"],
      officialEmail: "ankit@skylinebuilders.demo",
      ownerName: "Priya Nair",
      daysAgo: 3,
    },
    {
      name: "Dr. Kavita Rao",
      mobilePrimary: "9811100005",
      roles: ["chartered_accountant"],
      personalEmail: "kavita.rao@ca.demo",
      ownerName: "Priya Nair",
      daysAgo: 4,
    },
    {
      name: "Rahul Menon",
      mobilePrimary: "9811100006",
      roles: ["lender_employee"],
      officialEmail: "rahul.menon@hdfc.demo",
      ownerName: "Arjun Desai",
      daysAgo: 5,
    },
    {
      name: "No Email Contact",
      mobilePrimary: "9811100099",
      roles: ["partner", "builder"],
      ownerName: "Platform Admin",
      daysAgo: 6,
    },
  ];

  for (const seed of seeds) {
    const created = registerEcmContact({
      name: seed.name,
      mobilePrimary: seed.mobilePrimary,
      roles: seed.roles,
      personalEmail: seed.personalEmail,
      officialEmail: seed.officialEmail,
      ownerName: seed.ownerName,
      createdBy: "system",
    });
    const createdOn = new Date(Date.now() - seed.daysAgo * 86400000).toISOString();
    updateEcmContact(
      created.id,
      { lastActiveOn: createdOn },
      "system",
    );
  }
}

function ContactRegistryInner() {
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const canDelete = user?.role === ROLES.SUPER_ADMIN;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("active");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<"create" | "edit">("create");
  const [workspaceContact, setWorkspaceContact] = useState<EcmContact | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState("identity");

  useEffect(() => {
    seedEnterpriseContactsIfEmpty();
    setTick((t) => t + 1);
  }, []);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
    setPage(1);
  }, []);

  const queryResult = useMemo(() => {
    void tick;
    return queryEcmContacts({
      search,
      status: statusFilter,
      roles: roleFilter === "all" ? undefined : [roleFilter as EcmContactRole],
      page,
      pageSize: 100,
      sortBy: "createdOn",
      sortDir: "desc",
    });
  }, [search, roleFilter, statusFilter, page, tick]);

  useEffect(() => {
    const fromQuery = searchParams.get("contact");
    if (!fromQuery) return;
    const found = listEcmContacts().find((c) => c.id === fromQuery);
    if (found) {
      setWorkspaceMode("edit");
      setWorkspaceContact(found);
      setWorkspaceTab("identity");
      setWorkspaceOpen(true);
    }
  }, [searchParams]);

  const openCreate = () => {
    setWorkspaceMode("create");
    setWorkspaceContact(null);
    setWorkspaceTab("identity");
    setWorkspaceOpen(true);
  };

  const openContact = (contact: EcmContact, tab = "identity") => {
    setWorkspaceMode("edit");
    setWorkspaceContact(contact);
    setWorkspaceTab(tab);
    setWorkspaceOpen(true);
  };

  const onWorkspaceSaved = (contact: EcmContact) => {
    setWorkspaceContact(contact);
    setHighlightId(contact.id);
    setTick((t) => t + 1);
  };

  const onWorkspaceClose = (open: boolean) => {
    setWorkspaceOpen(open);
    if (!open) {
      setTick((t) => t + 1);
      setPage(1);
    }
  };

  const exportCsv = () => {
    const rows = queryResult.items;
    const headers = [
      "Contact Name",
      "Primary Mobile",
      "Primary Email",
      "Assigned Roles",
      "Owner",
      "Status",
      "Contact Score",
      "Last Active",
      "Last Modified",
      "Created",
    ];
    const lines = rows.map((c) =>
      [
        c.name,
        c.mobilePrimary,
        c.personalEmail || c.officialEmail || "",
        c.roles.map(getEcmRoleLabel).join("|"),
        c.ownerName ?? "",
        c.status,
        String(c.contactScore),
        c.lastActiveOn,
        c.modifiedOn,
        c.createdOn,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contact-registry-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo<EnterpriseGridColumnDef<EcmContact>[]>(
    () => [
      {
        id: "name",
        label: "Contact Name",
        defaultOrder: 1,
        defaultWidth: 180,
        frozen: true,
        render: (row) => (
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            <p className="font-mono text-[10px] text-muted-foreground">{row.id.slice(0, 8)}</p>
          </div>
        ),
        exportValue: (row) => row.name,
      },
      {
        id: "mobile",
        label: "Primary Mobile",
        defaultOrder: 2,
        defaultWidth: 130,
        render: (row) => row.mobilePrimary,
        exportValue: (row) => row.mobilePrimary,
      },
      {
        id: "email",
        label: "Primary Email",
        defaultOrder: 3,
        defaultWidth: 190,
        render: (row) => row.personalEmail || row.officialEmail || "—",
        exportValue: (row) => row.personalEmail || row.officialEmail || "",
      },
      {
        id: "roles",
        label: "Assigned Roles",
        defaultOrder: 4,
        defaultWidth: 220,
        render: (row) => <ContactRoleChips roles={row.roles} />,
        exportValue: (row) => row.roles.map(getEcmRoleLabel).join("|"),
      },
      {
        id: "owner",
        label: "Relationship Manager / Owner",
        defaultOrder: 5,
        defaultWidth: 180,
        render: (row) => row.ownerName || "—",
        exportValue: (row) => row.ownerName || "",
      },
      {
        id: "status",
        label: "Status",
        defaultOrder: 6,
        defaultWidth: 100,
        render: (row) => (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize tracking-tight",
              row.status === "active"
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10 dark:bg-slate-800 dark:text-slate-300",
            )}
          >
            {row.status}
          </span>
        ),
        exportValue: (row) => row.status,
      },
      {
        id: "score",
        label: "Contact Score",
        defaultOrder: 7,
        defaultWidth: 110,
        align: "center",
        render: (row) => (
          <span className="inline-flex h-7 min-w-10 items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-semibold tabular-nums text-slate-800 dark:bg-zinc-800 dark:text-zinc-100">
            {row.contactScore}
          </span>
        ),
        exportValue: (row) => String(row.contactScore),
      },
      {
        id: "lastActive",
        label: "Last Active Date",
        defaultOrder: 8,
        defaultWidth: 130,
        render: (row) => formatDate(row.lastActiveOn),
        exportValue: (row) => row.lastActiveOn,
      },
      {
        id: "modified",
        label: "Last Modified Date",
        defaultOrder: 9,
        defaultWidth: 140,
        render: (row) => formatDate(row.modifiedOn),
        exportValue: (row) => row.modifiedOn,
      },
      {
        id: "created",
        label: "Created Date",
        defaultOrder: 10,
        defaultWidth: 120,
        render: (row) => formatDate(row.createdOn),
        exportValue: (row) => row.createdOn,
      },
      {
        id: "actions",
        label: "Actions",
        defaultOrder: 11,
        defaultWidth: 90,
        defaultVisible: true,
        align: "center",
        render: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => openContact(row, "identity")}>
                Open Contact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openContact(row, "identity")}>
                Edit Contact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openContact(row, "identity")}>
                Manage Roles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openContact(row, "documents")}>
                Documents
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openContact(row, "timeline")}>
                Timeline
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openContact(row, "communication")}>
                Communication
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  archiveEcmContact(row.id, user?.id ?? "ui");
                  refresh();
                }}
              >
                Archive
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    archiveEcmContact(row.id, user?.id ?? "ui");
                    refresh();
                  }}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [canDelete, refresh, user?.id],
  );

  const totalPages = Math.max(1, Math.ceil(queryResult.total / queryResult.pageSize));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Enterprise Contact Registry"
        description="Browse every person in Catalyst One. Open a workspace to create or enrich a contact — identity is collected once."
        actions={
          <Button type="button" onClick={openCreate} className="h-10 gap-2 rounded-xl px-4 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/80 p-3 shadow-sm shadow-black/[0.02] lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 rounded-xl border-border/70 bg-background pl-9"
            placeholder="Search name, mobile, email, owner…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-10 w-full rounded-xl lg:w-44">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="customer">Borrower</SelectItem>
            <SelectItem value="investor">Investor</SelectItem>
            <SelectItem value="builder">Builder</SelectItem>
            <SelectItem value="chartered_accountant">CA</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="lender_employee">Banker</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as typeof statusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-10 w-full rounded-xl lg:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={refresh} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" className="h-10 gap-2 rounded-xl" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <EnterpriseDataGrid
        storageKey="ecm-contact-registry-grid-v1"
        columns={columns}
        rows={queryResult.items}
        rowKey={(row) => row.id}
        highlightedRowKey={highlightId}
        onRowClick={(row) => openContact(row)}
        emptyMessage="No contacts match the current filters."
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {queryResult.items.length} of {queryResult.total} · page {queryResult.page} of{" "}
          {totalPages} (page size 100, newest first)
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <ContactWorkspaceModal
        open={workspaceOpen}
        mode={workspaceMode}
        contact={workspaceContact}
        actorId={user?.id ?? "ui"}
        initialTab={workspaceTab}
        onOpenChange={onWorkspaceClose}
        onSaved={onWorkspaceSaved}
      />
    </div>
  );
}

export function ContactRegistryWorkspace() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading registry…</div>}>
      <ContactRegistryInner />
    </Suspense>
  );
}

/** @deprecated Use ContactRegistryWorkspace — retained export name for route compatibility */
export function ContactMasterWorkspace() {
  return <ContactRegistryWorkspace />;
}
