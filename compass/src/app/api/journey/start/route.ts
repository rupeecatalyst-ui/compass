import { NextResponse } from "next/server";
import { catalystOneGateway } from "@/lib/catalyst-one-gateway/server";
import { customerSafeError, rejectCrossOrigin } from "@/lib/public-request-guard";

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  try {
    const body = await request.json();
    const data = await catalystOneGateway.startJourney(body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = customerSafeError(error, "Unable to start journey.");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
