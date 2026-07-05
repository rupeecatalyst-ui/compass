"use client";

import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { loanManagers } from "@/data/catalyst-one/loan-files";
import { PIPELINE_STAGES } from "@/constants/loan-pipeline";
import type { LoanFile, LoanFilePriority } from "@/types/catalyst-one";

interface LoanCardMenuProps {
  file: LoanFile;
  onOpen: () => void;
}

export function LoanCardMenu({ file, onOpen }: LoanCardMenuProps) {
  const { duplicateFile, assignRm, moveFile, setPriority, archiveFile, deleteFile } = useLoanFiles();
  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null);

  const stopProp = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={stopProp}>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48" onClick={stopProp}>
          <DropdownMenuItem onClick={onOpen}>Open</DropdownMenuItem>
          <DropdownMenuItem onClick={() => duplicateFile(file.id)}>Duplicate</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Assign RM</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {loanManagers.map((rm) => (
                <DropdownMenuItem key={rm} onClick={() => assignRm(file.id, rm)}>
                  {rm}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Move Stage</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {PIPELINE_STAGES.map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => moveFile(file.id, s.id)}>
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Mark Priority</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {(["urgent", "high", "medium", "low"] as LoanFilePriority[]).map((p) => (
                <DropdownMenuItem key={p} onClick={() => setPriority(file.id, p)} className="capitalize">
                  {p}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setConfirmAction("archive")}>Archive</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmAction("delete")}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction === "delete" ? "Delete loan file?" : "Archive loan file?"}</DialogTitle>
            <DialogDescription>
              {confirmAction === "delete"
                ? `Permanently remove ${file.fileNumber} — ${file.customerName}. This cannot be undone.`
                : `Archive ${file.fileNumber} — it will be hidden from the workspace.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction === "delete" ? "destructive" : "default"}
              onClick={() => {
                if (confirmAction === "delete") deleteFile(file.id);
                else archiveFile(file.id);
                setConfirmAction(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
