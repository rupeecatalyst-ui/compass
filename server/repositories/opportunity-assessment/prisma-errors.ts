import { OpportunityAssessmentError } from "@server/services/opportunity-assessment/errors";
import type { PrismaUniqueConflict } from "./prisma-surface";

export type AssessmentUniqueConstraint =
  | "assessment_opportunity"
  | "revision_command"
  | "revision_number"
  | "run_id"
  | "unknown";

function fieldList(error: PrismaUniqueConflict): string[] {
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];
  return [];
}

function constraintName(error: PrismaUniqueConflict): string {
  return String(error.meta?.constraint ?? "");
}

function modelName(error: PrismaUniqueConflict): string {
  return String(error.meta?.modelName ?? "");
}

export function isPrismaUniqueConflict(error: unknown): error is PrismaUniqueConflict {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: string }).code === "P2002";
}

export function identifyAssessmentUniqueConstraint(error: unknown): AssessmentUniqueConstraint {
  if (!isPrismaUniqueConflict(error)) return "unknown";
  const fields = fieldList(error).map((field) => field.toLowerCase());
  const constraint = constraintName(error).toLowerCase();
  const model = modelName(error).toLowerCase();

  if (fields.includes("command_id") || fields.includes("commandid") || constraint.includes("eoar_org_command_id")) {
    return "revision_command";
  }
  if (
    fields.includes("revision_number") ||
    fields.includes("revisionnumber") ||
    constraint.includes("eoar_assessment_revision")
  ) {
    return "revision_number";
  }
  if (
    (model.includes("recommendationrun") || constraint.includes("recommendation_runs")) &&
    (fields.includes("id") || constraint.includes("pkey"))
  ) {
    return "run_id";
  }
  if (
    fields.includes("opportunity_id") ||
    fields.includes("opportunityid") ||
    constraint.includes("enterprise_opportunity_assessments_opportunity_id")
  ) {
    return "assessment_opportunity";
  }
  if (model.includes("recommendationrun") && fields.includes("id")) return "run_id";
  return "unknown";
}

export function persistenceFailure(): OpportunityAssessmentError {
  return new OpportunityAssessmentError("ASSESSMENT_PERSISTENCE_FAILURE");
}

export function translatePrismaError(error: unknown): never {
  if (error instanceof OpportunityAssessmentError) throw error;
  throw persistenceFailure();
}
