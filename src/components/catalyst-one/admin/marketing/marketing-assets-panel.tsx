"use client";

/**
 * CO-MARKETING-REDESIGN-011 — Organisation-scoped Marketing Asset Library.
 * Campaign collateral only. Not the Enterprise Document Registry.
 * Durable Prisma storage. Public retrieval remains approved images only.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Check,
  FileText,
  ImageIcon,
  Loader2,
  RefreshCw,
  Replace,
  Upload,
  X,
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
  type MarketingAssetApprovalStatus,
} from "@/constants/enterprise-marketing-engine";
import { rememberMarketingSelectedAsset } from "@/lib/enterprise-marketing-engine/asset-select";
import { isAllowedMarketingAssetMime } from "@/lib/enterprise-marketing-engine/asset-mime";
import {
  prepareMarketingUploadImage,
  type MarketingImageFocal,
  type MarketingImageFrame,
  type PreparedMarketingUploadImage,
} from "@/lib/enterprise-marketing-engine/asset-image-prepare";
import { paginateMarketingCollection } from "@/lib/enterprise-marketing-engine/ux-pagination";
import type { MarketingAsset } from "@/types/enterprise-marketing-campaign";
import type { MarketingAssetSelectPayload } from "@/types/enterprise-marketing-assets";
import { MarketingModuleNav } from "./marketing-module-nav";
import { MarketingUxPagination } from "./marketing-ux-pagination";
import { toast } from "sonner";
import "@/styles/marketing-command-centre.css";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

type ImageQueueItem = PreparedMarketingUploadImage & {
  key: string;
  title: string;
  altText: string;
};

type UploadFileResult = { key: string; title: string; ok: boolean; detail: string };

function isVisual(asset: MarketingAsset) {
  const preview = asset.previewUrl ?? "";
  return (
    asset.mimeType.startsWith("image/") ||
    preview.startsWith("data:image") ||
    asset.url.startsWith("data:image")
  );
}

/** Authorised library thumbnail — never the unauthenticated public path for DRAFT. */
function libraryPreviewSrc(asset: MarketingAsset) {
  if (asset.previewUrl?.startsWith("data:") || asset.previewUrl?.startsWith("blob:")) {
    return asset.previewUrl;
  }
  if (asset.previewUrl && !asset.previewUrl.includes("/api/marketing/public-assets/")) {
    return asset.previewUrl;
  }
  return asset.previewUrl || asset.url;
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
  const [rightsSourceUrl, setRightsSourceUrl] = useState("");
  const [rightsLicense, setRightsLicense] = useState("");
  const [rightsCommercialEmail, setRightsCommercialEmail] = useState("");
  const [rightsAttribution, setRightsAttribution] = useState("");
  const [rightsRestrictions, setRightsRestrictions] = useState("");
  const [rightsEvidence, setRightsEvidence] = useState("");
  const [frame, setFrame] = useState<MarketingImageFrame>("original");
  const [focal, setFocal] = useState<MarketingImageFocal>("center");
  const [queue, setQueue] = useState<ImageQueueItem[]>([]);
  const [uploadReport, setUploadReport] = useState<UploadFileResult[]>([]);
  const singleFileRef = useRef<HTMLInputElement>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);

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

  const onImageFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const prepared: ImageQueueItem[] = [];
    const prepareFailures: UploadFileResult[] = [];
    for (const file of Array.from(files)) {
      try {
        const image = await prepareMarketingUploadImage(file, { frame, focal });
        prepared.push({
          ...image,
          key: `${file.name}-${file.size}-${file.lastModified}-${prepared.length}`,
          title: file.name.replace(/\.[^.]+$/, "") || "Image",
          altText: "",
        });
      } catch (e) {
        prepareFailures.push({
          key: `prepare-${file.name}-${prepareFailures.length}`,
          title: file.name,
          ok: false,
          detail: e instanceof Error ? e.message : "Could not prepare this image",
        });
      }
    }
    if (prepared.length) setQueue((current) => [...current, ...prepared]);
    if (prepareFailures.length) setUploadReport((current) => [...prepareFailures, ...current]);
  };

  const imageRights = () => ({
    sourceUrl: rightsSourceUrl,
    license: rightsLicense,
    commercialEmail: rightsCommercialEmail,
    attribution: rightsAttribution,
    restrictions: rightsRestrictions,
    evidenceReference: rightsEvidence,
  });

  const saveImageDrafts = async () => {
    if (!queue.length) return;
    setBusy(true);
    const results: UploadFileResult[] = [];
    const failedKeys = new Set<string>();
    try {
      for (const item of queue) {
        const res = await authenticatedJsonFetch("/api/admin/marketing/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upload",
            title: item.title,
            name: item.title,
            mimeType: item.mimeType,
            category,
            assetType: "image",
            productCategory,
            tags: tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            url: item.dataUrl,
            byteSize: item.byteSize,
            altText: item.altText,
            filename: item.filename,
            width: item.width,
            height: item.height,
            rights: imageRights(),
          }),
        });
        const body = (await res.json()) as ApiEnvelope<{ asset: MarketingAsset }>;
        if (!res.ok || !body.success || !body.data?.asset) {
          const detail = body.error?.message || "Upload failed";
          failedKeys.add(item.key);
          results.push({ key: item.key, title: item.title, ok: false, detail });
        } else if (body.data.asset.approvalStatus !== "DRAFT") {
          failedKeys.add(item.key);
          results.push({
            key: item.key,
            title: item.title,
            ok: false,
            detail: "Upload did not remain a draft",
          });
        } else {
          results.push({ key: item.key, title: item.title, ok: true, detail: "Saved as draft" });
        }
      }
      setUploadReport(results);
      const saved = results.filter((row) => row.ok).length;
      const failed = results.length - saved;
      if (saved) {
        toast.success(`${saved} image${saved === 1 ? "" : "s"} saved as draft`);
        setQueue((current) => current.filter((row) => failedKeys.has(row.key)));
        await load();
      }
      if (failed) toast.error(`${failed} image${failed === 1 ? "" : "s"} not saved`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
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
            rights: imageRights(),
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

  const setApproval = async (assetId: string, approvalStatus: MarketingAssetApprovalStatus) => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_approval", assetId, approvalStatus }),
      });
      const body = (await res.json()) as ApiEnvelope<{ asset: MarketingAsset }>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Approval update failed");
      }
      const labels: Record<MarketingAssetApprovalStatus, string> = {
        APPROVED: "Image approved",
        REJECTED: "Image rejected",
        PENDING_REVIEW: "Submitted for review",
        DRAFT: "Returned to draft",
      };
      toast.success(labels[approvalStatus]);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval update failed");
    } finally {
      setBusy(false);
    }
  };

  const selectForCampaign = async (asset: MarketingAsset) => {
    if (asset.approvalStatus !== "APPROVED" || asset.archived) {
      toast.error("Approve this asset before using it in a campaign email.");
      return;
    }
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
                Max {Math.round(MARKETING_ASSET_MAX_BYTES / 1000)} KB. New images stay in Draft until they are submitted for review and approved. Alt text is required before approval.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => singleFileRef.current?.click()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Upload Image
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => bulkFileRef.current?.click()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Bulk Upload
              </Button>
              <input
                ref={singleFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  void onImageFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={bulkFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => {
                  void onImageFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="mkt-asset-frame">Frame</Label>
                <Select value={frame} onValueChange={(value) => setFrame(value as MarketingImageFrame)}>
                  <SelectTrigger id="mkt-asset-frame">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="hero">Hero 16:9</SelectItem>
                    <SelectItem value="card">Card square</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-asset-focal">Position</Label>
                <Select value={focal} onValueChange={(value) => setFocal(value as MarketingImageFocal)}>
                  <SelectTrigger id="mkt-asset-focal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <Input id="mkt-asset-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="collection:home-loans, placement:hero" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="mkt-asset-source">Source URL</Label>
                <Input id="mkt-asset-source" value={rightsSourceUrl} onChange={(e) => setRightsSourceUrl(e.target.value)} placeholder="https://…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-asset-license">License</Label>
                <Input id="mkt-asset-license" value={rightsLicense} onChange={(e) => setRightsLicense(e.target.value)} placeholder="License name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-asset-commercial">Commercial email permission</Label>
                <Select value={rightsCommercialEmail || "unrecorded"} onValueChange={(value) => setRightsCommercialEmail(value === "unrecorded" ? "" : value)}>
                  <SelectTrigger id="mkt-asset-commercial">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unrecorded">Not recorded</SelectItem>
                    <SelectItem value="yes">Permitted</SelectItem>
                    <SelectItem value="no">Not permitted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-asset-evidence">Evidence reference</Label>
                <Input id="mkt-asset-evidence" value={rightsEvidence} onChange={(e) => setRightsEvidence(e.target.value)} placeholder="Receipt or authorization id" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-asset-attribution">Attribution</Label>
                <Input id="mkt-asset-attribution" value={rightsAttribution} onChange={(e) => setRightsAttribution(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mkt-asset-restrictions">Usage restrictions</Label>
                <Input id="mkt-asset-restrictions" value={rightsRestrictions} onChange={(e) => setRightsRestrictions(e.target.value)} />
              </div>
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
              <Label htmlFor="mkt-asset-url">Or HTTPS / data URL (library payload)</Label>
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
            {queue.length ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {queue.length} image{queue.length === 1 ? "" : "s"} ready. Add a title and alt text, then save as draft. There is no library size cap.
                </p>
                {queue.map((item) => (
                  <div key={item.key} className="flex gap-3 rounded-md border p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.dataUrl} alt={item.altText || item.title} className="h-16 w-24 rounded object-cover" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        aria-label={`Title for ${item.filename}`}
                        value={item.title}
                        onChange={(e) =>
                          setQueue((current) =>
                            current.map((row) => (row.key === item.key ? { ...row, title: e.target.value } : row)),
                          )
                        }
                      />
                      <Input
                        aria-label={`Alt text for ${item.filename}`}
                        value={item.altText}
                        placeholder="Alt text"
                        onChange={(e) =>
                          setQueue((current) =>
                            current.map((row) => (row.key === item.key ? { ...row, altText: e.target.value } : row)),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {uploadReport.length ? (
              <ul className="space-y-1 text-xs" aria-label="Upload results">
                {uploadReport.map((row) => (
                  <li key={row.key} className={row.ok ? "text-foreground" : "text-destructive"}>
                    {row.ok ? "Saved as draft" : "Not saved"} — {row.title}: {row.detail}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {queue.length ? (
                <Button size="sm" disabled={busy} onClick={() => void saveImageDrafts()}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Save {queue.length} draft{queue.length === 1 ? "" : "s"}
                </Button>
              ) : null}
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
                        <img src={libraryPreviewSrc(a)} alt={a.altText || a.name} />
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
                      Source {a.rights?.sourceUrl || "not recorded"} · License {a.rights?.license || "not recorded"} · Commercial email {a.rights?.commercialEmail || "not recorded"}
                      {a.rights?.attribution ? ` · Attribution ${a.rights.attribution}` : ""}
                      {a.rights?.restrictions ? ` · Restrictions ${a.rights.restrictions}` : ""}
                      {a.rights?.evidenceReference ? ` · Evidence ${a.rights.evidenceReference}` : ""}
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
                      {(a.approvalStatus === "DRAFT" || a.approvalStatus === "REJECTED") && !a.archived ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => void setApproval(a.id, "PENDING_REVIEW")}
                        >
                          Submit for review
                        </Button>
                      ) : null}
                      {a.approvalStatus === "PENDING_REVIEW" && !a.archived ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => void setApproval(a.id, "APPROVED")}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Approve
                        </Button>
                      ) : null}
                      {a.approvalStatus === "PENDING_REVIEW" && !a.archived ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void setApproval(a.id, "DRAFT")}
                        >
                          Return to draft
                        </Button>
                      ) : null}
                      {a.approvalStatus !== "APPROVED" && a.approvalStatus !== "REJECTED" && !a.archived ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void setApproval(a.id, "REJECTED")}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      ) : null}
                      {a.approvalStatus === "PENDING_REVIEW" ? (
                        <p className="w-full text-xs text-muted-foreground">
                          Recorded rights are notes for the reviewer. They are not a legal approval. Approve only after a person has checked the image and its rights.
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant={a.approvalStatus === "APPROVED" ? "default" : "outline"}
                        disabled={busy || a.approvalStatus !== "APPROVED" || a.archived}
                        onClick={() => void selectForCampaign(a)}
                      >
                        Select for campaign
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy || a.approvalStatus === "APPROVED" || a.usageReferences.length > 0}
                        title={
                          a.approvalStatus === "APPROVED" || a.usageReferences.length
                            ? "Upload a new image. This picture stays available for mail already sent."
                            : undefined
                        }
                        onClick={() => beginReplace(a)}
                      >
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
                <img src={libraryPreviewSrc(preview)} alt={preview.altText || preview.name} />
              ) : (
                <p className="text-sm text-muted-foreground">Preview available for images only.</p>
              )}
            </div>
            <p className="text-sm">{preview.altText || "No alt text yet — required before approval."}</p>
            <p className="text-xs text-muted-foreground">
              Source URL: {preview.rights?.sourceUrl || "Not recorded"}
              <br />
              License: {preview.rights?.license || "Not recorded"}
              <br />
              Commercial email permission: {preview.rights?.commercialEmail || "Not recorded"}
              <br />
              Attribution: {preview.rights?.attribution || "Not recorded"}
              <br />
              Restrictions: {preview.rights?.restrictions || "Not recorded"}
              <br />
              Evidence: {preview.rights?.evidenceReference || "Not recorded"}
            </p>
            <p className="text-xs text-muted-foreground">
              Recorded rights are notes for the reviewer. They are not a legal approval. A person must review the image before it is approved.
            </p>
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
