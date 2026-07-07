"use client";

import { useEffect, useState } from "react";
import { chanakyaIntelligenceService } from "@/modules/intelligence/services";
import type {
  ChanakyaIntelligenceContext,
  ExecutiveBrief,
  PriorityItem,
  Recommendation,
} from "@/modules/intelligence/types";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

function useAsync<T>(fetcher: () => Promise<T>, depKey: string): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error });
      });
    return () => {
      cancelled = true;
    };
    // depKey serialises caller context — fetcher is always fresh per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  return state;
}

export function useExecutiveBrief(context?: ChanakyaIntelligenceContext) {
  const depKey = `${context?.userId ?? ""}|${context?.userName ?? ""}|${context?.mode ?? ""}`;
  return useAsync(() => chanakyaIntelligenceService.getExecutiveBrief(context), depKey);
}

export function usePriorityItems(context?: ChanakyaIntelligenceContext) {
  const depKey = `${context?.userId ?? ""}|${context?.loanId ?? ""}|${context?.mode ?? ""}`;
  return useAsync(() => chanakyaIntelligenceService.getPriorityItems(context), depKey);
}

export function useRecommendations(context?: ChanakyaIntelligenceContext) {
  const depKey = `${context?.userId ?? ""}|${context?.loanId ?? ""}|${context?.mode ?? ""}`;
  return useAsync(() => chanakyaIntelligenceService.getRecommendations(context), depKey);
}

export function useLoanInsights(loanId?: string) {
  return useAsync(
    () =>
      loanId
        ? chanakyaIntelligenceService.getLoanInsights(loanId)
        : Promise.reject(new Error("No loanId")),
    loanId ?? "",
  );
}

export function useCustomerInsights(customerId?: string) {
  return useAsync(
    () =>
      customerId
        ? chanakyaIntelligenceService.getCustomerInsights(customerId)
        : Promise.reject(new Error("No customerId")),
    customerId ?? "",
  );
}

export function useUserInsights(userId?: string) {
  return useAsync(
    () =>
      userId
        ? chanakyaIntelligenceService.getUserInsights(userId)
        : Promise.reject(new Error("No userId")),
    userId ?? "",
  );
}

export type { ExecutiveBrief, PriorityItem, Recommendation };
