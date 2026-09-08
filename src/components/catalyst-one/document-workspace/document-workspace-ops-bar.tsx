"use client";

import { useMemo, useRef, useState } from "react";
import { FolderUp, Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DOCUMENT_WORKSPACE_ADD_DOCUMENT_LABEL,
  DOCUMENT_WORKSPACE_ATTACH_INBOUND_LABEL,
  DOCUMENT_WORKSPACE_EMAIL_CONFIRM,
  DOCUMENT_WORKSPACE_EMAIL_DOCUMENT_LABEL,
  DOCUMENT_WORKSPACE_FOLDER_UPLOAD_LABEL,
  DOCUMENT_WORKSPACE_INTERNAL_NOTE_LABEL,
  DOCUMENT_WORKSPACE_OTHER_DOCUMENTS_LABEL,
  DOCUMENT_WORKSPACE_REMOVE_CONFIRM,
  DOCUMENT_WORKSPACE_REPLACE_REASON_REQUIRED,
} from "@/constants/document-workspace-contact-centric";
import type { DocumentWorkspaceRow } from "@/lib/document-workspace";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import { listEdieDocumentTypeOptions } from "@/lib/document-requests";

type Recipient = { id: string; name: string };

export function DocumentWorkspaceOpsBar({
  onAddFiles,
  onFolderFiles,
  onOtherSave,
  onAttachInbound,
  inboundRecords,
  canUpload,
}: {
  onAddFiles: (input: { typeRef: string; categoryLabel: string; files: File[] }) => void;
  onFolderFiles: (files: File[]) => void;
  onOtherSave: (input: { name: string; files: File[] }) => void;
  onAttachInbound: (input: { recordId: string; typeRef: string; categoryLabel: string }) => void;
  inboundRecords: DocumentRegistryRecord[];
  canUpload: boolean;
}) {
  const folderRef = useRef<HTMLInputElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [inboundOpen, setInboundOpen] = useState(false);
  const [typeRef, setTypeRef] = useState("");
  const [otherName, setOtherName] = useState("");
  const [addFiles, setAddFiles] = useState<File[]>([]);
  const [otherFiles, setOtherFiles] = useState<File[]>([]);
  const [inboundId, setInboundId] = useState("");
  const types = useMemo(() => listEdieDocumentTypeOptions(), []);
  const selectedType = types.find((item) => item.typeRef === typeRef);

  return (
    <div
      data-document-workspace-ops="013"
      className="mb-3 flex flex-wrap items-center gap-2 border-b border-border/60 pb-3"
    >
      <Button
        type="button"
        size="sm"
        className="h-8"
        disabled={!canUpload}
        onClick={() => setAddOpen(true)}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        {DOCUMENT_WORKSPACE_ADD_DOCUMENT_LABEL}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        disabled={!canUpload}
        onClick={() => folderRef.current?.click()}
      >
        <FolderUp className="mr-1 h-3.5 w-3.5" />
        {DOCUMENT_WORKSPACE_FOLDER_UPLOAD_LABEL}
      </Button>
      <input
        ref={folderRef}
        type="file"
        className="hidden"
        multiple
        // @ts-expect-error webkitdirectory is valid in Chromium
        webkitdirectory=""
        onChange={(e) => {
          if (e.target.files?.length) onFolderFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        disabled={!canUpload}
        onClick={() => setOtherOpen(true)}
      >
        {DOCUMENT_WORKSPACE_OTHER_DOCUMENTS_LABEL}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        disabled={!canUpload || inboundRecords.length === 0}
        onClick={() => setInboundOpen(true)}
      >
        {DOCUMENT_WORKSPACE_ATTACH_INBOUND_LABEL}
        {inboundRecords.length ? ` (${inboundRecords.length})` : ""}
      </Button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md" allowOutsideClose>
          <DialogHeader>
            <DialogTitle className="text-sm">{DOCUMENT_WORKSPACE_ADD_DOCUMENT_LABEL}</DialogTitle>
            <DialogDescription>
              Select an acceptable document type, then upload one or more files into this locked transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Acceptable document type</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={typeRef}
                onChange={(e) => setTypeRef(e.target.value)}
              >
                <option value="">Select type</option>
                {types.map((item) => (
                  <option key={item.typeRef} value={item.typeRef}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              type="file"
              multiple
              accept={DOCUMENT_REGISTRY_ACCEPT}
              onChange={(e) => setAddFiles(Array.from(e.target.files || []))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!typeRef || addFiles.length === 0}
              onClick={() => {
                onAddFiles({
                  typeRef,
                  categoryLabel: selectedType?.label || "Document",
                  files: addFiles,
                });
                setAddOpen(false);
                setAddFiles([]);
                setTypeRef("");
              }}
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={otherOpen} onOpenChange={setOtherOpen}>
        <DialogContent className="sm:max-w-md" allowOutsideClose>
          <DialogHeader>
            <DialogTitle className="text-sm">{DOCUMENT_WORKSPACE_OTHER_DOCUMENTS_LABEL}</DialogTitle>
            <DialogDescription>
              Custom name plus attachment, stored on the locked Opportunity or Deal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Custom document name</Label>
              <Input value={otherName} onChange={(e) => setOtherName(e.target.value)} />
            </div>
            <Input
              type="file"
              multiple
              accept={DOCUMENT_REGISTRY_ACCEPT}
              onChange={(e) => setOtherFiles(Array.from(e.target.files || []))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOtherOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!otherName.trim() || otherFiles.length === 0}
              onClick={() => {
                onOtherSave({ name: otherName.trim(), files: otherFiles });
                setOtherOpen(false);
                setOtherName("");
                setOtherFiles([]);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inboundOpen} onOpenChange={setInboundOpen}>
        <DialogContent className="sm:max-w-md" allowOutsideClose>
          <DialogHeader>
            <DialogTitle className="text-sm">{DOCUMENT_WORKSPACE_ATTACH_INBOUND_LABEL}</DialogTitle>
            <DialogDescription>
              Attach an inbound-email registry file to a category on this locked transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={inboundId}
              onChange={(e) => setInboundId(e.target.value)}
            >
              <option value="">Select inbound file</option>
              {inboundRecords.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.displayName || record.originalFilename}
                </option>
              ))}
            </select>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={typeRef}
              onChange={(e) => setTypeRef(e.target.value)}
            >
              <option value="">Select category / type</option>
              {types.map((item) => (
                <option key={item.typeRef} value={item.typeRef}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setInboundOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!inboundId || !typeRef}
              onClick={() => {
                onAttachInbound({
                  recordId: inboundId,
                  typeRef,
                  categoryLabel: selectedType?.label || "Document",
                });
                setInboundOpen(false);
                setInboundId("");
                setTypeRef("");
              }}
            >
              Attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DocumentWorkspaceRowDialogs({
  row,
  mode,
  onClose,
  onReplace,
  onRemove,
  onEmail,
  onNote,
  recipients,
}: {
  row: DocumentWorkspaceRow | null;
  mode: "replace" | "remove" | "email" | "note" | null;
  onClose: () => void;
  onReplace: (reason: string, file: File) => void;
  onRemove: () => void;
  onEmail: (recipientId: string) => void;
  onNote: (note: string) => void;
  recipients: Recipient[];
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [recipientId, setRecipientId] = useState(recipients[0]?.id || "");
  const [file, setFile] = useState<File | null>(null);

  return (
    <>
      <Dialog open={mode === "replace"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md" allowOutsideClose>
          <DialogHeader>
            <DialogTitle className="text-sm">Replace document</DialogTitle>
            <DialogDescription>
              A new version is stored on the same registry record. Prior versions remain in history.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={DOCUMENT_WORKSPACE_REPLACE_REASON_REQUIRED}
          />
          <Input type="file" accept={DOCUMENT_REGISTRY_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!reason.trim() || !file}
              onClick={() => file && onReplace(reason.trim(), file)}
            >
              Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "remove"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md" allowOutsideClose>
          <DialogHeader>
            <DialogTitle className="text-sm">Remove document</DialogTitle>
            <DialogDescription>{DOCUMENT_WORKSPACE_REMOVE_CONFIRM}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={onRemove}>
              Confirm remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "email"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md" allowOutsideClose>
          <DialogHeader>
            <DialogTitle className="text-sm">{DOCUMENT_WORKSPACE_EMAIL_DOCUMENT_LABEL}</DialogTitle>
            <DialogDescription>{DOCUMENT_WORKSPACE_EMAIL_CONFIRM}</DialogDescription>
          </DialogHeader>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
          >
            {recipients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Attachment: {row?.record?.displayName || row?.typeLabel || "None"}
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!recipientId || !row?.record}
              onClick={() => onEmail(recipientId)}
            >
              <Mail className="mr-1 h-3.5 w-3.5" />
              Queue to Outbox
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "note"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md" allowOutsideClose>
          <DialogHeader>
            <DialogTitle className="text-sm">{DOCUMENT_WORKSPACE_INTERNAL_NOTE_LABEL}</DialogTitle>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={!note.trim()} onClick={() => onNote(note.trim())}>
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
