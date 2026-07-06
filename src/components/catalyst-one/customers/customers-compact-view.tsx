"use client";

import { CustomerHealthBadge } from "@/components/catalyst-one/customers/customer-health-badge";
import { useCustomersContext } from "@/components/catalyst-one/customers/customers-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatINRCompact } from "@/lib/format-currency";
import { getCustomerInitials } from "@/lib/customer-utils";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 36;

export function CustomersCompactView() {
  const { filteredCustomers, openCustomer, getMetrics } = useCustomersContext();

  if (filteredCustomers.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground rounded-lg border border-border bg-card">
        No customers match your filters
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 rounded-lg border border-border bg-card overflow-hidden">
      <div
        className="grid grid-cols-[minmax(180px,2fr)_minmax(100px,1fr)_minmax(80px,0.6fr)_minmax(80px,0.6fr)_minmax(90px,0.7fr)_minmax(100px,0.8fr)] gap-2 px-3 border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0 items-center"
        style={{ height: 32 }}
      >
        <span>Customer</span>
        <span>Company</span>
        <span className="text-right">Pipeline</span>
        <span className="text-right">Loans</span>
        <span className="text-right">Score</span>
        <span>Health</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {filteredCustomers.map((customer) => {
          const metrics = getMetrics(customer.id);
          return (
            <button
              key={customer.id}
              type="button"
              onClick={() => openCustomer(customer.id)}
              className={cn(
                "w-full grid grid-cols-[minmax(180px,2fr)_minmax(100px,1fr)_minmax(80px,0.6fr)_minmax(80px,0.6fr)_minmax(90px,0.7fr)_minmax(100px,0.8fr)] gap-2 px-3 items-center",
                "border-b border-border hover:bg-muted/40 transition-colors text-left",
              )}
              style={{ height: ROW_HEIGHT }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                    {getCustomerInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{customer.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{customer.city}</p>
                </div>
              </div>
              <span className="text-xs truncate text-muted-foreground">{customer.company}</span>
              <span className="text-xs text-right tabular-nums font-medium text-success">
                {formatINRCompact(metrics.pipelineValue)}
              </span>
              <span className="text-xs text-right tabular-nums">{metrics.activeLoans}</span>
              <span className="text-xs text-right tabular-nums">{customer.relationshipScore}</span>
              <CustomerHealthBadge health={customer.health} className="w-fit" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
