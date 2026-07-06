"use client";

import { format } from "date-fns";
import {
  Calendar,
  FilePlus,
  Mail,
  MessageCircle,
  Phone,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { CustomerHealthBadge } from "@/components/catalyst-one/customers/customer-health-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINRCompact } from "@/lib/format-currency";
import { formatCustomerId, getCustomerInitials } from "@/lib/customer-utils";
import type { Customer360Metrics, CustomerProfile } from "@/types/catalyst-one";

interface Customer360HeaderProps {
  customer: CustomerProfile;
  metrics: Customer360Metrics;
  onAddLoan: () => void;
  onAddTask: () => void;
  onUploadDocument: () => void;
}

/** CRC-009 snapshot fields in header. */
export function Customer360Header({
  customer,
  metrics,
  onAddLoan,
  onAddTask,
  onUploadDocument,
}: Customer360HeaderProps) {
  const whatsapp = customer.mobile.replace(/\D/g, "").slice(-10);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
            {getCustomerInitials(customer.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">{customer.name}</h2>
            <CustomerHealthBadge health={customer.health} />
            {customer.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="h-5 text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{customer.company}</p>

          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-1 text-xs">
            <Meta label="Customer Since" value={format(new Date(customer.customerSince), "dd MMM yyyy")} />
            <Meta label="Relationship Manager" value={customer.relationshipManager} />
            <Meta label="Active Exposure" value={formatINRCompact(metrics.pipelineValue)} />
            <Meta label="Pipeline" value={formatINRCompact(metrics.pipelineValue)} />
            <Meta label="Products Used" value={String(metrics.activeLoans + metrics.completedLoans)} />
            <Meta label="Relationship Score" value={`${customer.relationshipScore}/100`} />
            <Meta label="Last Contact" value={format(new Date(customer.lastContact), "dd MMM yyyy")} />
            <Meta label="Customer ID" value={formatCustomerId(customer.id)} />
            <Meta label="Lead Source" value={customer.leadSource} />
            <Meta label="Status" value={customer.isActive ? "Active" : "Inactive"} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
          <Link href={`tel:${customer.mobile}`}>
            <Phone className="h-3.5 w-3.5 mr-1" />
            Call
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
          <a href={`https://wa.me/91${whatsapp}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-3.5 w-3.5 mr-1" />
            WhatsApp
          </a>
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
          <Link href={`mailto:${customer.email}`}>
            <Mail className="h-3.5 w-3.5 mr-1" />
            Email
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onAddLoan}>
          <FilePlus className="h-3.5 w-3.5 mr-1" />
          Add Loan
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onAddTask}>
          <Calendar className="h-3.5 w-3.5 mr-1" />
          Add Task
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onUploadDocument}>
          <Upload className="h-3.5 w-3.5 mr-1" />
          Upload Document
        </Button>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <p className="font-medium text-foreground truncate">{value}</p>
    </div>
  );
}
