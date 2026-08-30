import Link from "next/link";
import { CompassLogo } from "@/components/branding/compass-logo";
import { PublicContactActions } from "@/components/contact/public-contact-actions";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <CompassLogo showTagline />
      <h1 className="mt-10 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        That page is not available. Return home, or reach {siteConfig.company} using the contact
        details below.
      </p>
      <Button className="mt-8" asChild>
        <Link href={ROUTES.HOME}>Back to COMPASS</Link>
      </Button>
      <div className="mt-10">
        <PublicContactActions className="justify-center" />
      </div>
      <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {siteConfig.officeAddress}
      </p>
    </div>
  );
}
