import { NextResponse } from "next/server";
import { catalystOneGateway } from "@/lib/catalyst-one-gateway/server";

function readToken(request: Request): string | null {
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return request.headers.get("x-compass-journey-token")?.trim() || null;
}

export async function PATCH(request: Request) {
  const token = readToken(request);
  if (!token) return NextResponse.json({ error: "Missing journey session" }, { status: 401 });
  try {
    const body = await request.json();
    const data = await catalystOneGateway.patchAnswers(token, body);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save answers.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
