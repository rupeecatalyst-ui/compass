/**
 * CO-MARKETING-MKT-04 / MKT-08 — Email-safe HTML renderer for block documents.
 * Table layout + inline CSS — reliable across common email clients.
 * Not dependent on a visual editor library.
 */

import type { MarketingContentDocument } from "@/types/enterprise-marketing-campaign";
import type { MarketingUtmConfig } from "@/lib/enterprise-marketing-engine/utm";
import { appendMarketingUtmParams } from "@/lib/enterprise-marketing-engine/utm";
import { applyPersonalization } from "./personalization";
import type { MarketingPersonalizationToken } from "@/constants/enterprise-marketing-engine/content";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtmlParagraphs(raw: string): string {
  return esc(raw)
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.5;color:#1f2937;">${p.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

function propString(props: Record<string, unknown>, key: string, fallback = ""): string {
  const v = props[key];
  return typeof v === "string" ? v : fallback;
}

function renderBlock(
  type: string,
  props: Record<string, unknown>,
  personalize: (s: string) => string,
  linkOpts: { trackingEnabled: boolean; utm: MarketingUtmConfig | null },
): string {
  switch (type) {
    case "header":
      return `<tr><td style="padding:20px 24px 8px 24px;">
        <div style="font-size:20px;font-weight:700;color:#0f172a;">${esc(personalize(propString(props, "title")))}</div>
        ${propString(props, "subtitle") ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">${esc(personalize(propString(props, "subtitle")))}</div>` : ""}
      </td></tr>`;
    case "logo": {
      const url = propString(props, "url");
      if (!url) return "";
      return `<tr><td style="padding:16px 24px;" align="center"><img src="${esc(url)}" alt="${esc(propString(props, "alt", "Logo"))}" width="140" style="display:block;max-width:140px;height:auto;border:0;" /></td></tr>`;
    }
    case "hero_image":
    case "image": {
      const url = propString(props, "url");
      if (!url) return "";
      return `<tr><td style="padding:8px 24px;" align="center"><img src="${esc(url)}" alt="${esc(propString(props, "alt", "Image"))}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:8px;" />
        ${propString(props, "caption") ? `<div style="font-size:12px;color:#64748b;margin-top:6px;">${esc(personalize(propString(props, "caption")))}</div>` : ""}
      </td></tr>`;
    }
    case "text":
      return `<tr><td style="padding:8px 24px;">${textToHtmlParagraphs(personalize(propString(props, "html")))}</td></tr>`;
    case "image_text": {
      const url = propString(props, "url");
      return `<tr><td style="padding:8px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          ${url ? `<td width="40%" style="padding-right:12px;vertical-align:top;"><img src="${esc(url)}" alt="${esc(propString(props, "alt", "Image"))}" width="200" style="display:block;width:100%;max-width:200px;height:auto;border:0;" /></td>` : ""}
          <td style="vertical-align:top;">${textToHtmlParagraphs(personalize(propString(props, "html")))}</td>
        </tr></table>
      </td></tr>`;
    }
    case "product_card":
    case "offer_card":
      return `<tr><td style="padding:8px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;">
          <tr><td style="padding:16px;">
            ${propString(props, "badge") ? `<div style="display:inline-block;font-size:11px;font-weight:700;color:#0f766e;background:#ccfbf1;padding:2px 8px;border-radius:999px;margin-bottom:8px;">${esc(propString(props, "badge"))}</div>` : ""}
            <div style="font-size:16px;font-weight:700;color:#0f172a;">${esc(personalize(propString(props, "title")))}</div>
            <div style="font-size:14px;color:#475569;margin-top:6px;">${esc(personalize(propString(props, "body")))}</div>
            ${propString(props, "amountLabel") ? `<div style="font-size:14px;font-weight:600;color:#0f172a;margin-top:8px;">${esc(personalize(propString(props, "amountLabel")))}</div>` : ""}
          </td></tr>
        </table>
      </td></tr>`;
    case "cta": {
      const label = personalize(propString(props, "label", "Continue"));
      const rawUrl = propString(props, "url", "#");
      const url = appendMarketingUtmParams(rawUrl, linkOpts.utm, linkOpts.trackingEnabled);
      return `<tr><td style="padding:16px 24px;" align="center">
        <a href="${esc(url)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:8px;">${esc(label)}</a>
      </td></tr>`;
    }
    case "divider":
      return `<tr><td style="padding:8px 24px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>`;
    case "spacer": {
      const h = Number.parseInt(propString(props, "heightPx", "24"), 10);
      const height = Number.isFinite(h) ? Math.min(Math.max(h, 8), 96) : 24;
      return `<tr><td style="height:${height}px;line-height:${height}px;font-size:0;">&nbsp;</td></tr>`;
    }
    case "highlight": {
      const tone = propString(props, "tone", "teal");
      const bg = tone === "gold" ? "#fffbeb" : tone === "slate" ? "#f8fafc" : "#f0fdfa";
      const border = tone === "gold" ? "#f59e0b" : tone === "slate" ? "#94a3b8" : "#0f766e";
      return `<tr><td style="padding:8px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${border};background:${bg};border-radius:8px;">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:15px;font-weight:700;color:#0f172a;">${esc(personalize(propString(props, "title")))}</div>
            <div style="font-size:14px;color:#475569;margin-top:6px;">${esc(personalize(propString(props, "body")))}</div>
          </td></tr>
        </table>
      </td></tr>`;
    }
    case "contact":
      return `<tr><td style="padding:8px 24px;">
        <div style="font-size:13px;line-height:1.5;color:#475569;">
          <div style="font-weight:600;color:#0f172a;">${esc(personalize(propString(props, "name")))}</div>
          ${propString(props, "email") ? `<div>${esc(personalize(propString(props, "email")))}</div>` : ""}
          ${propString(props, "phone") ? `<div>${esc(personalize(propString(props, "phone")))}</div>` : ""}
          ${propString(props, "address") ? `<div>${esc(personalize(propString(props, "address")))}</div>` : ""}
        </div>
      </td></tr>`;
    case "disclaimer":
      return `<tr><td style="padding:8px 24px;"><div style="font-size:11px;line-height:1.4;color:#94a3b8;">${esc(personalize(propString(props, "text")))}</div></td></tr>`;
    case "footer": {
      const footerCopy = propString(props, "text") || propString(props, "html");
      return `<tr><td style="padding:16px 24px 24px 24px;"><div style="font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px;">${esc(personalize(footerCopy))}</div></td></tr>`;
    }
    default:
      return "";
  }
}

