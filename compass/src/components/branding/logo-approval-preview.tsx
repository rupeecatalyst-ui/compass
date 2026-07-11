"use client";

import Image from "next/image";
import logoDark from "@/assets/brand/rupee-catalyst-logo-dark.png";
import logoDark2x from "@/assets/brand/rupee-catalyst-logo-dark@2x.png";
import logoDarkMark from "@/assets/brand/rupee-catalyst-logo-dark-mark.png";
import logoSource from "@/assets/brand/rupee-catalyst-logo-official-preview.png";
import { cn } from "@/lib/utils";

const SURFACES = [
  { id: "compass-hero", label: "COMPASS hero", className: "bg-[#05070c]" },
  { id: "glass-panel", label: "Glass panel", className: "bg-[#0a0f17] ring-1 ring-white/10" },
  { id: "header-bar", label: "Header bar", className: "bg-[#05070c]/95 backdrop-blur-xl ring-1 ring-white/5" },
] as const;

function LogoPanel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6", className)}>
      <div className="mb-4 space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

/** Internal approval surface — not wired into global branding until sign-off. */
export function LogoApprovalPreview() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#05070c] pb-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(45,212,191,0.08),transparent_55%)]" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Brand asset review</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Rupee Catalyst — dark theme logo
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Proposed master brand asset for COMPASS. Transparent background, original colours preserved,
            contrast lifted for premium dark UI. This page is for approval only — the live header and footer
            are unchanged.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <LogoPanel
            title="Official source (extracted)"
            subtitle="Official attachment · white background removed · no redesign"
          >
            <div className="flex min-h-[120px] items-center justify-center rounded-xl bg-[#05070c] p-8 ring-1 ring-white/5">
              <Image
                src={logoSource}
                alt="Official Rupee Catalyst logo source"
                width={448}
                height={313}
                className="h-auto w-[min(100%,14rem)]"
                priority
              />
            </div>
          </LogoPanel>

          <LogoPanel
            title="Proposed dark-theme version"
            subtitle="Contrast optimised for #05070c surfaces · PNG @1x/@2x/@3x + SVG"
          >
            <div className="flex min-h-[120px] items-center justify-center rounded-xl bg-[#05070c] p-8 ring-1 ring-white/5">
              <Image
                src={logoDark2x}
                alt="Proposed Rupee Catalyst dark theme logo"
                width={896}
                height={572}
                className="h-auto w-[min(100%,14rem)]"
                priority
              />
            </div>
          </LogoPanel>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {SURFACES.map((surface) => (
            <LogoPanel key={surface.id} title={surface.label} subtitle="Proposed asset at header scale">
              <div className={cn("flex min-h-[88px] items-center rounded-xl px-5 py-4", surface.className)}>
                <Image
                  src={logoDark}
                  alt=""
                  width={448}
                  height={287}
                  className="h-8 w-auto sm:h-9"
                />
              </div>
            </LogoPanel>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <LogoPanel
            title="Header mockup (not live)"
            subtitle="Rupee Catalyst parent · COMPASS child — proposed hierarchy"
          >
            <div className="flex items-center justify-between rounded-xl bg-[#05070c]/95 px-5 py-4 ring-1 ring-white/5 backdrop-blur-xl">
              <div className="flex min-w-0 items-center gap-3">
                <Image src={logoDarkMark} alt="" width={88} height={88} className="h-9 w-9 rounded-lg" />
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Rupee Catalyst
                  </p>
                  <p className="truncate text-base font-semibold tracking-tight text-foreground">COMPASS</p>
                </div>
              </div>
              <span className="hidden rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary sm:inline">
                Get Started
              </span>
            </div>
          </LogoPanel>

          <LogoPanel title="Retina scale test" subtitle="@3x export — 1344 × 861">
            <div className="space-y-4">
              <div className="flex items-center gap-6 rounded-xl bg-[#05070c] p-6 ring-1 ring-white/5">
                <Image src={logoDark} alt="" width={224} height={142} className="h-6 w-auto opacity-90" />
                <Image src={logoDark2x} alt="" width={448} height={284} className="h-10 w-auto" />
              </div>
              <p className="text-xs text-muted-foreground">
                Left: @1x header height · Right: @2x at same CSS size (sharper on Retina)
              </p>
            </div>
          </LogoPanel>
        </div>

        <div className="mt-10 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-amber-100">Approval checklist</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>White background fully removed (transparent PNG + SVG)</li>
            <li>Original magenta → purple and cyan brand gradients preserved</li>
            <li>Typography unchanged — no redraw or redesign</li>
            <li>Subtle contrast lift for dark UI readability only</li>
            <li>Assets ready: @1x, @2x, @3x PNG and SVG (2x embedded raster for fidelity)</li>
          </ul>
          <p className="mt-4 text-sm text-foreground/90">
            Reply with approval to wire this asset into header, footer, homepage hierarchy, and favicon
            touchpoints across COMPASS.
          </p>
        </div>
      </div>
    </div>
  );
}
