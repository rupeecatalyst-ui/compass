"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Search } from "lucide-react";
import { getInitialLoanFiles } from "@/data/catalyst-one/loan-files";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import { formatINR } from "@/lib/format-currency";
import { getJourneyStageDisplayLabel } from "@/constants/lead-opportunity-journey";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { opportunityNumberForFile } from "@/lib/enterprise-credit-workspace";
import { subscribeLoanFilesUpdated } from "@/lib/loan-data-sync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LoanFile } from "@/types/catalyst-one";

function listPickerFiles(): LoanFile[] {
  const files =
    typeof window === "undefined" ? getInitialLoanFiles() : loadLoanFiles() ?? getInitialLoanFiles();
  return files.filter((f) => !f.archived);
}

/**
 * Shown when a Lead Stage workspace opens from nav without an active opportunity.
 * Selecting a case writes Active Opportunity Context and navigates with query params.
 */
export function OpportunityContextPicker({
  targetHref,
  title = "Select an active opportunity",
  description = "Open this workspace from guided navigation, or pick a case below. Context is not carried from unrelated earlier sessions.",
}: {
  targetHref: string;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filesVersion, setFilesVersion] = useState(0);

  useEffect(() => subscribeLoanFilesUpdated(() => setFilesVersion((v) => v + 1)), []);

  const files = useMemo(() => {
    void filesVersion;
    return listPickerFiles();
  }, [filesVersion]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter(
      (f) =>
        f.customerName.toLowerCase().includes(q) ||
        f.fileNumber.toLowerCase().includes(q) ||
        f.loanProduct.toLowerCase().includes(q) ||
        opportunityNumberForFile(f).toLowerCase().includes(q),
    );
  }, [files, query]);

  const select = (file: LoanFile) => {
    setActiveOpportunityContext({
      fileId: file.id,
      customerName: file.customerName,
      product: file.loanProduct,
      label: opportunityNumberForFile(file),
    });
    router.replace(
      buildJourneyHref(targetHref, {
        fileId: file.id,
        opportunityId: null,
      }),
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Active Opportunity Context
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer, file, product…"
            className="h-9 pl-8 text-sm"
          />
        </div>

        <ul className="mt-3 max-h-[min(420px,50vh)] space-y-1.5 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <li className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-xs text-muted-foreground">
              No opportunities available. Create a loan file first, then return here.
            </li>
          )}
          {filtered.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                onClick={() => select(file)}
                className="flex w-full flex-col gap-0.5 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5 text-left transition-colors hover:border-teal-500/40 hover:bg-teal-500/5"
              >
                <span className="truncate text-sm font-semibold text-foreground">
                  {file.customerName}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {opportunityNumberForFile(file)} · {file.loanProduct} ·{" "}
                  {formatINR(file.requiredAmount || file.loanAmount)} ·{" "}
                  {getJourneyStageDisplayLabel(file.stage)}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

