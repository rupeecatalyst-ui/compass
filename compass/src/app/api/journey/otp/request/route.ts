import { NextResponse } from "next/server";
import { catalystOneGateway } from "@/lib/catalyst-one-gateway/server";
import { customerSafeError, rejectCrossOrigin } from "@/lib/public-request-guard";

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  try {
    const body = (await request.json()) as { mobile?: string };
    const data = await catalystOneGateway.requestOtp({ ...body, action: "request" });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: customerSafeError(
          error,
          "We cannot verify your mobile number yet. Please try again later.",
        ),
      },
      { status: 503 },
    );
  }
}
