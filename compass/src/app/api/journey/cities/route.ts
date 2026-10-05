import { NextResponse } from "next/server";
import { catalystOneGateway } from "@/lib/catalyst-one-gateway/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await catalystOneGateway.searchCities({
      q: url.searchParams.get("q") ?? "",
      id: url.searchParams.get("id") ?? "",
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "City search is unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
