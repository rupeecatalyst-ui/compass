import { authenticatedJsonFetch } from "@/lib/api-client";
import type { OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import type { OpportunityAssessmentCaptureDto } from "@/types/opportunity-assessment-capture";

type Envelope = {
  success: boolean;
  data?: OpportunityAssessmentCaptureDto;
  error?: { code?: string; message?: string };
};

async function readEnvelope(res: Response): Promise<OpportunityAssessmentCaptureDto> {
  const body = (await res.json()) as Envelope;
  if (!body.success || !body.data) {
    throw new Error(body.error?.code ?? "ASSESSMENT_PERSISTENCE_FAILURE");
  }
  return body.data;
}

export async function fetchOpportunityAssessmentCapture(
  opportunityId: string,
): Promise<OpportunityAssessmentCaptureDto> {
  const res = await authenticatedJsonFetch(
    `/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/opportunity-assessment`,
  );
  return readEnvelope(res);
}

export async function persistOpportunityAssessmentCapture(
  opportunityId: string,
  input: {
    kind: "SAVED" | "FINALIZED";
    expectedRowVersion: number;
    commandId: string;
    facts: OpportunityAssessmentFactsV1;
    sourceFingerprint?: OpportunityAssessmentCaptureDto["sourceFingerprint"];
  },
): Promise<OpportunityAssessmentCaptureDto> {
  const res = await authenticatedJsonFetch(
    `/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/opportunity-assessment`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return readEnvelope(res);
}
