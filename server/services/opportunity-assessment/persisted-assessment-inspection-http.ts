/**
 * Authenticated read of an already persisted assessment.
 * Resolves an Opportunity number inside the caller’s organization, then calls
 * inspectPersistedAssessment only.
 */
import { OpportunityAssessmentError } from "./errors";
import type { OpportunityAssessmentService } from "./opportunity-assessment.service";
import type { PersistedAssessmentInspection } from "./persisted-assessment-inspection";

export const CHANAKYA_INSPECTION_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;

export function isChanakyaInspectionAdministrator(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export type PersistedInspectionOpportunityRow = {
  id: string;
  organizationId: string;
  opportunityNumber: string;
  productCode: string | null;
  productLabel: string | null;
  requestedAmount: { toString(): string } | number | string | null;
  rowVersion: number;
  updatedAt: Date | string;
};

export type PersistedInspectionOpportunityIdentity = {
  id: string;
  opportunityNumber: string;
  productCode: string | null;
  productLabel: string | null;
  requestedAmount: number | string | null;
  rowVersion: number;
  updatedAt: string;
};

export type PersistedInspectionHttpResult =
  | {
      status: 200;
      body: {
        success: true;
        data:
          | {
              status: "NO_PERSISTED_ASSESSMENT";
              opportunity: PersistedInspectionOpportunityIdentity;
              assessment: null;
              revisions: [];
              recommendationRuns: [];
            }
          | {
              status: "PERSISTED_ASSESSMENT";
              opportunity: PersistedInspectionOpportunityIdentity;
              assessment: {
                assessmentId: string;
                currentRevisionId: string | null;
                rowVersion: number;
                readinessStatus: string;
              };
              revisions: PersistedAssessmentInspection["revisions"];
              recommendationRuns: Array<{
                runId: string;
                revisionId: string;
                assessedAt: string;
                resultStatus: string;
                acceptedProgrammeIdsJson: PersistedAssessmentInspection["recommendationRuns"][number]["acceptedProgrammeIdsJson"];
                rejectedProgrammeCodesJson: PersistedAssessmentInspection["recommendationRuns"][number]["rejectedProgrammeCodesJson"];
              }>;
            };
      };
    }
  | {
      status: 400 | 403 | 404;
      body: {
        success: false;
        error: { code: string; message: string };
      };
    };

function storedAmount(value: PersistedInspectionOpportunityRow["requestedAmount"]): number | string | null {
  if (value == null) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  return value.toString();
}

function storedTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function opportunityIdentity(row: PersistedInspectionOpportunityRow): PersistedInspectionOpportunityIdentity {
  return {
    id: row.id,
    opportunityNumber: row.opportunityNumber,
    productCode: row.productCode,
    productLabel: row.productLabel,
    requestedAmount: storedAmount(row.requestedAmount),
    rowVersion: row.rowVersion,
    updatedAt: storedTimestamp(row.updatedAt),
  };
}

function fail(status: 400 | 403 | 404, code: string, message: string): PersistedInspectionHttpResult {
  return { status, body: { success: false, error: { code, message } } };
}

export async function inspectPersistedAssessmentForOpportunityNumber(input: {
  role: string;
  organizationId: string;
  actorUserId: string | null;
  opportunityNumber: string;
  findOpportunityByNumber: (
    organizationId: string,
    opportunityNumber: string,
  ) => Promise<PersistedInspectionOpportunityRow | null>;
  service: Pick<OpportunityAssessmentService, "inspectPersistedAssessment">;
}): Promise<PersistedInspectionHttpResult> {
  if (!isChanakyaInspectionAdministrator(input.role)) {
    return fail(403, "FORBIDDEN", "Only administrators can inspect persisted assessments.");
  }
  const organizationId = input.organizationId.trim();
  if (!organizationId) {
    return fail(403, "ORGANIZATION_CONTEXT_REQUIRED", "Organization context is required.");
  }
  const opportunityNumber = input.opportunityNumber.trim();
  if (!opportunityNumber) {
    return fail(400, "OPPORTUNITY_NUMBER_REQUIRED", "Opportunity number is required.");
  }

  const opportunity = await input.findOpportunityByNumber(organizationId, opportunityNumber);
  if (!opportunity || opportunity.organizationId !== organizationId) {
    return fail(404, "OPPORTUNITY_NOT_FOUND", "Opportunity was not found.");
  }

  let inspection: PersistedAssessmentInspection | null;
  try {
    inspection = await input.service.inspectPersistedAssessment(
      { organizationId, actorUserId: input.actorUserId, channel: "C1" },
      opportunity.id,
    );
  } catch (error) {
    if (error instanceof OpportunityAssessmentError && error.code === "CROSS_ORGANIZATION_ACCESS") {
      return fail(403, "CROSS_ORGANIZATION_ACCESS", "CROSS_ORGANIZATION_ACCESS");
    }
    throw error;
  }

  const identity = opportunityIdentity(opportunity);
  if (!inspection) {
    return {
      status: 200,
      body: {
        success: true,
        data: {
          status: "NO_PERSISTED_ASSESSMENT",
          opportunity: identity,
          assessment: null,
          revisions: [],
          recommendationRuns: [],
        },
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        status: "PERSISTED_ASSESSMENT",
        opportunity: identity,
        assessment: {
          assessmentId: inspection.assessment.assessmentId,
          currentRevisionId: inspection.assessment.currentRevisionId,
          rowVersion: inspection.assessment.rowVersion,
          readinessStatus: inspection.assessment.readinessStatus,
        },
        revisions: inspection.revisions,
        recommendationRuns: inspection.recommendationRuns.map((run) => ({
          runId: run.runId,
          revisionId: run.revisionId,
          assessedAt: run.assessedAt,
          resultStatus: run.resultStatus,
          acceptedProgrammeIdsJson: run.acceptedProgrammeIdsJson,
          rejectedProgrammeCodesJson: run.rejectedProgrammeCodesJson,
        })),
      },
    },
  };
}
