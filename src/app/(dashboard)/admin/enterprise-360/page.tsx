import { Enterprise360FrameworkDemo } from "@/components/catalyst-one/enterprise-360-workspace";
import type { Enterprise360EntityKind } from "@/types/enterprise-360-workspace";

const KINDS = new Set([
  "customer",
  "lender",
  "wealth_partner",
  "vendor",
  "employee",
  "contact",
]);

export default async function AdminEnterprise360Page({
  searchParams,
}: {
  searchParams?: Promise<{ entity?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const entity =
    params.entity && KINDS.has(params.entity)
      ? (params.entity as Enterprise360EntityKind)
      : "customer";

  return (
    <div className="mx-auto max-w-6xl space-y-3 p-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Enterprise Universal 360° Framework
        </h1>
        <p className="text-sm text-muted-foreground">
          CO-360-001 — Framework certification surface. Registries remain SSOT; Workspaces
          are operational.
        </p>
      </div>
      <Enterprise360FrameworkDemo initialKind={entity} />
    </div>
  );
}
