"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileText, Search, User } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { commandPaletteRoutes, organizationCommandPaletteRoutes, recentPages } from "@/config/navigation";
import { useAuthContext } from "@/components/providers/auth-provider";
import { hasAnyRole } from "@/lib/permissions";
import { ROLES } from "@/constants/roles";
import type { GlobalSearchResult } from "@/lib/loan-files-utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { user } = useAuthContext();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);

  const showOrganizationRoutes = user?.role && hasAnyRole(user.role, [ROLES.SUPER_ADMIN]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    void import("@/lib/loan-files-utils").then(({ searchGlobal }) => {
      if (!cancelled) {
        setSearchResults(searchGlobal(q));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const navigate = (href: string) => {
    onOpenChange(false);
    setQuery("");
    setSearchResults([]);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder="Search customers, loan IDs, mobile, RM, lender..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {query.trim() && searchResults.length > 0 && (
          <CommandGroup heading="Search Results">
            {searchResults.map((result) => (
              <CommandItem key={`${result.type}-${result.id}`} onSelect={() => navigate(result.href)}>
                {result.type === "loan" ? (
                  <FileText className="mr-2 h-4 w-4" />
                ) : (
                  <User className="mr-2 h-4 w-4" />
                )}
                <div className="flex flex-col">
                  <span>{result.title}</span>
                  <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                </div>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!query.trim() && (
          <>
            <CommandGroup heading="Catalyst One">
              {commandPaletteRoutes.map((item) => (
                <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            {showOrganizationRoutes && (
              <CommandGroup heading="Organization">
                {organizationCommandPaletteRoutes.map((item) => (
                  <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                    <CommandShortcut>↵</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup heading="Recent">
              {recentPages.map((page) => (
                <CommandItem key={page.href} onSelect={() => navigate(page.href)}>
                  <Clock className="mr-2 h-4 w-4" />
                  {page.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {query.trim() && searchResults.length === 0 && (
          <CommandGroup heading="Tip">
            <CommandItem disabled>
              <Search className="mr-2 h-4 w-4" />
              Try customer name, RC-2026-xxxx, mobile, or lender
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
