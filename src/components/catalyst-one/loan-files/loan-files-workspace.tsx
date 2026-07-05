"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LoanFilesProvider, useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { LoanFilesToolbar } from "@/components/catalyst-one/loan-files/loan-files-toolbar";
import { KanbanView } from "@/components/catalyst-one/loan-files/kanban-view";
import { LoanFilesListView } from "@/components/catalyst-one/loan-files/loan-files-list-view";
import { LoanFilesTimelineView } from "@/components/catalyst-one/loan-files/loan-files-timeline-view";
import { LoanFilesAnalyticsView } from "@/components/catalyst-one/loan-files/loan-files-analytics-view";
import { TaskBoardView } from "@/components/catalyst-one/loan-files/task-board-view";
import { LoanFileDetailSheet } from "@/components/catalyst-one/loan-files/loan-file-detail-sheet";
import { AiInsightsSidebar } from "@/components/catalyst-one/loan-files/ai-insights-sidebar";
import { CreateLoanModal } from "@/components/catalyst-one/loan-files/create-loan-modal";

function LoanFilesKeyboard() {
  const { setCreateOpen, setSelectedFileId, searchInputRef } = useLoanFiles();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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
  }, [setCreateOpen, setSelectedFileId, searchInputRef]);

  return null;
}

function LoanFilesQuerySync() {
  const searchParams = useSearchParams();
  const { setSelectedFileId, setCustomerFilterId } = useLoanFiles();

  useEffect(() => {
    const fileId = searchParams.get("file");
    if (fileId) setSelectedFileId(fileId);

    const customerId = searchParams.get("customer");
    setCustomerFilterId(customerId);
  }, [searchParams, setSelectedFileId, setCustomerFilterId]);

  return null;
}

function LoanFilesContent() {
  const { view, mounted } = useLoanFiles();

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

      <LoanFileDetailSheet />
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
