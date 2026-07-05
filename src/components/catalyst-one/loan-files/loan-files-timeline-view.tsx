"use client";

import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/constants/loan-pipeline";
import { formatINRCompact } from "@/lib/format-currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LoanFilesTimelineView() {
  const { filteredFiles, setSelectedFileId } = useLoanFiles();

  const grouped = PIPELINE_STAGES.map(({ id, label }) => ({
    stage: id,
    label,
    files: filteredFiles
      .filter((f) => f.stage === id)
      .sort((a, b) => new Date(a.expectedDisbursement).getTime() - new Date(b.expectedDisbursement).getTime()),
  }));

  return (
    <div className="space-y-6">
      {grouped.map(({ stage, label, files }, groupIndex) => (
        <div key={stage}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {groupIndex + 1}
            </div>
            <div>
              <h3 className="font-semibold">{label}</h3>
              <p className="text-xs text-muted-foreground">{files.length} files</p>
            </div>
          </div>

          {files.length === 0 ? (
            <div className="ml-4 border-l-2 border-dashed border-border pl-6 py-4 text-sm text-muted-foreground">
              No files in this stage
            </div>
          ) : (
            <div className="ml-4 border-l-2 border-primary/20 pl-6 space-y-3">
              {files.map((file, i) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    className={cn(
                      "cursor-pointer hover:border-primary/40 transition-colors border-l-[3px]",
                      file.isDelayed ? "border-l-destructive" : file.isUrgent ? "border-l-warning" : "border-l-accent",
                    )}
                    onClick={() => setSelectedFileId(file.id)}
                  >
                    <CardHeader className="py-3 px-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-sm">{file.customerName}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {file.loanProduct} · {file.lender} · {file.fileNumber}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-primary">{formatINRCompact(file.loanAmount)}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="py-0 px-4 pb-3">
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Disbursement: {new Date(file.expectedDisbursement).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span>{file.daysInStage} days in {STAGE_LABELS[file.stage]}</span>
                        <span>RM: {file.relationshipManager}</span>
                      </div>
                      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width: `${file.progress}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
