"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoNewArrivals, deriveLeadSource } from "@/data/catalyst-one/dashboard";
import { STAGE_LABELS } from "@/constants/loan-pipeline";
import { formatINRCompact } from "@/lib/format-currency";
import { getAllLoanFiles } from "@/lib/loan-files-utils";
import { formatRelativeTime } from "@/lib/utils";
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
} from "@/components/catalyst-one/dashboard/dashboard-card";
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

export function NewArrivalsPanel() {
  const router = useRouter();
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
        assignedRm: file.relationshipManager,
        currentStage: STAGE_LABELS[file.stage],
        createdAt: file.createdAt,
      }));

    const merged = [...fromFiles, ...demoNewArrivals];
    const unique = new Map<string, NewArrivalRow>();
    merged.forEach((row) => unique.set(row.fileId, row));

    return Array.from(unique.values())
      .filter((row) => new Date(row.createdAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [loanFiles]);

  return (
    <DashboardCard>
      <DashboardCardHeader
        title="New files"
        description="Created in the last 72 hours"
        action={
          <Link href="/loan-files?filter=new" className="text-[10px] font-medium text-teal-400 hover:underline">
            View all
          </Link>
        }
      />
      <DashboardCardContent className="pt-0 px-0 pb-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-500 text-[10px] h-8">Customer</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-8">Source</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-8">Product</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-8">Amount</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-8">RM</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-8">Stage</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-8">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arrivals.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={7} className="h-16 text-center text-slate-500 text-xs">
                    No new files in the last 72 hours
                  </TableCell>
                </TableRow>
              ) : (
                arrivals.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-slate-800 cursor-pointer hover:bg-slate-800/40"
                    onClick={() => router.push(`/loan-files?file=${row.fileId}`)}
                  >
                    <TableCell className="text-xs font-medium text-slate-200 py-2">{row.customerName}</TableCell>
                    <TableCell className="text-xs text-slate-400 py-2">{row.source}</TableCell>
                    <TableCell className="text-xs text-slate-400 py-2 max-w-[100px] truncate">{row.product}</TableCell>
                    <TableCell className="text-xs text-slate-200 py-2 tabular-nums">{formatINRCompact(row.loanAmount)}</TableCell>
                    <TableCell className="text-xs text-slate-400 py-2 max-w-[90px] truncate">{row.assignedRm ?? "—"}</TableCell>
                    <TableCell className="text-xs text-slate-400 py-2">{row.currentStage ?? "—"}</TableCell>
                    <TableCell className="text-xs text-slate-500 py-2 whitespace-nowrap">{formatRelativeTime(row.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DashboardCardContent>
    </DashboardCard>
  );
}
