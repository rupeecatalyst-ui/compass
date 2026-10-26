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
import {
  MARKETING_EMAIL_SAFE_COLORS,
  MARKETING_EMAIL_SAFE_FONT_STACK,
} from "@/constants/enterprise-marketing-engine/content";
import {
  isUnsafeMarketingHref,
  sanitizeMarketingPlainText,
  sanitizeMarketingRichText,
} from "@/lib/enterprise-marketing-engine/html-sanitize";
import { RUPEE_CATALYST_OFFICIAL_LOGO_ALT } from "@/constants/rupee-catalyst-brand";
import {
  OFFICIAL_EMAIL_LOGO_WIDTH_PX,
  RUPEE_CATALYST_OFFICIAL_LOGO_EMAIL_URL,
  isOfficialRupeeCatalystLogoUrl,
  officialEmailLogoAlt,
  resolveMarketingEmailImageUrl,
} from "@/lib/enterprise-marketing-engine/official-email-logo";

function esc(s: string): string {
  return sanitizeMarketingPlainText(s);
}

export function officialMarketingEmailLogoUrl(): string {
  return RUPEE_CATALYST_OFFICIAL_LOGO_EMAIL_URL;
}

function logoSrcForEmail(raw: string): string {
  const trimmed = raw.trim();
  const url =
    !trimmed || isOfficialRupeeCatalystLogoUrl(trimmed)
      ? officialMarketingEmailLogoUrl()
      : resolveMarketingEmailImageUrl(trimmed);
  if (!url || isUnsafeMarketingHref(url)) return "";
  return url;
}

function emailImageTag(url: string, alt: string, width: number): string {
  const radius = isOfficialRupeeCatalystLogoUrl(url) ? "" : "border-radius:8px;";
  return `<img src="${esc(url)}" alt="${esc(alt)}" width="${width}" border="0" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;outline:none;text-decoration:none;${radius}" />`;
}

