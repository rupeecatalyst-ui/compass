import { NextResponse } from "next/server";
import { catalystOneGateway } from "@/lib/catalyst-one-gateway/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await catalystOneGateway.startJourney(body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start journey.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
