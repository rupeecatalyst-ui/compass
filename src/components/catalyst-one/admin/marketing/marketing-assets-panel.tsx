"use client";

/**
 * CO-MARKETING-MKT-04 — Marketing Asset Library (not Document Registry).
 */

import { useCallback, useEffect, useState } from "react";
import { Archive, ImageIcon, Loader2, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  MARKETING_ASSET_CATEGORIES,
  MARKETING_ASSET_MAX_BYTES,
} from "@/constants/enterprise-marketing-engine";
import type { MarketingAsset } from "@/types/enterprise-marketing-campaign";
import { MarketingModuleNav } from "./marketing-module-nav";
import { toast } from "sonner";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

export function MarketingAssetsPanel() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState<(typeof MARKETING_ASSET_CATEGORIES)[number]>("banner");
  const [tags, setTags] = useState("");
  const [url, setUrl] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedJsonFetch(
        `/api/admin/marketing/assets?includeArchived=${includeArchived ? "1" : "0"}`,
      );
      const body = (await res.json()) as ApiEnvelope<{ assets: MarketingAsset[] }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Failed to load assets");
      }
      setAssets(body.data.assets);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > MARKETING_ASSET_MAX_BYTES) {
      toast.error(`File exceeds ${MARKETING_ASSET_MAX_BYTES} bytes foundation limit`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      setUrl(dataUrl);
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsDataURL(file);
  };

  const upload = async () => {
    if (!title.trim() || !url.trim()) {
      toast.error("Title and file/URL are required");
      return;
    }
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload",
          title,
          mimeType: url.startsWith("data:")
            ? url.slice(5, url.indexOf(";")) || "application/octet-stream"
            : "image/png",
          category,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          url,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{ asset: MarketingAsset }>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Upload failed");
      }
      toast.success("Asset saved to Marketing Asset Library");
      setTitle("");
      setTags("");
      setUrl("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const archive = async (assetId: string) => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", assetId }),
      });
      const body = (await res.json()) as ApiEnvelope<{ asset: MarketingAsset }>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Archive failed");
      }
      toast.success("Asset archived");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <MarketingModuleNav activeId="assets" />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Marketing Asset Library</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Foundation DAM for campaign creatives. Separate from operational Document Registry. Org
          marketing scope · archive · tags · categories · reuse via asset URLs in content blocks.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Upload</CardTitle>
            <CardDescription className="text-xs">
              Max {Math.round(MARKETING_ASSET_MAX_BYTES / 1000)} KB for in-memory foundation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) =>
                  setCategory(v as (typeof MARKETING_ASSET_CATEGORIES)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARKETING_ASSET_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>File</Label>
              <Input
                type="file"
                accept="image/*,.svg"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Or HTTPS / data URL</Label>
              <Input
                value={url.startsWith("data:") ? "(data URL loaded)" : url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                disabled={url.startsWith("data:")}
              />
              {url.startsWith("data:") ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setUrl("")}>
                  Clear data URL
                </Button>
              ) : null}
            </div>
            <Button size="sm" disabled={busy} onClick={() => void upload()}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Save asset
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Library</CardTitle>
                <CardDescription className="text-xs">{assets.length} assets</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                  />
                  Include archived
                </label>
                <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assets yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {assets.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-md border p-2 text-xs space-y-2"
                  >
                    <div className="flex h-28 items-center justify-center overflow-hidden rounded bg-muted">
                      {a.mimeType.startsWith("image/") || a.url.startsWith("data:image") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.url}
                          alt={a.title}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="font-medium truncate">{a.title}</div>
                    <div className="text-muted-foreground">
                      {a.category} · {a.byteSize} B · {a.permissionScope}
                      {a.archived ? " · archived" : ""}
                    </div>
                    {a.tags.length ? (
                      <div className="text-muted-foreground truncate">
                        tags: {a.tags.join(", ")}
                      </div>
                    ) : null}
                    {!a.archived ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7"
                        disabled={busy}
                        onClick={() => void archive(a.id)}
                      >
                        <Archive className="mr-1 h-3 w-3" />
                        Archive
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
