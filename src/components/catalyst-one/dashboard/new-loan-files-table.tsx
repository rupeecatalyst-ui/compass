"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoLoanFileRows, deriveLeadSource } from "@/data/catalyst-one/dashboard";
import { STAGE_LABELS } from "@/constants/loan-pipeline";
import { formatINRCompact } from "@/lib/format-currency";
import { getAllLoanFiles } from "@/lib/loan-files-utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import type { DashboardLoanFileRow } from "@/types/catalyst-one";

const SEVENTY_TWO_HOURS_MS = 72 * 3600_000;
const HIGH_VALUE_THRESHOLD = 80_00_000;

const priorityStyles = {
  urgent: "border-red-500/40 bg-red-500/10 text-red-300",
  high: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  medium: "border-slate-600/40 bg-slate-800/50 text-slate-400",
  low: "border-slate-700/40 bg-slate-900/50 text-slate-500",
} as const;

function computeAgeing(createdAt: string): string {
  const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600_000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function inferPriority(loanAmount: number, ageing: string, stage?: string): DashboardLoanFileRow["priority"] {
  const days = parseInt(ageing, 10);
  const isDelayed = ageing.endsWith("d") && days >= 2;
  const isCredit = stage?.toLowerCase().includes("credit");
  if (loanAmount >= HIGH_VALUE_THRESHOLD && isDelayed) return "urgent";
  if (isDelayed || isCredit) return "high";
  if (loanAmount >= HIGH_VALUE_THRESHOLD) return "high";
  return "medium";
}

export function NewLoanFilesTable() {
  const router = useRouter();
  const [loanFiles, setLoanFiles] = useState<ReturnType<typeof getAllLoanFiles>>([]);

  useEffect(() => {
    setLoanFiles(getAllLoanFiles());
  }, []);

  const rows = useMemo(() => {
    const cutoff = Date.now() - SEVENTY_TWO_HOURS_MS;
    const fromFiles: DashboardLoanFileRow[] = loanFiles
      .filter((file) => !file.archived && new Date(file.createdAt).getTime() >= cutoff)
      .map((file) => {
        const ageing = computeAgeing(file.createdAt);
        const stage = STAGE_LABELS[file.stage];
        return {
          id: `file-${file.id}`,
          fileId: file.id,
          customerName: file.customerName,
          source: deriveLeadSource(file.id),
          product: file.loanProduct,
          loanAmount: file.loanAmount,
          assignedRm: file.relationshipManager,
          currentStage: stage,
          createdAt: file.createdAt,
          ageing,
          priority: inferPriority(file.loanAmount, ageing, stage),
        };
      });

    const merged = [...fromFiles, ...demoLoanFileRows];
    const unique = new Map<string, DashboardLoanFileRow>();
    merged.forEach((row) => unique.set(row.fileId, row));

    return Array.from(unique.values())
      .filter((row) => new Date(row.createdAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [loanFiles]);

  return (
    <DashboardCard>
      <DashboardCardHeader
        title="New Loan Files"
        description="Last 72 hours"
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
                <TableHead className="text-slate-500 text-[10px] h-8 pl-4">Customer</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-8">Product</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-8">Amount</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-8">RM</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-8">Stage</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-8">Ageing</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-8 pr-4">Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={7} className="h-16 text-center text-slate-500 text-xs">
                    No new files in the last 72 hours
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const isHighValue = row.loanAmount >= HIGH_VALUE_THRESHOLD;
                  const isDelayed = row.ageing.endsWith("d") && parseInt(row.ageing, 10) >= 2;
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "border-slate-800 cursor-pointer hover:bg-slate-800/40",
                        (isHighValue || isDelayed || row.priority === "urgent") &&
                          "bg-red-950/10 hover:bg-red-950/20",
                      )}
                      onClick={() => router.push(`/loan-files?file=${row.fileId}`)}
                    >
                      <TableCell className="text-xs font-medium text-slate-200 py-2 pl-4">
                        {row.customerName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 py-2 max-w-[100px] truncate">
                        {row.product}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-xs py-2 tabular-nums",
                          isHighValue ? "text-teal-300 font-medium" : "text-slate-200",
                        )}
                      >
                        {formatINRCompact(row.loanAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 py-2 max-w-[80px] truncate">
                        {row.assignedRm ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 py-2">{row.currentStage ?? "—"}</TableCell>
                      <TableCell
                        className={cn(
                          "text-xs py-2 tabular-nums",
                          isDelayed ? "text-amber-400" : "text-slate-500",
                        )}
                      >
                        {row.ageing}
                      </TableCell>
                      <TableCell className="py-2 pr-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-4 px-1.5 text-[9px] capitalize border",
                            priorityStyles[row.priority],
                          )}
                        >
                          {row.priority}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DashboardCardContent>
    </DashboardCard>
  );
}
