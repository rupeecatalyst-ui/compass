"use client";

import { useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import {
  EnterpriseDataGrid,
  type EnterpriseGridColumnDef,
} from "@/components/catalyst-one/enterprise-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getEcmRoleLabel, ECM_ROLE_MASTER } from "@/constants/enterprise-contact-master";
import { updateEcmContact } from "@/lib/enterprise-contact-master";
import {
  buildContactRegistryRows,
  exportContactRegistryCsv,
  filterContactRegistryRows,
  sortContactRegistryRows,
  uniqueAssignedRms,
  uniqueContactCities,
  uniqueContactStates,
} from "@/lib/enterprise-contact-registry";
import { downloadCsv } from "@/lib/loan-files-utils";
import type { EcmContact, EcmContactStatus } from "@/types/enterprise-contact-master";
import {
  CONTACT_REGISTRY_PAGE_SIZES,
  EMPTY_CONTACT_REGISTRY_FILTERS,
  type ContactRegistryFilters,
  type ContactRegistryRow,
  type ContactRegistrySortField,
} from "@/types/enterprise-contact-registry";
import { cn } from "@/lib/utils";

const SORT_MAP: Record<string, ContactRegistrySortField> = {
  contactId: "contactId",
  name: "name",
  contactType: "contactType",
  mobile: "mobile",
  city: "city",
  assignedRm: "assignedRm",
  activeOpportunities: "activeOpportunities",
  contactScore: "contactScore",
  strategicContact: "strategicContact",
  lastInteraction: "lastInteractionAt",
  dateCreated: "dateCreatedAt",
  status: "status",
  email: "email",
  companyName: "companyName",
  source: "source",
  panStatus: "panStatus",
  aadhaarStatus: "aadhaarStatus",
  lastModified: "lastModifiedAt",
  tags: "tags",
  loanRequirement: "loanRequirement",
  productInterest: "productInterest",
  customerStage: "customerStage",
};

const STATUS_OPTIONS: EcmContactStatus[] = [
  "provisional",
  "active",
  "complete",
  "verified",
  "archived",
];

interface ContactRegistryTableProps {
  contacts: EcmContact[];
  onOpenContact: (contact: EcmContact) => void;
  onRegistryChanged?: () => void;
}

/**
 * CO-SPRINT-094 — Enterprise Contact Registry table (Enterprise Table Standard).
 */
export function ContactRegistryTable({
  contacts,
  onOpenContact,
  onRegistryChanged,
}: ContactRegistryTableProps) {
  const [filters, setFilters] = useState<ContactRegistryFilters>(EMPTY_CONTACT_REGISTRY_FILTERS);
  const [sortField, setSortField] = useState<ContactRegistrySortField>("lastModifiedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof CONTACT_REGISTRY_PAGE_SIZES)[number]>(20);

  const allRows = useMemo(() => buildContactRegistryRows(contacts), [contacts]);

  const cities = useMemo(() => uniqueContactCities(allRows), [allRows]);
  const states = useMemo(() => uniqueContactStates(allRows), [allRows]);
  const rms = useMemo(() => uniqueAssignedRms(allRows), [allRows]);

  const filteredSorted = useMemo(() => {
    const filtered = filterContactRegistryRows(allRows, filters);
    return sortContactRegistryRows(filtered, sortField, sortDir);
  }, [allRows, filters, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const patchFilters = (patch: Partial<ContactRegistryFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const handleSort = (columnId: string) => {
    const field = SORT_MAP[columnId];
    if (!field) return;
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return field;
      }
      setSortDir(
        field === "contactScore" ||
          field === "activeOpportunities" ||
          field === "lastInteractionAt" ||
          field === "dateCreatedAt" ||
          field === "lastModifiedAt"
          ? "desc"
          : "asc",
      );
      return field;
    });
    setPage(1);
  };

  const columns = useMemo<EnterpriseGridColumnDef<ContactRegistryRow>[]>(
    () => [
      {
        id: "contactId",
        label: "Contact ID",
        frozen: true,
        sortable: true,
        defaultOrder: 1,
        defaultWidth: 96,
        render: (row) => (
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {row.contactId}
          </span>
        ),
        exportValue: (row) => row.contact.id,
      },
      {
        id: "name",
        label: "Contact Name",
        frozen: true,
        sortable: true,
        defaultOrder: 2,
        defaultWidth: 150,
        render: (row) => <span className="font-medium">{row.name}</span>,
        exportValue: (row) => row.name,
      },
      {
        id: "contactType",
        label: "Contact Type",
        sortable: true,
        defaultOrder: 3,
        defaultWidth: 110,
        render: (row) => row.contactType,
        exportValue: (row) => row.contactType,
      },
      {
        id: "mobile",
        label: "Mobile Number",
        sortable: true,
        defaultOrder: 4,
        defaultWidth: 118,
        render: (row) => <span className="tabular-nums">{row.mobile}</span>,
        exportValue: (row) => row.mobile,
      },
      {
        id: "city",
        label: "City",
        sortable: true,
        defaultOrder: 5,
        defaultWidth: 100,
        render: (row) => row.city,
        exportValue: (row) => row.city,
      },
      {
        id: "assignedRm",
        label: "Assigned RM",
        sortable: true,
        defaultOrder: 6,
        defaultWidth: 120,
        render: (row) => row.assignedRm,
        exportValue: (row) => row.assignedRm,
      },
      {
        id: "activeOpportunities",
        label: "Active Opportunities",
        sortable: true,
        defaultOrder: 7,
        defaultWidth: 110,
        align: "center",
        render: (row) => (
          <span className="tabular-nums">{row.activeOpportunities}</span>
        ),
        exportValue: (row) => String(row.activeOpportunities),
      },
      {
        id: "contactScore",
        label: "Contact Score",
        sortable: true,
        defaultOrder: 8,
        defaultWidth: 96,
        align: "center",
        render: (row) => {
          const tone =
            row.contactScore >= 80
              ? "text-emerald-700"
              : row.contactScore >= 60
                ? "text-foreground"
                : "text-amber-700";
          return (
            <span className={cn("font-semibold tabular-nums", tone)}>{row.contactScore}</span>
          );
        },
        exportValue: (row) => String(row.contactScore),
      },
      {
        id: "strategicContact",
        label: "Strategic Contact",
        sortable: true,
        defaultOrder: 9,
        defaultWidth: 110,
        align: "center",
        render: (row) => (
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Switch
              checked={row.strategicContact}
              onCheckedChange={(checked) => {
                try {
                  updateEcmContact(row.contact.id, { strategicContact: Boolean(checked) }, "ui");
                  onRegistryChanged?.();
                } catch {
                  /* ignore */
                }
              }}
              aria-label={`Strategic contact ${row.name}`}
            />
          </div>
        ),
        exportValue: (row) => (row.strategicContact ? "Yes" : "No"),
      },
      {
        id: "lastInteraction",
        label: "Last Interaction",
        sortable: true,
        defaultOrder: 10,
        defaultWidth: 110,
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{row.lastInteraction}</span>
        ),
        exportValue: (row) => row.lastInteraction,
      },
      {
        id: "dateCreated",
        label: "Date Created",
        sortable: true,
        defaultOrder: 11,
        defaultWidth: 100,
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{row.dateCreated}</span>
        ),
        exportValue: (row) => row.dateCreated,
      },
      {
        id: "status",
        label: "Status",
        sortable: true,
        defaultOrder: 12,
        defaultWidth: 88,
        render: (row) => (
          <span
            className={cn(
              "text-[11px] font-medium uppercase tracking-wide",
              row.status === "active" || row.status === "complete" || row.status === "verified"
                ? "text-emerald-700"
                : "text-muted-foreground",
            )}
          >
            {row.status}
          </span>
        ),
        exportValue: (row) => row.status,
      },
      // Optional columns
      {
        id: "email",
        label: "Email",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 20,
        defaultWidth: 160,
        render: (row) => <span className="truncate text-muted-foreground">{row.email}</span>,
        exportValue: (row) => row.email,
      },
      {
        id: "companyName",
        label: "Company Name",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 21,
        defaultWidth: 150,
        render: (row) => row.companyName,
        exportValue: (row) => row.companyName,
      },
      {
        id: "source",
        label: "Source",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 22,
        defaultWidth: 100,
        render: (row) => row.source,
        exportValue: (row) => row.source,
      },
      {
        id: "panStatus",
        label: "PAN Status",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 23,
        defaultWidth: 96,
        render: (row) => row.panStatus,
        exportValue: (row) => row.panStatus,
      },
      {
        id: "aadhaarStatus",
        label: "Aadhaar Status",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 24,
        defaultWidth: 110,
        render: (row) => row.aadhaarStatus,
        exportValue: (row) => row.aadhaarStatus,
      },
      {
        id: "lastModified",
        label: "Last Modified",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 25,
        defaultWidth: 110,
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{row.lastModified}</span>
        ),
        exportValue: (row) => row.lastModified,
      },
      {
        id: "tags",
        label: "Tags",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 26,
        defaultWidth: 140,
        render: (row) => <span className="truncate text-muted-foreground">{row.tags}</span>,
        exportValue: (row) => row.tags,
      },
      {
        id: "loanRequirement",
        label: "Loan Requirement",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 27,
        defaultWidth: 130,
        render: (row) => row.loanRequirement,
        exportValue: (row) => row.loanRequirement,
      },
      {
        id: "productInterest",
        label: "Product Interest",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 28,
        defaultWidth: 120,
        render: (row) => row.productInterest,
        exportValue: (row) => row.productInterest,
      },
      {
        id: "customerStage",
        label: "Customer Stage",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 29,
        defaultWidth: 120,
        render: (row) => row.customerStage,
        exportValue: (row) => row.customerStage,
      },
    ],
    [onRegistryChanged],
  );

  const hasFilters =
    filters.search ||
    filters.contactType !== "all" ||
    filters.city !== "all" ||
    filters.state !== "all" ||
    filters.assignedRm !== "all" ||
    filters.status !== "all" ||
    filters.strategic !== "all" ||
    filters.dateCreatedFrom ||
    filters.dateCreatedTo ||
    filters.lastInteractionFrom ||
    filters.lastInteractionTo ||
    filters.scoreMin ||
    filters.scoreMax ||
    filters.columnName ||
    filters.columnMobile;

  const sortColumnId =
    Object.entries(SORT_MAP).find(([, f]) => f === sortField)?.[0] ?? "lastModified";

  const roleOptions = useMemo(
    () =>
      [...ECM_ROLE_MASTER]
        .filter((r) => r.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((r) => ({ id: r.code, label: getEcmRoleLabel(r.code) })),
    [],
  );

  return (
    <div className="space-y-2">
      <div className="space-y-1.5 border border-slate-300 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-card">
        <div className="flex flex-wrap gap-1.5">
          <Input
            value={filters.search}
            onChange={(e) => patchFilters({ search: e.target.value })}
            placeholder="Global search…"
            className="h-7 w-[180px] rounded-sm text-[11px]"
          />
          <Input
            value={filters.columnName}
            onChange={(e) => patchFilters({ columnName: e.target.value })}
            placeholder="Column: Name"
            className="h-7 w-[120px] rounded-sm text-[11px]"
          />
          <Input
            value={filters.columnMobile}
            onChange={(e) => patchFilters({ columnMobile: e.target.value })}
            placeholder="Column: Mobile"
            className="h-7 w-[120px] rounded-sm text-[11px]"
          />
          <Select
            value={filters.contactType}
            onValueChange={(v) =>
              patchFilters({ contactType: v as ContactRegistryFilters["contactType"] })
            }
          >
            <SelectTrigger className="h-7 w-[130px] rounded-sm text-[11px]">
              <SelectValue placeholder="Contact Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {roleOptions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.state} onValueChange={(v) => patchFilters({ state: v, city: "all" })}>
            <SelectTrigger className="h-7 w-[120px] rounded-sm text-[11px]">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.city} onValueChange={(v) => patchFilters({ city: v })}>
            <SelectTrigger className="h-7 w-[120px] rounded-sm text-[11px]">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.assignedRm} onValueChange={(v) => patchFilters({ assignedRm: v })}>
            <SelectTrigger className="h-7 w-[140px] rounded-sm text-[11px]">
              <SelectValue placeholder="Assigned RM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All RMs</SelectItem>
              {rms.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(v) => patchFilters({ status: v as ContactRegistryFilters["status"] })}
          >
            <SelectTrigger className="h-7 w-[120px] rounded-sm text-[11px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.strategic}
            onValueChange={(v) =>
              patchFilters({ strategic: v as ContactRegistryFilters["strategic"] })
            }
          >
            <SelectTrigger className="h-7 w-[140px] rounded-sm text-[11px]">
              <SelectValue placeholder="Strategic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Strategic: All</SelectItem>
              <SelectItem value="yes">Strategic: Yes</SelectItem>
              <SelectItem value="no">Strategic: No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Created
          </span>
          <Input
            type="date"
            value={filters.dateCreatedFrom}
            onChange={(e) => patchFilters({ dateCreatedFrom: e.target.value })}
            className="h-7 w-[128px] rounded-sm text-[11px]"
          />
          <span className="text-[11px] text-muted-foreground">–</span>
          <Input
            type="date"
            value={filters.dateCreatedTo}
            onChange={(e) => patchFilters({ dateCreatedTo: e.target.value })}
            className="h-7 w-[128px] rounded-sm text-[11px]"
          />
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Last interaction
          </span>
          <Input
            type="date"
            value={filters.lastInteractionFrom}
            onChange={(e) => patchFilters({ lastInteractionFrom: e.target.value })}
            className="h-7 w-[128px] rounded-sm text-[11px]"
          />
          <span className="text-[11px] text-muted-foreground">–</span>
          <Input
            type="date"
            value={filters.lastInteractionTo}
            onChange={(e) => patchFilters({ lastInteractionTo: e.target.value })}
            className="h-7 w-[128px] rounded-sm text-[11px]"
          />
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Score
          </span>
          <Input
            value={filters.scoreMin}
            onChange={(e) => patchFilters({ scoreMin: e.target.value })}
            placeholder="Min"
            className="h-7 w-[56px] rounded-sm text-[11px]"
            inputMode="numeric"
          />
          <span className="text-[11px] text-muted-foreground">–</span>
          <Input
            value={filters.scoreMax}
            onChange={(e) => patchFilters({ scoreMax: e.target.value })}
            placeholder="Max"
            className="h-7 w-[56px] rounded-sm text-[11px]"
            inputMode="numeric"
          />
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => {
                setFilters(EMPTY_CONTACT_REGISTRY_FILTERS);
                setPage(1);
              }}
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <EnterpriseDataGrid
        storageKey="catalyst.ecm.contact-registry.v1"
        density="compact"
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.id}
        emptyMessage="No contacts match the current filters."
        toolbarLabel={`Contact Registry · ${filteredSorted.length} contacts`}
        sortColumnId={sortColumnId}
        sortDirection={sortDir}
        onSort={handleSort}
        onRowClick={(row) => onOpenContact(row.contact)}
        maxHeightClassName="max-h-[min(72vh,860px)]"
        toolbarActions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 rounded-md text-[11px]"
            onClick={() => {
              downloadCsv(
                exportContactRegistryCsv(filteredSorted),
                `contact-registry-${new Date().toISOString().slice(0, 10)}.csv`,
              );
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Export to Excel
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border border-slate-300 bg-slate-50/80 px-2.5 py-1.5 dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {filteredSorted.length === 0
            ? "0 contacts"
            : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredSorted.length)} of ${filteredSorted.length}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v) as (typeof CONTACT_REGISTRY_PAGE_SIZES)[number]);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-7 w-[72px] rounded-sm text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_REGISTRY_PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-sm px-2 text-[11px]"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-[11px] tabular-nums">
              {safePage}/{totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-sm px-2 text-[11px]"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
