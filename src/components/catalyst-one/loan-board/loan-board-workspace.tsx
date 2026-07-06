"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LoanBoardProvider, useLoanBoardContext } from "@/components/catalyst-one/loan-board/loan-board-context";
import { LoanBoardToolbar } from "@/components/catalyst-one/loan-board/loan-board-toolbar";
import { LoanBoardView } from "@/components/catalyst-one/loan-board/loan-board-view";
import { LoanBoardSettingsDialog } from "@/components/catalyst-one/loan-board/loan-board-settings-dialog";
import { LoanBoardCreateModal } from "@/components/catalyst-one/loan-board/loan-board-create-modal";
import { LoanBoardDetailModal } from "@/components/catalyst-one/loan-board/loan-board-detail-modal";
import type { PipelineStage } from "@/types/catalyst-one";

function LoanBoardQuerySync() {
  const searchParams = useSearchParams();
  const { setStageFilter, setSelectedFileId } = useLoanBoardContext();

  useEffect(() => {
    const stage = searchParams.get("stage");
    if (stage) setStageFilter(stage as PipelineStage);

    const fileId = searchParams.get("file");
    if (fileId) setSelectedFileId(fileId);
  }, [searchParams, setStageFilter, setSelectedFileId]);

  return null;
}

function LoanBoardInner() {
  const {
    mounted,
    setCreateOpen,
    selectedFile,
    selectedFileId,
    setSelectedFileId,
    updateFile,
  } = useLoanBoardContext();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setCreateOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setCreateOpen]);

  if (!mounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background -mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8">
      <LoanBoardQuerySync />
      <div className="px-2 md:px-3 pt-1 shrink-0">
        <LoanBoardToolbar />
      </div>
      <div className="flex-1 min-h-0 px-2 md:px-3 pb-1">
        <LoanBoardView />
      </div>

      <LoanBoardSettingsDialog />
      <LoanBoardCreateModal />
      <LoanBoardDetailModal
        file={selectedFile}
        open={Boolean(selectedFileId)}
        onOpenChange={(open) => !open && setSelectedFileId(null)}
        onUpdate={updateFile}
      />
    </div>
  );
}

export function LoanBoardWorkspace() {
  return (
    <LoanBoardProvider>
      <Suspense fallback={null}>
        <LoanBoardInner />
      </Suspense>
    </LoanBoardProvider>
  );
}
