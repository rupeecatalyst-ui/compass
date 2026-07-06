"use client";

import { useCallback, useRef, useState } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { CUSTOMER_LIST_COLUMNS } from "@/constants/customer-360";
import { CustomerHealthBadge } from "@/components/catalyst-one/customers/customer-health-badge";
import { useCustomersContext } from "@/components/catalyst-one/customers/customers-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatINRCompact } from "@/lib/format-currency";
import { formatCustomerId, getCustomerInitials } from "@/lib/customer-utils";
import { cn } from "@/lib/utils";
import type { CustomerListColumnKey, CustomerListSortField, CustomerProfile } from "@/types/catalyst-one";

const ROW_HEIGHT = 44;
const OVERSCAN = 6;

const SORTABLE: Partial<Record<CustomerListColumnKey, CustomerListSortField>> = {
  customer: "name",
  company: "company",
  city: "city",
  rm: "relationshipManager",
  activeLoans: "activeLoans",
  pipelineValue: "pipelineValue",
  revenue: "revenue",
  lastContact: "lastContact",
  status: "health",
};

function SortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: CustomerListSortField;
  sortField: CustomerListSortField;
  sortDirection: "asc" | "desc";
}) {
  if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return sortDirection === "asc" ? (
    <ArrowUp className="h-3 w-3" />
  ) : (
    <ArrowDown className="h-3 w-3" />
  );
}

function CustomerRow({
  customer,
  visibleColumns,
  onClick,
  getMetrics,
}: {
  customer: CustomerProfile;
  visibleColumns: CustomerListColumnKey[];
  onClick: () => void;
  getMetrics: (id: string) => ReturnType<typeof import("@/lib/customer-utils").computeCustomer360Metrics>;
}) {
  const metrics = getMetrics(customer.id);

  const cell = (key: CustomerListColumnKey) => {
    switch (key) {
      case "customer":
        return (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {getCustomerInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate text-foreground">{customer.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{formatCustomerId(customer.id)}</p>
            </div>
          </div>
        );
      case "mobile":
        return <span className="text-xs text-muted-foreground">{customer.mobile}</span>;
      case "company":
        return <span className="text-xs truncate">{customer.company}</span>;
      case "city":
        return <span className="text-xs">{customer.city}</span>;
      case "rm":
        return <span className="text-xs truncate">{customer.relationshipManager}</span>;
      case "activeLoans":
        return <span className="text-xs tabular-nums">{metrics.activeLoans}</span>;
      case "pipelineValue":
        return <span className="text-xs tabular-nums font-medium text-success">{formatINRCompact(metrics.pipelineValue)}</span>;
      case "revenue":
        return <span className="text-xs tabular-nums">{formatINRCompact(metrics.revenueGenerated)}</span>;
      case "lastContact":
        return (
          <span className="text-xs text-muted-foreground">
            {format(new Date(customer.lastContact), "dd MMM yyyy")}
          </span>
        );
      case "status":
        return <CustomerHealthBadge health={customer.health} />;
      default:
        return null;
    }
  };

  return (
    <div
      role="row"
      className="flex items-center border-b border-border hover:bg-muted/40 cursor-pointer transition-colors"
      style={{ height: ROW_HEIGHT }}
      onClick={onClick}
    >
      {CUSTOMER_LIST_COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => (
        <div
          key={col.key}
          className={cn(
            "px-3 shrink-0 overflow-hidden",
            col.key === "customer" ? "flex-[2] min-w-[180px]" : "flex-1 min-w-[90px]",
          )}
        >
          {cell(col.key)}
        </div>
      ))}
    </div>
  );
}

export function CustomersListView() {
  const {
    filteredCustomers,
    visibleColumns,
    openCustomer,
    sortField,
    sortDirection,
    toggleSort,
    getMetrics,
  } = useCustomersContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const onScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (node) {
      setContainerHeight(node.clientHeight);
      const ro = new ResizeObserver(() => setContainerHeight(node.clientHeight));
      ro.observe(node);
    }
  }, []);

  const totalHeight = filteredCustomers.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(filteredCustomers.length, startIndex + visibleCount);
  const visibleRows = filteredCustomers.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  const visibleColDefs = CUSTOMER_LIST_COLUMNS.filter((c) => visibleColumns.includes(c.key));

  return (
    <div className="flex flex-col h-full min-h-0 rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center border-b border-border bg-muted/30 shrink-0" style={{ height: 36 }}>
        {visibleColDefs.map((col) => {
          const sortKey = SORTABLE[col.key];
          return (
            <div
              key={col.key}
              className={cn(
                "px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0 flex items-center gap-1",
                col.key === "customer" ? "flex-[2] min-w-[180px]" : "flex-1 min-w-[90px]",
                sortKey && "cursor-pointer hover:text-foreground select-none",
              )}
              onClick={sortKey ? () => toggleSort(sortKey) : undefined}
            >
              {col.label}
              {sortKey && (
                <SortIcon field={sortKey} sortField={sortField} sortDirection={sortDirection} />
              )}
            </div>
          );
        })}
      </div>

      <div ref={setRef} className="flex-1 min-h-0 overflow-auto" onScroll={onScroll}>
        {filteredCustomers.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No customers match your filters
          </div>
        ) : (
          <div style={{ height: totalHeight, position: "relative" }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleRows.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  visibleColumns={visibleColumns}
                  onClick={() => openCustomer(customer.id)}
                  getMetrics={getMetrics}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