export function renderMarketingEmailHtml(args: {
  content: MarketingContentDocument;
  subject: string;
  previewText: string;
  mode: "desktop" | "mobile";
  personalization?: Partial<Record<MarketingPersonalizationToken, string>>;
  trackingEnabled?: boolean;
  utm?: MarketingUtmConfig | null;
}): string {
  const personalize = (s: string) => applyPersonalization(s, args.personalization ?? {});
  const maxWidth = args.mode === "mobile" ? 360 : 600;
  const linkOpts = {
    trackingEnabled: args.trackingEnabled ?? false,
    utm: args.utm ?? null,
  };
  const blocksHtml = args.content.blocks
    .map((b) => renderBlock(b.type, b.props, personalize, linkOpts))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(personalize(args.subject))}</title>
<!--[if mso]><style>table{border-collapse:collapse;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(personalize(args.previewText))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="${maxWidth}" cellpadding="0" cellspacing="0" style="width:100%;max-width:${maxWidth}px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${blocksHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderMarketingEmailPlaintext(args: {
  content: MarketingContentDocument;
  personalization?: Partial<Record<MarketingPersonalizationToken, string>>;
  /** Editable override — when set, used instead of auto-derived plaintext. */
  plainTextOverride?: string | null;
  trackingEnabled?: boolean;
  utm?: MarketingUtmConfig | null;
}): string {
  const personalize = (s: string) => applyPersonalization(s, args.personalization ?? {});
  if (args.plainTextOverride?.trim()) {
    return personalize(args.plainTextOverride.trim());
  }
  const lines: string[] = [];
  for (const b of args.content.blocks) {
    const p = b.props;
    switch (b.type) {
      case "header":
        lines.push(personalize(String(p.title ?? "")), personalize(String(p.subtitle ?? "")));
        break;
      case "text":
      case "disclaimer":
      case "footer":
      case "highlight":
        lines.push(
          personalize(String(p.html ?? p.text ?? p.title ?? "")),
          personalize(String(p.body ?? "")),
        );
        break;
      case "contact":
        lines.push(
          personalize(String(p.name ?? "")),
          personalize(String(p.email ?? "")),
          personalize(String(p.phone ?? "")),
          personalize(String(p.address ?? "")),
        );
        break;
      case "cta": {
        const url = appendMarketingUtmParams(
          String(p.url ?? ""),
          args.utm ?? null,
          args.trackingEnabled ?? false,
        );
        lines.push(`${personalize(String(p.label ?? "CTA"))}: ${url}`);
        break;
      }
      case "product_card":
      case "offer_card":
        lines.push(personalize(String(p.title ?? "")), personalize(String(p.body ?? "")));
        break;
      default:
        break;
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
