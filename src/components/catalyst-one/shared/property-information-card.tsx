"use client";

import { Building2 } from "lucide-react";
import { OccupancySelect } from "@/components/catalyst-one/shared/occupancy-select";
import { PropertyTypeSelect } from "@/components/catalyst-one/shared/property-type-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINRInput, parseINRInput } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import type { PropertyType } from "@/constants/loan-stage-master";
import type { OccupancyMasterEntry } from "@/constants/occupancy-master";

export interface PropertyInformationValues {
  propertyType?: string;
  occupancyId?: string;
  approxPropertyValue?: number;
}

export interface PropertyInformationCardProps {
  loanProduct: string;
  values: PropertyInformationValues;
  onPropertyTypeChange: (type: PropertyType) => void;
  onOccupancyChange: (entry: OccupancyMasterEntry) => void;
  onApproxPropertyValueChange: (value: number | undefined) => void;
  /** Reserved slot for future property-related fields (valuation, address, etc.). */
  children?: React.ReactNode;
  className?: string;
}

/** CRC-10.3 — Grouped property qualification fields for secured products. */
export function PropertyInformationCard({
  loanProduct,
  values,
  onPropertyTypeChange,
  onOccupancyChange,
  onApproxPropertyValueChange,
  children,
  className,
}: PropertyInformationCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/70 bg-muted/15 shadow-sm",
        "dark:bg-muted/10",
        className,
      )}
      aria-label="Property Information"
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 sm:px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-4 w-4" />
        </span>
        <h4 className="text-sm font-semibold text-foreground">Property Information</h4>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <PropertyField label="Property Type *">
          <PropertyTypeSelect
            value={values.propertyType}
            onSelect={onPropertyTypeChange}
          />
        </PropertyField>

        <PropertyField label="Property Occupancy *">
          <OccupancySelect
            loanProduct={loanProduct}
            value={values.occupancyId}
            onSelect={onOccupancyChange}
          />
        </PropertyField>

        <PropertyField label="Approximate Property Value (₹)" className="sm:col-span-2 lg:col-span-1">
          <Input
            className="h-8 text-xs"
            inputMode="numeric"
            placeholder="e.g. 75,00,000"
            value={formatINRInput(values.approxPropertyValue)}
            onChange={(e) => {
              const amount = parseINRInput(e.target.value);
              onApproxPropertyValueChange(amount > 0 ? amount : undefined);
            }}
          />
        </PropertyField>

        {children}
      </div>
    </section>
  );
}

function PropertyField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
