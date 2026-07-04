import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle, Phone, Zap } from "lucide-react";
import { SITE } from "@/lib/site";

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Hide on the apply page itself to avoid redundancy
  if (pathname === "/apply") return null;

  const wa = SITE.whatsapp.replace(/[^0-9]/g, "");
  const tel = SITE.phone.replace(/\s/g, "");

  return (
    <nav
      aria-label="Quick actions"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 overflow-hidden rounded-2xl border border-navy/10 bg-white/95 backdrop-blur-md shadow-[0_8px_32px_-8px_rgba(15,31,61,0.35)]">
        <a
          href={`tel:${tel}`}
          aria-label={`Call ${SITE.contactName}`}
          className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-navy transition-colors active:bg-royal/10"
        >
          <Phone className="size-5 text-royal" aria-hidden="true" />
          Call
        </a>
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener"
          aria-label="Chat on WhatsApp"
          className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 border-x border-navy/10 text-[11px] font-semibold text-navy transition-colors active:bg-emerald/10"
        >
          <MessageCircle className="size-5 text-emerald" aria-hidden="true" />
          WhatsApp
        </a>
        <Link
          to="/apply"
          aria-label="Apply for a loan"
          className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 bg-gradient-cta text-[11px] font-bold text-cta-foreground transition-transform active:scale-95"
        >
          <Zap className="size-5" aria-hidden="true" />
          Apply Now
        </Link>
      </div>
    </nav>
  );
}
