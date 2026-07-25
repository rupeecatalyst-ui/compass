"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Download, X } from "lucide-react";
import {
  EnterpriseDataGrid,
  type EnterpriseGridColumnDef,
} from "@/components/catalyst-one/enterprise-grid";
import { useAuthContext } from "@/components/providers/auth-provider";
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
import { listContactRegistryFilters } from "@/constants/enterprise-contact-master/registry-filters";
import { NEW_ARRIVALS_QUERY } from "@/constants/user-home-dashboard/new-arrivals";
import { updateEcmContact } from "@/lib/enterprise-contact-master";
import {
  buildDirectoryRegistryRows,
  exportContactRegistryCsv,
  filterContactRegistryRows,
  sortContactRegistryRows,
  uniqueAssignedRms,
  uniqueContactCities,
  uniqueContactStates,
} from "@/lib/enterprise-contact-registry";
import { downloadCsv } from "@/lib/loan-files-utils";
import { CreateTaskActionButton } from "@/components/catalyst-one/tasks/create-task-action-button";
import type { EcmCompany } from "@/types/enterprise-company-master";
import type { EcmContact, EcmContactRole, EcmContactStatus } from "@/types/enterprise-contact-master";
import {
  CONTACT_REGISTRY_PAGE_SIZES,
  EMPTY_CONTACT_REGISTRY_FILTERS,
  type ContactRegistryFilters,
  type ContactRegistryRow,
  type ContactRegistrySortField,
  type DirectoryEntityFilter,
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

const ECM_CONTACT_ROLES = new Set<string>(
  ECM_ROLE_MASTER.map((r) => r.code),
);

function filtersFromSearchParams(params: URLSearchParams): Partial<ContactRegistryFilters> {
  const patch: Partial<ContactRegistryFilters> = {};
  const contactType = params.get(NEW_ARRIVALS_QUERY.contactType)?.trim();
  if (contactType && ECM_CONTACT_ROLES.has(contactType)) {
    patch.contactType = contactType as EcmContactRole;
  }
  const from = params.get(NEW_ARRIVALS_QUERY.dateCreatedFrom)?.trim();
  const to = params.get(NEW_ARRIVALS_QUERY.dateCreatedTo)?.trim();
  if (from) patch.dateCreatedFrom = from;
  if (to) patch.dateCreatedTo = to;
  return patch;
}

interface ContactRegistryTableProps {
  contacts: EcmContact[];
  companies: EcmCompany[];
  onOpenContact: (contact: EcmContact) => void;
  onOpenCompany: (company: EcmCompany) => void;
  onRegistryChanged?: () => void;
  /** After company setup — filter registry to surface linked contacts. */
  highlightSearch?: string;
  onHighlightApplied?: () => void;
}

/**
 * CO-SPRINT-094 — Enterprise Contact Registry table (Enterprise Table Standard).
 */
export function ContactRegistryTable({
  contacts,
  companies,
  onOpenContact,
  onOpenCompany,
  onRegistryChanged,
  highlightSearch,
  onHighlightApplied,
}: ContactRegistryTableProps) {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ContactRegistryFilters>(() => ({
    ...EMPTY_CONTACT_REGISTRY_FILTERS,
    ...filtersFromSearchParams(searchParams),
  }));
  const [sortField, setSortField] = useState<ContactRegistrySortField>("dateCreatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof CONTACT_REGISTRY_PAGE_SIZES)[number]>(50);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  // CO-SPRINT-119 — hydrate registry filters from New Arrivals (and similar) drill-down URLs
  useEffect(() => {
    const patch = filtersFromSearchParams(searchParams);
    if (Object.keys(patch).length === 0) return;
    setFilters((f) => ({ ...f, ...patch }));
    setSortField("dateCreatedAt");
    setSortDir("desc");
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    const term = highlightSearch?.trim();
    if (!term) return;
    setFilters((f) => ({ ...f, search: term }));
    setSortField("lastModifiedAt");
    setSortDir("desc");
    setPage(1);
    onHighlightApplied?.();
  }, [highlightSearch, onHighlightApplied]);

  const allRows = useMemo(
    () => buildDirectoryRegistryRows(contacts, companies),
    [contacts, companies],
  );

  const entityFilters = useMemo(
    () => listContactRegistryFilters().filter((f) => f.kind !== "role"),
    [],
  );

  const roleFilters = useMemo(
    () => listContactRegistryFilters().filter((f) => f.kind === "role"),
    [],
  );

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
        exportValue: (row) => row.contact?.id ?? row.company?.id ?? row.id,
      },
      {
        id: "name",
        label: "Name",
        frozen: true,
        sortable: true,
        defaultOrder: 2,
        defaultWidth: 150,
        render: (row) => (
          <span className="font-medium">
            {row.name}
            {row.entityKind === "company" ? (
              <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                Company
              </span>
            ) : null}
          </span>
        ),
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
            {row.entityKind === "contact" && row.contact ? (
              <Switch
                checked={row.strategicContact}
                onCheckedChange={(checked) => {
                  try {
                    updateEcmContact(row.contact!.id, { strategicContact: Boolean(checked) }, "ui");
                    onRegistryChanged?.();
                  } catch {
                    /* ignore */
                  }
                }}
                aria-label={`Strategic contact ${row.name}`}
              />
            ) : (
              <span className="text-[11px] text-muted-foreground">—</span>
            )}
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
    filters.entityFilter !== "all" ||
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

  const hasAdvancedFilters =
    filters.city !== "all" ||
    filters.state !== "all" ||
    filters.strategic !== "all" ||
    Boolean(filters.dateCreatedFrom) ||
    Boolean(filters.dateCreatedTo) ||
    Boolean(filters.lastInteractionFrom) ||
    Boolean(filters.lastInteractionTo) ||
    Boolean(filters.scoreMin) ||
    Boolean(filters.scoreMax) ||
    Boolean(filters.columnName) ||
    Boolean(filters.columnMobile);

  const sortColumnId =
    Object.entries(SORT_MAP).find(([, f]) => f === sortField)?.[0] ?? "dateCreated";

  const roleOptions = useMemo(
    () =>
      [...ECM_ROLE_MASTER]
        .filter((r) => r.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((r) => ({ id: r.code, label: getEcmRoleLabel(r.code) })),
    [],
  );

  const registryTabs = useMemo(
    () => [...entityFilters, ...roleFilters],
    [entityFilters, roleFilters],
  );

  const isTabActive = (filter: (typeof registryTabs)[number]) => {
    if (filter.kind === "role") {
      return filters.contactType === filter.role && filters.entityFilter !== "companies";
    }
    return filters.entityFilter === filter.id && filters.contactType === "all";
  };

  const entityLabel =
    filters.entityFilter === "all"
      ? "entries"
      : filters.entityFilter === "individuals"
        ? "individuals"
        : "companies";

  const selectClass = "h-7 w-[118px] rounded-sm text-[11px]";
  const controlH = "h-7 rounded-sm text-[11px]";

  const resetFilters = () => {
    setFilters(EMPTY_CONTACT_REGISTRY_FILTERS);
    setPage(1);
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-1.5"
      data-sprint="BAT-016"
      data-surface="contact-registry"
    >
      <div className="shrink-0 border border-slate-300 bg-white dark:border-zinc-700 dark:bg-card">
        {/* Registry role / entity tabs — single compact strip */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border/70 px-1.5 py-1">
          {registryTabs.map((filter) => {
            const active = isTabActive(filter);
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  if (filter.kind === "role") {
                    patchFilters({
                      entityFilter: "individuals",
                      contactType: filter.role ?? "all",
                    });
                    return;
                  }
                  patchFilters({
                    entityFilter: filter.id as DirectoryEntityFilter,
                    contactType: "all",
                  });
                }}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Smart default filters */}
        <div className="flex flex-wrap items-center gap-1.5 px-1.5 py-1">
          <Input
            value={filters.search}
            onChange={(e) => patchFilters({ search: e.target.value })}
            placeholder="Search name, mobile, email…"
            className={cn(controlH, "w-[min(100%,14rem)] min-w-[10rem] flex-1 sm:flex-none")}
            aria-label="Search contacts"
          />
          <Select
            value={filters.contactType}
            onValueChange={(v) =>
              patchFilters({ contactType: v as ContactRegistryFilters["contactType"] })
            }
          >
            <SelectTrigger className={cn(selectClass, "w-[130px]")} aria-label="Contact Type">
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
          <Select
            value={filters.assignedRm}
            onValueChange={(v) => patchFilters({ assignedRm: v })}
          >
            <SelectTrigger className={cn(selectClass, "w-[130px]")} aria-label="Relationship Manager">
              <SelectValue placeholder="RM" />
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
            <SelectTrigger className={selectClass} aria-label="Status">
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
          <Button
            type="button"
            variant={moreFiltersOpen || hasAdvancedFilters ? "secondary" : "outline"}
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => setMoreFiltersOpen((o) => !o)}
            aria-expanded={moreFiltersOpen}
            aria-controls="contact-registry-more-filters"
          >
            More Filters
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                moreFiltersOpen && "rotate-180",
              )}
              aria-hidden
            />
            {hasAdvancedFilters ? (
              <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            ) : null}
          </Button>
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={resetFilters}
            >
              <X className="mr-1 h-3 w-3" />
              Reset
            </Button>
          ) : null}
          <p className="ml-auto text-[11px] tabular-nums text-muted-foreground">
            {filteredSorted.length} of {allRows.length}
          </p>
        </div>

        {moreFiltersOpen ? (
          <div
            id="contact-registry-more-filters"
            className="space-y-1.5 border-t border-dashed border-border/80 bg-muted/20 px-1.5 py-1.5"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <Input
                value={filters.columnName}
                onChange={(e) => patchFilters({ columnName: e.target.value })}
                placeholder="Column: Name"
                className={cn(controlH, "w-[120px]")}
              />
              <Input
                value={filters.columnMobile}
                onChange={(e) => patchFilters({ columnMobile: e.target.value })}
                placeholder="Column: Mobile"
                className={cn(controlH, "w-[120px]")}
              />
              <Select
                value={filters.state}
                onValueChange={(v) => patchFilters({ state: v, city: "all" })}
              >
                <SelectTrigger className={cn(selectClass, "w-[110px]")}>
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
                <SelectTrigger className={cn(selectClass, "w-[110px]")}>
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
              <Select
                value={filters.strategic}
                onValueChange={(v) =>
                  patchFilters({ strategic: v as ContactRegistryFilters["strategic"] })
                }
              >
                <SelectTrigger className={cn(selectClass, "w-[140px]")}>
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
                className={cn(controlH, "w-[118px]")}
                aria-label="Created from"
              />
              <span className="text-[11px] text-muted-foreground">–</span>
              <Input
                type="date"
                value={filters.dateCreatedTo}
                onChange={(e) => patchFilters({ dateCreatedTo: e.target.value })}
                className={cn(controlH, "w-[118px]")}
                aria-label="Created to"
              />
              <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Last interaction
              </span>
              <Input
                type="date"
                value={filters.lastInteractionFrom}
                onChange={(e) => patchFilters({ lastInteractionFrom: e.target.value })}
                className={cn(controlH, "w-[118px]")}
                aria-label="Last interaction from"
              />
              <span className="text-[11px] text-muted-foreground">–</span>
              <Input
                type="date"
                value={filters.lastInteractionTo}
                onChange={(e) => patchFilters({ lastInteractionTo: e.target.value })}
                className={cn(controlH, "w-[118px]")}
                aria-label="Last interaction to"
              />
              <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Score
              </span>
              <Input
                value={filters.scoreMin}
                onChange={(e) => patchFilters({ scoreMin: e.target.value })}
                placeholder="Min"
                className={cn(controlH, "w-[56px]")}
                inputMode="numeric"
              />
              <span className="text-[11px] text-muted-foreground">–</span>
              <Input
                value={filters.scoreMax}
                onChange={(e) => patchFilters({ scoreMax: e.target.value })}
                placeholder="Max"
                className={cn(controlH, "w-[56px]")}
                inputMode="numeric"
              />
            </div>
          </div>
        ) : null}
      </div>

      <EnterpriseDataGrid
        className="min-h-0 flex-1"
        storageKey="catalyst.ecm.contact-registry.v3"
        userId={user?.id}
        density="dense"
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.id}
        emptyMessage="No entries match the current filters."
        toolbarLabel={`Contact Registry · ${filteredSorted.length} ${entityLabel}`}
        sortColumnId={sortColumnId}
        sortDirection={sortDir}
        onSort={handleSort}
        onRowClick={(row) => {
          if (row.entityKind === "company" && row.company) {
            onOpenCompany(row.company);
            return;
          }
          if (row.contact) onOpenContact(row.contact);
        }}
        maxHeightClassName="h-full max-h-none min-h-0 flex-1"
        toolbarActions={
          <div className="flex flex-wrap items-center gap-1.5">
            <CreateTaskActionButton
              allowEntityPicker
              className="h-6 gap-1.5 rounded-md px-2 text-[10px]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 gap-1.5 rounded-md px-2 text-[10px]"
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
          </div>
        }
      />

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border border-slate-300 bg-slate-50/80 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {filteredSorted.length === 0
            ? `0 ${entityLabel}`
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
