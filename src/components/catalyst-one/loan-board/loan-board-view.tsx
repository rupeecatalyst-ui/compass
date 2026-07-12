"use client";

import { useState } from "react";
import { LOAN_BOARD_STAGES } from "@/constants/loan-board";
import { useLoanBoardContext } from "@/components/catalyst-one/loan-board/loan-board-context";
import { LoanBoardColumn } from "@/components/catalyst-one/loan-board/loan-board-column";
import type { PipelineStage } from "@/types/catalyst-one";

export function LoanBoardView() {
  const {
    filesByStage,
    columnStats,
    density,
    visibleFields,
    collapsedColumns,
    toggleColumnCollapse,
    moveFile,
    setSelectedFileId,
    selectedIds,
    toggleSelect,
    managers,
    openOpportunityWorkspace,
    changeOwner,
    holdFile,
    unholdFile,
    markLost,
    archiveFile,
    whatsappFile,
    getPage,
    getPageSize,
    nextPage,
    prevPage,
  } = useLoanBoardContext();

  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    e.dataTransfer.setData("text/plain", fileId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(fileId);
  };

  const handleDrop = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    const fileId = e.dataTransfer.getData("text/plain");
    if (fileId) moveFile(fileId, stage);
    setDragOverStage(null);
    setDraggingId(null);
  };

  const pageSize = getPageSize();

  return (
    <div className="h-full overflow-x-auto overflow-y-hidden scrollbar-thin">
      <div className="flex gap-1.5 min-w-max h-full">
        {LOAN_BOARD_STAGES.map(({ id }) => {
          const stats = columnStats.find((s) => s.stage === id)!;
          const columnFiles = filesByStage.get(id) ?? [];
          const collapsed = collapsedColumns.includes(id);
          const page = getPage(id);
          const totalPages = Math.max(1, Math.ceil(columnFiles.length / pageSize));
          const safePage = Math.min(page, totalPages - 1);
          const pageFiles = columnFiles.slice(safePage * pageSize, safePage * pageSize + pageSize);

          return (
            <LoanBoardColumn
              key={id}
              stats={stats}
              pageFiles={pageFiles}
              page={safePage}
              totalPages={totalPages}
              density={density}
              visibleFields={visibleFields}
              collapsed={collapsed}
              isDragOver={dragOverStage === id}
              selectedIds={selectedIds}
              managers={managers}
              onToggleCollapse={() => toggleColumnCollapse(id)}
              onOpen={setSelectedFileId}
              onToggleSelect={toggleSelect}
              onDragStart={handleDragStart}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(id);
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => handleDrop(e, id)}
              onMoveStage={(fileId, stage) => moveFile(fileId, stage)}
              onOpenOpportunity={openOpportunityWorkspace}
              onChangeOwner={changeOwner}
              onHold={holdFile}
              onUnhold={unholdFile}
              onMarkLost={markLost}
              onArchive={archiveFile}
              onWhatsApp={whatsappFile}
              onPrevPage={() => prevPage(id)}
              onNextPage={() => nextPage(id, totalPages)}
            />
          );
        })}
      </div>
      {draggingId && (
        <div
          className="fixed inset-0 z-10 pointer-events-none"
          onDragEnd={() => {
            setDraggingId(null);
            setDragOverStage(null);
          }}
        />
      )}
    </div>
  );
}
