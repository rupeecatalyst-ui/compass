"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STORAGE_KEYS } from "@/constants/animations";
import {
  CUSTOMER_SAVED_VIEWS,
  DEFAULT_CUSTOMER_COLUMNS,
} from "@/constants/customer-360";
import {
  customerCities,
  loanProducts,
  relationshipManagers,
} from "@/data/catalyst-one/customer-360-seed";
import { LEAD_SOURCES } from "@/constants/customer-360";
import {
  applyCustomerFilters,
  applyCustomerSavedView,
  computeCustomer360Metrics,
  searchCustomers,
  sortCustomers,
} from "@/lib/customer-utils";
import { subscribeLoanFilesUpdated } from "@/lib/loan-data-sync";
import { getInitialCustomers, loadCustomers, saveCustomers } from "@/lib/customers-storage";
import { getAllLoanFiles } from "@/lib/loan-files-utils";
import {
  loadCustomerWorkspaceContext,
  popWorkspaceNav,
  pushWorkspaceNav,
  saveCustomerWorkspaceContext,
} from "@/lib/workspace-context";
import type {
  CustomerListColumnKey,
  CustomerListSortField,
  CustomerListView,
  CustomerProfile,
  SortDirection,
} from "@/types/catalyst-one";

function loadViewMode(): CustomerListView {
  if (typeof window === "undefined") return "list";
  const v = localStorage.getItem(STORAGE_KEYS.CUSTOMERS_VIEW_MODE);
  if (v === "list" || v === "card" || v === "compact") return v;
  return "list";
}

function loadVisibleColumns(): CustomerListColumnKey[] {
  if (typeof window === "undefined") return DEFAULT_CUSTOMER_COLUMNS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS_COLUMNS);
    if (raw) return JSON.parse(raw) as CustomerListColumnKey[];
  } catch {
    /* ignore */
  }
  return DEFAULT_CUSTOMER_COLUMNS;
}

