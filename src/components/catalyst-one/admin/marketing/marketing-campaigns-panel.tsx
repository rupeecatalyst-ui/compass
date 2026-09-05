"use client";

/**
 * CO-MARKETING-REDESIGN-006 — Campaign Builder entry (not the registry).
 * Creates or restores a campaign, then opens the full-page wizard.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { MARKETING_PERMISSIONS } from "@/constants/enterprise-marketing-engine";
import { marketingCampaignBuilderHref } from "@/constants/enterprise-marketing-engine/campaign-builder";
import { ROUTES } from "@/constants/routes";
import { hasMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import { MarketingModuleNav } from "./marketing-module-nav";
import { toast } from "sonner";
import "@/styles/marketing-command-centre.css";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

export function MarketingCampaignsPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const canCreate = hasMarketingPermission({ role: "ADMIN" }, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      router.replace(marketingCampaignBuilderHref(id));
    }
  }, [router, searchParams]);

  useEffect(() => {
    const create = searchParams.get("create");
    if (create !== "1" || !canCreate) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", name: "New campaign", channel: "EMAIL" }),
        });
        const body = (await res.json()) as ApiEnvelope<{ campaign: { id: string } }>;
        if (!res.ok || !body.success || !body.data?.campaign.id) {
          throw new Error(body.error?.message ?? "Could not create campaign draft");
        }
        if (!cancelled) router.replace(marketingCampaignBuilderHref(body.data.campaign.id));
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Could not create campaign draft";
          setError(message);
          toast.error(message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canCreate, router, searchParams]);

  if (searchParams.get("id") || searchParams.get("create") === "1") {
    return (
      <p className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Opening Campaign Builder…
      </p>
    );
  }

  return (
    <div className="mkt-cc mkt-cc-page">
      <header className="space-y-3">
        <p className="mkt-cc-kicker">Marketing · Campaign Builder</p>
        <h1 className="mkt-cc-title">Campaign Builder</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Authoring is a dedicated full-page wizard. Scan and operate campaigns in Campaign Registry.
        </p>
      </header>
      <MarketingModuleNav activeId="campaigns" />
      {error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {canCreate ? (
          <Button asChild className="rounded-xl">
            <Link href={`${ROUTES.ADMIN_MARKETING_CAMPAIGNS}?create=1`}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Create Campaign
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={ROUTES.ADMIN_MARKETING_REGISTRY}>Open Campaign Registry</Link>
        </Button>
      </div>
    </div>
  );
}
