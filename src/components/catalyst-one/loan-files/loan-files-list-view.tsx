"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import {
  loanFileStatusOptions,
  loanLenders,
  loanProducts,
} from "@/data/catalyst-one/loan-files";
import { formatINR } from "@/lib/format-currency";
import { STAGE_LABELS, PIPELINE_STAGES } from "@/constants/loan-pipeline";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
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
import type { LoanFileSortField, SortDirection } from "@/types/catalyst-one";

const PAGE_SIZE = 10;

const statusVariant = {
  on_track: "success" as const,
  at_risk: "warning" as const,
  delayed: "error" as const,
  completed: "default" as const,
};

const statusLabel = {
  on_track: "On Track",
  at_risk: "At Risk",
  delayed: "Delayed",
  completed: "Completed",
};

function SortIcon({ field, sortField, direction }: { field: LoanFileSortField; sortField: LoanFileSortField; direction: SortDirection }) {
  if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  return direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

export function LoanFilesListView() {
  const { filteredFiles, filters, setFilters, clearFilters, setSelectedFileId } = useLoanFiles();
  const [sortField, setSortField] = useState<LoanFileSortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      let cmp = 0;
      if (typeof aVal === "number" && typeof bVal === "number") cmp = aVal - bVal;
      else cmp = String(aVal).localeCompare(String(bVal));
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredFiles, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field: LoanFileSortField) => {
    if (sortField === field) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDirection("asc"); }
    setPage(1);
  };

  const hasFilters =
    filters.stage !== "all" ||
    filters.loanProduct !== "all" ||
    filters.lender !== "all" ||
    filters.relationshipManager !== "all" ||
    filters.priority !== "all" ||
    filters.status !== "all";

  const SortHead = ({ field, children, className }: { field: LoanFileSortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button type="button" onClick={() => handleSort(field)} className="inline-flex items-center gap-1 hover:text-foreground">
        {children}
        <SortIcon field={field} sortField={sortField} direction={sortDirection} />
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={filters.stage} onValueChange={(v) => { setFilters((f) => ({ ...f, stage: v as typeof f.stage })); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {PIPELINE_STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.loanProduct} onValueChange={(v) => { setFilters((f) => ({ ...f, loanProduct: v })); setPage(1); }}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Product" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {loanProducts.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.lender} onValueChange={(v) => { setFilters((f) => ({ ...f, lender: v })); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Lender" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lenders</SelectItem>
            {loanLenders.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={(v) => { setFilters((f) => ({ ...f, status: v as typeof f.status })); setPage(1); }}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {loanFileStatusOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear filters
          </Button>
        )}
      </div>

      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-20rem)]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
              <TableRow className="hover:bg-transparent bg-muted/40">
                <SortHead field="customerName">Customer</SortHead>
                <SortHead field="loanProduct" className="hidden md:table-cell">Product</SortHead>
                <SortHead field="loanAmount">Amount</SortHead>
                <SortHead field="lender" className="hidden lg:table-cell">Lender</SortHead>
                <SortHead field="stage">Stage</SortHead>
                <SortHead field="relationshipManager" className="hidden xl:table-cell">RM</SortHead>
                <SortHead field="createdAt" className="hidden sm:table-cell">Created</SortHead>
                <SortHead field="expectedRevenue" className="hidden lg:table-cell">Revenue</SortHead>
                <SortHead field="status">Status</SortHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((file) => (
                <TableRow
                  key={file.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedFileId(file.id)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{file.customerName}</p>
                      <p className="text-xs text-muted-foreground">{file.fileNumber}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{file.loanProduct}</TableCell>
                  <TableCell className="font-medium">{formatINR(file.loanAmount)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{file.lender}</TableCell>
                  <TableCell><StatusPill variant="default">{STAGE_LABELS[file.stage]}</StatusPill></TableCell>
                  <TableCell className="hidden xl:table-cell text-muted-foreground">{file.relationshipManager}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                    {new Date(file.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-accent font-medium">{formatINR(file.expectedRevenue)}</TableCell>
                  <TableCell><StatusPill variant={statusVariant[file.status]}>{statusLabel[file.status]}</StatusPill></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20">
          <p className="text-sm text-muted-foreground">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm tabular-nums">{page}/{totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
