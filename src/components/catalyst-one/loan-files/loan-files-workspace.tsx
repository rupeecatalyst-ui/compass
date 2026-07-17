"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { LoanFilesProvider, useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { LoanFilesToolbar } from "@/components/catalyst-one/loan-files/loan-files-toolbar";
import { KanbanView } from "@/components/catalyst-one/loan-files/kanban-view";
import { LoanFilesListView } from "@/components/catalyst-one/loan-files/loan-files-list-view";
import { LoanFilesTimelineView } from "@/components/catalyst-one/loan-files/loan-files-timeline-view";
import { LoanFilesAnalyticsView } from "@/components/catalyst-one/loan-files/loan-files-analytics-view";
import { TaskBoardView } from "@/components/catalyst-one/loan-files/task-board-view";
import { AiInsightsSidebar } from "@/components/catalyst-one/loan-files/ai-insights-sidebar";
import { CreateLoanModal } from "@/components/catalyst-one/loan-files/create-loan-modal";
import { LoanWorkspaceModal } from "@/components/catalyst-one/shared/loan-workspace-modal";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import { isEcmContactUsable, listEcmContacts } from "@/lib/enterprise-contact-master";
import { CUSTOMER_SEED } from "@/data/catalyst-one/customer-seed";
import {
  getRememberedOpportunityActiveLoan,
  rememberOpportunityActiveLoan,
  resolveLoansForOpportunity,
} from "@/lib/opportunity-loan-continuity";
import {
  clearActiveOpportunityContext,
  getActiveOpportunityContext,
  isDashboardNavEntry,
  setActiveOpportunityContext,
} from "@/lib/lead-opportunity-journey/active-context";
import { opportunityNumberForFile } from "@/lib/enterprise-credit-workspace";

function LoanFilesKeyboard() {
  const { setCreateOpen, setSelectedFileId, selectedFileId, searchInputRef } = useLoanFiles();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // While Loan Workspace is open, Escape is owned by unsaved-changes close flow.
        if (selectedFileId) return;
        setSelectedFileId(null);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setCreateOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef?.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef?.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setCreateOpen, setSelectedFileId, selectedFileId, searchInputRef]);

  return null;
}

function LoanFilesQuerySync() {
  const searchParams = useSearchParams();
  const { setSelectedFileId, setCustomerFilterId, files } = useLoanFiles();

  useEffect(() => {
    const browseAll = searchParams.get("browse") === "1";
    const dashboardEntry = isDashboardNavEntry(searchParams);
    const fileId = searchParams.get("file");
    const opportunityId = searchParams.get("opportunityId");

    if (dashboardEntry && !fileId && !opportunityId) {
      clearActiveOpportunityContext();
      setCustomerFilterId(searchParams.get("customer"));
      return;
    }

    if (fileId) {
      setSelectedFileId(fileId);
      const hit = files.find((f) => f.id === fileId);
      if (hit) {
        setActiveOpportunityContext({
          fileId: hit.id,
          opportunityId: opportunityId ?? undefined,
          customerName: hit.customerName,
          product: hit.loanProduct,
          label: opportunityNumberForFile(hit),
        });
      }
      if (opportunityId) rememberOpportunityActiveLoan(opportunityId, fileId);
    } else if (opportunityId && !browseAll) {
      const contactId = searchParams.get("customer");
      const matches = files.filter((f) => {
        if (contactId && f.customerId === contactId) return true;
        return false;
      });
      const remembered = getRememberedOpportunityActiveLoan(opportunityId);
      if (remembered && files.some((f) => f.id === remembered)) {
        setSelectedFileId(remembered);
      } else if (matches.length === 1) {
        setSelectedFileId(matches[0]!.id);
        rememberOpportunityActiveLoan(opportunityId, matches[0]!.id);
      } else {
        const byOpportunity = resolveLoansForOpportunity(opportunityId, null);
        if (byOpportunity.length === 1) {
          setSelectedFileId(byOpportunity[0]!.id);
        }
      }
    } else if (!browseAll && !dashboardEntry) {
      const active = getActiveOpportunityContext();
      if (active?.fileId && files.some((f) => f.id === active.fileId)) {
        setSelectedFileId(active.fileId);
      }
    }

    const customerId = searchParams.get("customer");
    setCustomerFilterId(customerId);
  }, [searchParams, setSelectedFileId, setCustomerFilterId, files]);

  return null;
}

function LoanFilesCreateQuery() {
  const searchParams = useSearchParams();
  const { setCreateOpen } = useLoanFiles();

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpen(true);
    }
  }, [searchParams, setCreateOpen]);

  return null;
}

function LoanFilesContent() {
  const { view, mounted, selectedFile, selectedFileId, setSelectedFileId } = useLoanFiles();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "lenders";
  const registryVersion = useEcmContactRegistryVersion();
  const contactOptions = useMemo(() => {
    void registryVersion;
    const ecm = listEcmContacts()
      .filter((c) => isEcmContactUsable(c.status))
      .map((c) => ({
        id: c.id,
        name: c.name,
        mobile: c.mobilePrimary?.startsWith("pending-") ? "" : c.mobilePrimary || "",
        email: c.personalEmail || c.officialEmail || "",
      }));
    const seed = CUSTOMER_SEED.map((c) => ({
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      email: c.email,
    }));
    const byId = new Map<string, (typeof seed)[number]>();
    for (const row of [...seed, ...ecm]) byId.set(row.id, row);
    return [...byId.values()];
  }, [registryVersion]);

  useEffect(() => {
    if (!selectedFile) return;
    const active = getActiveOpportunityContext();
    setActiveOpportunityContext({
      fileId: selectedFile.id,
      opportunityId: active?.opportunityId,
      customerName: selectedFile.customerName,
      product: selectedFile.loanProduct,
      label: opportunityNumberForFile(selectedFile),
    });
  }, [selectedFile]);

  if (!mounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 md:-mx-6 lg:-mx-8">
      <LoanFilesKeyboard />
      <LoanFilesQuerySync />
      <LoanFilesCreateQuery />
      <div className="px-4 md:px-6 lg:px-8 shrink-0">
        <LoanFilesToolbar />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto px-4 md:px-6 lg:px-8 py-4 scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {view === "kanban" && <KanbanView />}
              {view === "list" && <LoanFilesListView />}
              {view === "timeline" && <LoanFilesTimelineView />}
              {view === "analytics" && <LoanFilesAnalyticsView />}
              {view === "tasks" && <TaskBoardView />}
            </motion.div>
          </AnimatePresence>
        </div>
        <AiInsightsSidebar />
      </div>

      <LoanWorkspaceModal
        file={selectedFile}
        open={Boolean(selectedFileId)}
        onOpenChange={(open) => {
          if (!open) setSelectedFileId(null);
        }}
        contactOptions={contactOptions}
        defaultTab={defaultTab}
      />
      <CreateLoanModal />
    </div>
  );
}

export function LoanFilesWorkspace() {
  return (
    <LoanFilesProvider>
      <LoanFilesContent />
    </LoanFilesProvider>
  );
}
