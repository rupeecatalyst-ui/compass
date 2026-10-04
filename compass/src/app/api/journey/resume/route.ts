import { NextResponse } from "next/server";
import { catalystOneGateway } from "@/lib/catalyst-one-gateway/server";
import { customerSafeError, rejectCrossOrigin } from "@/lib/public-request-guard";

function readToken(request: Request): string | null {
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return request.headers.get("x-compass-journey-token")?.trim() || null;
}

export async function GET(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  const token = readToken(request);
  if (!token) return NextResponse.json({ error: "Missing journey session" }, { status: 401 });
  try {
    const data = await catalystOneGateway.resume(token);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: customerSafeError(error, "We could not restore your application.") },
      { status: 503 },
    );
  }
}
