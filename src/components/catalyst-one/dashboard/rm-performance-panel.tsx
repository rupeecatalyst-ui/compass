"use client";

import Link from "next/link";
import { rmPerformanceRows } from "@/data/catalyst-one/dashboard";
import { ROUTES } from "@/constants/routes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
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

export function RmPerformancePanel() {
  return (
    <DashboardCard>
      <DashboardCardHeader
        title="RM Performance"
        description="Active files & conversion"
        action={
          <Link
            href={`${ROUTES.REPORTS}?tab=rm-performance`}
            className="text-[10px] font-medium text-teal-400 hover:underline"
          >
            Full report
          </Link>
        }
      />
      <DashboardCardContent className="pt-0 px-0 pb-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-500 text-[10px] h-7 pl-4">RM</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-7 text-right">Files</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-7 text-right">Sanctions</TableHead>
                <TableHead className="text-slate-500 text-[10px] h-7 text-right pr-4">Conv.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rmPerformanceRows.map((row) => (
                <TableRow key={row.id} className="border-slate-800 hover:bg-slate-800/30">
                  <TableCell className="py-1.5 pl-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-6 w-6 border border-slate-700">
                        <AvatarFallback className="text-[9px] bg-teal-500/10 text-teal-400">
                          {row.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-slate-200 truncate max-w-[90px]">{row.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 py-1.5 text-right tabular-nums">
                    {row.activeFiles}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 py-1.5 text-right tabular-nums">
                    {row.sanctions}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-xs py-1.5 text-right tabular-nums pr-4 font-medium",
                      row.conversion >= 70 ? "text-teal-400" : "text-slate-400",
                    )}
                  >
                    {row.conversion}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DashboardCardContent>
    </DashboardCard>
  );
}
