"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { demoNewArrivals, deriveLeadSource } from "@/data/catalyst-one/dashboard";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { formatINRCompact } from "@/lib/format-currency";
import { getAllLoanFiles } from "@/lib/loan-files-utils";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NewArrivalRow } from "@/types/catalyst-one";

const SEVENTY_TWO_HOURS_MS = 72 * 3600_000;

export function NewArrivalsWidget() {
  const router = useRouter();
  const { dateRange } = useDashboardFilter();
  const [loanFiles, setLoanFiles] = useState<ReturnType<typeof getAllLoanFiles>>([]);

  useEffect(() => {
    setLoanFiles(getAllLoanFiles());
  }, []);

  const arrivals = useMemo(() => {
    const cutoff = Date.now() - SEVENTY_TWO_HOURS_MS;
    const fromFiles: NewArrivalRow[] = loanFiles
      .filter((file) => !file.archived && new Date(file.createdAt).getTime() >= cutoff)
      .map((file) => ({
        id: `file-${file.id}`,
        fileId: file.id,
        customerName: file.customerName,
        source: deriveLeadSource(file.id),
        product: file.loanProduct,
        loanAmount: file.loanAmount,
        createdAt: file.createdAt,
      }));

    const merged = [...fromFiles, ...demoNewArrivals];
    const unique = new Map<string, NewArrivalRow>();
    merged.forEach((row) => unique.set(row.fileId, row));

    return Array.from(unique.values())
      .filter((row) => new Date(row.createdAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [loanFiles]);

  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              New Arrivals
              <Sparkles className="h-4 w-4 text-accent" />
            </CardTitle>
            <CardDescription>
              Files created in the last 72 hours · {dateRange.label}
            </CardDescription>
          </div>
          <Link
            href="/loan-files?filter=new"
            className="text-xs font-medium text-primary hover:underline shrink-0"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {arrivals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No new files in the last 72 hours
                </TableCell>
              </TableRow>
            ) : (
              arrivals.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => router.push(`/loan-files?file=${row.fileId}`)}
                >
                  <TableCell className="font-medium">{row.customerName}</TableCell>
                  <TableCell>{row.source}</TableCell>
                  <TableCell className="max-w-[140px] truncate">{row.product}</TableCell>
                  <TableCell>{formatINRCompact(row.loanAmount)}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(row.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
