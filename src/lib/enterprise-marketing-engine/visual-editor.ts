/**
 * CO-MARKETING-REDESIGN-007 — Structured visual email editor operations.
 * Content SSOT is the block document. HTML is derived, never the other way around.
 */

import { MARKETING_UNSUBSCRIBE_BLOCK_TYPE } from "@/constants/enterprise-marketing-engine/content";
import type { MarketingContentBlockType } from "@/constants/enterprise-marketing-engine/content";
import type {
  MarketingContentBlock,
  MarketingContentDocument,
} from "@/types/enterprise-marketing-campaign";
import { createBlock } from "@/lib/enterprise-marketing-engine/content-blocks";
import { sanitizeMarketingRichText } from "@/lib/enterprise-marketing-engine/html-sanitize";

export function cloneMarketingBlocks(doc: MarketingContentDocument): MarketingContentDocument {
  return {
    version: 1,
    blocks: doc.blocks.map((block) => ({
      id: block.id,
      type: block.type,
      props: { ...block.props },
    })),
  };
}

export function hasMarketingUnsubscribeBlock(doc: MarketingContentDocument): boolean {
  return doc.blocks.some((block) => block.type === MARKETING_UNSUBSCRIBE_BLOCK_TYPE);
}

export function assertMarketingUnsubscribePresent(doc: MarketingContentDocument): void {
  if (hasMarketingUnsubscribeBlock(doc)) return;
  throw Object.assign(new Error("Mandatory unsubscribe block is missing"), {
    statusCode: 400,
    code: "MARKETING_UNSUBSCRIBE_REQUIRED",
  });
}

export function sanitizeMarketingContentDocument(doc: MarketingContentDocument): MarketingContentDocument {
  return {
    version: 1,
    blocks: doc.blocks.map((block) => {
      const props = { ...block.props };
      for (const key of ["html", "text", "title", "subtitle", "label", "left", "right", "caption", "body"]) {
        if (typeof props[key] === "string") {
          props[key] = sanitizeMarketingRichText(String(props[key]));
        }
      }
      if (typeof props.url === "string") {
        const url = props.url.trim();
        if (/^(javascript|vbscript|data):/i.test(url)) props.url = "";
      }
      if (typeof props.href === "string") {
        const href = props.href.trim();
        if (/^(javascript|vbscript|data):/i.test(href)) props.href = "{{unsubscribeUrl}}";
      }
      return { ...block, props };
    }),
  };
}

export function insertMarketingBlock(
  doc: MarketingContentDocument,
  type: MarketingContentBlockType,
  index?: number,
  props?: Record<string, unknown>,
): MarketingContentDocument {
  const next = cloneMarketingBlocks(doc);
  const block = createBlock(type, props);
  const at = index == null ? next.blocks.length : Math.max(0, Math.min(index, next.blocks.length));
  next.blocks.splice(at, 0, block);
  return sanitizeMarketingContentDocument(next);
}

export function updateMarketingBlock(
  doc: MarketingContentDocument,
  blockId: string,
  props: Record<string, unknown>,
): MarketingContentDocument {
  return sanitizeMarketingContentDocument({
    version: 1,
    blocks: doc.blocks.map((block) =>
      block.id === blockId ? { ...block, props: { ...block.props, ...props } } : block,
    ),
  });
}

export function reorderMarketingBlock(
  doc: MarketingContentDocument,
  fromIndex: number,
  toIndex: number,
): MarketingContentDocument {
  const next = cloneMarketingBlocks(doc);
  if (fromIndex < 0 || fromIndex >= next.blocks.length) return next;
  const [moved] = next.blocks.splice(fromIndex, 1);
  const clamped = Math.max(0, Math.min(toIndex, next.blocks.length));
  next.blocks.splice(clamped, 0, moved);
  return next;
}

export function duplicateMarketingBlock(
  doc: MarketingContentDocument,
  blockId: string,
): MarketingContentDocument {
  const index = doc.blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return cloneMarketingBlocks(doc);
  const source = doc.blocks[index];
  const copy: MarketingContentBlock = createBlock(source.type, { ...source.props });
  const next = cloneMarketingBlocks(doc);
  next.blocks.splice(index + 1, 0, copy);
  return next;
}

export function deleteMarketingBlock(
  doc: MarketingContentDocument,
  blockId: string,
): MarketingContentDocument {
  return {
    version: 1,
    blocks: doc.blocks.filter((block) => block.id !== blockId),
  };
}

export type MarketingBlockHistory = {
  past: MarketingContentDocument[];
  present: MarketingContentDocument;
  future: MarketingContentDocument[];
};

export function createMarketingBlockHistory(present: MarketingContentDocument): MarketingBlockHistory {
  return { past: [], present: cloneMarketingBlocks(present), future: [] };
}

export function pushMarketingBlockHistory(
  history: MarketingBlockHistory,
  next: MarketingContentDocument,
): MarketingBlockHistory {
  return {
    past: [...history.past, history.present].slice(-40),
    present: cloneMarketingBlocks(next),
    future: [],
  };
}

export function undoMarketingBlockHistory(history: MarketingBlockHistory): MarketingBlockHistory {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoMarketingBlockHistory(history: MarketingBlockHistory): MarketingBlockHistory {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

export function paragraphTextFromDocument(doc: MarketingContentDocument): string {
  const text = doc.blocks.find((block) => block.type === "text");
  return typeof text?.props.html === "string" ? text.props.html : "";
}
