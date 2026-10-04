/**
 * Marketing Sheets runtime — requested vs allowed fixture.
 * Fixture is local/test BAT only. Production and non-loopback hosts fail closed.
 */

export type EnterpriseMarketingSheetsMode = "off" | "fixture" | "live";

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

function hostHints(): string {
  return [
    env("HOSTNAME"),
    env("HOST"),
    env("VERCEL_URL"),
    env("RAILWAY_PUBLIC_DOMAIN"),
    env("NEXT_PUBLIC_APP_URL"),
    env("NEXTAUTH_URL"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function isLoopbackMarketingHost(): boolean {
  if (env("VERCEL_ENV").toLowerCase() === "production") return false;
  const hints = hostHints();
  if (
    /rupeecatalyst\.com|vercel\.app|\.hostingersite\.|onrender\.com|railway\.app/.test(hints)
  ) {
    return false;
  }
  if (/(^|[\s/:])(localhost|127\.0\.0\.1|::1)($|[\s/:])/i.test(hints)) return true;
  return env("NODE_ENV").toLowerCase() !== "production";
}

export function isMarketingProductionLikeRuntime(): boolean {
  if (env("NODE_ENV").toLowerCase() === "production") return true;
  if (env("VERCEL_ENV").toLowerCase() === "production") return true;
  return !isLoopbackMarketingHost();
}

export function requestedMarketingSheetsMode(): EnterpriseMarketingSheetsMode {
  const raw = env("ENTERPRISE_MARKETING_SHEETS_MODE").toLowerCase();
  if (raw === "fixture" || raw === "live" || raw === "off") return raw;
  return isMarketingProductionLikeRuntime() ? "live" : "fixture";
}

export function isMarketingFixtureExplicitlyAllowed(): boolean {
  const raw = env("ENTERPRISE_MARKETING_ALLOW_FIXTURE").toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

/**
 * Fixture adapter is local/test BAT only.
 * NODE_ENV=production, non-loopback hosts, and ALLOW_FIXTURE in production all refuse fixture.
 */
export function isMarketingFixtureRuntimeAllowed(): boolean {
  if (env("NODE_ENV").toLowerCase() === "production") return false;
  if (isMarketingProductionLikeRuntime()) return false;
  if (!isLoopbackMarketingHost()) return false;
  if (requestedMarketingSheetsMode() !== "fixture") return false;
  if (isMarketingFixtureExplicitlyAllowed()) return true;
  return env("ENTERPRISE_PERSISTENCE_MODE").toLowerCase() !== "prisma";
}

export function operationalMarketingSheetsMode(input: {
  status: "OFF" | "FIXTURE" | "LIVE" | "NOT_CONFIGURED";
}): EnterpriseMarketingSheetsMode {
  if (input.status === "FIXTURE") return "fixture";
  if (input.status === "LIVE") return "live";
  return "off";
}

export function isMarketingSheetsReadEnabled(): boolean {
  if (isMarketingFixtureRuntimeAllowed()) return true;
  return requestedMarketingSheetsMode() === "live";
}
