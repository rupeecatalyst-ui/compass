"use client";

import { createContext, useContext } from "react";
import {
  useCustomersWorkspace,
  type CustomersWorkspace,
} from "@/hooks/use-customers-workspace";

const CustomersContext = createContext<CustomersWorkspace | null>(null);

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const workspace = useCustomersWorkspace();
  return <CustomersContext.Provider value={workspace}>{children}</CustomersContext.Provider>;
}

export function useCustomersContext() {
  const ctx = useContext(CustomersContext);
  if (!ctx) throw new Error("useCustomersContext must be used within CustomersProvider");
  return ctx;
}
