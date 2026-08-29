import { NextResponse } from "next/server";
import { catalystOneGateway } from "@/lib/catalyst-one-gateway/server";

export async function GET(request: Request) {
  try {
    const productCode = new URL(request.url).searchParams.get("productCode");
    if (!productCode) {
      return NextResponse.json({ error: "productCode is required" }, { status: 400 });
    }
    const data = await catalystOneGateway.getJourneyConfig(productCode);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuration unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
