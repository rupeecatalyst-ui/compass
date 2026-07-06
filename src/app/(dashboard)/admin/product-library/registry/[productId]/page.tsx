"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getProductById } from "@/lib/product-library/product-store";
import { ProductDetailView } from "@/components/catalyst-one/product-library/product-detail-view";
import { ProductLibraryShell } from "@/components/catalyst-one/product-library/product-library-shell";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ProductDetailPageContent() {
  const params = useParams();
  const productId = params.productId as string;
  const product = getProductById(productId);

  if (!product) {
    return (
      <ProductLibraryShell title="Product Not Found" description="The requested product definition does not exist.">
        <Card className="glass-card mx-auto max-w-md border-border/60">
          <CardHeader><CardTitle className="text-base">Not found</CardTitle></CardHeader>
          <CardContent>
            <Button size="sm" asChild>
              <Link href={ROUTES.ADMIN_PRODUCT_REGISTRY}>Back to Registry</Link>
            </Button>
          </CardContent>
        </Card>
      </ProductLibraryShell>
    );
  }

  return <ProductDetailView product={product} />;
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={null}>
      <ProductDetailPageContent />
    </Suspense>
  );
}