function textToHtmlParagraphs(
  template: string,
  personalize: (s: string) => string,
  color = "#1f2937",
): string {
  const sanitisedTemplate = sanitizeMarketingRichText(template);
  const htmlish = /<[a-z][\s\S]*>/i.test(sanitisedTemplate);
  const merged = personalize(sanitisedTemplate);
  if (htmlish) return merged;
  return merged
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.5;color:${color};font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${p.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

function propString(props: Record<string, unknown>, key: string, fallback = ""): string {
  const v = props[key];
  return typeof v === "string" ? v : fallback;
}

function cellPad(props: Record<string, unknown>, fallback = "8"): string {
  const raw = Number.parseInt(propString(props, "padding", fallback), 10);
  const pad = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 48) : Number(fallback);
  return `${pad}px 24px`;
}

function alignOf(props: Record<string, unknown>, fallback = "left"): "left" | "center" | "right" {
  const value = propString(props, "align", fallback);
  if (value === "center" || value === "right" || value === "left") return value;
  return fallback as "left" | "center" | "right";
}

function safeColor(props: Record<string, unknown>, key: string, fallback: string): string {
  const value = propString(props, key, fallback);
  return (MARKETING_EMAIL_SAFE_COLORS as readonly string[]).includes(value) ? value : fallback;
}

const LIGHT_EMAIL_COLORS = new Set(["#ffffff", "#f8fafc", "#f0fdfa", "#ccfbf1", "#fff7ed", "#e2e8f0"]);

function solidBackground(props: Record<string, unknown>): string {
  const value = propString(props, "background");
  return (MARKETING_EMAIL_SAFE_COLORS as readonly string[]).includes(value) ? value : "";
}

function cellStyle(props: Record<string, unknown>, fallbackPad: string): string {
  const bg = solidBackground(props);
  const padding = `padding:${cellPad(props, fallbackPad)};`;
  return bg ? `background-color:${bg};${padding}` : padding;
}

function cellAttrs(props: Record<string, unknown>, fallbackPad: string, align?: string): string {
  const bg = solidBackground(props);
  const alignAttr = align ? ` align="${align}"` : "";
  const bgAttr = bg ? ` bgcolor="${bg}"` : "";
  return `${bgAttr}${alignAttr} style="${cellStyle(props, fallbackPad)}"`;
}

function buttonFill(props: Record<string, unknown>): string {
  const value = propString(props, "color");
  if (!value || LIGHT_EMAIL_COLORS.has(value)) return "#0f766e";
  return (MARKETING_EMAIL_SAFE_COLORS as readonly string[]).includes(value) ? value : "#0f766e";
}

function renderImageRow(
  props: Record<string, unknown>,
  personalize: (s: string) => string,
  url: string,
  width: number,
): string {
  const official = isOfficialRupeeCatalystLogoUrl(url);
  const alt = official
    ? officialEmailLogoAlt(propString(props, "alt", RUPEE_CATALYST_OFFICIAL_LOGO_ALT))
    : propString(props, "alt", "Image");
  return `<tr><td${cellAttrs(props, "8", alignOf(props, "center"))}>${emailImageTag(url, alt, width)}
        ${propString(props, "caption") ? `<div style="font-size:12px;color:#64748b;margin-top:6px;font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(personalize(propString(props, "caption")))}</div>` : ""}
      </td></tr>`;
}

function renderBlock(
  type: string,
  props: Record<string, unknown>,
  personalize: (s: string) => string,
  linkOpts: { trackingEnabled: boolean; utm: MarketingUtmConfig | null },
): string {
  switch (type) {
    case "header":
      return `<tr><td${cellAttrs(props, "16", alignOf(props))}>
        <div style="font-size:20px;font-weight:700;color:${safeColor(props, "color", "#0f172a")};font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(personalize(propString(props, "title")))}</div>
        ${propString(props, "subtitle") ? `<div style="font-size:13px;color:${solidBackground(props) && !LIGHT_EMAIL_COLORS.has(solidBackground(props)) ? "#e2e8f0" : "#64748b"};margin-top:4px;font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(personalize(propString(props, "subtitle")))}</div>` : ""}
      </td></tr>`;
    case "logo": {
      const url = logoSrcForEmail(propString(props, "url"));
      if (!url) return "";
      const alt = isOfficialRupeeCatalystLogoUrl(url)
        ? officialEmailLogoAlt(propString(props, "alt", RUPEE_CATALYST_OFFICIAL_LOGO_ALT))
        : propString(props, "alt", "Rupee Catalyst");
      const image = emailImageTag(url, alt, OFFICIAL_EMAIL_LOGO_WIDTH_PX);
      const bg = solidBackground(props);
      if (!bg) return `<tr><td style="padding:16px 24px;" align="center">${image}</td></tr>`;
      return `<tr><td bgcolor="${bg}" align="center" style="background-color:${bg};padding:16px 24px;">${image}</td></tr>`;
    }
    case "hero_image": {
      const url = resolveMarketingEmailImageUrl(propString(props, "url"));
      if (!url || isUnsafeMarketingHref(url)) {
        const bg = solidBackground(props) || "#0b1f33";
        const caption = propString(props, "caption", "Photograph");
        return `<tr><td bgcolor="${bg}" align="center" style="background-color:${bg};padding:28px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="center" style="border:1px solid #94a3b8;padding:36px 20px;">
              <div style="font-size:22px;line-height:1.35;font-weight:700;color:#ffffff;font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(personalize(caption))}</div>
            </td>
          </tr></table>
        </td></tr>`;
      }
      return renderImageRow(props, personalize, url, 520);
    }
    case "image": {
      const url = resolveMarketingEmailImageUrl(propString(props, "url"));
      if (!url || isUnsafeMarketingHref(url)) return "";
      return renderImageRow(props, personalize, url, isOfficialRupeeCatalystLogoUrl(url) ? OFFICIAL_EMAIL_LOGO_WIDTH_PX : 520);
    }
    case "text": {
      const bg = solidBackground(props);
      const color = bg && !LIGHT_EMAIL_COLORS.has(bg) ? "#ffffff" : "#1f2937";
      return `<tr><td${cellAttrs(props, "8", alignOf(props))}>${textToHtmlParagraphs(propString(props, "html"), personalize, color)}</td></tr>`;
    }
    case "image_text": {
      const url = resolveMarketingEmailImageUrl(propString(props, "url"));
      const imageUrl = url && !isUnsafeMarketingHref(url) ? url : "";
      return `<tr><td style="padding:8px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          ${imageUrl ? `<td width="40%" style="padding-right:12px;vertical-align:top;">${emailImageTag(imageUrl, isOfficialRupeeCatalystLogoUrl(imageUrl) ? officialEmailLogoAlt(propString(props, "alt", RUPEE_CATALYST_OFFICIAL_LOGO_ALT)) : propString(props, "alt", "Image"), isOfficialRupeeCatalystLogoUrl(imageUrl) ? OFFICIAL_EMAIL_LOGO_WIDTH_PX : 200)}</td>` : ""}
          <td style="vertical-align:top;">${textToHtmlParagraphs(propString(props, "html"), personalize)}</td>
        </tr></table>
      </td></tr>`;
    }
    case "product_card":
    case "offer_card": {
      const cardBg = solidBackground(props) || "#f8fafc";
      const dark = !LIGHT_EMAIL_COLORS.has(cardBg);
      const titleColor = dark ? "#ffffff" : "#0f172a";
      const bodyColor = dark ? "#e2e8f0" : "#475569";
      const badgeColor = dark ? "#ccfbf1" : "#134e4a";
      const edge = dark ? cardBg : "#cbd5e1";
      return `<tr><td style="padding:8px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${cardBg}" style="border:1px solid ${edge};background-color:${cardBg};">
          <tr><td style="padding:18px 16px;">
            ${propString(props, "badge") ? `<div style="font-size:12px;font-weight:700;letter-spacing:0.4px;color:${badgeColor};margin-bottom:8px;font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(propString(props, "badge"))}</div>` : ""}
            <div style="font-size:16px;font-weight:700;color:${titleColor};font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(personalize(propString(props, "title")))}</div>
            <div style="font-size:14px;color:${bodyColor};margin-top:6px;font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(personalize(propString(props, "body")))}</div>
            ${propString(props, "amountLabel") ? `<div style="font-size:14px;font-weight:600;color:${titleColor};margin-top:8px;font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(personalize(propString(props, "amountLabel")))}</div>` : ""}
          </td></tr>
        </table>
      </td></tr>`;
    }
    case "cta": {
      const label = personalize(propString(props, "label", "Continue"));
      const rawUrl = propString(props, "url", "#");
      const url = appendMarketingUtmParams(rawUrl, linkOpts.utm, linkOpts.trackingEnabled);
      const fill = buttonFill(props);
      return `<tr><td${cellAttrs(props, "16", "center")}>
        <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td bgcolor="${fill}" style="background-color:${fill};">
          <a href="${esc(url)}" style="display:inline-block;background-color:${fill};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(label)}</a>
        </td></tr></table>
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
      const toneBg = tone === "gold" ? "#fffbeb" : tone === "slate" ? "#f8fafc" : "#f0fdfa";
      const bg = solidBackground(props) || toneBg;
      const dark = !LIGHT_EMAIL_COLORS.has(bg);
      const border = tone === "gold" ? "#f59e0b" : tone === "slate" ? "#94a3b8" : "#0f766e";
      const titleColor = dark ? "#ffffff" : "#0f172a";
      const bodyColor = dark ? "#e2e8f0" : "#475569";
      return `<tr><td style="padding:8px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${bg}" style="border-left:4px solid ${border};background-color:${bg};">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:15px;font-weight:700;color:${titleColor};font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(personalize(propString(props, "title")))}</div>
            <div style="font-size:14px;color:${bodyColor};margin-top:6px;font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(personalize(propString(props, "body")))}</div>
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
      return `<tr><td style="padding:8px 24px;"><div style="font-size:12px;line-height:1.5;color:#475569;">${esc(personalize(propString(props, "text")))}</div></td></tr>`;
    case "footer": {
      const footerCopy = propString(props, "text") || propString(props, "html");
      const bg = solidBackground(props);
      const color = bg && !LIGHT_EMAIL_COLORS.has(bg) ? "#e2e8f0" : "#64748b";
      return `<tr><td${cellAttrs(props, "16", alignOf(props, "center"))}><div style="font-size:12px;color:${color};border-top:1px solid #e2e8f0;padding-top:12px;font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(personalize(footerCopy))}</div></td></tr>`;
    }
    case "columns":
      return `<tr><td style="padding:${cellPad(props)};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="50%" valign="top" style="padding-right:8px;font-size:14px;color:#1f2937;font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${textToHtmlParagraphs(propString(props, "left"), personalize)}</td>
          <td width="50%" valign="top" style="padding-left:8px;font-size:14px;color:#1f2937;font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${textToHtmlParagraphs(propString(props, "right"), personalize)}</td>
        </tr></table>
      </td></tr>`;
    case "social": {
      const items: Array<[string, string]> = (
        [
          ["LinkedIn", propString(props, "linkedin")],
          ["Website", propString(props, "website")],
        ] as Array<[string, string]>
      ).filter(([, url]) => Boolean(url) && !isUnsafeMarketingHref(url));
      if (items.length === 0) return "";
      return `<tr><td style="padding:${cellPad(props)};" align="${alignOf(props, "center")}">${items
        .map(
          ([label, url]) =>
            `<a href="${esc(url)}" style="color:#0f766e;font-size:13px;text-decoration:underline;margin:0 8px;font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(label)}</a>`,
        )
        .join(" ")}</td></tr>`;
    }
    case "unsubscribe": {
      const href = propString(props, "href", "{{unsubscribeUrl}}");
      const label = personalize(propString(props, "label", "Unsubscribe"));
      const safeHref =
        href === "{{unsubscribeUrl}}" || !isUnsafeMarketingHref(href) ? href : "{{unsubscribeUrl}}";
      return `<tr><td data-marketing-unsubscribe="true" style="padding:${cellPad(props, "16")};" align="${alignOf(props, "center")}">
        <a href="${esc(safeHref)}" style="color:#64748b;font-size:12px;text-decoration:underline;font-family:${MARKETING_EMAIL_SAFE_FONT_STACK};">${esc(label)}</a>
      </td></tr>`;
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
  const personalize = (s: string) =>
    applyPersonalization(s, args.personalization ?? {}, { escapeHtml: true });
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
  const personalize = (s: string) =>
    applyPersonalization(s, args.personalization ?? {}, { escapeHtml: false });
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
      case "columns":
        lines.push(personalize(String(p.left ?? "")), personalize(String(p.right ?? "")));
        break;
      case "social":
        lines.push(String(p.linkedin ?? ""), String(p.website ?? ""));
        break;
      case "unsubscribe":
        lines.push(`${personalize(String(p.label ?? "Unsubscribe"))}: ${String(p.href ?? "{{unsubscribeUrl}}")}`);
        break;
      case "image":
      case "hero_image":
      case "logo":
        lines.push(personalize(String(p.alt ?? p.caption ?? "")));
        break;
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
