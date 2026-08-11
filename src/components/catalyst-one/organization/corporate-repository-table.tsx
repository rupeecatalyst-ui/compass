"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Eye, Loader2 } from "lucide-react";
import { ORG_DOC_CATEGORIES } from "@/constants/organization-documents";
import { ROUTES } from "@/constants/routes";
import { organizationWorkspaceApi } from "@/lib/enterprise-organization-workspace";
import { ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE } from "@/lib/organization-documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrganizationDocumentDto } from "@/types/enterprise-organization-workspace";

function categoryLabel(categoryId: string): string {
  return ORG_DOC_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
}

export function CorporateRepositoryTable() {
  const [documents, setDocuments] = useState<OrganizationDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await organizationWorkspaceApi.listDocuments("active");
      setDocuments(rows);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading corporate repository…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-info/30 bg-info/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Author documents in{" "}
          <span className="font-medium text-foreground">Organization Documents</span>. This view is a
          read-only projection of the enterprise registry.
        </p>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href={ROUTES.ORGANIZATION_DOCUMENTS}>
            <ExternalLink className="h-4 w-4" />
            Open Organization Documents
          </Link>
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card className="glass-card border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No documents in the corporate repository yet. Upload files in Organization
                    Documents.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <span className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {categoryLabel(doc.categoryId)}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium max-w-[280px] truncate">
                      {doc.displayName || doc.originalFilename}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.documentTypeLabel}
                    </TableCell>
                    <TableCell>{formatDate(doc.updatedAt)}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">v{doc.versionNumber}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`${ROUTES.ORGANIZATION_DOCUMENTS}?doc=${doc.id}`}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
