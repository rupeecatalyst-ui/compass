import type {
  ChanakyaIntelligenceContext,
  CustomerInsights,
  ExecutiveBrief,
  LoanInsights,
  PriorityItem,
  Recommendation,
  UserInsights,
} from "@/modules/intelligence/types/intelligence.types";
import {
  buildMockCustomerInsights,
  buildMockExecutiveBrief,
  buildMockLoanInsights,
  buildMockUserInsights,
  MOCK_PRIORITY_ITEMS,
  MOCK_RECOMMENDATIONS,
} from "@/modules/intelligence/services/mock-data";

/** Service contract — future AI / API implementations swap in here. */
export interface ChanakyaIntelligenceService {
  getExecutiveBrief(context?: ChanakyaIntelligenceContext): Promise<ExecutiveBrief>;
  getLoanInsights(loanId: string): Promise<LoanInsights>;
  getCustomerInsights(customerId: string): Promise<CustomerInsights>;
  getUserInsights(userId: string): Promise<UserInsights>;
  getPriorityItems(context?: ChanakyaIntelligenceContext): Promise<PriorityItem[]>;
  getRecommendations(context?: ChanakyaIntelligenceContext): Promise<Recommendation[]>;
}

function delay<T>(data: T, ms = 120): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), ms);
  });
}

/** 10.3B — Mock intelligence service (no AI, no hardcoded UI). */
export class ChanakyaMockIntelligenceService implements ChanakyaIntelligenceService {
  async getExecutiveBrief(context?: ChanakyaIntelligenceContext): Promise<ExecutiveBrief> {
    const name = context?.userName?.split(" ")[0] ?? "Rahul";
    return delay(buildMockExecutiveBrief(name));
  }

  async getLoanInsights(loanId: string): Promise<LoanInsights> {
    return delay(buildMockLoanInsights(loanId));
  }

  async getCustomerInsights(customerId: string): Promise<CustomerInsights> {
    return delay(buildMockCustomerInsights(customerId));
  }

  async getUserInsights(userId: string): Promise<UserInsights> {
    return delay(buildMockUserInsights(userId, "Rahul Verma"));
  }

  async getPriorityItems(): Promise<PriorityItem[]> {
    return delay([...MOCK_PRIORITY_ITEMS]);
  }

  async getRecommendations(): Promise<Recommendation[]> {
    return delay([...MOCK_RECOMMENDATIONS]);
  }
}

export const chanakyaIntelligenceService: ChanakyaIntelligenceService =
  new ChanakyaMockIntelligenceService();
