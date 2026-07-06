"use client";

import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import { STAGE_COLORS, STAGE_LABELS } from "@/constants/loan-pipeline";
import { LOAN_FILE_STATUS_STYLES } from "@/constants/loan-status";
import { formatINRCompact } from "@/lib/format-currency";
import { getRevenueBaseAmount } from "@/lib/loan-amount-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";

interface CustomerLoanPortfolioProps {
  loans: LoanFile[];
  title?: string;
  emptyLabel?: string;
  onOpenLoan: (fileId: string) => void;
}

export function CustomerLoanPortfolio({
  loans,
  title = "Loan Portfolio",
  emptyLabel = "No loans in this portfolio.",
  onOpenLoan,
}: CustomerLoanPortfolioProps) {
  if (loans.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {loans.map((file) => (
          <LoanPortfolioCard key={file.id} file={file} onOpen={() => onOpenLoan(file.id)} />
        ))}
      </div>
    </section>
  );
}

function LoanPortfolioCard({ file, onOpen }: { file: LoanFile; onOpen: () => void }) {
  const stageColor = STAGE_COLORS[file.stage];
  const revenue = getRevenueBaseAmount(file);
  const statusStyle = LOAN_FILE_STATUS_STYLES[file.status];

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group text-left rounded-xl border border-border bg-card p-4",
        "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
        "transition-all duration-200 ease-out",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{file.fileNumber}</p>
          <p className="font-semibold text-sm text-foreground truncate">{file.loanProduct}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>

      <p className="text-xl font-semibold tabular-nums text-foreground mb-3">
        {formatINRCompact(file.loanAmount)}
      </p>

      <div className="flex items-center gap-2 mb-3">
        <LenderLogo lender={file.lender} size="sm" />
        <span className="text-xs text-muted-foreground truncate">{file.lender}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <Badge
          variant="outline"
          className="h-5 text-[10px]"
          style={{ borderColor: stageColor, color: stageColor }}
        >
          {STAGE_LABELS[file.stage]}
        </Badge>
        <span className={cn("text-[10px] font-medium", statusStyle.className)}>
          {statusStyle.label}
        </span>
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground border-t border-border pt-2">
        <span>Revenue {formatINRCompact(Math.round(revenue * (file.revenuePercent / 100)))}</span>
        <span>{format(new Date(file.loginDate), "dd MMM yyyy")}</span>
      </div>
    </button>
  );
}
