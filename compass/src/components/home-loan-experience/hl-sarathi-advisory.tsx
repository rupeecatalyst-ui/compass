"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Compass, MessageCircle } from "lucide-react";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { SectionReveal } from "@/components/homepage/shared/section-reveal";
import { Button } from "@/components/ui/button";
import { discoveryCopy } from "@/config/home-loan-discovery";
import { ROUTES } from "@/constants/routes";
import { sarathiSpeakDelayMs } from "@/lib/discovery-orchestration";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

function SarathiAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/15",
        size === "md" ? "h-12 w-12" : "h-10 w-10",
      )}
    >
      <Compass className={cn("text-primary", size === "md" ? "h-6 w-6" : "h-5 w-5")} aria-hidden />
    </div>
  );
}

function SarathiMessage({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  const reduceMotion = useReducedMotion();
  if (!visible) return null;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: smoothEase }}
      className="flex gap-3"
    >
      <SarathiAvatar size="sm" />
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-foreground/90 sm:px-5 sm:py-4 sm:text-base">
        {children}
      </div>
    </motion.div>
  );
}

export function HlSarathiAdvisory() {
  const reduceMotion = useReducedMotion();
  const { sarathiActivated, intelligence, openDiscovery } = useDiscovery();
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [speakingStarted, setSpeakingStarted] = useState(false);

  const sarathiMeta = discoveryCopy.sarathiBridge;
  const allMessages = useMemo(() => intelligence?.sarathi.messages ?? [], [intelligence]);

  useEffect(() => {
    if (!sarathiActivated) {
      setSpeakingStarted(false);
      setVisibleMessages(0);
      return;
    }

    const t = window.setTimeout(() => setSpeakingStarted(true), reduceMotion ? 0 : 800);
    return () => clearTimeout(t);
  }, [sarathiActivated, reduceMotion]);

  useEffect(() => {
    if (!speakingStarted || visibleMessages >= allMessages.length) return;

    const prev = allMessages[visibleMessages - 1];
    const delay = prev ? sarathiSpeakDelayMs(prev) : 500;
    const t = window.setTimeout(() => setVisibleMessages((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [speakingStarted, visibleMessages, allMessages]);

  return (
    <SectionReveal>
      <section id="advantage-conversation" className="scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          {!sarathiActivated ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center sm:p-10">
              <MessageCircle className="mx-auto h-10 w-10 text-primary/70" />
              <p className="mt-4 text-lg font-medium text-foreground">Your advisor awaits.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Review your matches first — Sarathi joins when you&apos;re ready.
              </p>
              <Button size="lg" className="mt-8 h-12" onClick={openDiscovery}>
                Begin
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: smoothEase }}
                className="text-center sm:text-left"
              >
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <SarathiAvatar />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{sarathiMeta.name}</p>
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{sarathiMeta.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{sarathiMeta.tagline}</p>
                    <p className="text-sm text-muted-foreground">{sarathiMeta.taglineSub}</p>
                  </div>
                </div>
              </motion.div>

              {speakingStarted ? (
                <div className="space-y-5 pt-2">
                  {allMessages.map((line, i) => (
                    <SarathiMessage key={line} visible={i < visibleMessages}>
                      {line}
                    </SarathiMessage>
                  ))}
                </div>
              ) : null}

              {visibleMessages >= allMessages.length && allMessages.length > 0 ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: smoothEase }}
                  className="space-y-6 pt-4"
                >
                  <div className="rounded-2xl border border-primary/25 bg-primary/[0.07] p-6 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      Personalised guidance
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                      You understand your options. You know your COMPASS Advantage. When you&apos;re ready, we&apos;ll
                      guide every next step — calmly, and without repetition.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button size="lg" className="h-12" asChild>
                      <Link href={ROUTES.CONTACT}>
                        Begin Application
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="h-12 bg-transparent" onClick={openDiscovery}>
                      Review Advantage
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </SectionReveal>
  );
}
