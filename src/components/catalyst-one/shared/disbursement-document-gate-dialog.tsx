"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DOCUMENT_REGISTRY_ACCEPT } from "@/constants/document-registry";
import {
  buildEntityLinksFromLoanFile,
  uploadDocumentToRegistry,
} from "@/lib/document-registry";
import {
  resolveEdieChecklistForLoanFile,
  saveEdieReceipts,
  loadEdieReceipts,
  seedEdieCertifiedRulesIfNeeded,
} from "@/lib/edie-certified";
import { EDIE_ADDRESS_PROOF_GROUP } from "@/constants/edie-certified/document-catalog";
import { useAuthContext } from "@/components/providers/auth-provider";
import type { LoanFile } from "@/types/catalyst-one";
import type { EdieChecklistItem } from "@/types/edie-certified-rules";
import { cn } from "@/lib/utils";

export function listPendingMandatoryDocuments(file: LoanFile | null | undefined): EdieChecklistItem[] {
  if (!file) return [];
  seedEdieCertifiedRulesIfNeeded();
  const checklist = resolveEdieChecklistForLoanFile(file);
  return checklist.items.filter((item) => {
    if (!item.mandatory || item.complete) return false;
    if (item.choiceGroupId === EDIE_ADDRESS_PROOF_GROUP && item.optional) return false;
    return true;
  });
}

/**
 * Chanakya stop-gate before Disbursement — UI only.
 * Allows uploading pending mandatory documents without leaving the current desk.
 */
export function DisbursementDocumentGateDialog({
  open,
  onOpenChange,
  file,
  pendingItems,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: LoanFile | null;
  pendingItems: EdieChecklistItem[];
  onUploaded?: () => void;
}) {
  const { user } = useAuthContext();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [target, setTarget] = useState<EdieChecklistItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const count = pendingItems.length;
  const uploaderName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "User";

  const headline = useMemo(() => {
    if (count <= 0) return "All mandatory documents are ready.";
    return count === 1
      ? "1 mandatory document is pending. Please upload it before moving to Disbursement."
      : `${count} mandatory documents are pending. Please upload them before moving to Disbursement.`;
  }, [count]);

  const startUpload = (item: EdieChecklistItem) => {
    setTarget(item);
    setMessage(null);
    window.setTimeout(() => inputRef.current?.click(), 0);
  };

  const onFilePicked = async (files: FileList | null) => {
    if (!files?.length || !file || !target) return;
    setBusy(true);
    try {
      const links = buildEntityLinksFromLoanFile(file);
      for (const uploadFile of Array.from(files)) {
        await uploadDocumentToRegistry({
          file: uploadFile,
          typeRef: target.folderId ?? target.typeRef,
          categoryLabel: target.folderLabel || target.label,
          uploadedBy: uploaderName,
          uploadedByUserId: user?.id,
          links,
        });
      }
      const receipts = { ...loadEdieReceipts(file.id) };
      receipts[target.typeRef] = true;
      if (target.folderId) receipts[target.folderId] = true;
      saveEdieReceipts(file.id, receipts);
      setMessage(`Uploaded to ${target.folderLabel || target.label}.`);
      onUploaded?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      setTarget(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Chanakya — Disbursement blocked
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {headline}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={DOCUMENT_REGISTRY_ACCEPT}
          multiple
          onChange={(e) => void onFilePicked(e.target.files)}
        />

        <ul className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/60 p-2">
          {pendingItems.map((item) => (
            <li
              key={item.typeRef}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2.5 py-2 text-xs"
            >
              <span className="min-w-0 truncate font-medium">
                {item.folderLabel || item.label}
              </span>
              <Button
                type="button"
                size="sm"
                className="h-7 shrink-0 gap-1 text-[11px]"
                disabled={busy || !file}
                onClick={() => startUpload(item)}
              >
                <Upload className="h-3 w-3" />
                Upload
              </Button>
            </li>
          ))}
        </ul>

        {message ? (
          <p
            className={cn(
              "text-[11px]",
              message.toLowerCase().includes("fail")
                ? "text-rose-700 dark:text-rose-300"
                : "text-teal-800 dark:text-teal-200",
            )}
          >
            {message}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Stay here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
