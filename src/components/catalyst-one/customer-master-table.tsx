"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import {
  customers as allCustomers,
  customerStatusOptions,
  lenders,
  loanProducts,
  relationshipManagers,
} from "@/data/catalyst-one/customers";
import { formatINR } from "@/lib/format-currency";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { computeCustomerLoanStats, getAllLoanFiles } from "@/lib/loan-files-utils";
import { ROUTES } from "@/constants/routes";
import type { Customer, CustomerFilters, CustomerSortField, CustomerStatus, LoanFile, SortDirection } from "@/types/catalyst-one";

const PAGE_SIZE = 8;

const statusVariant: Record<CustomerStatus, "default" | "info" | "success" | "warning" | "muted" | "error"> = {
  active: "info",
  in_progress: "warning",
  sanctioned: "default",
  disbursed: "success",
  closed: "muted",
  dropped: "error",
};

const statusLabel: Record<CustomerStatus, string> = {
  active: "Active",
  in_progress: "In Progress",
  sanctioned: "Sanctioned",
  disbursed: "Disbursed",
  closed: "Closed",
  dropped: "Dropped",
};

const defaultFilters: CustomerFilters = {
  status: "all",
  loanProduct: "all",
  lender: "all",
  relationshipManager: "all",
};

function SortIcon({ field, sortField, direction }: { field: CustomerSortField; sortField: CustomerSortField; direction: SortDirection }) {
  if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  return direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

export function CustomerMasterTable() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CustomerFilters>(defaultFilters);
  const [sortField, setSortField] = useState<CustomerSortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [loanFiles, setLoanFiles] = useState<LoanFile[]>([]);

  useEffect(() => {
    setLoanFiles(getAllLoanFiles());
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allCustomers.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.loanProduct.toLowerCase().includes(q) ||
        c.lender.toLowerCase().includes(q) ||
        c.relationshipManager.toLowerCase().includes(q);

      const matchesStatus = filters.status === "all" || c.status === filters.status;
      const matchesProduct = filters.loanProduct === "all" || c.loanProduct === filters.loanProduct;
      const matchesLender = filters.lender === "all" || c.lender === filters.lender;
      const matchesRm = filters.relationshipManager === "all" || c.relationshipManager === filters.relationshipManager;

      return matchesSearch && matchesStatus && matchesProduct && matchesLender && matchesRm;
    });
  }, [search, filters]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      let cmp = 0;
      if (typeof aVal === "number" && typeof bVal === "number") cmp = aVal - bVal;
      else if (typeof aVal === "string" && typeof bVal === "string") cmp = aVal.localeCompare(bVal);
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field: CustomerSortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.loanProduct !== "all" ||
    filters.lender !== "all" ||
    filters.relationshipManager !== "all" ||
    search.length > 0;

  const clearFilters = () => {
    setSearch("");
    setFilters(defaultFilters);
    setPage(1);
  };

  const SortableHead = ({ field, children, className }: { field: CustomerSortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
      >
        {children}
        <SortIcon field={field} sortField={sortField} direction={sortDirection} />
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers, mobile, city..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filters.status} onValueChange={(v) => { setFilters((f) => ({ ...f, status: v as CustomerFilters["status"] })); setPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {customerStatusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.loanProduct} onValueChange={(v) => { setFilters((f) => ({ ...f, loanProduct: v })); setPage(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Product" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {loanProducts.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.lender} onValueChange={(v) => { setFilters((f) => ({ ...f, lender: v })); setPage(1); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Lender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lenders</SelectItem>
              {lenders.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.relationshipManager} onValueChange={(v) => { setFilters((f) => ({ ...f, relationshipManager: v })); setPage(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="RM" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All RMs</SelectItem>
              {relationshipManagers.map((rm) => <SelectItem key={rm} value={rm}>{rm}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <SortableHead field="name">Customer Name</SortableHead>
                <TableHead className="hidden md:table-cell">Mobile</TableHead>
                <SortableHead field="city" className="hidden sm:table-cell">City</SortableHead>
                <SortableHead field="loanProduct" className="hidden lg:table-cell">Loan Product</SortableHead>
                <SortableHead field="lender" className="hidden xl:table-cell">Lender</SortableHead>
                <SortableHead field="loanAmount">Loan Amount</SortableHead>
                <TableHead className="hidden xl:table-cell">Loans</TableHead>
                <TableHead className="hidden xl:table-cell">Pipeline Stage</TableHead>
                <TableHead className="hidden xl:table-cell">Exp. Revenue</TableHead>
                <SortableHead field="status">Status</SortableHead>
                <SortableHead field="relationshipManager" className="hidden lg:table-cell">RM</SortableHead>
                <SortableHead field="createdAt" className="hidden md:table-cell">Created</SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                    No customers match your search or filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((customer: Customer) => {
                  const stats = computeCustomerLoanStats(customer.id, loanFiles);
                  return (
                  <TableRow key={customer.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <Link href={`${ROUTES.LOAN_FILES}?customer=${customer.id}`} className="hover:text-primary hover:underline">
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{customer.mobile}</TableCell>
                    <TableCell className="hidden sm:table-cell">{customer.city}</TableCell>
                    <TableCell className="hidden lg:table-cell">{customer.loanProduct}</TableCell>
                    <TableCell className="hidden xl:table-cell">{customer.lender}</TableCell>
                    <TableCell className="font-medium">
                      {stats.loanCount > 0 ? formatINR(stats.totalLoanAmount) : formatINR(customer.loanAmount)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-center">{stats.loanCount || "—"}</TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground text-xs">{stats.currentStage}</TableCell>
                    <TableCell className="hidden xl:table-cell text-accent text-sm">
                      {stats.expectedRevenue > 0 ? formatINR(stats.expectedRevenue) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusPill variant={statusVariant[customer.status]}>
                        {statusLabel[customer.status]}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{customer.relationshipManager}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {new Date(customer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3 bg-muted/20">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length} customers
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm tabular-nums px-2">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
