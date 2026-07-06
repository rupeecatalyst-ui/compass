"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { getProductColor } from "@/constants/product-colors";
import { formatINRCompact } from "@/lib/format-currency";
import type { PortfolioIntelligence, PortfolioSlice } from "@/lib/customer-utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RelationshipPortfolioSectionProps {
  data: PortfolioSlice[];
  intelligence: PortfolioIntelligence;
  onProductClick?: (product: string) => void;
}

/** CRC-011 / CRC-012 / CRC-014 — Relationship portfolio visualization + intelligence. */
export function RelationshipPortfolioSection({
  data,
  intelligence,
  onProductClick,
}: RelationshipPortfolioSectionProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/10 p-4 h-[260px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No disbursed engagements yet.</p>
      </div>
    );
  }

  const total = intelligence.totalRelationshipValue;

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-foreground">Relationship Portfolio</h4>
        <p className="text-[10px] text-muted-foreground">Disbursed Value by Product</p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-center">
        <div className="relative h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="product"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={88}
                paddingAngle={3}
                isAnimationActive
                animationBegin={0}
                animationDuration={800}
                activeShape={(props: PieSectorDataItem) => (
                  <Sector
                    {...props}
                    outerRadius={(props.outerRadius ?? 88) + 6}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                )}
                onClick={(_, index) => {
                  const slice = data[index];
                  if (slice) onProductClick?.(slice.product);
                }}
                style={{ cursor: onProductClick ? "pointer" : "default" }}
              >
                {data.map((slice, i) => (
                  <Cell key={slice.product} fill={getProductColor(slice.product, i)} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const item = payload[0].payload as PortfolioSlice;
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-semibold">{item.product}</p>
                      <p>{formatINRCompact(item.value)} · {pct}%</p>
                      <p className="text-muted-foreground">
                        {item.count} loan{item.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Total Relationship Value
            </p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {formatINRCompact(total)}
            </p>
          </div>
        </div>

        <PortfolioIntelligenceSummary intelligence={intelligence} />
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        {data.map((d, i) => (
          <button
            key={d.product}
            type="button"
            onClick={() => onProductClick?.(d.product)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getProductColor(d.product, i) }}
            />
            {d.product}
          </button>
        ))}
      </div>
    </div>
  );
}

function PortfolioIntelligenceSummary({
  intelligence,
}: {
  intelligence: PortfolioIntelligence;
}) {
  const items = useMemo(
    () => [
      {
        label: "Total Relationship Value",
        value: formatINRCompact(intelligence.totalRelationshipValue),
        accent: true,
      },
      {
        label: "Total Disbursed Loans",
        value: String(intelligence.totalDisbursedLoans),
      },
      {
        label: "Largest Product",
        value: intelligence.largestProduct,
      },
      {
        label: "Average Ticket Size",
        value: formatINRCompact(intelligence.averageTicketSize),
      },
      {
        label: "First Engagement Date",
        value: intelligence.firstEngagementDate
          ? format(new Date(intelligence.firstEngagementDate), "dd MMM yyyy")
          : "—",
      },
      {
        label: "Latest Engagement",
        value: intelligence.latestDisbursement
          ? format(new Date(intelligence.latestDisbursement), "dd MMM yyyy")
          : "—",
      },
    ],
    [intelligence],
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border bg-background/60 px-3 py-2"
        >
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
          <p
            className={cn(
              "text-sm font-medium mt-0.5 truncate",
              item.accent && "text-success font-semibold",
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
