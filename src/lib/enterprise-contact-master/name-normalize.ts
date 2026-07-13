/**
 * Normalize person names to Title Case for Contact SSOT persistence.
 * Handles ALL CAPS, all lowercase, and mixed case input.
 */
export function normalizePersonName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((part) => {
      if (!part) return part;
      // Preserve initials like "R." or single letters
      if (part.length === 1) return part.toUpperCase();
      if (/^[A-Za-z]\.$/.test(part)) return part.toUpperCase();
      // Hyphenated / apostrophe names: Mary-Jane, O'Brien
      return part
        .split(/([-'])/)
        .map((segment) => {
          if (segment === "-" || segment === "'") return segment;
          if (!segment) return segment;
          return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
        })
        .join("");
    })
    .join(" ");
}
