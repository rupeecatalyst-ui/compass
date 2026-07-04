import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Phone, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SITE, PRODUCTS } from "@/lib/site";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/loans", label: "Loans" },
  { to: "/mutual-funds", label: "Mutual Funds" },
  { to: "/calculators", label: "Calculators" },
  { to: "/blogs", label: "Blogs" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* top utility bar */}
      <div className="hidden bg-navy text-navy-foreground/90 text-xs md:block">
        <div className="container mx-auto flex h-9 items-center justify-between px-4">
          <span>{SITE.tagline}</span>
          <a href={`tel:${SITE.phone}`} className="inline-flex items-center gap-1.5 hover:text-cta">
            <Phone className="size-3.5" /> {SITE.phone}
          </a>
        </div>
      </div>
      <div className="border-b border-border/70 bg-card/90 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 md:h-20">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={SITE.logoUrl} alt={SITE.name} className="h-10 w-auto md:h-12" />
            <span className="hidden sm:flex flex-col leading-tight">
              <span className="font-display text-lg font-extrabold text-navy">Rupee Catalyst</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Loans · Investments</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname === n.to || (n.to !== "/" && pathname.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active ? "text-royal" : "text-foreground/80 hover:text-royal",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            
            <Button asChild variant="cta" size="default" className="hidden sm:inline-flex">
              <Link to="/apply">Apply Now</Link>
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                  {open ? <X /> : <Menu />}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[88vw] max-w-[360px] p-0 flex flex-col">
                <div className="flex items-center gap-2.5 border-b bg-gradient-to-br from-navy to-royal p-5 text-navy-foreground">
                  <img src={SITE.logoUrl} alt="" aria-hidden="true" className="h-10 w-auto rounded bg-white/10 p-1" />
                  <div className="flex flex-col leading-tight">
                    <span className="font-display text-base font-extrabold">Rupee Catalyst</span>
                    <span className="text-[10px] uppercase tracking-wider text-navy-foreground/70">{SITE.tagline}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <nav className="flex flex-col gap-1" aria-label="Primary">
                    {NAV.map((n) => {
                      const active = pathname === n.to || (n.to !== "/" && pathname.startsWith(n.to));
                      return (
                        <Link
                          key={n.to}
                          to={n.to}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-[52px] items-center rounded-xl px-4 text-base font-semibold transition-all",
                            active
                              ? "bg-gradient-to-r from-royal/15 to-emerald/10 text-royal shadow-sm"
                              : "text-navy/80 hover:bg-secondary active:bg-secondary",
                          )}
                        >
                          {n.label}
                        </Link>
                      );
                    })}
                  </nav>
                  <div className="my-4 h-px bg-border" />
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Loan Products
                  </p>
                  <div className="mt-2 flex flex-col gap-1">
                    {PRODUCTS.filter((p) => p.slug !== "mutual-funds").map((p) => (
                      <Link
                        key={p.slug}
                        to="/loans/$slug"
                        params={{ slug: p.slug }}
                        onClick={() => setOpen(false)}
                        className="min-h-11 rounded-lg px-3 py-2.5 text-sm text-foreground/80 hover:bg-secondary active:bg-secondary"
                      >
                        {p.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="border-t bg-surface p-4">
                  <Button asChild variant="cta" size="lg" className="w-full" onClick={() => setOpen(false)}>
                    <Link to="/apply">Apply Now</Link>
                  </Button>
                  <a
                    href={`tel:${SITE.phone.replace(/\s/g, "")}`}
                    className="mt-2 flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-royal"
                  >
                    <Phone className="size-4" /> {SITE.phone}
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
