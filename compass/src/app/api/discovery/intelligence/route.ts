import { NextResponse } from "next/server";

/** Legacy route retained for compatibility — production path uses /api/journey/analyze via gateway. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Discovery intelligence is served through the COMPASS journey gateway. Update the client to use /api/journey/analyze.",
    },
    { status: 410 },
  );
}
