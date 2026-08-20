/**
 * Auth segment: never long-cache HTML at CDN.
 * Static prerender + s-maxage=31536000 caused Hostinger CDN to serve stale
 * document HTML that referenced /_next/static chunk hashes from prior deploys
 * (404 → blank React shell). Documents must revalidate; hashed assets stay immutable.
 */
export const dynamic = "force-dynamic";

export default function AuthSegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
