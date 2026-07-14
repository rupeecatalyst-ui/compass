/**
 * CHANAKYA communication contract — short, professional, business-oriented.
 */

export const CEI_COMMUNICATION_CONTRACT = [
  "Short",
  "Professional",
  "Business-oriented",
  "Personalized",
] as const;

export const CEI_COMMUNICATION_NEVER = [
  "Technical jargon",
  "Robotic phrasing",
  "Command-style instructions",
  "Support-ticket tone",
] as const;

/** Patterns that should not appear in user-facing CHANAKYA copy. */
export const CEI_TECHNICAL_COPY_PATTERNS = [
  /\bAPI\b/i,
  /\bJSON\b/i,
  /\bHTTP\b/i,
  /\bendpoint\b/i,
  /\bdatabase\b/i,
  /\bschema\b/i,
  /\bstack trace\b/i,
  /\bnull\b/i,
  /\bundefined\b/i,
] as const;
