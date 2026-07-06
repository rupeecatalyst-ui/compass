"use client";

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
import { formatCustomerId, getCustomerInitials } from "@/lib/customer-utils";
import { cn } from "@/lib/utils";
import type { CustomerProfile } from "@/types/catalyst-one";

interface CustomerWorkspaceStickyHeaderProps {
  customer: CustomerProfile;
  onAddLoan: () => void;
  onAddTask: () => void;
  onUploadDocument: () => void;
}

const KYC_STYLES: Record<NonNullable<CustomerProfile["kycStatus"]>, string> = {
  verified: "bg-success/10 text-success border-success/30",
  partial: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  pending: "bg-muted text-muted-foreground border-border",
  expired: "bg-destructive/10 text-destructive border-destructive/30",
};

const RISK_STYLES: Record<NonNullable<CustomerProfile["riskRating"]>, string> = {
  low: "text-success",
  medium: "text-amber-600 dark:text-amber-400",
  high: "text-destructive",
};

export function CustomerWorkspaceStickyHeader({
  customer,
  onAddLoan,
  onAddTask,
  onUploadDocument,
}: CustomerWorkspaceStickyHeaderProps) {
  const whatsapp = customer.mobile.replace(/\D/g, "").slice(-10);
  const kyc = customer.kycStatus ?? "pending";
  const risk = customer.riskRating ?? "medium";

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "px-6 py-4 space-y-3 transition-colors",
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarFallback className="text-base bg-primary/10 text-primary font-semibold">
            {getCustomerInitials(customer.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{customer.name}</h2>
            <CustomerHealthBadge health={customer.health} />
            <Badge variant="outline" className={cn("h-5 text-[10px] capitalize border", KYC_STYLES[kyc])}>
              KYC {kyc}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{customer.company}</p>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 text-xs">
            <Field label="Customer ID" value={formatCustomerId(customer.id)} />
            <Field label="Mobile" value={customer.mobile} />
            <Field label="Email" value={customer.email ?? "—"} />
            <Field label="PAN" value={customer.pan} mono />
            <Field label="Aadhaar" value={customer.aadhaar} mono />
            <Field label="Occupation" value={customer.occupation} />
            <Field label="Credit Score" value={customer.creditScore ? String(customer.creditScore) : "—"} accent />
            <Field
              label="Risk Rating"
              value={risk}
              className={RISK_STYLES[risk]}
            />
            <Field label="Relationship Manager" value={customer.relationshipManager} />
            <Field label="KYC Status" value={kyc} className={KYC_STYLES[kyc].split(" ")[1]} />
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
    </header>
  );
}

function Field({
  label,
  value,
  mono,
  accent,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <p
        className={cn(
          "font-medium truncate capitalize",
          mono && "font-mono text-[11px]",
          accent && "text-success",
          className,
        )}
      >
        {value}
      </p>
    </div>
  );
}
