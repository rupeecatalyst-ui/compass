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
import { enterpriseOpportunityRepository } from "@server/repositories/enterprise-opportunity/enterprise-opportunity.repository";
import {
  appendChanakyaRecalculation,
  cardsFromGovernedResult,
  compassRecalculatePatch,
  isCompassOriginSnapshot,
  linesFromCanonicalSources,
  projectCompassRecommendationHistory,
} from "@/lib/compass-customer-gateway/recommendation-history";

type Ctx = { params: Promise<{ opportunityId: string }> };

const LENDING_KEYS = ["approxCibilScore", "btAmount", "btInstitutionId", "btInstitutionName"] as const;

function trustedActor(userId: string, organizationId: string) {
  return { organizationId, actorUserId: userId, channel: "C1" as const };
}

async function project(opportunityId: string, userId: string, execute: boolean) {
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
    {},
    { execute },
  );
  const compassHistory = projectCompassRecommendationHistory(loaded.snapshot, loaded.sources);
  return NextResponse.json(
    { success: true, data: { ...data, compassHistory } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    const loaded = await loadCanonicalAssessmentSources(opportunityId);
    if (!loaded) {
      return NextResponse.json(
        { success: false, error: { code: "ASSESSMENT_NOT_FOUND", message: "ASSESSMENT_NOT_FOUND" } },
        { status: 404 },
      );
    }
    return await project(opportunityId, actor.userId, !isCompassOriginSnapshot(loaded.snapshot));
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
    const incoming = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const loaded = await loadCanonicalAssessmentSources(opportunityId);
    if (!loaded) {
      return NextResponse.json(
        { success: false, error: { code: "ASSESSMENT_NOT_FOUND", message: "ASSESSMENT_NOT_FOUND" } },
        { status: 404 },
      );
    }
    const recalculate = incoming.recalculate === true && isCompassOriginSnapshot(loaded.snapshot);
    const persistedPatch = recalculate ? compassRecalculatePatch(loaded.snapshot, loaded.sources) : null;
    const submit = persistedPatch
      ? { ...persistedPatch.columns, ...incoming, ...(incoming.approxCibilScore === undefined ? persistedPatch.lending : {}) }
      : incoming;
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
    const organizationId = await resolvePilotOrganizationId();
    const service = createOpportunityAssessmentService({ prismaClient: prisma });
    const refreshed = await loadCanonicalAssessmentSources(opportunityId);
    if (!refreshed) {
      return NextResponse.json(
        { success: false, error: { code: "ASSESSMENT_NOT_FOUND", message: "ASSESSMENT_NOT_FOUND" } },
        { status: 404 },
      );
    }
    const data = await projectChanakyaRecommendationWorkspace(
      service,
      trustedActor(actor.userId, organizationId),
      refreshed.sources,
      {},
      { execute: true },
    );
    let snapshot = refreshed.snapshot;
    if (recalculate) {
      const appended = appendChanakyaRecalculation(snapshot, {
        recordedAt: new Date().toISOString(),
        actorUserId: actor.userId,
        assessment: linesFromCanonicalSources(refreshed.sources),
        cards: cardsFromGovernedResult(data.result),
        note: data.result?.status === "ready" ? null : data.guidance,
      });
      if (appended.changed) {
        await enterpriseOpportunityRepository.updateOpportunity(organizationId, opportunityId, {
          snapshot: JSON.parse(JSON.stringify(appended.snapshot)),
          updatedBy: actor.userId,
        });
        snapshot = appended.snapshot;
      }
    }
    const compassHistory = projectCompassRecommendationHistory(snapshot, refreshed.sources);
    return NextResponse.json(
      { success: true, data: { ...data, compassHistory } },
      { headers: { "Cache-Control": "no-store" } },
    );
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
