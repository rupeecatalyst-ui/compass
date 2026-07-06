"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEYS } from "@/constants/animations";
import {
  DEFAULT_LOAN_BOARD_FIELDS,
  LOAN_BOARD_SAVED_VIEWS,
  LOAN_BOARD_STAGES,
  type LoanBoardDensity,
  type LoanBoardFieldKey,
} from "@/constants/loan-board";
import { DEMO_CURRENT_RM, PIPELINE_STAGES, STAGE_LABELS } from "@/constants/loan-pipeline";
import { LOAN_MANAGERS } from "@/data/catalyst-one/generate-loan-files";
import { getInitialLoanFiles, loanLenders, loanProducts } from "@/data/catalyst-one/loan-files";
import { averageAgeingForStage } from "@/lib/loan-board-utils";
import {
  createLoanFileFromInput,
} from "@/lib/loan-files-utils";
import { loadLoanFiles, saveLoanFiles } from "@/lib/loan-files-storage";
import type {
  CreateLoanFileInput,
  LoanFile,
  LoanFileColumnStats,
  LoanFilePriority,
  PipelineStage,
} from "@/types/catalyst-one";

function loadDensity(): LoanBoardDensity {
  if (typeof window === "undefined") return "compact";
  const v = localStorage.getItem(STORAGE_KEYS.LOAN_BOARD_DENSITY);
  if (v === "compact" || v === "medium" || v === "large") return v;
  return "compact";
}

function loadVisibleFields(): LoanBoardFieldKey[] {
  if (typeof window === "undefined") return DEFAULT_LOAN_BOARD_FIELDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOAN_BOARD_FIELDS);
    if (raw) return JSON.parse(raw) as LoanBoardFieldKey[];
  } catch {
    /* ignore */
  }
  return DEFAULT_LOAN_BOARD_FIELDS;
}

function loadCollapsedColumns(): PipelineStage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOAN_BOARD_COLLAPSED_COLUMNS);
    if (raw) return JSON.parse(raw) as PipelineStage[];
  } catch {
    /* ignore */
  }
  return [];
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function applyBoardSavedView(files: LoanFile[], savedView: string): LoanFile[] {
  const today = new Date();
  switch (savedView) {
    case "my_files":
      return files.filter((f) => f.relationshipManager === DEMO_CURRENT_RM);
    case "todays_followups":
      return files.filter((f) => f.tasks.some((t) => !t.completed && isSameDay(new Date(t.dueDate), today)));
    case "high_value":
      return files.filter((f) => f.loanAmount >= 80_00_000);
    case "home_loans":
      return files.filter((f) => f.loanProduct.includes("Home Loan"));
    case "business_loans":
      return files.filter((f) => f.loanProduct === "Business Loan" || f.loanProduct === "Working Capital");
    case "credit_wip":
      return files.filter((f) => f.stage === "credit_wip");
    case "management":
      return files.filter((f) => f.loanAmount >= 50_00_000 || f.priority === "urgent");
    default:
      return files;
  }
}

