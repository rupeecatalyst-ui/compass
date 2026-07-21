import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { configureEcmPersistencePorts } from "@/lib/enterprise-persistence";
import { ecmCompanyService } from "@server/services/ecm/company.service";
import type { ApiResponse } from "@/types/api";
import type { EcmCompanyQuery } from "@/types/enterprise-company-master";

function persistenceGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw new Error("ECM REST API requires ENTERPRISE_PERSISTENCE_MODE=prisma");
  }
}

export async function GET(request: Request) {
  try {
    persistenceGuard();
    configureEcmPersistencePorts();
    requireAccessToken(request);
    const url = new URL(request.url);
    const query: EcmCompanyQuery = {
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Number(url.searchParams.get("pageSize") ?? 100),
      search: url.searchParams.get("search") ?? undefined,
      status: (url.searchParams.get("status") as EcmCompanyQuery["status"]) ?? "all",
    };
    const result = await ecmCompanyService.query(query);
    return successResponse(result);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(500, "ECM_COMPANY_QUERY_FAILED", "Failed to query companies");
  }
}

export async function POST(request: Request) {
  try {
    persistenceGuard();
    configureEcmPersistencePorts();
    const actor = requireAccessToken(request);
    const body = await request.json();
    const company = await ecmCompanyService.register({
      companyName: String(body.companyName ?? ""),
      createdBy: actor.userId,
      constitution: body.constitution,
      cin: body.cin,
      pan: body.pan,
      gst: body.gst,
      dateOfIncorporation: body.dateOfIncorporation,
      registeredAddress: body.registeredAddress,
      industry: body.industry,
      natureOfBusiness: body.natureOfBusiness,
      yearsInBusiness: body.yearsInBusiness,
      annualTurnover: body.annualTurnover,
      approximateNetProfit: body.approximateNetProfit,
      employeeStrength: body.employeeStrength,
      website: body.website,
      ownerName: body.ownerName,
      ownerId: body.ownerId,
    });
    return successResponse(company, 201);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to create company";
    return errorResponse(400, "ECM_COMPANY_CREATE_FAILED", message);
  }
}
