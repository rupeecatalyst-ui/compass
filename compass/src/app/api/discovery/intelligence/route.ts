import { NextResponse } from "next/server";
import { resolveHomeLoanIntelligence } from "@/services/catalyst-one/home-loan-intelligence";
import type { DiscoveryIntelligenceRequest } from "@/services/catalyst-one/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DiscoveryIntelligenceRequest;

    if (body.product !== "home-loan") {
      return NextResponse.json({ error: "Unsupported product" }, { status: 400 });
    }

    if (!body.answers?.loanAmount || !body.answers?.city) {
      return NextResponse.json({ error: "Incomplete discovery answers" }, { status: 400 });
    }

    const result = resolveHomeLoanIntelligence(body.answers);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Intelligence resolution failed" }, { status: 500 });
  }
}
