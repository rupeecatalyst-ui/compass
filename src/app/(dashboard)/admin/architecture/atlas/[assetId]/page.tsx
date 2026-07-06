"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAtlasAssetById } from "@/lib/atlas/atlas-store";
import { AtlasAssetDetailView } from "@/components/catalyst-one/atlas/atlas-asset-detail-view";
import { ArchitectureShell } from "@/components/catalyst-one/architecture/architecture-shell";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function AtlasAssetDetailPageContent() {
  const params = useParams();
  const assetId = decodeURIComponent(params.assetId as string);
  const asset = getAtlasAssetById(assetId);

  if (!asset) {
    return (
      <ArchitectureShell title="Asset Not Found" description="The requested enterprise asset does not exist in ATLAS.">
        <Card className="glass-card mx-auto max-w-md border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Asset not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" asChild>
              <Link href={ROUTES.ADMIN_ARCHITECTURE_ATLAS_EXPLORER}>Back to Asset Explorer</Link>
            </Button>
          </CardContent>
        </Card>
      </ArchitectureShell>
    );
  }

  return <AtlasAssetDetailView asset={asset} />;
}

export default function AtlasAssetDetailPage() {
  return (
    <Suspense fallback={null}>
      <AtlasAssetDetailPageContent />
    </Suspense>
  );
}
