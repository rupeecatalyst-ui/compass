/**
 * Server-side rich-text sanitise + plain-text fallback for Custom Email.
 */

const SCRIPT_RE = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const STYLE_RE = /<style[\s\S]*?>[\s\S]*?<\/style>/gi;
const EVENT_RE = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const DANGEROUS_TAGS = /<\/?(iframe|object|embed|link|meta|form|base)[^>]*>/gi;
const JAVASCRIPT_HREF = /href\s*=\s*(['"]?)\s*javascript:[^'"\s>]*/gi;

export function sanitizeDocumentWorkspaceHtml(html: string): string {
  return html
    .replace(SCRIPT_RE, "")
    .replace(STYLE_RE, "")
    .replace(DANGEROUS_TAGS, "")
    .replace(EVENT_RE, "")
    .replace(JAVASCRIPT_HREF, "href=$1#");
}

export function htmlToPlainTextFallback(html: string): string {
  return sanitizeDocumentWorkspaceHtml(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
