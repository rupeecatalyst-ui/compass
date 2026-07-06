"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getEnterpriseAssetById } from "@/lib/enterprise-asset-library/eal-store";
import { EalDetailView } from "@/components/catalyst-one/enterprise-asset-library/eal-detail-view";
import { EalShell } from "@/components/catalyst-one/enterprise-asset-library/eal-shell";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function EnterpriseAssetDetailPageContent() {
  const params = useParams();
  const assetId = params.assetId as string;
  const asset = getEnterpriseAssetById(assetId);

  if (!asset) {
    return (
      <EalShell title="Asset Not Found" description="The requested enterprise asset does not exist.">
        <Card className="glass-card mx-auto max-w-md border-border/60">
          <CardHeader><CardTitle className="text-base">Not found</CardTitle></CardHeader>
          <CardContent>
            <Button size="sm" asChild>
              <Link href={ROUTES.ADMIN_ENTERPRISE_ASSETS_REGISTRY}>Back to Registry</Link>
            </Button>
          </CardContent>
        </Card>
      </EalShell>
    );
  }

  return <EalDetailView asset={asset} />;
}

export default function EnterpriseAssetDetailPage() {
  return (
    <Suspense fallback={null}>
      <EnterpriseAssetDetailPageContent />
    </Suspense>
  );
}
