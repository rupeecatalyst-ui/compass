"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  PRODUCT_LIFECYCLE_LABELS,
  PRODUCT_LIFECYCLE_PILL_VARIANT,
  PRODUCT_OPERATIONAL_PILL_VARIANT,
  PRODUCT_OPERATIONAL_STATUS_LABELS,
  formatProductVersion,
} from "@/constants/product-library-lifecycle";
import { ProductCompositionView } from "@/components/catalyst-one/product-library/product-composition-view";
import { getCompositionGaps } from "@/lib/product-library/product-composition";
import {
  getAuditTrailForProduct,
  getProductCategoryById,
  getProductGroupById,
  getProductVersions,
  transitionProductLifecycle,
} from "@/lib/product-library/product-store";
import type { ProductDefinition, ProductLifecycleStatus } from "@/types/product-library";
import { ProductLibraryShell } from "@/components/catalyst-one/product-library/product-library-shell";
import { WORKSPACE_CLOSE } from "@/constants/workspace-navigation";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ProductDetailViewProps {
  product: ProductDefinition;
}

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";
  const category = getProductCategoryById(product.categoryId);
  const group = getProductGroupById(product.groupId);
  const audit = getAuditTrailForProduct(product.productId);
  const versions = getProductVersions(product.productId);
  const compositionGaps = getCompositionGaps(product);

  return (
    <ProductLibraryShell
      closeTo={WORKSPACE_CLOSE.PRODUCT_REGISTRY}
      title={product.productName}
      description={`${product.productCode} · ${formatProductVersion(product.majorVersion, product.minorVersion)} · ${category?.categoryName ?? product.categoryId}`}
      actions={
        <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
          <Link href={ROUTES.ADMIN_PRODUCT_REGISTRY}>Back to Registry</Link>
        </Button>
      }
    >
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="metadata" className="text-xs">Metadata</TabsTrigger>
          <TabsTrigger value="composition" className="text-xs">Composition</TabsTrigger>
          <TabsTrigger value="references" className="text-xs">References</TabsTrigger>
          <TabsTrigger value="versions" className="text-xs">Version History</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
          <TabsTrigger value="runtime" className="text-xs" disabled>
            <Lock className="mr-1 h-3 w-3" />Runtime
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="glass-card border-border/60">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-base">{product.productName}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <StatusPill variant={PRODUCT_LIFECYCLE_PILL_VARIANT[product.lifecycleStatus]}>
                    {PRODUCT_LIFECYCLE_LABELS[product.lifecycleStatus]}
                  </StatusPill>
                  <StatusPill variant={PRODUCT_OPERATIONAL_PILL_VARIANT[product.operationalStatus]}>
                    {PRODUCT_OPERATIONAL_STATUS_LABELS[product.operationalStatus]}
                  </StatusPill>
                </div>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{product.productCode}</p>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Meta label="Category" value={category?.categoryName ?? product.categoryId} />
              <Meta label="Group" value={group?.groupName ?? product.groupId} />
              <Meta label="Version" value={formatProductVersion(product.majorVersion, product.minorVersion)} mono />
              <Meta label="Owner" value={product.productOwner} />
              <Meta label="Created By" value={product.createdBy} />
              <Meta label="Approved By" value={product.approvedBy ?? "—"} />
              <Meta label="Published By" value={product.publishedBy ?? "—"} />
              <Meta label="Effective From" value={product.effectiveFrom ?? "—"} />
              <Meta label="Effective To" value={product.effectiveTo ?? "—"} />
              <Meta label="Short Description" value={product.shortDescription ?? "—"} className="sm:col-span-2 lg:col-span-3" />
              <Meta label="Description" value={product.description} className="sm:col-span-2 lg:col-span-3" />
            </CardContent>
          </Card>
          <LifecycleActions product={product} />
          {compositionGaps.length > 0 && (
            <Card className="glass-card mt-4 border-border/60">
              <CardHeader><CardTitle className="text-base">Composition Gaps</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Missing: {compositionGaps.join(", ")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="composition">
          <ProductCompositionView product={product} />
        </TabsContent>

        <TabsContent value="metadata">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="glass-card border-border/60">
              <CardHeader><CardTitle className="text-base">Eligibility Metadata</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Meta label="Min Age" value={product.eligibilityMetadata.minAge != null ? String(product.eligibilityMetadata.minAge) : "—"} />
                <Meta label="Max Age" value={product.eligibilityMetadata.maxAge != null ? String(product.eligibilityMetadata.maxAge) : "—"} />
                <Meta label="Customer Categories" value={product.eligibilityMetadata.customerCategoryRefs.join(", ") || "—"} className="sm:col-span-2" />
                <Meta label="Geography" value={product.eligibilityMetadata.geographyRefs.join(", ") || "—"} className="sm:col-span-2" />
                {product.eligibilityMetadata.notes && (
                  <Meta label="Notes" value={product.eligibilityMetadata.notes} className="sm:col-span-2" />
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-border/60">
              <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {product.tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tags.</p>
                ) : (
                  product.tags.map((tag) => (
                    <StatusPill key={tag} variant="muted">{tag}</StatusPill>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-border/60">
              <CardHeader><CardTitle className="text-base">Features</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {product.features.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No features defined.</p>
                ) : (
                  product.features.map((f) => (
                    <div key={f.id} className="rounded-lg border border-border/50 px-3 py-2 text-xs">
                      <p className="font-medium">{f.label}</p>
                      <p className="text-muted-foreground">{f.description}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-border/60">
              <CardHeader><CardTitle className="text-base">Benefits</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {product.benefits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No benefits defined.</p>
                ) : (
                  product.benefits.map((b) => (
                    <div key={b.id} className="rounded-lg border border-border/50 px-3 py-2 text-xs">
                      <p className="font-medium">{b.label}</p>
                      <p className="text-muted-foreground">{b.description}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="references">
          <div className="space-y-4">
            <RefTable title="Policy References (ID only)" ids={product.policyIds} />
            <RefTable title="Workflow References (ID only)" ids={product.workflowIds} />
            <RefTable title="Rule References (ID only)" ids={product.ruleIds} />
            <RefTable title="Document References (ID only)" ids={product.documentIds} />

            <Card className="glass-card border-border/60">
              <CardHeader><CardTitle className="text-base">Dependencies</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Ref ID</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Required</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.dependencies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-xs text-muted-foreground">No dependencies.</TableCell>
                      </TableRow>
                    ) : (
                      product.dependencies.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-xs capitalize">{d.dependencyType}</TableCell>
                          <TableCell className="font-mono text-xs">{d.refId}</TableCell>
                          <TableCell className="text-xs">{d.label}</TableCell>
                          <TableCell className="text-xs">{d.required ? "Yes" : "No"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/60">
              <CardHeader><CardTitle className="text-base">Documentation References</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Ref ID</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.documentationRefs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-xs text-muted-foreground">No documentation references.</TableCell>
                      </TableRow>
                    ) : (
                      product.documentationRefs.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-xs">{d.docType}</TableCell>
                          <TableCell className="font-mono text-xs">{d.refId}</TableCell>
                          <TableCell className="text-xs">{d.label}</TableCell>
                          <TableCell className="text-xs capitalize">{d.status}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="versions">
          <Card className="glass-card overflow-hidden border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead>Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{formatProductVersion(v.majorVersion, v.minorVersion)}</TableCell>
                    <TableCell>
                      <StatusPill variant={PRODUCT_LIFECYCLE_PILL_VARIANT[v.lifecycleStatus]}>
                        {PRODUCT_LIFECYCLE_LABELS[v.lifecycleStatus]}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <StatusPill variant={PRODUCT_OPERATIONAL_PILL_VARIANT[v.operationalStatus]}>
                        {PRODUCT_OPERATIONAL_STATUS_LABELS[v.operationalStatus]}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(v.lastModified).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.publishedDate ? new Date(v.publishedDate).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="glass-card overflow-hidden border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-xs text-muted-foreground">No audit entries for this product.</TableCell>
                  </TableRow>
                ) : (
                  audit.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{new Date(e.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{e.actor}</TableCell>
                      <TableCell className="text-xs">{e.action}</TableCell>
                      <TableCell className="text-xs">{e.oldValue && e.newValue ? `${e.oldValue} → ${e.newValue}` : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </ProductLibraryShell>
  );
}

function Meta({ label, value, mono, className }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function RefTable({ title, ids }: { title: string; ids: string[] }) {
  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {ids.length === 0 ? (
          <p className="text-sm text-muted-foreground">None referenced.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {ids.map((id) => (
              <span key={id} className="rounded-md border border-border/60 bg-muted/30 px-2 py-1 font-mono text-xs">{id}</span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LifecycleActions({ product }: { product: ProductDefinition }) {
  const actions: Array<{ label: string; status: ProductLifecycleStatus }> = [
    { label: "Submit Review", status: "review" },
    { label: "Approve", status: "approved" },
    { label: "Publish", status: "published" },
    { label: "Deprecate", status: "deprecated" },
    { label: "Archive", status: "archived" },
  ];

  return (
    <Card className="glass-card mt-4 border-border/60">
      <CardHeader><CardTitle className="text-base">Lifecycle</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map(({ label, status }) => (
          <Button
            key={status}
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={product.lifecycleStatus === status}
            onClick={() => transitionProductLifecycle(product.productId, status, "Product Admin")}
          >
            {label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
