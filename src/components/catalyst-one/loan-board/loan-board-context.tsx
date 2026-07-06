"use client";

import { createContext, useContext } from "react";
import { useLoanBoard, type LoanBoardWorkspace } from "@/hooks/use-loan-board";

const LoanBoardContext = createContext<LoanBoardWorkspace | null>(null);

export function LoanBoardProvider({ children }: { children: React.ReactNode }) {
  const workspace = useLoanBoard();
  return <LoanBoardContext.Provider value={workspace}>{children}</LoanBoardContext.Provider>;
}

export function useLoanBoardContext() {
  const ctx = useContext(LoanBoardContext);
  if (!ctx) throw new Error("useLoanBoardContext must be used within LoanBoardProvider");
  return ctx;
}
