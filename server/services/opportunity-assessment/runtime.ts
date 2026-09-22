import { PrismaOpportunityAssessmentRepository } from "@server/repositories/opportunity-assessment/prisma-repository";
import { asOpportunityAssessmentPrisma } from "@server/repositories/opportunity-assessment/prisma-surface";
import type { OpportunityAssessmentRepository } from "@server/repositories/opportunity-assessment/contract";
import { OpportunityAssessmentError } from "./errors";
import { OpportunityAssessmentService } from "./opportunity-assessment.service";
import { OPPORTUNITY_ASSESSMENT_PRISMA_ACTIVATION } from "@/constants/opportunity-assessment-capture";

/**
 * Stage 5C4 runtime boundary.
 *
 * Production activation (later Hostinger stage — not this stage):
 * approved migrate + prisma generate must expose
 * enterpriseOpportunityAssessment / Revision / RecommendationRun delegates.
 *
 * Never fall back to MemoryOpportunityAssessmentRepository in production.
 */
export function resolveOpportunityAssessmentRepository(options?: {
  repository?: OpportunityAssessmentRepository;
  prismaClient?: object | null;
}): OpportunityAssessmentRepository {
  if (options?.repository) return options.repository;
  const surface = asOpportunityAssessmentPrisma(options?.prismaClient ?? null);
  if (!surface) {
    throw new OpportunityAssessmentError("ASSESSMENT_PERSISTENCE_FAILURE", OPPORTUNITY_ASSESSMENT_PRISMA_ACTIVATION);
  }
  return new PrismaOpportunityAssessmentRepository(surface);
}

export function createOpportunityAssessmentService(options?: {
  repository?: OpportunityAssessmentRepository;
  prismaClient?: object | null;
}): OpportunityAssessmentService {
  return new OpportunityAssessmentService(resolveOpportunityAssessmentRepository(options));
}
