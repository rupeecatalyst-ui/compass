/**
 * CO-AI-G2-W1 — Shadow Mode feature flags.
 * Default: DISABLED. Customer experience unchanged unless explicitly enabled.
 */

export const EAO_SHADOW_MODE_ENABLED_ENV = "EAO_SHADOW_MODE_ENABLED" as const;
export const EAO_SHADOW_MODE_VERSION = "1.0.0-g2-w1" as const;

function envTruthy(name: string): boolean {
  if (typeof process === "undefined") return false;
  const v = process.env[name];
  if (v == null || v === "") return false;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

/**
 * Shadow Mode master switch.
 * **Default false** — unset / empty / "false" ⇒ shadow never runs.
 */
export function isEaoShadowModeEnabled(): boolean {
  return envTruthy(EAO_SHADOW_MODE_ENABLED_ENV);
}
