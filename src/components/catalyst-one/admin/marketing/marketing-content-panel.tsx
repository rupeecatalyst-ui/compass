"use client";

/**
 * CO-MARKETING-MKT-04 — Content templates + reusable blocks registry.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticatedJsonFetch } from "@/lib/api-client";
import type {
  MarketingContentTemplate,
  MarketingReusableBlock,
} from "@/types/enterprise-marketing-campaign";
import { MarketingModuleNav } from "./marketing-module-nav";
import { toast } from "sonner";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

export function MarketingContentPanel() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MarketingContentTemplate[]>([]);
  const [blocks, setBlocks] = useState<MarketingReusableBlock[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, bRes] = await Promise.all([
        authenticatedJsonFetch("/api/admin/marketing/campaigns?view=templates"),
        authenticatedJsonFetch("/api/admin/marketing/campaigns?view=reusable-blocks"),
      ]);
      const tBody = (await tRes.json()) as ApiEnvelope<{ templates: MarketingContentTemplate[] }>;
      const bBody = (await bRes.json()) as ApiEnvelope<{ blocks: MarketingReusableBlock[] }>;
      if (!tRes.ok || !tBody.success || !tBody.data) {
        throw new Error(tBody.error?.message || "Failed to load templates");
      }
      setTemplates(tBody.data.templates);
      if (bRes.ok && bBody.success && bBody.data) setBlocks(bBody.data.blocks);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <MarketingModuleNav activeId="content" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Content & Templates</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Templates and reusable blocks for Campaign Builder. Save templates from a campaign via
            “Save as template”. Create campaigns from a template on the Campaigns screen.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href={ROUTES.ADMIN_MARKETING_CAMPAIGNS}>Open Campaign Builder</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Templates</CardTitle>
              <CardDescription className="text-xs">{templates.length} saved</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No templates yet. Author a campaign, then Save as template.
                </p>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="rounded-md border p-2 text-xs">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-muted-foreground">
                      {t.channel} · {t.content.blocks.length} blocks · {t.subject}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reusable blocks</CardTitle>
              <CardDescription className="text-xs">{blocks.length} saved</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {blocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Reusable blocks can be saved via API (
                  <code className="text-[11px]">save_reusable_block</code>). UI picker expansion
                  follows in a later polish sprint.
                </p>
              ) : (
                blocks.map((b) => (
                  <div key={b.id} className="rounded-md border p-2 text-xs">
                    <div className="font-medium">{b.name}</div>
                    <div className="text-muted-foreground">{b.block.type}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
