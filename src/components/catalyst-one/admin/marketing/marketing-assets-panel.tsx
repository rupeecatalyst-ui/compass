"use client";

/**
 * CO-MARKETING-REDESIGN-011 — Organisation-scoped Marketing Asset Library.
 * Campaign collateral only. Not the Enterprise Document Registry.
 * Fixture storage only — never Hostinger or an external provider.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  FileText,
  ImageIcon,
  Loader2,
  RefreshCw,
  Replace,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  MARKETING_ASSET_APPROVAL_STATUSES,
  MARKETING_ASSET_CATEGORIES,
  MARKETING_ASSET_DOCUMENT_REGISTRY_NOTICE,
  MARKETING_ASSET_FIXTURE_NOTICE,
  MARKETING_ASSET_LIBRARY_PAGE_SIZE,
  MARKETING_ASSET_MAX_BYTES,
  MARKETING_ASSET_PRODUCT_CATEGORIES,
  MARKETING_ASSET_TYPE_LABELS,
  MARKETING_ASSET_TYPES,
  MARKETING_TEST_MODE_BANNER,
} from "@/constants/enterprise-marketing-engine";
import { rememberMarketingSelectedAsset } from "@/lib/enterprise-marketing-engine/asset-select";
import { isAllowedMarketingAssetMime } from "@/lib/enterprise-marketing-engine/asset-mime";
import { paginateMarketingCollection } from "@/lib/enterprise-marketing-engine/ux-pagination";
import type { MarketingAsset } from "@/types/enterprise-marketing-campaign";
import type { MarketingAssetSelectPayload } from "@/types/enterprise-marketing-assets";
import { MarketingModuleNav } from "./marketing-module-nav";
import { MarketingUxPagination } from "./marketing-ux-pagination";
import { toast } from "sonner";
import "@/styles/marketing-command-centre.css";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

function isVisual(asset: MarketingAsset) {
  return asset.mimeType.startsWith("image/") || asset.url.startsWith("data:image");
}

export function MarketingAssetsPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [title, setTitle] = useState("");
  const [assetType, setAssetType] = useState<(typeof MARKETING_ASSET_TYPES)[number]>("campaign_banner");
  const [category, setCategory] =
    useState<(typeof MARKETING_ASSET_CATEGORIES)[number]>("banner");
  const [productCategory, setProductCategory] =
    useState<(typeof MARKETING_ASSET_PRODUCT_CATEGORIES)[number]>("Unspecified");
  const [tags, setTags] = useState("");
  const [altText, setAltText] = useState("");
  const [url, setUrl] = useState("");
  const [mimeType, setMimeType] = useState("image/png");
  const [filename, setFilename] = useState("");
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [page, setPage] = useState(1);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (includeArchived) params.set("includeArchived", "1");
    if (search.trim()) params.set("search", search.trim());
    if (typeFilter !== "all") params.set("assetType", typeFilter);
    if (productFilter !== "all") params.set("productCategory", productFilter);
    if (approvalFilter !== "all") params.set("approvalStatus", approvalFilter);
    return params.toString();
  }, [includeArchived, search, typeFilter, productFilter, approvalFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedJsonFetch(
        `/api/admin/marketing/assets${query ? `?${query}` : ""}`,
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
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const paged = useMemo(
    () => paginateMarketingCollection(assets, page, MARKETING_ASSET_LIBRARY_PAGE_SIZE),
    [assets, page],
  );

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > MARKETING_ASSET_MAX_BYTES) {
      toast.error(`File exceeds ${MARKETING_ASSET_MAX_BYTES} bytes foundation limit`);
      return;
    }
    if (!isAllowedMarketingAssetMime(file.type)) {
      toast.error("Unsupported or dangerous file type");
      return;
    }
    setFilename(file.name);
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      setUrl(dataUrl);
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsDataURL(file);
  };

  const saveAsset = async () => {
    if (!title.trim() || !url.trim()) {
      toast.error("Name and file/URL are required");
      return;
    }
    setBusy(true);
    try {
      const action = replaceId ? "replace" : "upload";
      const res = await authenticatedJsonFetch("/api/admin/marketing/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          assetId: replaceId ?? undefined,
          title,
          name: title,
          mimeType,
          category,
          assetType,
          productCategory,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          url,
          altText,
          filename,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{ asset: MarketingAsset }>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Upload failed");
      }
      toast.success(replaceId ? "New asset version saved" : "Asset saved to Marketing Asset Library");
      setTitle("");
      setTags("");
      setAltText("");
      setUrl("");
      setFilename("");
      setReplaceId(null);
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
      toast.success("Asset archived (not deleted)");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setBusy(false);
    }
  };

  const selectForCampaign = async (asset: MarketingAsset) => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select_for_campaign", assetId: asset.id }),
      });
      const body = (await res.json()) as ApiEnvelope<{ selected: MarketingAssetSelectPayload }>;
      if (!res.ok || !body.success || !body.data?.selected) {
        throw new Error(body.error?.message || "Select failed");
      }
      rememberMarketingSelectedAsset(body.data.selected);
      toast.success("Asset selected for campaign");
      router.push("/admin/marketing/campaigns");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Select failed");
    } finally {
      setBusy(false);
    }
  };

  const beginReplace = (asset: MarketingAsset) => {
    setReplaceId(asset.id);
    setTitle(asset.name);
    setAssetType(asset.assetType);
    setCategory(asset.category);
    setProductCategory(asset.productCategory);
    setTags(asset.tags.join(", "));
    setAltText(asset.altText);
    setUrl("");
    setMimeType(asset.mimeType);
  };

  const preview = assets.find((a) => a.id === previewId) ?? null;

  return (
    <div className="mkt-cc">
      <div className="mkt-cc-page space-y-5">
        <MarketingModuleNav activeId="assets" />
        <div className="mkt-cc-banner">{MARKETING_TEST_MODE_BANNER}</div>
        <div>
          <p className="mkt-cc-kicker">Campaign collateral</p>
          <h1 className="mkt-cc-title">Marketing Asset Library</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {MARKETING_ASSET_DOCUMENT_REGISTRY_NOTICE} {MARKETING_ASSET_FIXTURE_NOTICE}
          </p>
        </div>

        <div className="mkt-cc-filters">
          <div className="space-y-1.5">
            <Label htmlFor="mkt-asset-search">Search</Label>
            <Input
              id="mkt-asset-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, tags, alt text"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mkt-asset-type-filter">Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger id="mkt-asset-type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {MARKETING_ASSET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {MARKETING_ASSET_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mkt-asset-product-filter">Campaign / product</Label>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger id="mkt-asset-product-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {MARKETING_ASSET_PRODUCT_CATEGORIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mkt-asset-approval-filter">Approval</Label>
            <Select value={approvalFilter} onValueChange={setApprovalFilter}>
              <SelectTrigger id="mkt-asset-approval-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {MARKETING_ASSET_APPROVAL_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Include archived
          </label>
        </div>

        <div className="mkt-asset-layout">
          <section className="mkt-cc-panel space-y-3">
            <div>
              <h2 className="text-base font-semibold">
                {replaceId ? "Replace / version" : "Upload preparation"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Max {Math.round(MARKETING_ASSET_MAX_BYTES / 1000)} KB. Images need alt text before campaign approval.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mkt-asset-name">Asset name</Label>
              <Input id="mkt-asset-name" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mkt-asset-type">Asset type</Label>
              <Select
                value={assetType}
                onValueChange={(v) => setAssetType(v as (typeof MARKETING_ASSET_TYPES)[number])}
              >
                <SelectTrigger id="mkt-asset-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARKETING_ASSET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {MARKETING_ASSET_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mkt-asset-category">Legacy category</Label>
              <Select
                value={category}
                onValueChange={(v) =>
                  setCategory(v as (typeof MARKETING_ASSET_CATEGORIES)[number])
                }
              >
                <SelectTrigger id="mkt-asset-category">
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
              <Label htmlFor="mkt-asset-product">Campaign / product category</Label>
              <Select
                value={productCategory}
                onValueChange={(v) =>
                  setProductCategory(v as (typeof MARKETING_ASSET_PRODUCT_CATEGORIES)[number])
                }
              >
                <SelectTrigger id="mkt-asset-product">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARKETING_ASSET_PRODUCT_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mkt-asset-tags">Tags (comma-separated)</Label>
              <Input id="mkt-asset-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mkt-asset-alt">Accessibility alt text</Label>
              <Input
                id="mkt-asset-alt"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Required before campaign approval for images"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mkt-asset-file">File</Label>
              <Input
                id="mkt-asset-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/webm"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mkt-asset-url">Or HTTPS / data URL (fixture reference)</Label>
              <Input
                id="mkt-asset-url"
                value={url.startsWith("data:") ? "(data URL loaded locally)" : url}
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
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => void saveAsset()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {replaceId ? "Save new version" : "Save asset"}
              </Button>
              {replaceId ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setReplaceId(null)}>
                  Cancel replace
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </section>

          <section>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assets yet.</p>
            ) : (
              <>
              <div className="mkt-asset-grid">
                {paged.slice.map((a) => (
                  <article key={a.id} className="mkt-asset-card">
                    <button
                      type="button"
                      className="mkt-asset-thumb"
                      aria-label={`Preview ${a.name}`}
                      onClick={() => setPreviewId(a.id)}
                    >
                      {isVisual(a) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.url} alt={a.altText || a.name} />
                      ) : a.assetType === "pdf" ? (
                        <FileText className="h-10 w-10 text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      )}
                    </button>
                    <div>
                      <div className="truncate text-base font-semibold">{a.name}</div>
                      <div className="mkt-asset-meta mt-2">
                        <span className="mkt-asset-chip">{MARKETING_ASSET_TYPE_LABELS[a.assetType]}</span>
                        <span className="mkt-asset-chip">{a.productCategory}</span>
                        <span className="mkt-asset-chip">{a.approvalStatus}</span>
                        {a.archived ? <span className="mkt-asset-chip">Archived</span> : null}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {a.mimeType} · {a.fileSize} B · v{a.currentVersionNumber} · {a.storageProvider}
                    </p>
                    {a.usageReferences.length ? (
                      <div className="text-xs text-muted-foreground">
                        Used by{" "}
                        {a.usageReferences
                          .map((ref) => `${ref.kind} ${ref.name}${ref.versionNumber ? ` v${ref.versionNumber}` : ""}`)
                          .join(", ")}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No campaign or template usage yet.</p>
                    )}
                    <div className="mt-auto flex flex-wrap gap-2">
                      <Button type="button" size="sm" disabled={busy} onClick={() => void selectForCampaign(a)}>
                        Select for campaign
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => beginReplace(a)}>
                        <Replace className="mr-1 h-3 w-3" />
                        Replace
                      </Button>
                      {!a.archived ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void archive(a.id)}
                        >
                          <Archive className="mr-1 h-3 w-3" />
                          Archive
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
              <MarketingUxPagination
                page={paged.page}
                totalPages={paged.totalPages}
                total={paged.total}
                label="Asset library pages"
                onPageChange={setPage}
              />
              </>
            )}
          </section>
        </div>

        {preview ? (
          <section
            className="mkt-cc-panel space-y-3"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mkt-asset-preview-title"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="mkt-asset-preview-title" className="text-base font-semibold">
                Image preview · {preview.name}
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewId(null)}>
                Close
              </Button>
            </div>
            <div className="mkt-asset-thumb min-h-[18rem]">
              {isVisual(preview) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={preview.altText || preview.name} />
              ) : (
                <p className="text-sm text-muted-foreground">Preview available for images only.</p>
              )}
            </div>
            <p className="text-sm">{preview.altText || "No alt text yet — required before campaign approval."}</p>
            <div className="text-xs text-muted-foreground">
              Usage history:{" "}
              {preview.usageReferences.length
                ? preview.usageReferences
                    .map((ref) => `${ref.kind}: ${ref.name}`)
                    .join(" · ")
                : "not referenced by templates or campaigns"}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
