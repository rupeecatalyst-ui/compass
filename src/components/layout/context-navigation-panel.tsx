"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  Search,
} from "lucide-react";
import {
  getContextDomainByKey,
  isNavHrefActive,
} from "@/config/navigation";
import { ANIMATION } from "@/constants/animations";
import { useSidebarContext } from "@/components/providers/sidebar-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  clearActiveOpportunityContext,
  isTransactionContextRoute,
} from "@/lib/lead-opportunity-journey/active-context";

function useLocationHash() {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return hash;
}

function onContextNavClick(href: string) {
  if (!href || href === "#") return;
  if (isTransactionContextRoute(href.split("?")[0]?.split("#")[0] ?? href)) {
    clearActiveOpportunityContext();
  }
}

/**
 * Column 2 — Context Navigation Panel
 * Shows children of the selected primary domain. Never expands the primary sidebar.
 */
export function ContextNavigationPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const hash = useLocationHash();
  const {
    activeContextKey,
    contextPanelCollapsed,
    toggleContextPanel,
    contextPanelPinned,
    toggleContextPanelPin,
    contextPanelVisible,
    hydrated,
  } = useSidebarContext();

  const [query, setQuery] = useState("");
  const [focusIndex, setFocusIndex] = useState(0);

  const domain = activeContextKey ? getContextDomainByKey(activeContextKey) : undefined;
  const children = domain?.children ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return children;
    return children.filter((c) => c.title.toLowerCase().includes(q));
  }, [children, query]);

  useEffect(() => {
    setQuery("");
    setFocusIndex(0);
  }, [activeContextKey]);

  if (!hydrated || !contextPanelVisible || !domain) return null;

  const Icon = domain.icon;

  const goToFocused = () => {
    const item = filtered[focusIndex];
    if (!item) return;
    onContextNavClick(item.href);
    router.push(item.href);
  };

  return (
    <motion.aside
      initial={false}
      animate={{
        width: contextPanelCollapsed
          ? ANIMATION.contextPanel.collapsed.width
          : ANIMATION.contextPanel.expanded.width,
      }}
      transition={ANIMATION.contextPanel.transition}
      className="hidden md:flex h-screen flex-col border-r border-border/80 bg-muted/20 shrink-0 overflow-hidden"
      aria-label={`${domain.title} context navigation`}
    >
      <div className="flex h-16 items-center gap-1 border-b border-border/70 px-2">
        {!contextPanelCollapsed ? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">{domain.title}</p>
                <p className="truncate text-[10px] text-muted-foreground">Context</p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={toggleContextPanelPin}
                  aria-pressed={contextPanelPinned}
                  aria-label={contextPanelPinned ? "Unpin context panel" : "Pin context panel"}
                >
                  {contextPanelPinned ? (
                    <Pin className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <PinOff className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {contextPanelPinned ? "Unpin panel" : "Pin panel"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={toggleContextPanel}
                  aria-label="Collapse context panel"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Collapse</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mx-auto h-8 w-8"
                onClick={toggleContextPanel}
                aria-label={`Expand ${domain.title} context`}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{domain.title}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!contextPanelCollapsed ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {children.length > 6 ? (
              <div className="relative border-b border-border/50 p-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 pl-8 text-xs"
                  placeholder="Filter modules…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setFocusIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setFocusIndex((i) => Math.min(filtered.length - 1, i + 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setFocusIndex((i) => Math.max(0, i - 1));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      goToFocused();
                    }
                  }}
                  aria-label="Filter context modules"
                />
              </div>
            ) : null}

            <ScrollArea className="flex-1 px-2 py-2">
              {filtered.length === 0 ? (
                <p className="px-2 py-4 text-[11px] leading-snug text-muted-foreground">
                  {children.length === 0
                    ? "Modules coming soon."
                    : "No modules match your filter."}
                </p>
              ) : (
                <nav className="space-y-0.5" role="navigation">
                  {filtered.map((child, index) => {
                    const active = isNavHrefActive(pathname, child.href, hash);
                    return (
                      <div key={`${child.href}-${child.title}`}>
                        {child.separatorBefore ? (
                          <div
                            className="my-2 border-t border-border/60"
                            role="separator"
                          />
                        ) : null}
                        <Link
                          href={child.href}
                          onClick={() => onContextNavClick(child.href)}
                          onFocus={() => setFocusIndex(index)}
                          className={cn(
                            "block rounded-md px-2.5 py-2 text-[12px] font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/20"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            focusIndex === index && !active && "bg-muted/70",
                          )}
                          aria-current={active ? "page" : undefined}
                        >
                          {child.title}
                        </Link>
                      </div>
                    );
                  })}
                </nav>
              )}
            </ScrollArea>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-1 flex-col items-center gap-2 py-3"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  onClick={toggleContextPanel}
                  aria-label={domain.title}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{domain.title}</TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
