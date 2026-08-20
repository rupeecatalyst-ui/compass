import { DashboardLayout } from "@/layouts/dashboard-layout";

/**
 * Application shell HTML must not be long-cached at CDN.
 * Document Cache-Control is set in next.config.ts headers(); hashed /_next/static
 * assets remain immutable. force-dynamic avoids year-long prerender HTML at edges.
 */
export const dynamic = "force-dynamic";

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
