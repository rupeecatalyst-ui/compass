/**
 * CO-MARKETING-REDESIGN-007 — Email HTML sanitisation.
 * Strips executable scripts, handlers, and unsafe URLs. Server-safe.
 */

const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "a", "span"]);

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&");
}

export function isUnsafeMarketingHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return true;
  if (/^\{\{[a-zA-Z][a-zA-Z0-9_]*\}\}$/.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:")) return true;
  if (lower.startsWith("vbscript:")) return true;
  if (lower.startsWith("data:")) return true;
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("mailto:")) {
    return false;
  }
  return true;
}

export function sanitizeMarketingPlainText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function containsForbiddenMarketingMarkup(html: string): boolean {
  const decoded = decodeBasicEntities(html);
  return /<\s*(script|iframe|object|embed|form|link|meta|svg|math|style)\b/i.test(decoded)
    || /\son[a-z]+\s*=/i.test(decoded)
    || /javascript\s*:/i.test(decoded)
    || /vbscript\s*:/i.test(decoded);
}

/**
 * Allowlisted inline markup only. Unknown tags are escaped. Scripts never survive.
 */
export function sanitizeMarketingRichText(html: string): string {
  const decoded = decodeBasicEntities(html ?? "");
  const withoutForbidden = decoded
    .replace(/<\s*(script|iframe|object|embed|form|link|meta|svg|math|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|form|link|meta|svg|math|style)[^>]*\/?\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  return withoutForbidden.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, rawName: string, rawAttrs: string) => {
    const name = rawName.toLowerCase();
    const closing = full.startsWith("</");
    if (!ALLOWED_TAGS.has(name)) return sanitizeMarketingPlainText(full);
    if (closing) return `</${name}>`;
    if (name === "br") return "<br/>";
    if (name === "a") {
      const hrefMatch = rawAttrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4] ?? "";
      if (!href || isUnsafeMarketingHref(href)) return "";
      return `<a href="${sanitizeMarketingPlainText(href)}">`;
    }
    return `<${name}>`;
  });
}

export function assertMarketingHtmlIsSafe(html: string): void {
  if (containsForbiddenMarketingMarkup(html) && /<\s*script/i.test(decodeBasicEntities(html))) {
    throw Object.assign(new Error("Unsafe HTML rejected: executable script is not allowed"), {
      statusCode: 400,
      code: "UNSAFE_MARKETING_HTML",
    });
  }
  const sanitised = sanitizeMarketingRichText(html);
  if (/<\s*script\b/i.test(sanitised)) {
    throw Object.assign(new Error("Unsafe HTML rejected after sanitisation"), {
      statusCode: 400,
      code: "UNSAFE_MARKETING_HTML",
    });
  }
}
