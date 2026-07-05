"use client";

import { createContext, useContext } from "react";
import { useLoanFilesWorkspace, type LoanFilesWorkspace } from "@/hooks/use-loan-files-workspace";

const LoanFilesContext = createContext<LoanFilesWorkspace | null>(null);

export function LoanFilesProvider({ children }: { children: React.ReactNode }) {
  const workspace = useLoanFilesWorkspace();
  return <LoanFilesContext.Provider value={workspace}>{children}</LoanFilesContext.Provider>;
}

export function useLoanFiles() {
  const ctx = useContext(LoanFilesContext);
  if (!ctx) throw new Error("useLoanFiles must be used within LoanFilesProvider");
  return ctx;
}
