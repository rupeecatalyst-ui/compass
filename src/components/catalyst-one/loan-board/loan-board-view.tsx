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

  return (
    <div className="h-full overflow-x-auto overflow-y-hidden scrollbar-thin">
      <div className="flex gap-1.5 min-w-max h-full">
        {LOAN_BOARD_STAGES.map(({ id }) => {
          const stats = columnStats.find((s) => s.stage === id)!;
          const columnFiles = filesByStage.get(id) ?? [];
          const collapsed = collapsedColumns.includes(id);

          return (
            <LoanBoardColumn
              key={id}
              stats={stats}
              files={columnFiles}
              density={density}
              visibleFields={visibleFields}
              collapsed={collapsed}
              isDragOver={dragOverStage === id}
              onToggleCollapse={() => toggleColumnCollapse(id)}
              onOpen={setSelectedFileId}
              onDragStart={handleDragStart}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(id);
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => handleDrop(e, id)}
              onMoveStage={setSelectedFileId}
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
