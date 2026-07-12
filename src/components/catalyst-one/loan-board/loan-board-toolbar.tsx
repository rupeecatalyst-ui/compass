"use client";

import { ArrowDownUp, Plus, RefreshCw, Search, Settings2, SlidersHorizontal, X } from "lucide-react";
import { useLoanBoardContext } from "@/components/catalyst-one/loan-board/loan-board-context";
import {
  LOAN_BOARD_SORT_OPTIONS,
  type LoanBoardSortDir,
  type LoanBoardSortKey,
} from "@/components/catalyst-one/loan-board/providers/loan-board-placeholder-provider";
import { LOAN_BOARD_STAGES } from "@/constants/loan-board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { loanFilePriorityOptions } from "@/data/catalyst-one/loan-files";

const filterTrigger = "h-8 text-xs bg-background border-border shrink-0";

export function LoanBoardToolbar() {
  const {
    search,
    setSearch,
    searchInputRef,
    rmFilter,
    setRmFilter,
    productFilter,
    setProductFilter,
    lenderFilter,
    setLenderFilter,
    cityFilter,
    setCityFilter,
    priorityFilter,
    setPriorityFilter,
    stageFilter,
    setStageFilter,
    showClosed,
    setShowClosed,
    savedView,
    setSavedView,
    savedViews,
    setSettingsOpen,
    setCreateOpen,
    managers,
    products,
    lenders,
    cities,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    clearFilters,
    refresh,
    isRefreshing,
    selectedIds,
    clearSelection,
    selectAllFiltered,
    bulkArchive,
    bulkHold,
    bulkChangeOwner,
    lastStatus,
  } = useLoanBoardContext();

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-1.5 shrink-0">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-1">
        <div className="relative w-[200px] shrink-0">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-8 pl-8 text-xs bg-background border-border"
          />
        </div>

        <Button
          size="sm"
          className="h-8 shrink-0 px-3 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Loan
        </Button>

        <Select value={rmFilter} onValueChange={setRmFilter}>
          <SelectTrigger className={`${filterTrigger} w-[108px]`}>
            <SelectValue placeholder="RM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All RMs</SelectItem>
            {managers.map((rm) => (
              <SelectItem key={rm} value={rm} className="text-xs">{rm}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className={`${filterTrigger} w-[118px]`}>
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Products</SelectItem>
            {products.map((p) => (
              <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={lenderFilter} onValueChange={setLenderFilter}>
          <SelectTrigger className={`${filterTrigger} w-[108px]`}>
            <SelectValue placeholder="Lender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Lenders</SelectItem>
            {lenders.map((l) => (
              <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className={`${filterTrigger} w-[100px]`}>
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
          <SelectTrigger className={`${filterTrigger} w-[100px]`}>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {loanFilePriorityOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={stageFilter}
          onValueChange={(v) => setStageFilter(v as typeof stageFilter)}
        >
          <SelectTrigger className={`${filterTrigger} w-[110px]`}>
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Stages</SelectItem>
            {LOAN_BOARD_STAGES.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-md border border-border px-1.5 h-8 shrink-0 bg-background">
          <Switch id="closed-toggle" checked={showClosed} onCheckedChange={setShowClosed} className="scale-75" />
          <Label htmlFor="closed-toggle" className="text-[10px] text-muted-foreground cursor-pointer whitespace-nowrap">
            Closed
          </Label>
        </div>

        <Select value={savedView} onValueChange={setSavedView}>
          <SelectTrigger className={`${filterTrigger} w-[132px]`}>
            <SlidersHorizontal className="h-3 w-3 mr-1 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Saved View" />
          </SelectTrigger>
          <SelectContent>
            {savedViews.map((v) => (
              <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortKey} onValueChange={(v) => setSortKey(v as LoanBoardSortKey)}>
          <SelectTrigger className={`${filterTrigger} w-[118px]`}>
            <ArrowDownUp className="h-3 w-3 mr-1 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {LOAN_BOARD_SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortDir} onValueChange={(v) => setSortDir(v as LoanBoardSortDir)}>
          <SelectTrigger className={`${filterTrigger} w-[88px]`}>
            <SelectValue placeholder="Dir" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc" className="text-xs">Asc</SelectItem>
            <SelectItem value="desc" className="text-xs">Desc</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 px-2.5 text-xs border-border bg-background"
          onClick={clearFilters}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 px-2.5 text-xs border-border bg-background"
          onClick={refresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 px-2.5 text-xs border-border bg-background"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="h-3.5 w-3.5 mr-1" />
          Settings
        </Button>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1">
          <span className="text-[10px] text-muted-foreground tabular-nums">{selectedCount} selected</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllFiltered}>
            Select all filtered
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
            Clear selection
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={bulkHold}>
            Bulk Hold
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={bulkArchive}>
            Bulk Archive
          </Button>
          <Select onValueChange={(owner) => bulkChangeOwner(owner)}>
            <SelectTrigger className={`${filterTrigger} w-[140px]`}>
              <SelectValue placeholder="Bulk owner…" />
            </SelectTrigger>
            <SelectContent>
              {managers.map((rm) => (
                <SelectItem key={rm} value={rm} className="text-xs">{rm}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {lastStatus && (
        <p className="text-[10px] text-muted-foreground truncate">{lastStatus}</p>
      )}
    </div>
  );
}
