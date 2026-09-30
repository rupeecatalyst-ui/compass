import { NextResponse } from "next/server";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
} from "@/lib/api/auth-route-utils";
import { buildChanakyaCanonicalUpdateBody } from "@/lib/lead-information/canonical-recommendation-facts";
import { isApproxCibilScoreBand } from "@/constants/cibil-score-master";
import { findCityEntry } from "@/constants/city-master";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { projectChanakyaRecommendationWorkspace } from "@server/services/opportunity-assessment/chanakya-workspace";
import { loadCanonicalAssessmentSources } from "@server/services/opportunity-assessment/load-canonical-sources";
import { createOpportunityAssessmentService } from "@server/services/opportunity-assessment/runtime";
import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import { OpportunityValidationError } from "@server/services/enterprise-opportunity/opportunity-validation";

type Ctx = { params: Promise<{ opportunityId: string }> };

const LENDING_KEYS = ["approxCibilScore", "btAmount", "btInstitutionId", "btInstitutionName"] as const;

function trustedActor(userId: string, organizationId: string) {
  return { organizationId, actorUserId: userId, channel: "C1" as const };
}

async function project(opportunityId: string, userId: string) {
  const organizationId = await resolvePilotOrganizationId();
  const loaded = await loadCanonicalAssessmentSources(opportunityId);
  if (!loaded) {
    return NextResponse.json(
      { success: false, error: { code: "ASSESSMENT_NOT_FOUND", message: "ASSESSMENT_NOT_FOUND" } },
      { status: 404 },
    );
  }
  const service = createOpportunityAssessmentService({ prismaClient: prisma });
  const data = await projectChanakyaRecommendationWorkspace(
    service,
    trustedActor(userId, organizationId),
    loaded.sources,
  );
  return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    return await project(opportunityId, actor.userId);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return errorResponse(503, "ASSESSMENT_PERSISTENCE_FAILURE", "ASSESSMENT_PERSISTENCE_FAILURE");
  }
}

export async function POST(request: Request, context: Ctx) {
  try {
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    const submit = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const loaded = await loadCanonicalAssessmentSources(opportunityId);
    if (!loaded) {
      return NextResponse.json(
        { success: false, error: { code: "ASSESSMENT_NOT_FOUND", message: "ASSESSMENT_NOT_FOUND" } },
        { status: 404 },
      );
    }
    const body = buildChanakyaCanonicalUpdateBody(submit);
    if (submit.cityLabel !== undefined || submit.stateLabel !== undefined) {
      const city = typeof submit.cityLabel === "string" ? submit.cityLabel.trim() : "";
      const state = typeof submit.stateLabel === "string" ? submit.stateLabel.trim() : "";
      const entry = city && state ? findCityEntry(city, state) : undefined;
      if (!entry || entry.state.toLowerCase() !== state.toLowerCase()) {
        return errorResponse(400, "INVALID_CITY", "Select a city from the master.");
      }
      body.cityLabel = entry.city;
      body.stateLabel = entry.state;
    }
    const lending = { ...loaded.lendingExtension };
    let lendingChanged = false;
    for (const key of LENDING_KEYS) {
      if (submit[key] === undefined) continue;
      if (key === "approxCibilScore") {
        const value = String(submit[key] ?? "").trim();
        if (!isApproxCibilScoreBand(value)) {
          return errorResponse(400, "INVALID_CIBIL", "Select a valid CIBIL band.");
        }
        lending.approxCibilScore = value;
      } else if (key === "btAmount") {
        const amount = Number(submit[key]);
        if (!Number.isFinite(amount) || amount <= 0) {
          return errorResponse(400, "INVALID_AMOUNT", "Enter a positive outstanding amount.");
        }
        lending.btAmount = amount;
      } else {
        lending[key] = submit[key];
      }
      lendingChanged = true;
    }
    if (lendingChanged) body.lendingExtension = lending;
    if (Object.keys(body).length > 0) {
      await enterpriseOpportunityService.updateOpportunity(opportunityId, body, actor.userId);
    }
    return await project(opportunityId, actor.userId);
  } catch (err) {
    if (err instanceof OpportunityValidationError) {
      return errorResponse(400, "INVALID_CANONICAL_FACT", err.message);
    }
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return errorResponse(503, "ASSESSMENT_PERSISTENCE_FAILURE", "ASSESSMENT_PERSISTENCE_FAILURE");
  }
}