export function useLoanBoard() {
  const [files, setFiles] = useState<LoanFile[]>(() => getInitialLoanFiles());
  const [search, setSearch] = useState("");
  const [rmFilter, setRmFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [lenderFilter, setLenderFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<LoanFilePriority | "all">("all");
  const [showClosed, setShowClosed] = useState(false);
  const [savedView, setSavedView] = useState("all");
  const [stageFilter, setStageFilter] = useState<PipelineStage | "all">("all");
  const [density, setDensityState] = useState<LoanBoardDensity>("medium");
  const [visibleFields, setVisibleFieldsState] = useState<LoanBoardFieldKey[]>(DEFAULT_LOAN_BOARD_FIELDS);
  const [collapsedColumns, setCollapsedColumns] = useState<PipelineStage[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFiles(loadLoanFiles());
    setDensityState(loadDensity());
    setVisibleFieldsState(loadVisibleFields());
    setCollapsedColumns(loadCollapsedColumns());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    saveLoanFiles(files);
  }, [files, mounted]);

  const setDensity = useCallback((d: LoanBoardDensity) => {
    setDensityState(d);
    localStorage.setItem(STORAGE_KEYS.LOAN_BOARD_DENSITY, d);
  }, []);

  const setVisibleFields = useCallback((fields: LoanBoardFieldKey[]) => {
    setVisibleFieldsState(fields);
    localStorage.setItem(STORAGE_KEYS.LOAN_BOARD_FIELDS, JSON.stringify(fields));
  }, []);

  const toggleColumnCollapse = useCallback((stage: PipelineStage) => {
    setCollapsedColumns((prev) => {
      const next = prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage];
      localStorage.setItem(STORAGE_KEYS.LOAN_BOARD_COLLAPSED_COLUMNS, JSON.stringify(next));
      return next;
    });
  }, []);

  const persistFiles = useCallback((updater: (prev: LoanFile[]) => LoanFile[]) => {
    setFiles((prev) => updater(prev));
  }, []);

  const moveFile = useCallback((fileId: string, newStage: PipelineStage) => {
    persistFiles((prev) =>
      prev.map((f) => {
        if (f.id !== fileId) return f;
        const stageIndex = PIPELINE_STAGES.findIndex((s) => s.id === newStage);
        return {
          ...f,
          stage: newStage,
          daysInStage: 0,
          progress: Math.round(((stageIndex + 1) / PIPELINE_STAGES.length) * 100),
          status: newStage === "won" ? "completed" : f.status === "completed" ? "on_track" : f.status,
          timeline: [
            ...f.timeline,
            {
              id: `tl-move-${Date.now()}`,
              title: `Moved to ${STAGE_LABELS[newStage]}`,
              description: `Stage updated to ${STAGE_LABELS[newStage]}`,
              timestamp: new Date().toISOString(),
              completed: true,
            },
          ],
        };
      }),
    );
  }, [persistFiles]);

  const addFile = useCallback(
    (input: CreateLoanFileInput) => {
      persistFiles((prev) => [...prev, createLoanFileFromInput(input, prev)]);
    },
    [persistFiles],
  );

  const updateFile = useCallback(
    (fileId: string, patch: Partial<LoanFile>) => {
      persistFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, ...patch } : f)));
    },
    [persistFiles],
  );

  const cities = useMemo(() => {
    const set = new Set(files.map((f) => f.city));
    return Array.from(set).sort();
  }, [files]);

  const filteredFiles = useMemo(() => {
    const q = search.toLowerCase().trim();
    let pool = showClosed ? files.filter((f) => f.archived || f.status === "completed") : files.filter((f) => !f.archived && f.status !== "completed");

    pool = pool.filter((f) => {
      const matchesSearch =
        !q ||
        f.customerName.toLowerCase().includes(q) ||
        f.fileNumber.toLowerCase().includes(q) ||
        f.loanProduct.toLowerCase().includes(q) ||
        f.lender.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q) ||
        f.relationshipManager.toLowerCase().includes(q) ||
        f.customerMobile.includes(q) ||
        (f.businessDetails?.companyName?.toLowerCase().includes(q) ?? false);

      const matchesRm = rmFilter === "all" || f.relationshipManager === rmFilter;
      const matchesProduct = productFilter === "all" || f.loanProduct === productFilter;
      const matchesLender = lenderFilter === "all" || f.lender === lenderFilter;
      const matchesCity = cityFilter === "all" || f.city === cityFilter;
      const matchesPriority = priorityFilter === "all" || f.priority === priorityFilter;
      const matchesStage = stageFilter === "all" || f.stage === stageFilter;

      return matchesSearch && matchesRm && matchesProduct && matchesLender && matchesCity && matchesPriority && matchesStage;
    });

    if (savedView !== "all") {
      pool = applyBoardSavedView(pool, savedView);
    }

    return pool;
  }, [files, search, rmFilter, productFilter, lenderFilter, cityFilter, priorityFilter, showClosed, savedView, stageFilter]);

  const columnStats = useMemo((): LoanFileColumnStats[] => {
    return LOAN_BOARD_STAGES.map(({ id, label }) => {
      const columnFiles = filteredFiles.filter((f) => f.stage === id);
      return {
        stage: id,
        label,
        count: columnFiles.length,
        totalValue: columnFiles.reduce((s, f) => s + f.loanAmount, 0),
        urgentCount: columnFiles.filter((f) => f.isUrgent).length,
        delayedCount: columnFiles.filter((f) => f.isDelayed).length,
        avgAgeing: averageAgeingForStage(columnFiles, id),
      };
    });
  }, [filteredFiles]);

  const filesByStage = useMemo(() => {
    const map = new Map<PipelineStage, LoanFile[]>();
    LOAN_BOARD_STAGES.forEach(({ id }) => map.set(id, []));
    filteredFiles.forEach((f) => {
      if (!map.has(f.stage)) return;
      const list = map.get(f.stage)!;
      list.push(f);
      map.set(f.stage, list);
    });
    return map;
  }, [filteredFiles]);

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedFileId) ?? null,
    [files, selectedFileId],
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setRmFilter("all");
    setProductFilter("all");
    setLenderFilter("all");
    setCityFilter("all");
    setPriorityFilter("all");
    setStageFilter("all");
    setSavedView("all");
    setShowClosed(false);
  }, []);

  return {
    files,
    filteredFiles,
    filesByStage,
    columnStats,
    search,
    setSearch,
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
    showClosed,
    setShowClosed,
    savedView,
    setSavedView,
    savedViews: LOAN_BOARD_SAVED_VIEWS,
    stageFilter,
    setStageFilter,
    density,
    setDensity,
    visibleFields,
    setVisibleFields,
    collapsedColumns,
    toggleColumnCollapse,
    selectedFile,
    selectedFileId,
    setSelectedFileId,
    moveFile,
    addFile,
    updateFile,
    createOpen,
    setCreateOpen,
    settingsOpen,
    setSettingsOpen,
    mounted,
    searchInputRef,
    clearFilters,
    managers: LOAN_MANAGERS,
    products: loanProducts,
    lenders: loanLenders,
    cities,
  };
}

export type LoanBoardWorkspace = ReturnType<typeof useLoanBoard>;
