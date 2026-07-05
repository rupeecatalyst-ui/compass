"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { KanbanColumnHeader } from "@/components/catalyst-one/loan-files/kanban-column-header";
import { KanbanCard } from "@/components/catalyst-one/loan-files/kanban-card";
import { PIPELINE_STAGES } from "@/constants/loan-pipeline";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/types/catalyst-one";

export function KanbanView() {
  const { filesByStage, columnStats, moveFile, setSelectedFileId } = useLoanFiles();
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    e.dataTransfer.setData("text/plain", fileId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(fileId);
  };

  const handleDragOver = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleDrop = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    const fileId = e.dataTransfer.getData("text/plain");
    if (fileId) moveFile(fileId, stage);
    setDragOverStage(null);
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setDragOverStage(null);
    setDraggingId(null);
  };

  return (
    <div className="overflow-x-auto scrollbar-thin pb-4 -mx-1 px-1">
      <div className="flex gap-3 min-w-max">
        {PIPELINE_STAGES.map(({ id }) => {
          const stats = columnStats.find((s) => s.stage === id)!;
          const columnFiles = filesByStage.get(id) ?? [];
          const isDragOver = dragOverStage === id;

          return (
            <div
              key={id}
              className="flex w-[280px] shrink-0 flex-col"
              onDragOver={(e) => handleDragOver(e, id)}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => handleDrop(e, id)}
            >
              <KanbanColumnHeader stats={stats} isDragOver={isDragOver} />
              <div
                className={cn(
                  "flex-1 rounded-b-xl border border-t-0 bg-muted/20 p-2 min-h-[420px] transition-colors",
                  isDragOver && "bg-primary/5 border-primary/30",
                )}
              >
                <ScrollArea className="h-[calc(100vh-22rem)] min-h-[400px]">
                  <div className="space-y-2 pr-2">
                    <AnimatePresence mode="popLayout">
                      {columnFiles.map((file) => (
                        <KanbanCard
                          key={file.id}
                          file={file}
                          onOpen={setSelectedFileId}
                          onDragStart={handleDragStart}
                        />
                      ))}
                    </AnimatePresence>
                    {columnFiles.length === 0 && (
                      <div
                        className={cn(
                          "flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground",
                          isDragOver && "border-primary bg-primary/5",
                        )}
                      >
                        {isDragOver ? "Drop here" : "No files"}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          );
        })}
      </div>
      {draggingId && (
        <div className="fixed inset-0 z-10 pointer-events-none" onDragEnd={handleDragEnd} />
      )}
    </div>
  );
}
