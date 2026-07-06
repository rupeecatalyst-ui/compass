"use client";

import { format } from "date-fns";
import { Mail, Phone } from "lucide-react";
import { CustomerHealthBadge } from "@/components/catalyst-one/customers/customer-health-badge";
import { useCustomersContext } from "@/components/catalyst-one/customers/customers-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatINRCompact } from "@/lib/format-currency";
import { formatCustomerId, getCustomerInitials } from "@/lib/customer-utils";
import { cn } from "@/lib/utils";

export function CustomersCardView() {
  const { filteredCustomers, openCustomer, getMetrics } = useCustomersContext();

  if (filteredCustomers.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground rounded-lg border border-border bg-card">
        No customers match your filters
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 overflow-auto h-full min-h-0 pb-1">
      {filteredCustomers.map((customer) => {
        const metrics = getMetrics(customer.id);
        return (
          <button
            key={customer.id}
            type="button"
            onClick={() => openCustomer(customer.id)}
            className={cn(
              "text-left rounded-lg border border-border bg-card p-3",
              "hover:border-primary/30 hover:bg-muted/30 transition-colors",
            )}
          >
            <div className="flex items-start gap-2.5">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getCustomerInitials(customer.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate text-foreground">{customer.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{customer.company}</p>
                <p className="text-[10px] text-muted-foreground">{formatCustomerId(customer.id)}</p>
              </div>
              <CustomerHealthBadge health={customer.health} showDot={false} />
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[10px]">
              <div>
                <span className="text-muted-foreground">Pipeline</span>
                <p className="font-semibold text-success tabular-nums">{formatINRCompact(metrics.pipelineValue)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Revenue</span>
                <p className="font-medium tabular-nums">{formatINRCompact(metrics.revenueGenerated)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Active Loans</span>
                <p className="font-medium tabular-nums">{metrics.activeLoans}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Score</span>
                <p className="font-medium tabular-nums">{customer.relationshipScore}/100</p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {customer.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="h-4 text-[9px] px-1.5">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="truncate">{customer.relationshipManager}</span>
              <span>{format(new Date(customer.lastContact), "dd MMM")}</span>
            </div>

            <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1 truncate">
                <Phone className="h-3 w-3 shrink-0" />
                {customer.mobile}
              </span>
              {customer.email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  {customer.email}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
