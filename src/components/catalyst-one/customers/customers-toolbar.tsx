"use client";

import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { CUSTOMER_TAGS } from "@/constants/customer-360";
import { useCustomersContext } from "@/components/catalyst-one/customers/customers-context";
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
import type { CustomerListView } from "@/types/catalyst-one";

const filterTrigger = "h-8 text-xs bg-background border-border shrink-0";

const VIEW_OPTIONS: { value: CustomerListView; label: string }[] = [
  { value: "list", label: "List" },
  { value: "card", label: "Card" },
  { value: "compact", label: "Compact" },
];

export function CustomersToolbar() {
  const {
    search,
    setSearch,
    searchInputRef,
    rmFilter,
    setRmFilter,
    cityFilter,
    setCityFilter,
    productFilter,
    setProductFilter,
    activeFilter,
    setActiveFilter,
    leadSourceFilter,
    setLeadSourceFilter,
    tagFilter,
    setTagFilter,
    savedView,
    setSavedView,
    savedViews,
    viewMode,
    setViewMode,
    setCreateOpen,
    setColumnSettingsOpen,
    managers,
    products,
    cities,
    leadSources,
    filteredCustomers,
  } = useCustomersContext();

  return (
    <div className="space-y-1.5 border-b border-border pb-1.5 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Customer Relationship Centre</h1>
          <p className="text-[10px] text-muted-foreground">
            {filteredCustomers.length} relationships · single source of truth per customer
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {VIEW_OPTIONS.map((v) => (
            <Button
              key={v.value}
              size="sm"
              variant={viewMode === v.value ? "secondary" : "ghost"}
              className={cn("h-7 px-2 text-[10px]", viewMode === v.value && "bg-muted")}
              onClick={() => setViewMode(v.value)}
            >
              {v.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative w-[200px] shrink-0">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, mobile, PAN, company, loan ID..."
            className="h-8 pl-8 text-xs bg-background border-border"
          />
        </div>

        <Button
          size="sm"
          className="h-8 shrink-0 px-3 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Customer
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

        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className={`${filterTrigger} w-[100px]`}>
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Cities</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city} className="text-xs">{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className={`${filterTrigger} w-[120px]`}>
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Products</SelectItem>
            {products.map((p) => (
              <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={activeFilter}
          onValueChange={(v) => setActiveFilter(v as "all" | "active" | "inactive")}
        >
          <SelectTrigger className={`${filterTrigger} w-[100px]`}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All</SelectItem>
            <SelectItem value="active" className="text-xs">Active</SelectItem>
            <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={leadSourceFilter} onValueChange={setLeadSourceFilter}>
          <SelectTrigger className={`${filterTrigger} w-[110px]`}>
            <SelectValue placeholder="Lead Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Sources</SelectItem>
            {leadSources.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className={`${filterTrigger} w-[100px]`}>
            <SelectValue placeholder="Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Tags</SelectItem>
            {CUSTOMER_TAGS.map((tag) => (
              <SelectItem key={tag} value={tag} className="text-xs">{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={savedView} onValueChange={setSavedView}>
          <SelectTrigger className={`${filterTrigger} w-[130px]`}>
            <SelectValue placeholder="Saved Views" />
          </SelectTrigger>
          <SelectContent>
            {savedViews.map((v) => (
              <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 text-xs border-border"
          onClick={() => setColumnSettingsOpen(true)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
          Columns
        </Button>
      </div>
    </div>
  );
}
