"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CheckSquare,
  Copy,
  Download,
  Eye,
  FileText,
  FolderInput,
  GripVertical,
  LayoutGrid,
  List,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Replace,
  Search,
  Share2,
  Trash2,
  Upload,
  History,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ORG_DOC_CATEGORIES,
  formatOrgDocFileSize,
} from "@/constants/organization-documents";
import {
  addOrgTemplateType,
  archiveOrgDocuments,
  buildOrgDocumentInternalLink,
  deleteOrgTemplateType,
  filterOrgDocuments,
  getOrgDocuments,
  getOrgTemplateTypes,
  listOrgDocumentTypes,
  moveOrgDocumentsCategory,
  reorderOrgTemplateTypes,
  replaceOrgDocument,
  updateOrgTemplateType,
  uploadOrgDocuments,
} from "@/lib/organization-documents";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  OrgDocCategoryId,
  OrgDocTypeDefinition,
  OrgDocViewMode,
  OrgDocumentFilters,
  OrgDocumentRecord,
} from "@/types/organization-documents";

const DEFAULT_FILTERS: OrgDocumentFilters = {
  query: "",
  categoryId: "all",
  documentTypeId: "all",
  uploadedBy: "all",
  status: "active",
  tag: "all",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function downloadRecord(doc: OrgDocumentRecord) {
  if (!doc.contentDataUrl) {
    toast.message("Download queued", {
      description: `${doc.originalFilename} — content not cached locally (metadata preserved).`,
    });
    return;
  }
  const a = document.createElement("a");
  a.href = doc.contentDataUrl;
  a.download = doc.originalFilename;
  a.click();
}

export function OrganizationDocumentsWorkspace() {
  const { user } = useAuthContext();
  const actor =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Platform Admin";

  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const documents = useMemo(() => getOrgDocuments(), [tick]);
  const templateTypes = useMemo(() => getOrgTemplateTypes(), [tick]);

  const [filters, setFilters] = useState<OrgDocumentFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<OrgDocViewMode>("list");
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingDropFiles, setPendingDropFiles] = useState<File[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [historyDoc, setHistoryDoc] = useState<OrgDocumentRecord | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterOrgDocuments(documents, filters),
    [documents, filters],
  );

  const uploaders = useMemo(
    () => Array.from(new Set(documents.map((d) => d.uploadedBy))).sort(),
    [documents],
  );

  const categoryTypes = useMemo(() => {
    if (filters.categoryId === "all") return [];
    return listOrgDocumentTypes(filters.categoryId, templateTypes);
  }, [filters.categoryId, templateTypes, tick]);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((d) => d.id));
  };

  const onBulkArchive = () => {
    const n = archiveOrgDocuments(selected);
    toast.success(`Archived ${n} document${n === 1 ? "" : "s"}`);
    setSelected([]);
    refresh();
  };

  const onBulkDownload = () => {
    const docs = documents.filter((d) => selected.includes(d.id));
    docs.forEach(downloadRecord);
    toast.success(`Download started for ${docs.length} file${docs.length === 1 ? "" : "s"}`);
  };

  const onBulkShare = async () => {
    const links = selected.map((id) => buildOrgDocumentInternalLink(id)).join("\n");
    await navigator.clipboard.writeText(links);
    toast.success("Share links copied");
  };

  const onBulkEmail = () => {
    toast.message("Email prepared", {
      description: `${selected.length} document(s) attached to draft outbox.`,
    });
  };

  const openReplace = (id: string) => {
    setReplaceTargetId(id);
    window.setTimeout(() => replaceInputRef.current?.click(), 0);
  };

  const onReplaceFile = async (file: File | null) => {
    if (!file || !replaceTargetId) return;
    await replaceOrgDocument(replaceTargetId, file, actor);
    toast.success(`Replaced — original name preserved: ${file.name}`);
    setReplaceTargetId(null);
    refresh();
  };

  return (
    <div className="space-y-4">
      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          void onReplaceFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />

      {/* Category strip */}
      <div className="flex flex-wrap gap-1.5">
        <CategoryChip
          label="All"
          active={filters.categoryId === "all"}
          count={documents.filter((d) => filters.status === "all" || d.status === filters.status).length}
          onClick={() =>
            setFilters((f) => ({ ...f, categoryId: "all", documentTypeId: "all" }))
          }
        />
        {ORG_DOC_CATEGORIES.map((cat) => {
          const count = documents.filter(
            (d) =>
              d.categoryId === cat.id &&
              (filters.status === "all" || d.status === filters.status),
          ).length;
          return (
            <CategoryChip
              key={cat.id}
              label={cat.label}
              active={filters.categoryId === cat.id}
              count={count}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  categoryId: cat.id,
                  documentTypeId: "all",
                }))
              }
            />
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="Search filename, type, category, uploader, tags…"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.documentTypeId}
            onValueChange={(v) => setFilters((f) => ({ ...f, documentTypeId: v }))}
          >
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {categoryTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.uploadedBy}
            onValueChange={(v) => setFilters((f) => ({ ...f, uploadedBy: v }))}
          >
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue placeholder="Uploaded by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All uploaders</SelectItem>
              {uploaders.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, status: v as OrgDocumentFilters["status"] }))
            }
          >
            <SelectTrigger className="h-9 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-md border border-border/70 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "cards" ? "secondary" : "ghost"}
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("cards")}
              aria-label="Card view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
          {filters.categoryId === "templates" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs"
              onClick={() => setTemplatesOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Manage Templates
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
        </div>
      </div>

      {/* Drop zone */}
      <UploadDropZone
        dragOver={dragOver}
        setDragOver={setDragOver}
        onFiles={(files) => {
          setPendingDropFiles(files);
          setUploadOpen(true);
        }}
      />

      {/* Bulk bar */}
      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2">
          <CheckSquare className="h-4 w-4 text-teal-700 dark:text-teal-300" />
          <span className="text-xs font-medium">{selected.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onBulkDownload}>
              <Download className="mr-1 h-3 w-3" />
              Download
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => void onBulkShare()}>
              <Share2 className="mr-1 h-3 w-3" />
              Share
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onBulkEmail}>
              <Mail className="mr-1 h-3 w-3" />
              Email
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => setMoveOpen(true)}
            >
              <FolderInput className="mr-1 h-3 w-3" />
              Move
            </Button>
            <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={onBulkArchive}>
              <Archive className="mr-1 h-3 w-3" />
              Archive
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px]"
              onClick={() => setSelected([])}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : null}

      {viewMode === "list" ? (
        <DocumentTable
          docs={filtered}
          selected={selected}
          onToggle={toggleSelect}
          onToggleAll={toggleSelectAll}
          onView={(d) => {
            if (d.contentDataUrl) window.open(d.contentDataUrl, "_blank");
            else toast.message("Preview unavailable", { description: d.originalFilename });
          }}
          onDownload={downloadRecord}
          onShare={async (d) => {
            await navigator.clipboard.writeText(buildOrgDocumentInternalLink(d.id));
            toast.success("Internal link copied");
          }}
          onEmail={(d) =>
            toast.message("Email draft", { description: `Ready to send ${d.originalFilename}` })
          }
          onCopyLink={async (d) => {
            await navigator.clipboard.writeText(buildOrgDocumentInternalLink(d.id));
            toast.success("Internal link copied");
          }}
          onReplace={(d) => openReplace(d.id)}
          onHistory={setHistoryDoc}
          onArchive={(d) => {
            archiveOrgDocuments([d.id]);
            toast.success("Document archived");
            refresh();
          }}
        />
      ) : (
        <DocumentCards
          docs={filtered}
          selected={selected}
          onToggle={toggleSelect}
          onView={(d) => {
            if (d.contentDataUrl) window.open(d.contentDataUrl, "_blank");
            else toast.message("Preview unavailable", { description: d.originalFilename });
          }}
          onDownload={downloadRecord}
          onMore={setHistoryDoc}
        />
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={(o) => {
          setUploadOpen(o);
          if (!o) setPendingDropFiles([]);
        }}
        actor={actor}
        templateTypes={templateTypes}
        defaultCategory={
          filters.categoryId === "all" ? "legal" : filters.categoryId
        }
        initialFiles={pendingDropFiles}
        onUploaded={() => {
          setPendingDropFiles([]);
          refresh();
          setUploadOpen(false);
        }}
      />

      <TemplatesAdminDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        types={templateTypes}
        onChanged={refresh}
      />

      <VersionHistoryDialog doc={historyDoc} onOpenChange={(o) => !o && setHistoryDoc(null)} />

      <MoveCategoryDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        templateTypes={templateTypes}
        onConfirm={(categoryId, typeId, typeLabel) => {
          const n = moveOrgDocumentsCategory(selected, categoryId, typeId, typeLabel);
          toast.success(`Moved ${n} document${n === 1 ? "" : "s"}`);
          setSelected([]);
          setMoveOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

function CategoryChip({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-teal-500/40 bg-teal-500/15 text-teal-900 dark:text-teal-100"
          : "border-border/70 bg-card/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function UploadDropZone({
  dragOver,
  setDragOver,
  onFiles,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onFiles: (files: File[]) => void;
}) {
  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(files);
      }}
      className={cn(
        "rounded-xl border border-dashed px-4 py-5 text-center transition-colors",
        dragOver
          ? "border-teal-500 bg-teal-500/10"
          : "border-border/70 bg-muted/20 hover:bg-muted/30",
      )}
    >
      <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
      <p className="mt-2 text-xs font-medium text-foreground">
        Drag & drop files here — original filenames are preserved
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Multiple files supported · Metadata stored separately from binary
      </p>
    </div>
  );
}

function DocumentTable({
  docs,
  selected,
  onToggle,
  onToggleAll,
  onView,
  onDownload,
  onShare,
  onEmail,
  onCopyLink,
  onReplace,
  onHistory,
  onArchive,
}: {
  docs: OrgDocumentRecord[];
  selected: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onView: (d: OrgDocumentRecord) => void;
  onDownload: (d: OrgDocumentRecord) => void;
  onShare: (d: OrgDocumentRecord) => void | Promise<void>;
  onEmail: (d: OrgDocumentRecord) => void;
  onCopyLink: (d: OrgDocumentRecord) => void | Promise<void>;
  onReplace: (d: OrgDocumentRecord) => void;
  onHistory: (d: OrgDocumentRecord) => void;
  onArchive: (d: OrgDocumentRecord) => void;
}) {
  return (
    <Card className="glass-card border-border/60 overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={docs.length > 0 && selected.length === docs.length}
                  onCheckedChange={() => onToggleAll()}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Filename</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Ver</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                  No documents yet. Upload corporate files to begin the registry.
                </TableCell>
              </TableRow>
            ) : (
              docs.map((d) => {
                const cat = ORG_DOC_CATEGORIES.find((c) => c.id === d.categoryId);
                return (
                  <TableRow key={d.id} data-state={selected.includes(d.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selected.includes(d.id)}
                        onCheckedChange={() => onToggle(d.id)}
                        aria-label={`Select ${d.originalFilename}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium text-sm" title={d.originalFilename}>
                          {d.originalFilename}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{d.documentTypeLabel}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {cat?.label ?? d.categoryId}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.uploadedBy}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatDate(d.uploadedAt)}</TableCell>
                    <TableCell className="font-mono text-xs">v{d.version}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {formatOrgDocFileSize(d.fileSizeBytes)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                          d.status === "active"
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {d.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => onView(d)}>
                            <Eye className="h-4 w-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDownload(d)}>
                            <Download className="h-4 w-4" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void onShare(d)}>
                            <Share2 className="h-4 w-4" /> Share
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEmail(d)}>
                            <Mail className="h-4 w-4" /> Send via Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void onCopyLink(d)}>
                            <Copy className="h-4 w-4" /> Copy Internal Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onReplace(d)}>
                            <Replace className="h-4 w-4" /> Replace Document
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onHistory(d)}>
                            <History className="h-4 w-4" /> Version History
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onArchive(d)}
                            disabled={d.status === "archived"}
                          >
                            <Archive className="h-4 w-4" /> Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DocumentCards({
  docs,
  selected,
  onToggle,
  onView,
  onDownload,
  onMore,
}: {
  docs: OrgDocumentRecord[];
  selected: string[];
  onToggle: (id: string) => void;
  onView: (d: OrgDocumentRecord) => void;
  onDownload: (d: OrgDocumentRecord) => void;
  onMore: (d: OrgDocumentRecord) => void;
}) {
  if (docs.length === 0) {
    return (
      <Card className="glass-card border-border/60">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No documents in this view.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {docs.map((d) => {
        const cat = ORG_DOC_CATEGORIES.find((c) => c.id === d.categoryId);
        return (
          <Card
            key={d.id}
            className={cn(
              "glass-card border-border/60 transition-shadow hover:shadow-md",
              selected.includes(d.id) && "ring-2 ring-teal-500/40",
            )}
          >
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={selected.includes(d.id)}
                  onCheckedChange={() => onToggle(d.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" title={d.originalFilename}>
                    {d.originalFilename}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {d.documentTypeLabel} · {cat?.label}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                <span>v{d.version}</span>
                <span>{formatOrgDocFileSize(d.fileSizeBytes)}</span>
                <span className="capitalize">{d.status}</span>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 flex-1 text-[11px]" onClick={() => onView(d)}>
                  View
                </Button>
                <Button size="sm" variant="outline" className="h-7 flex-1 text-[11px]" onClick={() => onDownload(d)}>
                  Download
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onMore(d)}>
                  <History className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  actor,
  templateTypes,
  defaultCategory,
  initialFiles = [],
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  actor: string;
  templateTypes: OrgDocTypeDefinition[];
  defaultCategory: OrgDocCategoryId;
  initialFiles?: File[];
  onUploaded: () => void;
}) {
  const [categoryId, setCategoryId] = useState<OrgDocCategoryId>(defaultCategory);
  const [typeId, setTypeId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const types = useMemo(
    () => listOrgDocumentTypes(categoryId, templateTypes),
    [categoryId, templateTypes],
  );

  useEffect(() => {
    if (!open) return;
    setCategoryId(defaultCategory);
    setFiles(initialFiles);
  }, [open, defaultCategory, initialFiles]);

  useEffect(() => {
    if (types[0]) setTypeId(types[0].id);
  }, [types]);

  const typeLabel = types.find((t) => t.id === typeId)?.label ?? "Other";

  const submit = async () => {
    if (!files.length || !typeId) return;
    setBusy(true);
    try {
      await uploadOrgDocuments({
        files,
        categoryId,
        documentTypeId: typeId,
        documentTypeLabel: typeLabel,
        uploadedBy: actor,
      });
      toast.success(
        `Uploaded ${files.length} file${files.length === 1 ? "" : "s"} — filenames preserved`,
      );
      onUploaded();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Organization Documents</DialogTitle>
          <DialogDescription>
            Original filenames are never renamed. Metadata is stored separately in the registry.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v as OrgDocCategoryId)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_DOC_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Document Type</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Files</Label>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full gap-2 text-xs"
              onClick={() => inputRef.current?.click()}
            >
              <Plus className="h-3.5 w-3.5" />
              {files.length ? `${files.length} file(s) selected` : "Choose files"}
            </Button>
            {files.length > 0 ? (
              <ul className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-border/60 p-2 text-[11px]">
                {files.map((f) => (
                  <li key={f.name + f.size} className="truncate font-medium">
                    {f.name}{" "}
                    <span className="text-muted-foreground">
                      ({formatOrgDocFileSize(f.size)})
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!files.length || busy}
            onClick={() => void submit()}
          >
            {busy ? "Uploading…" : "Upload to Registry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplatesAdminDialog({
  open,
  onOpenChange,
  types,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  types: OrgDocTypeDefinition[];
  onChanged: () => void;
}) {
  const [label, setLabel] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    if (open) setOrder(types.map((t) => t.id));
  }, [open, types]);

  const ordered = order
    .map((id) => types.find((t) => t.id === id))
    .filter(Boolean) as OrgDocTypeDefinition[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Template Types</DialogTitle>
          <DialogDescription>
            Super Administrators can add, edit, delete, and reorder template types without
            developer changes.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="New template type"
            className="h-9 text-sm"
          />
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0"
            disabled={!label.trim()}
            onClick={() => {
              addOrgTemplateType(label);
              setLabel("");
              onChanged();
              toast.success("Template type added");
            }}
          >
            Add
          </Button>
        </div>
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {ordered.map((t, index) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
              {editId === t.id ? (
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-7 flex-1 text-xs"
                />
              ) : (
                <span className="flex-1 truncate text-xs font-medium">{t.label}</span>
              )}
              <div className="flex gap-0.5">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...order];
                    const i = next.indexOf(t.id);
                    if (i <= 0) return;
                    [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                    setOrder(next);
                    reorderOrgTemplateTypes(next);
                    onChanged();
                  }}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={index === ordered.length - 1}
                  onClick={() => {
                    const next = [...order];
                    const i = next.indexOf(t.id);
                    if (i < 0 || i >= next.length - 1) return;
                    [next[i], next[i + 1]] = [next[i + 1]!, next[i]!];
                    setOrder(next);
                    reorderOrgTemplateTypes(next);
                    onChanged();
                  }}
                >
                  ↓
                </Button>
                {editId === t.id ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      updateOrgTemplateType(t.id, editLabel);
                      setEditId(null);
                      onChanged();
                      toast.success("Template updated");
                    }}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditId(t.id);
                      setEditLabel(t.label);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-rose-600"
                  onClick={() => {
                    deleteOrgTemplateType(t.id);
                    onChanged();
                    toast.success("Template type removed");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function VersionHistoryDialog({
  doc,
  onOpenChange,
}: {
  doc: OrgDocumentRecord | null;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(doc)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription className="truncate">
            {doc?.originalFilename}
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {doc?.versions.map((v) => (
            <li
              key={v.id}
              className="rounded-md border border-border/60 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold">v{v.version}</span>
                <span className="text-muted-foreground">{formatDate(v.uploadedAt)}</span>
              </div>
              <p className="mt-1 truncate font-medium" title={v.originalFilename}>
                {v.originalFilename}
              </p>
              <p className="text-muted-foreground">
                {v.uploadedBy} · {formatOrgDocFileSize(v.fileSizeBytes)}
              </p>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function MoveCategoryDialog({
  open,
  onOpenChange,
  templateTypes,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  templateTypes: OrgDocTypeDefinition[];
  onConfirm: (
    categoryId: OrgDocCategoryId,
    typeId: string,
    typeLabel: string,
  ) => void;
}) {
  const [categoryId, setCategoryId] = useState<OrgDocCategoryId>("others");
  const types = useMemo(
    () => listOrgDocumentTypes(categoryId, templateTypes),
    [categoryId, templateTypes],
  );
  const [typeId, setTypeId] = useState("");

  useEffect(() => {
    if (types[0]) setTypeId(types[0].id);
  }, [types]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to Category</DialogTitle>
          <DialogDescription>Relocate selected documents in the registry.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select
            value={categoryId}
            onValueChange={(v) => setCategoryId(v as OrgDocCategoryId)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORG_DOC_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              onConfirm(
                categoryId,
                typeId,
                types.find((t) => t.id === typeId)?.label ?? "Other",
              )
            }
          >
            Move Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
