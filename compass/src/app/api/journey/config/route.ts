import { NextResponse } from "next/server";
import { catalystOneGateway } from "@/lib/catalyst-one-gateway/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productCode = url.searchParams.get("productCode");
    if (!productCode) {
      return NextResponse.json({ error: "productCode is required" }, { status: 400 });
    }
    const versionRaw = url.searchParams.get("journeyVersion");
    const journeyVersion = versionRaw ? Number(versionRaw) : null;
    const campaign = url.searchParams.get("campaign");
    const requirePublished = url.searchParams.get("requirePublished") === "1";
    const data = await catalystOneGateway.getJourneyConfig(productCode, journeyVersion, {
      campaign,
      requirePublished,
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuration unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
