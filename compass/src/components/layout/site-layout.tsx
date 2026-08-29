import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipToContent } from "@/components/a11y/skip-to-content";
import { PwaShell } from "@/components/pwa/pwa-shell";
import { ProductJourneyShell } from "@/components/product-journey/product-journey-shell";

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProductJourneyShell>
      <div className="flex min-h-screen flex-col bg-background">
        <PwaShell />
        <SkipToContent />
        <SiteHeader />
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </div>
    </ProductJourneyShell>
  );
}
