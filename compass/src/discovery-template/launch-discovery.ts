/** Master template — launch COMPASS Discovery as a dedicated experience layer. */

export const COMPASS_LAUNCH_DISCOVERY_EVENT = "compass:launch-discovery";

export const DISCOVERY_LAUNCH_QUERY = "discovery=launch";

export function dispatchLaunchDiscovery(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMPASS_LAUNCH_DISCOVERY_EVENT));
}

export function discoveryLaunchUrl(pathname: string): string {
  return `${pathname}?${DISCOVERY_LAUNCH_QUERY}`;
}

export function shouldAutoLaunchDiscovery(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.replace("#", "");
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("discovery") === "launch" ||
    hash === "discovery" ||
    hash === "advantage-conversation"
  );
}

export function clearDiscoveryLaunchUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("discovery");
  url.hash = "";
  const next = url.search ? `${url.pathname}${url.search}` : url.pathname;
  window.history.replaceState(null, "", next);
}
