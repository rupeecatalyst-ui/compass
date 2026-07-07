"use client";

import { format } from "date-fns";
import { Download, Eye, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CustomerDocument, CustomerProfile } from "@/types/catalyst-one";

const STATUS_STYLES: Record<CustomerDocument["status"], string> = {
  verified: "bg-success/10 text-success border-success/30",
  received: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  requested: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  pending: "bg-muted text-muted-foreground border-border",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

interface CustomerDocumentsPanelProps {
  customer: CustomerProfile;
}

export function CustomerDocumentsPanel({ customer }: CustomerDocumentsPanelProps) {
  const grouped = customer.documents.reduce<Record<string, CustomerDocument[]>>((acc, doc) => {
    const cat = doc.category || "Other";
    acc[cat] = acc[cat] ? [...acc[cat], doc] : [doc];
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <section key={category}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {category}
          </h4>
          <div className="grid sm:grid-cols-2 gap-3">
            {grouped[category]!.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DocumentCard({ doc }: { doc: CustomerDocument }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        "hover:border-primary/30 transition-colors duration-200",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{doc.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {format(new Date(doc.uploadedAt), "dd MMM yyyy")}
            {doc.uploadedBy ? ` · ${doc.uploadedBy}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge variant="outline" className={cn("h-5 text-[10px] capitalize border", STATUS_STYLES[doc.status])}>
              {doc.status}
            </Badge>
            {doc.version && (
              <Badge variant="secondary" className="h-5 text-[10px]">
                v{doc.version}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
