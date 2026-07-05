"use client";

import {
  BarChart3,
  CheckSquare,
  Download,
  Filter,
  GanttChart,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { CatalystBranding } from "@/components/catalyst-one/catalyst-branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { LoanFileView } from "@/types/catalyst-one";
import { useToast } from "@/hooks/use-toast";

const views: { id: LoanFileView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "kanban", label: "Kanban", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
  { id: "timeline", label: "Timeline", icon: GanttChart },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
];

export function LoanFilesToolbar() {
  const {
    search,
    setSearch,
    savedView,
    setSavedView,
    savedViews,
    view,
    setView,
    refresh,
    isRefreshing,
    filteredFiles,
    setCreateOpen,
    exportFiles,
    saveCustomView,
    searchInputRef,
  } = useLoanFiles();
  const { success } = useToast();

  const handleSaveView = () => {
    const label = window.prompt("Name this view:");
    if (label?.trim()) {
      saveCustomView(label.trim());
      success("View saved", `"${label.trim()}" is now available in Saved Views.`);
    }
  };

  return (
    <div className="space-y-4 border-b border-border/60 pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <CatalystBranding variant="compact" />
          <h1 className="text-xl font-semibold tracking-tight">Loan Files</h1>
          <p className="text-sm text-muted-foreground">
            {filteredFiles.length} files · Loan Operations Workspace
          </p>
        </div>
        <Button size="sm" className="self-start shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Loan File
          <span className="ml-1 hidden text-[10px] opacity-70 md:inline">Ctrl+N</span>
        </Button>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search files, customers, lenders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={savedView} onValueChange={setSavedView}>
            <SelectTrigger className="w-[180px] h-9">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Saved Views" />
            </SelectTrigger>
            <SelectContent>
              {savedViews.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-9" onClick={handleSaveView}>
            Save View
          </Button>

          <Button variant="outline" size="sm" className="h-9" onClick={exportFiles}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <Button variant="outline" size="sm" className="h-9" onClick={refresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            {views.map((v) => (
              <Button
                key={v.id}
                variant={view === v.id ? "secondary" : "ghost"}
                size="sm"
                className={cn("h-8 px-2.5 gap-1.5", view === v.id && "shadow-sm")}
                onClick={() => setView(v.id)}
              >
                <v.icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline text-xs">{v.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
