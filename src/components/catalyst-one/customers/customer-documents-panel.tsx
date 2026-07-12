"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Download, Eye, FileText, Replace, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CustomerDocument, CustomerProfile } from "@/types/catalyst-one";
import {
  c360DownloadDocument,
  c360PreviewDocument,
} from "./providers/customer-360-placeholder-provider";

const STATUS_STYLES: Record<CustomerDocument["status"], string> = {
  verified: "bg-success/10 text-success border-success/30",
  received: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  requested: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  pending: "bg-muted text-muted-foreground border-border",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

interface CustomerDocumentsPanelProps {
  customer: CustomerProfile;
  onUpload: () => void;
  onReplace: (docId: string) => void;
  onDelete: (docId: string) => void;
  statusMessage?: string | null;
}

export function CustomerDocumentsPanel({
  customer,
  onUpload,
  onReplace,
  onDelete,
  statusMessage,
}: CustomerDocumentsPanelProps) {
  const [preview, setPreview] = useState<{ id: string; text: string } | null>(null);

  const grouped = customer.documents.reduce<Record<string, CustomerDocument[]>>((acc, doc) => {
    const cat = doc.category || "Other";
    acc[cat] = acc[cat] ? [...acc[cat], doc] : [doc];
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground">{statusMessage ?? " "}</p>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onUpload}>
          Upload Document
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <section key={category}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped[category]!.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    customerId={customer.id}
                    doc={doc}
                    previewOpen={preview?.id === doc.id}
                    previewText={preview?.id === doc.id ? preview.text : ""}
                    onPreview={() => {
                      const text = c360PreviewDocument(customer.id, doc.id, doc.name);
                      setPreview({ id: doc.id, text });
                    }}
                    onDownload={() => {
                      c360DownloadDocument(customer.id, doc.id, doc.name);
                    }}
                    onReplace={() => onReplace(doc.id)}
                    onDelete={() => onDelete(doc.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentCard({
  customerId,
  doc,
  previewOpen,
  previewText,
  onPreview,
  onDownload,
  onReplace,
  onDelete,
}: {
  customerId: string;
  doc: CustomerDocument;
  previewOpen: boolean;
  previewText: string;
  onPreview: () => void;
  onDownload: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  void customerId;
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        "transition-colors duration-200 hover:border-primary/30",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {format(new Date(doc.uploadedAt), "dd MMM yyyy")}
            {doc.uploadedBy ? ` · ${doc.uploadedBy}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn("h-5 border text-[10px] capitalize", STATUS_STYLES[doc.status])}
            >
              {doc.status}
            </Badge>
            {doc.version != null && (
              <Badge variant="secondary" className="h-5 text-[10px]">
                v{doc.version}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onPreview} title="Preview">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onDownload} title="Download">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onReplace} title="Replace">
            <Replace className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onDelete} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {previewOpen && (
        <pre className="mt-3 overflow-auto rounded-lg bg-muted/60 p-2 text-[11px]">{previewText}</pre>
      )}
    </div>
  );
}
