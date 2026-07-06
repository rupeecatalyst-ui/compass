"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { getLenderInitials, getRmInitials } from "@/data/catalyst-one/dashboard";
import { STAGE_LABELS } from "@/constants/loan-pipeline";
import { ROUTES } from "@/constants/routes";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { formatINRCompact } from "@/lib/format-currency";
import { getAllLoanFiles } from "@/lib/loan-files-utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { LoanFile, PipelineStage } from "@/types/catalyst-one";

const PREVIEW_STAGES: PipelineStage[] = [
  "logged_in",
  "credit_wip",
  "soft_approved",
  "final_approved",
  "closure_wip",
];

const CARDS_PER_COLUMN = 5;

export function DashboardKanbanPreview() {
  const router = useRouter();
  const { dateRange } = useDashboardFilter();
  const [files, setFiles] = useState<LoanFile[]>([]);

  useEffect(() => {
    setFiles(getAllLoanFiles().filter((file) => !file.archived));
  }, []);

  const columns = useMemo(() => {
    return PREVIEW_STAGES.map((stage) => ({
      stage,
      label: STAGE_LABELS[stage],
      files: files.filter((file) => file.stage === stage).slice(0, CARDS_PER_COLUMN),
    }));
  }, [files]);

  return (
    <Card className="glass-card border-border/60 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Pipeline Kanban</CardTitle>
            <CardDescription>
              Active files across key stages · {dateRange.label}
            </CardDescription>
          </div>
          <Link
            href={`${ROUTES.LOAN_FILES}?view=kanban`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
          >
            Open Kanban
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ScrollArea className="w-full">
          <div className="flex gap-2.5 pb-2 min-h-[420px]">
            {columns.map((column, columnIndex) => (
              <div
                key={column.stage}
                className="flex w-[210px] shrink-0 flex-col rounded-xl border border-border/50 bg-muted/20"
              >
                <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
                  <p className="text-xs font-semibold truncate">{column.label}</p>
                  <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium">
                    {column.files.length}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-2">
                  {column.files.map((file, index) => (
                    <motion.button
                      key={file.id}
                      type="button"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: columnIndex * 0.04 + index * 0.03 }}
                      onClick={() => router.push(`${ROUTES.LOAN_FILES}?file=${file.id}`)}
                      className={cn(
                        "rounded-lg border border-border/60 bg-card p-2.5 text-left shadow-sm",
                        "hover:border-primary/30 hover:shadow-md transition-all",
                        "border-l-[3px] border-l-primary/60",
                      )}
                    >
                      <p className="text-xs font-semibold leading-snug line-clamp-2 mb-2">
                        {file.customerName}
                      </p>
                      <p className="text-sm font-bold text-primary mb-2">
                        {formatINRCompact(file.loanAmount)}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-accent/10 text-[9px] font-bold text-primary">
                            {getLenderInitials(file.lender)}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {file.lender.replace(" Bank", "")}
                          </span>
                        </div>
                        <Avatar className="h-6 w-6 border border-border/60">
                          <AvatarFallback className="text-[9px] bg-accent/10 text-accent">
                            {getRmInitials(file.relationshipManager)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
