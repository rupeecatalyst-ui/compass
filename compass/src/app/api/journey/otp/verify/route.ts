import { NextResponse } from "next/server";
import { catalystOneGateway } from "@/lib/catalyst-one-gateway/server";
import { customerSafeError, rejectCrossOrigin } from "@/lib/public-request-guard";

async function post(request: Request, action: "request" | "verify") {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  try {
    const body = (await request.json()) as { mobile?: string; otp?: string };
    const data = await catalystOneGateway.requestOtp({ ...body, action });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        verified: false,
        error: customerSafeError(
          error,
          "We cannot verify your mobile number yet. Please try again later.",
        ),
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  return post(request, url.pathname.endsWith("/verify") ? "verify" : "request");
}
