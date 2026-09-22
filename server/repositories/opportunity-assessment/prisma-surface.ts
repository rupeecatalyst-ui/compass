export type PrismaWriteCount = { count: number };

export type PrismaUniqueConflict = {
  code: "P2002";
  meta?: {
    modelName?: string;
    target?: string[] | string;
    constraint?: string;
  };
};

export type OpportunityAssessmentPrismaDelegate = {
  findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
  create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  updateMany: (args: Record<string, unknown>) => Promise<PrismaWriteCount>;
};

export type OpportunityAssessmentPrismaSurface = {
  $transaction: <T>(fn: (tx: OpportunityAssessmentPrismaSurface) => Promise<T>) => Promise<T>;
  enterpriseOpportunityAssessment: OpportunityAssessmentPrismaDelegate;
  enterpriseOpportunityAssessmentRevision: OpportunityAssessmentPrismaDelegate;
  enterpriseOpportunityAssessmentRecommendationRun: OpportunityAssessmentPrismaDelegate;
};

const REQUIRED_DELEGATES: Array<keyof Omit<OpportunityAssessmentPrismaSurface, "$transaction">> = [
  "enterpriseOpportunityAssessment",
  "enterpriseOpportunityAssessmentRevision",
  "enterpriseOpportunityAssessmentRecommendationRun",
];

export function asOpportunityAssessmentPrisma(client: object | null | undefined): OpportunityAssessmentPrismaSurface | null {
  if (!client || typeof client !== "object") return null;
  const record = client as Record<string, unknown>;
  if (typeof record.$transaction !== "function") return null;
  for (const key of REQUIRED_DELEGATES) {
    const delegate = record[key];
    if (!delegate || typeof delegate !== "object") return null;
    const methods = delegate as Record<string, unknown>;
    if (typeof methods.findFirst !== "function") return null;
    if (typeof methods.findUnique !== "function") return null;
    if (typeof methods.create !== "function") return null;
    if (typeof methods.updateMany !== "function") return null;
  }
  return client as OpportunityAssessmentPrismaSurface;
}
