import Link from "next/link";
import { CompassLogo } from "@/components/branding/compass-logo";
import { SectionContainer } from "@/components/marketing/section-container";
import { footerNavigation } from "@/config/navigation";
import { publicWhatsAppHref, siteConfig } from "@/config/site";
import {
  PUBLIC_WHATSAPP_LINK_REL,
  PUBLIC_WHATSAPP_LINK_TARGET,
} from "@/lib/public-whatsapp";

const footerLinkClass =
  "text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-surface/80">
      <SectionContainer className="pb-8 pt-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <CompassLogo showTagline />
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {siteConfig.tagline}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/80">{siteConfig.campaignTagline}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {siteConfig.legalOperatorStatement}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {siteConfig.officeAddress}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Products</h3>
            <ul className="mt-4 space-y-2.5">
              {footerNavigation.products.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Company</h3>
            <ul className="mt-4 space-y-2.5">
              {footerNavigation.company.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Get in touch</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href={siteConfig.telHref} className={footerLinkClass}>
                  Call · {siteConfig.contactPhone}
                </a>
              </li>
              <li>
                <a
                  href={publicWhatsAppHref}
                  target={PUBLIC_WHATSAPP_LINK_TARGET}
                  rel={PUBLIC_WHATSAPP_LINK_REL}
                  className={footerLinkClass}
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a href={siteConfig.mailtoHref} className={`${footerLinkClass} break-all`}>
                  Email · {siteConfig.contactEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border/50 pt-8 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p>
              © {year} {siteConfig.company}. All rights reserved.
            </p>
            <p className="max-w-xl text-xs leading-relaxed sm:text-sm">
              {siteConfig.notALenderDisclosure}
            </p>
          </div>
          <p>
            <span className="font-medium text-foreground">{siteConfig.name}</span>
            <span className="mx-2 opacity-40">·</span>
            A product of <span className="font-medium text-primary">{siteConfig.company}</span>
          </p>
        </div>
      </SectionContainer>
    </footer>
  );
}
