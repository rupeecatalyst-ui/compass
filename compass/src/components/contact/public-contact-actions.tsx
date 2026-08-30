import Link from "next/link";
import { publicWhatsAppHref, siteConfig } from "@/config/site";
import { ROUTES } from "@/constants/routes";
import {
  PUBLIC_WHATSAPP_LINK_REL,
  PUBLIC_WHATSAPP_LINK_TARGET,
} from "@/lib/public-whatsapp";
import { cn } from "@/lib/utils";

const actionClass =
  "text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm";

export function PublicContactActions({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <li>
        <a href={siteConfig.telHref} className={actionClass}>
          Call
        </a>
      </li>
      <li>
        <a
          href={publicWhatsAppHref}
          target={PUBLIC_WHATSAPP_LINK_TARGET}
          rel={PUBLIC_WHATSAPP_LINK_REL}
          className={actionClass}
        >
          WhatsApp
        </a>
      </li>
      <li>
        <a href={siteConfig.mailtoHref} className={actionClass}>
          Email
        </a>
      </li>
      <li>
        <Link href={ROUTES.CONTACT} className={actionClass}>
          Contact
        </Link>
      </li>
      <li>
        <Link href={ROUTES.PRIVACY} className={actionClass}>
          Privacy Policy
        </Link>
      </li>
      <li>
        <Link href={ROUTES.TERMS} className={actionClass}>
          Terms and Conditions
        </Link>
      </li>
      <li>
        <Link href={ROUTES.DISCLAIMER} className={actionClass}>
          Disclaimer
        </Link>
      </li>
    </ul>
  );
}
