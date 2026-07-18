"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEYS } from "@/constants/animations";
import { DEMO_CURRENT_RM, PIPELINE_STAGES, STAGE_LABELS } from "@/constants/loan-pipeline";
import { LOAN_MANAGERS } from "@/data/catalyst-one/generate-loan-files";
import { getInitialLoanFiles, savedViews as defaultViews } from "@/data/catalyst-one/loan-files";
import {
  createLoanFileFromInput,
  duplicateLoanFile,
  exportLoanFilesCsv,
  downloadCsv,
} from "@/lib/loan-files-utils";
import { captureChanakyaStageTransition } from "@/lib/chanakya-stage-coaching";
import {
  loadCustomSavedViews,
  loadLoanFiles,
  saveCustomSavedViews,
  saveLoanFiles,
} from "@/lib/loan-files-storage";
import type {
  CreateLoanFileInput,
  LoanFile,
  LoanFileColumnStats,
  LoanFileFilters,
  LoanFileTask,
  LoanFileView,
  PipelineStage,
  SavedViewPreset,
} from "@/types/catalyst-one";

const defaultFilters: LoanFileFilters = {
  stage: "all",
  loanProduct: "all",
  lender: "all",
  relationshipManager: "all",
  priority: "all",
  status: "all",
};

function loadView(): LoanFileView {
  if (typeof window === "undefined") return "kanban";
  const stored = localStorage.getItem(STORAGE_KEYS.LOAN_FILES_VIEW);
  if (stored === "list" || stored === "kanban" || stored === "timeline" || stored === "tasks") {
    return stored;
  }
  /** Analytics relocated to Mission Control → Operations Intelligence. */
  if (stored === "analytics") return "kanban";
  return "kanban";
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function applySavedView(files: LoanFile[], savedView: string): LoanFile[] {
  const today = new Date();
  switch (savedView) {
    case "my_files":
      return files.filter((f) => f.relationshipManager === DEMO_CURRENT_RM);
    case "home_loans":
      return files.filter((f) => f.loanProduct.includes("Home Loan"));
    case "business_loans":
      return files.filter((f) => f.loanProduct === "Business Loan" || f.loanProduct === "Working Capital");
    case "lap":
      return files.filter((f) => f.loanProduct === "Loan Against Property");
    case "high_revenue":
      return files.filter((f) => f.expectedRevenue >= 5_00_000);
    case "delayed":
      return files.filter((f) => f.isDelayed);
    case "disbursement_today":
      return files.filter((f) => isSameDay(new Date(f.expectedDisbursement), today));
    case "urgent":
      return files.filter((f) => f.isUrgent);
    default:
      return files;
  }
}

export function useLoanFilesWorkspace() {
  const [files, setFiles] = useState<LoanFile[]>(() => getInitialLoanFiles());
  const [view, setViewState] = useState<LoanFileView>("kanban");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LoanFileFilters>(defaultFilters);
  const [savedView, setSavedView] = useState("all");
  const [customViews, setCustomViews] = useState<SavedViewPreset[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [customerFilterId, setCustomerFilterId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFiles(loadLoanFiles());
    setCustomViews(loadCustomSavedViews());
    setViewState(loadView());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    saveLoanFiles(files);
  }, [files, mounted]);

  const allSavedViews = useMemo(
    () => [...defaultViews, ...customViews.filter((c) => !defaultViews.some((d) => d.id === c.id))],
    [customViews],
  );

  const setView = useCallback((v: LoanFileView) => {
    setViewState(v);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.LOAN_FILES_VIEW, v);
    }
  }, []);

  const persistFiles = useCallback((updater: (prev: LoanFile[]) => LoanFile[]) => {
    setFiles((prev) => updater(prev));
  }, []);

  const moveFile = useCallback((fileId: string, newStage: PipelineStage) => {
    persistFiles((prev) =>
      prev.map((f) => {
        if (f.id !== fileId) return f;
        captureChanakyaStageTransition(f, newStage);
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

  const deleteFile = useCallback(
    (fileId: string) => {
      persistFiles((prev) => prev.filter((f) => f.id !== fileId));
      setSelectedFileId((id) => (id === fileId ? null : id));
    },
    [persistFiles],
  );

  const archiveFile = useCallback(
    (fileId: string) => {
      updateFile(fileId, { archived: true });
      setSelectedFileId((id) => (id === fileId ? null : id));
    },
    [updateFile],
  );

  const duplicateFile = useCallback(
    (fileId: string) => {
      persistFiles((prev) => {
        const source = prev.find((f) => f.id === fileId);
        if (!source) return prev;
        return [...prev, duplicateLoanFile(source, prev.length)];
      });
    },
    [persistFiles],
  );

  const assignRm = useCallback(
    (fileId: string, rm: string) => {
      updateFile(fileId, { relationshipManager: rm });
    },
    [updateFile],
  );

  const setPriority = useCallback(
    (fileId: string, priority: LoanFile["priority"]) => {
      updateFile(fileId, { priority, isUrgent: priority === "urgent" });
    },
    [updateFile],
  );

  const updateTask = useCallback(
    (fileId: string, taskId: string, patch: Partial<LoanFileTask>) => {
      persistFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }
            : f,
        ),
      );
    },
    [persistFiles],
  );

  const saveCustomView = useCallback(
    (label: string) => {
      const id = `custom_${Date.now()}`;
      const next = [...customViews, { id, label, isCustom: true }];
      setCustomViews(next);
      saveCustomSavedViews(next);
      setSavedView(id);
    },
    [customViews],
  );

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedFileId) ?? null,
    [files, selectedFileId],
  );

  const activeFiles = useMemo(() => files.filter((f) => !f.archived), [files]);

  const filteredFiles = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = activeFiles.filter((f) => {
      const matchesSearch =
        !q ||
        f.customerName.toLowerCase().includes(q) ||
        f.fileNumber.toLowerCase().includes(q) ||
        f.loanProduct.toLowerCase().includes(q) ||
        f.lender.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q) ||
        f.state.toLowerCase().includes(q) ||
        f.relationshipManager.toLowerCase().includes(q) ||
        f.customerMobile.includes(q) ||
        f.customerEmail.toLowerCase().includes(q) ||
        (f.businessDetails?.companyName?.toLowerCase().includes(q) ?? false);

      const matchesStage = filters.stage === "all" || f.stage === filters.stage;
      const matchesProduct = filters.loanProduct === "all" || f.loanProduct === filters.loanProduct;
      const matchesLender = filters.lender === "all" || f.lender === filters.lender;
      const matchesRm = filters.relationshipManager === "all" || f.relationshipManager === filters.relationshipManager;
      const matchesPriority = filters.priority === "all" || f.priority === filters.priority;
      const matchesStatus = filters.status === "all" || f.status === filters.status;

      return matchesSearch && matchesStage && matchesProduct && matchesLender && matchesRm && matchesPriority && matchesStatus;
    });

    if (savedView !== "all") {
      result = applySavedView(result, savedView);
    }

    if (customerFilterId) {
      result = result.filter((f) => f.customerId === customerFilterId);
    }

    return result;
  }, [activeFiles, search, filters, savedView, customerFilterId]);

  const allTasks = useMemo(() => {
    return activeFiles.flatMap((f) =>
      f.tasks.map((t) => ({ ...t, fileId: f.id, fileNumber: f.fileNumber, customerName: f.customerName })),
    );
  }, [activeFiles]);

  const columnStats = useMemo((): LoanFileColumnStats[] => {
    return PIPELINE_STAGES.map(({ id, label }) => {
      const columnFiles = filteredFiles.filter((f) => f.stage === id);
      return {
        stage: id,
        label,
        count: columnFiles.length,
        totalValue: columnFiles.reduce((s, f) => s + f.loanAmount, 0),
        urgentCount: columnFiles.filter((f) => f.isUrgent).length,
        delayedCount: columnFiles.filter((f) => f.isDelayed).length,
      };
    });
  }, [filteredFiles]);

  const filesByStage = useMemo(() => {
    const map = new Map<PipelineStage, LoanFile[]>();
    PIPELINE_STAGES.forEach(({ id }) => map.set(id, []));
    filteredFiles.forEach((f) => {
      const list = map.get(f.stage) ?? [];
      list.push(f);
      map.set(f.stage, list);
    });
    return map;
  }, [filteredFiles]);

  const aiInsights = useMemo(() => {
    const urgent = activeFiles.filter((f) => f.isUrgent);
    const delayed = activeFiles.filter((f) => f.isDelayed);
    const creditQueries = activeFiles.filter((f) => f.stage === "credit_wip");
    const todayDisbursement = activeFiles.filter((f) =>
      isSameDay(new Date(f.expectedDisbursement), new Date()),
    );
    const expectedRevenue = activeFiles.reduce((s, f) => s + f.expectedRevenue, 0);
    const rmPerformance = LOAN_MANAGERS.map((rm) => ({
      rm,
      revenue: activeFiles.filter((f) => f.relationshipManager === rm).reduce((s, f) => s + f.expectedRevenue, 0),
      count: activeFiles.filter((f) => f.relationshipManager === rm).length,
    })).sort((a, b) => b.revenue - a.revenue);

    return {
      urgentCount: urgent.length,
      delayedCount: delayed.length,
      creditQueryCount: creditQueries.length,
      todayDisbursementCount: todayDisbursement.length,
      expectedRevenue,
      expectedPayout: activeFiles
        .filter((f) => f.stage === "closure_wip" || f.stage === "final_approved")
        .reduce((s, f) => s + f.loanAmount, 0),
      followUpCount: activeFiles.filter((f) => f.tasks.some((t) => !t.completed && new Date(t.dueDate) <= new Date())).length,
      urgentFiles: urgent.slice(0, 5),
      delayedFiles: delayed.slice(0, 5),
      creditQueryFiles: creditQueries.slice(0, 4),
      todayDisbursementFiles: todayDisbursement.slice(0, 4),
      topRm: rmPerformance[0],
      todaysFocus: [
        ...urgent.slice(0, 2).map((f) => `Follow up: ${f.customerName}`),
        ...todayDisbursement.slice(0, 2).map((f) => `Disbursement: ${f.fileNumber}`),
      ].slice(0, 4),
    };
  }, [activeFiles]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setFiles([...getInitialLoanFiles()]);
      setIsRefreshing(false);
    }, 600);
  }, []);

  const exportFiles = useCallback(() => {
    const csv = exportLoanFilesCsv(filteredFiles);
    downloadCsv(csv, `loan-files-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [filteredFiles]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilters(defaultFilters);
    setSavedView("all");
    setCustomerFilterId(null);
  }, []);

  return {
    files: activeFiles,
    allFiles: files,
    filteredFiles,
    filesByStage,
    columnStats,
    allTasks,
    view,
    setView,
    search,
    setSearch,
    filters,
    setFilters,
    savedView,
    setSavedView,
    savedViews: allSavedViews,
    customViews,
    saveCustomView,
    selectedFile,
    selectedFileId,
    setSelectedFileId,
    moveFile,
    addFile,
    updateFile,
    deleteFile,
    archiveFile,
    duplicateFile,
    assignRm,
    setPriority,
    updateTask,
    refresh,
    exportFiles,
    isRefreshing,
    clearFilters,
    aiInsights,
    createOpen,
    setCreateOpen,
    customerFilterId,
    setCustomerFilterId,
    mounted,
    searchInputRef,
  };
}

export type LoanFilesWorkspace = ReturnType<typeof useLoanFilesWorkspace>;
