/**
 * Public Marketing image bytes for email clients (Gmail / Outlook).
 * No authentication. Approved images only. Checksum required.
 * Not Document Registry. DRAFT and REJECTED assets are not served.
 * Archiving an approved image hides it from new campaigns and keeps the checksum URL.
 */

import { NextResponse } from "next/server";
import { marketingAssetStore } from "@server/services/enterprise-marketing-engine/asset-store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const params = await context.params;
  const assetId = decodeURIComponent(params.assetId ?? "").trim();
  const checksum = new URL(request.url).searchParams.get("c");
  try {
    const served = await marketingAssetStore.getPublicImage(assetId, checksum);
    if (!served) {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(new Uint8Array(served.bytes), {
      status: 200,
      headers: {
        "Content-Type": served.mimeType,
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