export function useCustomersWorkspace() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerProfile[]>(() => getInitialCustomers());
  const [search, setSearch] = useState("");
  const [rmFilter, setRmFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [leadSourceFilter, setLeadSourceFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [savedView, setSavedView] = useState("all");
  const [viewMode, setViewModeState] = useState<CustomerListView>("list");
  const [visibleColumns, setVisibleColumnsState] =
    useState<CustomerListColumnKey[]>(DEFAULT_CUSTOMER_COLUMNS);
  const [sortField, setSortField] = useState<CustomerListSortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedLoanFileId, setSelectedLoanFileId] = useState<string | null>(null);
  const [loanWorkspaceTab, setLoanWorkspaceTab] = useState("overview");
  const [workspaceTab, setWorkspaceTabState] = useState("overview");
  const [completedProductFilter, setCompletedProductFilter] = useState<string | null>(null);
  const [loanFilesVersion, setLoanFilesVersion] = useState(0);
  const workspaceScrollRef = useRef<number>(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCustomers(loadCustomers());
    setViewModeState(loadViewMode());
    setVisibleColumnsState(loadVisibleColumns());
    setMounted(true);
    return subscribeLoanFilesUpdated(() => setLoanFilesVersion((v) => v + 1));
  }, []);

  const setWorkspaceTab = useCallback(
    (tab: string) => {
      setWorkspaceTabState(tab);
      if (selectedCustomerId) {
        saveCustomerWorkspaceContext(selectedCustomerId, {
          tab,
          scrollTop: workspaceScrollRef.current,
          completedProductFilter,
        });
      }
    },
    [selectedCustomerId, completedProductFilter],
  );

  useEffect(() => {
    if (!selectedCustomerId) return;
    const ctx = loadCustomerWorkspaceContext(selectedCustomerId);
    if (ctx) {
      setWorkspaceTabState(ctx.tab);
      workspaceScrollRef.current = ctx.scrollTop;
      setCompletedProductFilter(ctx.completedProductFilter ?? null);
    } else {
      setWorkspaceTabState("overview");
      setCompletedProductFilter(null);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    if (!mounted) return;
    saveCustomers(customers);
  }, [customers, mounted]);

  const setViewMode = useCallback((mode: CustomerListView) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS_VIEW_MODE, mode);
  }, []);

  const setVisibleColumns = useCallback((cols: CustomerListColumnKey[]) => {
    setVisibleColumnsState(cols);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS_COLUMNS, JSON.stringify(cols));
  }, []);

  const openCustomer = useCallback(
    (id: string) => {
      setSelectedCustomerId(id);
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams();
      params.set("customer", id);
      router.replace(`/customers?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const openContactFromWorkspace = useCallback(
    (contactId: string) => {
      if (contactId === selectedCustomerId) return;
      if (selectedCustomerId) {
        const context = {
          tab: workspaceTab,
          scrollTop: workspaceScrollRef.current,
          completedProductFilter,
        };
        saveCustomerWorkspaceContext(selectedCustomerId, context);
        pushWorkspaceNav({
          customerId: selectedCustomerId,
          context,
          loanFileId: selectedLoanFileId,
        });
      }
      setSelectedLoanFileId(null);
      setSelectedCustomerId(contactId);
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams();
      params.set("customer", contactId);
      router.replace(`/customers?${params.toString()}`, { scroll: false });
    },
    [
      selectedCustomerId,
      workspaceTab,
      completedProductFilter,
      selectedLoanFileId,
      router,
    ],
  );

  const closeCustomer = useCallback(() => {
    const frame = popWorkspaceNav();
    if (frame) {
      setSelectedCustomerId(frame.customerId);
      setWorkspaceTabState(frame.context.tab);
      workspaceScrollRef.current = frame.context.scrollTop;
      setCompletedProductFilter(frame.context.completedProductFilter ?? null);
      setSelectedLoanFileId(frame.loanFileId ?? null);
      saveCustomerWorkspaceContext(frame.customerId, frame.context);
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams();
      params.set("customer", frame.customerId);
      router.replace(`/customers?${params.toString()}`, { scroll: false });
      return;
    }
    setSelectedCustomerId(null);
    setSelectedLoanFileId(null);
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    params.delete("customer");
    router.replace(params.toString() ? `/customers?${params.toString()}` : "/customers", {
      scroll: false,
    });
  }, [router]);

  const loanFiles = useMemo(() => {
    if (!mounted) return [];
    void loanFilesVersion;
    return getAllLoanFiles();
  }, [mounted, loanFilesVersion]);

  const refreshLoanFiles = useCallback(() => {
    setLoanFilesVersion((v) => v + 1);
  }, []);

  const openLoanWorkspace = useCallback((fileId: string, tab = "overview") => {
    setLoanWorkspaceTab(tab);
    setSelectedLoanFileId(fileId);
  }, []);

  const closeLoanWorkspace = useCallback(() => {
    setSelectedLoanFileId(null);
    setLoanWorkspaceTab("overview");
  }, []);

  const filteredCustomers = useMemo(() => {
    let result = customers;
    result = applyCustomerSavedView(result, savedView, loanFiles);
    result = applyCustomerFilters(result, {
      rm: rmFilter,
      city: cityFilter,
      product: productFilter,
      activeFilter,
      leadSource: leadSourceFilter,
      tags: tagFilter,
    });
    result = searchCustomers(search, result, loanFiles);
    result = sortCustomers(result, sortField, sortDirection, loanFiles);
    return result;
  }, [
    customers,
    savedView,
    rmFilter,
    cityFilter,
    productFilter,
    activeFilter,
    leadSourceFilter,
    tagFilter,
    search,
    sortField,
    sortDirection,
    loanFiles,
  ]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const toggleSort = useCallback(
    (field: CustomerListSortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField],
  );

  const addCustomer = useCallback((profile: CustomerProfile) => {
    setCustomers((prev) => [profile, ...prev]);
  }, []);

  const updateCustomer = useCallback((id: string, patch: Partial<CustomerProfile>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const getMetrics = useCallback(
    (id: string) => computeCustomer360Metrics(id, loanFiles),
    [loanFiles],
  );

  return {
    mounted,
    customers,
    filteredCustomers,
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
    savedViews: CUSTOMER_SAVED_VIEWS,
    viewMode,
    setViewMode,
    visibleColumns,
    setVisibleColumns,
    sortField,
    sortDirection,
    toggleSort,
    selectedCustomerId,
    selectedCustomer,
    setSelectedCustomerId,
    openCustomer,
    openContactFromWorkspace,
    closeCustomer,
    createOpen,
    setCreateOpen,
    columnSettingsOpen,
    setColumnSettingsOpen,
    addCustomer,
    updateCustomer,
    getMetrics,
    loanFiles,
    refreshLoanFiles,
    workspaceTab,
    setWorkspaceTab,
    workspaceScrollRef,
    selectedLoanFileId,
    loanWorkspaceTab,
    openLoanWorkspace,
    closeLoanWorkspace,
    completedProductFilter,
    setCompletedProductFilter,
    managers: relationshipManagers,
    products: loanProducts,
    cities: customerCities,
    leadSources: [...LEAD_SOURCES],
  };
}

export type CustomersWorkspace = ReturnType<typeof useCustomersWorkspace>;
