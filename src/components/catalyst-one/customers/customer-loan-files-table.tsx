"use client";

import { format } from "date-fns";
import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import { EntityButtonLink, EntityLink } from "@/components/catalyst-one/shared/entity-link";
import { STAGE_COLORS, STAGE_LABELS } from "@/constants/loan-pipeline";
import { LOAN_FILE_STATUS_STYLES } from "@/constants/loan-status";
import { formatINRCompact } from "@/lib/format-currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";

interface CustomerLoanFilesTableProps {
  files: LoanFile[];
  emptyLabel: string;
  onOpenLoan: (fileId: string) => void;
  onOpenContact?: (contactId: string) => void;
  productFilter?: string | null;
}

function resolveSourceContact(file: LoanFile): { id: string; name: string } | null {
  if (file.sourceContactId && file.sourceContactName) {
    return { id: file.sourceContactId, name: file.sourceContactName };
  }
  return null;
}

/** CRC-007 / CRC-013 — Standardized loan tables with connected intelligence. */
export function CustomerLoanFilesTable({
  files,
  emptyLabel,
  productFilter,
  onOpenLoan,
  onOpenContact,
}: CustomerLoanFilesTableProps) {
  const rows = productFilter
    ? files.filter((f) => f.loanProduct === productFilter)
    : files;

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {productFilter ? `No loans for ${productFilter}.` : emptyLabel}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-muted/30 text-[10px] uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2">File</th>
            <th className="text-left px-3 py-2">Product</th>
            <th className="text-left px-3 py-2">Lender</th>
            <th className="text-right px-3 py-2">Loan Amount</th>
            <th className="text-left px-3 py-2">Stage</th>
            <th className="text-left px-3 py-2">Source</th>
            <th className="text-left px-3 py-2">Source Contact</th>
            <th className="text-left px-3 py-2">RM</th>
            <th className="text-left px-3 py-2">Login Date</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-right px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((file) => {
            const stageColor = STAGE_COLORS[file.stage];
            const sourceContact = resolveSourceContact(file);
            return (
              <tr key={file.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{file.fileNumber}</td>
                <td className="px-3 py-2 text-xs">{file.loanProduct}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <LenderLogo lender={file.lender} size="sm" />
                    <EntityLink
                      type="lender"
                      id={file.lender}
                      label={file.lender}
                      className="text-xs font-normal"
                    />
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {formatINRCompact(file.loanAmount)}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant="outline"
                    className="h-5 text-[10px]"
                    style={{ borderColor: stageColor, color: stageColor }}
                  >
                    {STAGE_LABELS[file.stage]}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {file.source ?? (file.stage === "raw_lead" ? "Manual" : "Pipeline")}
                </td>
                <td className="px-3 py-2 text-xs">
                  {sourceContact && onOpenContact ? (
                    <EntityButtonLink
                      label={sourceContact.name}
                      onClick={() => onOpenContact(sourceContact.id)}
                    />
                  ) : sourceContact ? (
                    sourceContact.name
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">{file.relationshipManager}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {format(new Date(file.loginDate), "dd MMM yyyy")}
                </td>
                <td className="px-3 py-2">
                  <span className={cn("text-xs", LOAN_FILE_STATUS_STYLES[file.status].className)}>
                    {LOAN_FILE_STATUS_STYLES[file.status].label}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onOpenLoan(file.id)}
                  >
                    Open
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
