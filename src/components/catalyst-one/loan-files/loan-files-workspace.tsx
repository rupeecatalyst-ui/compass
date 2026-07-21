"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { LoanFilesProvider, useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { LoanFilesToolbar } from "@/components/catalyst-one/loan-files/loan-files-toolbar";
import { KanbanView } from "@/components/catalyst-one/loan-files/kanban-view";
import { LoanFilesListView } from "@/components/catalyst-one/loan-files/loan-files-list-view";
import { LoanFilesTimelineView } from "@/components/catalyst-one/loan-files/loan-files-timeline-view";
import { TaskBoardView } from "@/components/catalyst-one/loan-files/task-board-view";
import { CreateLoanModal } from "@/components/catalyst-one/loan-files/create-loan-modal";
import { LoanWorkspaceNavigator } from "@/components/catalyst-one/loan-files/loan-workspace-navigator";
import { LoanWorkspaceModal } from "@/components/catalyst-one/shared/loan-workspace-modal";
import { useLoanJourneyEcm } from "@/hooks/use-loan-journey-ecm";
import { buildLoanJourneyContactOptions } from "@/lib/loan-journey/ecm-registry-options";
import {
  LOAN_WORKSPACE_BROWSE_PARAM,
  LOAN_WORKSPACE_SURFACE_HUB,
  LOAN_WORKSPACE_SURFACE_PARAM,
} from "@/constants/loan-workspace-navigator";
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
    const browseAll = searchParams.get(LOAN_WORKSPACE_BROWSE_PARAM) === "1";
    const surfaceHub = searchParams.get(LOAN_WORKSPACE_SURFACE_PARAM) === LOAN_WORKSPACE_SURFACE_HUB;
    const dashboardEntry = isDashboardNavEntry(searchParams);
    const fileId = searchParams.get("file");
    const opportunityId = searchParams.get("opportunityId");

    if (dashboardEntry && !fileId && !opportunityId) {
      clearActiveOpportunityContext();
      setSelectedFileId(null);
      setCustomerFilterId(searchParams.get("customer"));
      return;
    }

    /** Hub surface: preserve context for bench cards; do not auto-open execution modal. */
    if (surfaceHub) {
      if (fileId) {
        const hit = files.find((f) => f.id === fileId);
        setActiveOpportunityContext({
          fileId,
          opportunityId: opportunityId ?? undefined,
          customerName: hit?.customerName,
          product: hit?.loanProduct,
          label: hit ? opportunityNumberForFile(hit) : opportunityId ?? undefined,
        });
        if (opportunityId) rememberOpportunityActiveLoan(opportunityId, fileId);
      } else if (opportunityId) {
        const active = getActiveOpportunityContext();
        if (active?.opportunityId !== opportunityId) {
          setActiveOpportunityContext({
            fileId: active?.fileId ?? "",
            opportunityId,
            customerName: active?.customerName,
            product: active?.product,
            label: opportunityId,
          });
        }
      }
      setSelectedFileId(null);
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
  const browseAll = searchParams.get(LOAN_WORKSPACE_BROWSE_PARAM) === "1";
  const surfaceHub = searchParams.get(LOAN_WORKSPACE_SURFACE_PARAM) === LOAN_WORKSPACE_SURFACE_HUB;
  const dashboardEntry = isDashboardNavEntry(searchParams);
  const hasExecutionTarget = Boolean(searchParams.get("file") || selectedFileId);
  /** Architecture: Loan Workspace landing is a bench navigator, not analytics. */
  const showNavigator =
    !browseAll && (surfaceHub || dashboardEntry || !hasExecutionTarget);
  const { registryVersion } = useLoanJourneyEcm({ hydrateOnMount: true });
  const contactOptions = useMemo(() => {
    void registryVersion;
    return buildLoanJourneyContactOptions().map((c) => ({
      id: c.id,
      name: c.label,
      mobile: c.mobile || "",
      email: c.email || "",
    }));
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

  if (showNavigator) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 md:-mx-6 lg:-mx-8">
        <LoanFilesKeyboard />
        <LoanFilesQuerySync />
        <LoanFilesCreateQuery />
        <LoanWorkspaceNavigator />
        <CreateLoanModal />
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
              {view === "tasks" && <TaskBoardView />}
            </motion.div>
          </AnimatePresence>
        </div>
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
