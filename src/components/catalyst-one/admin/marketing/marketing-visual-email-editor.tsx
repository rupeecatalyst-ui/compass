"use client";

/**
 * CO-MARKETING-REDESIGN-007 — Block-based visual email editor.
 * Structured document is SSOT. HTML is derived and sanitised.
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MARKETING_EMAIL_SAFE_COLORS,
  MARKETING_HTML_SOURCE_MODE_DEFAULT,
  MARKETING_VISUAL_EDITOR_DESKTOP_NOTICE,
  MARKETING_VISUAL_EDITOR_PALETTE,
  MARKETING_ASSET_LIBRARY_PAGE_SIZE,
  type MarketingContentBlockType,
} from "@/constants/enterprise-marketing-engine";
import { renderMarketingEmailHtml } from "@/lib/enterprise-marketing-engine/email-render";
import {
  createMarketingBlockHistory,
  deleteMarketingBlock,
  duplicateMarketingBlock,
  hasMarketingUnsubscribeBlock,
  insertMarketingBlock,
  pushMarketingBlockHistory,
  redoMarketingBlockHistory,
  reorderMarketingBlock,
  undoMarketingBlockHistory,
  updateMarketingBlock,
  type MarketingBlockHistory,
} from "@/lib/enterprise-marketing-engine/visual-editor";
import { insertPersonalisationTokenIntoDocument } from "@/lib/enterprise-marketing-engine/personalisation-catalogue";
import {
  applyMarketingAssetToImageBlock,
  consumeMarketingSelectedAsset,
} from "@/lib/enterprise-marketing-engine/asset-select";
import { MARKETING_ASSET_IMAGE_BLOCK_TYPES } from "@/constants/enterprise-marketing-engine/assets";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { paginateMarketingCollection } from "@/lib/enterprise-marketing-engine/ux-pagination";
import type { MarketingContentDocument, MarketingAsset } from "@/types/enterprise-marketing-campaign";
import type { MarketingPersonalizationToken } from "@/constants/enterprise-marketing-engine/content";
import { MarketingUxPagination } from "./marketing-ux-pagination";
import "@/styles/marketing-visual-editor.css";

function propString(props: Record<string, unknown>, key: string, fallback = ""): string {
  const value = props[key];
  return typeof value === "string" ? value : fallback;
}

export function MarketingVisualEmailEditor({
  document,
  subject,
  previewText,
  onChange,
  insertToken,
}: {
  document: MarketingContentDocument;
  subject: string;
  previewText: string;
  onChange: (next: MarketingContentDocument) => void;
  insertToken?: { token: MarketingPersonalizationToken; nonce: number } | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(document.blocks[0]?.id ?? null);
  const [history, setHistory] = useState<MarketingBlockHistory>(() => createMarketingBlockHistory(document));
  const [sourceMode, setSourceMode] = useState(MARKETING_HTML_SOURCE_MODE_DEFAULT as boolean);
  const [showPreview, setShowPreview] = useState(false);

  const selected = document.blocks.find((block) => block.id === selectedId) ?? null;
  const html = useMemo(
    () =>
      renderMarketingEmailHtml({
        content: document,
        subject: subject || "Preview",
        previewText,
        mode: "desktop",
      }),
    [document, previewText, subject],
  );

  useEffect(() => {
    if (!insertToken?.token || !insertToken.nonce) return;
    commit(insertPersonalisationTokenIntoDocument(document, insertToken.token, selectedId));
    // insertToken.nonce is the trigger; selectedId/document captured at click time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertToken?.nonce]);

  useEffect(() => {
    const payload = consumeMarketingSelectedAsset();
    if (!payload) return;
    const imageTypes = MARKETING_ASSET_IMAGE_BLOCK_TYPES as readonly string[];
    const target =
      selected && imageTypes.includes(selected.type)
        ? selected
        : document.blocks.find((block) => imageTypes.includes(block.type));
    if (!target) return;
    commit(updateMarketingBlock(document, target.id, applyMarketingAssetToImageBlock(target.props, payload)));
    // Apply once on editor mount when the library handed off a selected asset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(next: MarketingContentDocument) {
    setHistory((prev) => pushMarketingBlockHistory(prev, next));
    onChange(next);
  }

  function applyHistory(nextHistory: MarketingBlockHistory) {
    setHistory(nextHistory);
    onChange(nextHistory.present);
  }

  return (
    <div className="mkt-ve">
      <p className="mkt-ve-desktop-notice">{MARKETING_VISUAL_EDITOR_DESKTOP_NOTICE}</p>
      <aside className="mkt-ve-palette">
        <p className="mb-2 text-sm font-semibold">Blocks</p>
        <div className="flex flex-col gap-1.5">
          {MARKETING_VISUAL_EDITOR_PALETTE.map((item) => (
            <Button
              key={item.type}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const at = selected
                  ? document.blocks.findIndex((block) => block.id === selected.id) + 1
                  : document.blocks.length;
                commit(insertMarketingBlock(document, item.type as MarketingContentBlockType, at));
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </aside>

      <section className="mkt-ve-canvas">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={history.past.length === 0}
            onClick={() => applyHistory(undoMarketingBlockHistory(history))}
          >
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={history.future.length === 0}
            onClick={() => applyHistory(redoMarketingBlockHistory(history))}
          >
            Redo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview((value) => !value)}>
            {showPreview ? "Hide preview" : "Preview"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setSourceMode((value) => !value)}>
            {sourceMode ? "Visual mode" : "HTML source"}
          </Button>
        </div>
        {!hasMarketingUnsubscribeBlock(document) ? (
          <p className="mb-3 text-sm text-destructive" role="alert">
            Mandatory unsubscribe block is missing. Approval is blocked until it is added.
          </p>
        ) : null}
        {sourceMode ? (
          <pre className="mkt-ve-source">{html}</pre>
        ) : (
          document.blocks.map((block, index) => (
            <div
              key={block.id}
              className="mkt-ve-block"
              data-selected={block.id === selectedId ? "true" : "false"}
              tabIndex={0}
              aria-label={`${block.type} block`}
              aria-current={block.id === selectedId ? "true" : undefined}
              onClick={() => setSelectedId(block.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedId(block.id);
                }
              }}
            >
              <div className="mkt-ve-block-toolbar">
                <span className="text-xs font-semibold uppercase tracking-wide">{block.type}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    commit(reorderMarketingBlock(document, index, index - 1));
                  }}
                >
                  Up
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={index === document.blocks.length - 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    commit(reorderMarketingBlock(document, index, index + 1));
                  }}
                >
                  Down
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    commit(duplicateMarketingBlock(document, block.id));
                  }}
                >
                  Duplicate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    const next = deleteMarketingBlock(document, block.id);
                    commit(next);
                    if (selectedId === block.id) setSelectedId(next.blocks[0]?.id ?? null);
                  }}
                >
                  Delete
                </Button>
              </div>
              <BlockPreview type={block.type} props={block.props} />
            </div>
          ))
        )}
        {showPreview ? (
          <iframe title="Email preview" className="mkt-ve-preview-frame mt-3" sandbox="" srcDoc={html} />
        ) : null}
      </section>

      <aside className="mkt-ve-settings">
        <p className="mb-2 text-sm font-semibold">Block settings</p>
        {selected ? (
          <div className="space-y-2">
            <Field
              label="Alignment"
              value={propString(selected.props, "align", "left")}
              onChange={(value) => commit(updateMarketingBlock(document, selected.id, { align: value }))}
            />
            <Field
              label="Spacing"
              value={propString(selected.props, "padding", "8")}
              onChange={(value) => commit(updateMarketingBlock(document, selected.id, { padding: value }))}
            />
            <div className="space-y-1">
              <Label id="mkt-ve-colour">Colour</Label>
              <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="mkt-ve-colour">
                {MARKETING_EMAIL_SAFE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    aria-pressed={propString(selected.props, "color") === color}
                    className="h-6 w-6 rounded-full border"
                    style={{ background: color }}
                    onClick={() => commit(updateMarketingBlock(document, selected.id, { color }))}
                  />
                ))}
              </div>
            </div>
            <BlockFields
              type={selected.type}
              props={selected.props}
              onChange={(props) => commit(updateMarketingBlock(document, selected.id, props))}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a block to edit.</p>
        )}
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const id = `mkt-ve-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}

function BlockPreview({ type, props }: { type: string; props: Record<string, unknown> }) {
  if (type === "header") return <p className="text-base font-semibold">{propString(props, "title") || "Heading"}</p>;
  if (type === "text") return <p className="whitespace-pre-wrap text-sm">{propString(props, "html") || "Paragraph"}</p>;
  if (type === "cta") return <p className="text-sm font-semibold">{propString(props, "label") || "Button"}</p>;
  if (type === "image") return <p className="text-sm text-muted-foreground">{propString(props, "alt") || "Image URL (no download)"}</p>;
  if (type === "unsubscribe") return <p className="text-sm underline">{propString(props, "label", "Unsubscribe")}</p>;
  if (type === "columns") {
    return (
      <p className="text-sm text-muted-foreground">
        {propString(props, "left")} / {propString(props, "right")}
      </p>
    );
  }
  return <p className="text-sm text-muted-foreground">{type}</p>;
}

function BlockFields({
  type,
  props,
  onChange,
}: {
  type: string;
  props: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
}) {
  if (type === "header") {
    return (
      <>
        <Field label="Heading" value={propString(props, "title")} onChange={(title) => onChange({ title })} />
        <Field label="Subtitle" value={propString(props, "subtitle")} onChange={(subtitle) => onChange({ subtitle })} />
      </>
    );
  }
  if (type === "text" || type === "footer") {
    return (
      <Field
        label={type === "footer" ? "Footer" : "Paragraph"}
        value={propString(props, type === "footer" ? "text" : "html")}
        multiline
        onChange={(value) => onChange(type === "footer" ? { text: value } : { html: value })}
      />
    );
  }
  if (type === "cta") {
    return (
      <>
        <Field label="Button label" value={propString(props, "label")} onChange={(label) => onChange({ label })} />
        <Field label="URL" value={propString(props, "url")} onChange={(url) => onChange({ url })} />
      </>
    );
  }
  if ((MARKETING_ASSET_IMAGE_BLOCK_TYPES as readonly string[]).includes(type)) {
    return (
      <>
        <Field label="Image URL" value={propString(props, "url")} onChange={(url) => onChange({ url })} />
        <Field label="Alt text" value={propString(props, "alt")} onChange={(alt) => onChange({ alt })} />
        <AssetLibraryPicker
          onPick={(asset) =>
            onChange(
              applyMarketingAssetToImageBlock(props, {
                assetId: asset.id,
                organizationId: asset.organizationId,
                url: asset.url,
                alt: asset.altText || propString(props, "alt"),
                assetType: asset.assetType,
                name: asset.name,
              }),
            )
          }
        />
      </>
    );
  }
  if (type === "columns") {
    return (
      <>
        <Field label="Left column" value={propString(props, "left")} multiline onChange={(left) => onChange({ left })} />
        <Field label="Right column" value={propString(props, "right")} multiline onChange={(right) => onChange({ right })} />
      </>
    );
  }
  if (type === "social") {
    return (
      <>
        <Field label="LinkedIn URL" value={propString(props, "linkedin")} onChange={(linkedin) => onChange({ linkedin })} />
        <Field label="Website URL" value={propString(props, "website")} onChange={(website) => onChange({ website })} />
      </>
    );
  }
  if (type === "unsubscribe") {
    return (
      <>
        <Field label="Label" value={propString(props, "label")} onChange={(label) => onChange({ label })} />
        <Field label="Href" value={propString(props, "href")} onChange={(href) => onChange({ href })} />
      </>
    );
  }
  if (type === "spacer") {
    return <Field label="Height (px)" value={propString(props, "heightPx", "24")} onChange={(heightPx) => onChange({ heightPx })} />;
  }
  return null;
}

function AssetLibraryPicker({ onPick }: { onPick: (asset: MarketingAsset) => void }) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/assets");
      const body = (await res.json()) as { success?: boolean; data?: { assets: MarketingAsset[] } };
      setAssets(body.data?.assets ?? []);
      setPage(1);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  const paged = paginateMarketingCollection(assets, page, MARKETING_ASSET_LIBRARY_PAGE_SIZE);

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
        Browse Asset Library
      </Button>
      {open ? (
        <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2" role="listbox" aria-label="Asset library">
          {assets.length === 0 ? (
            <p className="text-xs text-muted-foreground">No assets in this organisation.</p>
          ) : (
            <>
              {paged.slice.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="block w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-muted"
                  onClick={() => {
                    onPick(asset);
                    setOpen(false);
                  }}
                >
                  {asset.name} · {asset.assetType}
                </button>
              ))}
              <MarketingUxPagination
                page={paged.page}
                totalPages={paged.totalPages}
                total={paged.total}
                label="Visual editor asset pages"
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
