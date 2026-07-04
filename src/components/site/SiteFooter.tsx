import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone, Twitter, Youtube } from "lucide-react";
import { SITE, PRODUCTS } from "@/lib/site";

export function SiteFooter() {
  const waNumber = SITE.whatsapp.replace(/[^0-9]/g, "");
  return (
    <footer className="bg-navy text-navy-foreground">
      <div className="container mx-auto px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <img src={SITE.logoUrl} alt={SITE.name} className="h-12 w-auto bg-white rounded-md p-1" />
              <div>
                <div className="font-display text-lg font-bold">Rupee Catalyst</div>
                <div className="text-xs text-navy-foreground/70">{SITE.tagline}</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-navy-foreground/75 leading-relaxed max-w-md">
              Your trusted financial partner for Loans and Mutual Fund investments — with 100+
              lending partners, 40+ AMC tie-ups and a decade of advisory experience.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a href={SITE.social.linkedin} aria-label="LinkedIn" className="rounded-md bg-white/10 p-2 hover:bg-cta"><Linkedin className="size-4" /></a>
              <a href={SITE.social.facebook} aria-label="Facebook" className="rounded-md bg-white/10 p-2 hover:bg-cta"><Facebook className="size-4" /></a>
              <a href={SITE.social.instagram} aria-label="Instagram" className="rounded-md bg-white/10 p-2 hover:bg-cta"><Instagram className="size-4" /></a>
              <a href={SITE.social.twitter} aria-label="Twitter" className="rounded-md bg-white/10 p-2 hover:bg-cta"><Twitter className="size-4" /></a>
              <a href={SITE.social.youtube} aria-label="YouTube" className="rounded-md bg-white/10 p-2 hover:bg-cta"><Youtube className="size-4" /></a>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
              <iframe
                title="Rupee Catalyst Office, Malad West Mumbai"
                src="https://www.google.com/maps?q=Jaswanti+Allied+Business+Centre+Malad+West+Mumbai&output=embed"
                width="100%"
                height="180"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block w-full"
              />
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-navy-foreground/70">Products</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {PRODUCTS.filter((p) => p.slug !== "mutual-funds").map((p) => (
                <li key={p.slug}>
                  <Link to="/loans/$slug" params={{ slug: p.slug }} className="text-navy-foreground/80 hover:text-cta">
                    {p.name}
                  </Link>
                </li>
              ))}
              <li><Link to="/mutual-funds" className="text-navy-foreground/80 hover:text-cta">Mutual Funds</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-navy-foreground/70">Calculators</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/calculators" hash="emi" className="text-navy-foreground/80 hover:text-cta">EMI Calculator</Link></li>
              <li><Link to="/calculators" hash="balance-transfer" className="text-navy-foreground/80 hover:text-cta">Balance Transfer</Link></li>
              <li><Link to="/calculators" hash="sip" className="text-navy-foreground/80 hover:text-cta">SIP Calculator</Link></li>
              <li><Link to="/calculators" hash="lumpsum" className="text-navy-foreground/80 hover:text-cta">Lumpsum Calculator</Link></li>
              <li><Link to="/calculators" hash="retirement" className="text-navy-foreground/80 hover:text-cta">Retirement Planner</Link></li>
            </ul>
            <h4 className="mt-6 font-display text-sm font-semibold uppercase tracking-wider text-navy-foreground/70">Company</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/about" className="text-navy-foreground/80 hover:text-cta">About Us</Link></li>
              <li><Link to="/blogs" className="text-navy-foreground/80 hover:text-cta">Knowledge Centre</Link></li>
              <li><Link to="/contact" className="text-navy-foreground/80 hover:text-cta">Contact</Link></li>
              <li><Link to="/apply" className="text-navy-foreground/80 hover:text-cta">Apply Now</Link></li>
              <li><Link to="/privacy" className="text-navy-foreground/80 hover:text-cta">Privacy</Link></li>
              <li><Link to="/terms" className="text-navy-foreground/80 hover:text-cta">Terms</Link></li>
              <li><Link to="/disclaimer" className="text-navy-foreground/80 hover:text-cta">Disclaimer</Link></li>
            </ul>
          </div>


          {/* Contact */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-navy-foreground/70">Get in Touch</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 text-cta shrink-0" />
                <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="text-navy-foreground/85 hover:text-cta">{SITE.phone}</a>
              </li>
              <li className="flex items-start gap-2.5">
                <MessageCircle className="mt-0.5 size-4 text-cta shrink-0" />
                <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener" className="text-navy-foreground/85 hover:text-cta">
                  WhatsApp Chat
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 text-cta shrink-0" />
                <a href={`mailto:${SITE.email}`} className="text-navy-foreground/85 hover:text-cta break-all">{SITE.email}</a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 text-cta shrink-0" />
                <span className="text-navy-foreground/85">{SITE.address}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs text-navy-foreground/60 flex flex-col md:flex-row gap-3 md:items-center md:justify-between pb-20 md:pb-0">
          <p>© {new Date().getFullYear()} Rupee Catalyst. All rights reserved.</p>
          <p className="md:text-right max-w-2xl">
            Loans are subject to eligibility and lender policies. Mutual fund investments are subject
            to market risks; read all scheme-related documents carefully before investing.
          </p>
        </div>
      </div>
    </footer>
  );
}
