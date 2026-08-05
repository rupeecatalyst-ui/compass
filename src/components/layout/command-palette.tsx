"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileText, Building2, FolderOpen, Search, User } from "lucide-react";
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
import {
  businessOperationsCommandPaletteRoutes,
  systemAdministrationCommandPaletteRoutes,
  organizationCommandPaletteRoutes,
  adminConsoleCommandPaletteRoutes,
  recentPages,
} from "@/config/navigation";
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
  const [packageResults, setPackageResults] = useState<
    Array<{ id: string; title: string; subtitle: string; href: string }>
  >([]);

  const showOrganizationRoutes = user?.role && hasAnyRole(user.role, [ROLES.SUPER_ADMIN]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setPackageResults([]);
      return;
    }

    let cancelled = false;
    void import("@/lib/loan-files-utils").then(({ searchGlobal }) => {
      if (!cancelled) {
        setSearchResults(searchGlobal(q));
      }
    });
    // CO-DOC-005 — Document Package Registry (name / file / opportunity / uploader)
    void Promise.all([
      import("@/lib/document-package"),
      import("@/constants/lead-opportunity-journey"),
      import("@/constants/routes"),
    ]).then(([{ searchDocumentPackages }, { buildJourneyHref }, { ROUTES }]) =>
      searchDocumentPackages(q).then((items) => {
        if (cancelled) return;
        setPackageResults(
          items.map((pkg) => ({
            id: pkg.id,
            title: pkg.folderName,
            subtitle:
              pkg.matchHint ||
              `Document Package · ${pkg.uploadedBy}${
                pkg.opportunityId ? ` · ${pkg.opportunityId}` : ""
              }`,
            href: buildJourneyHref(ROUTES.DOCUMENT_CENTER, {
              opportunityId: pkg.opportunityId,
            }),
          })),
        );
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [query]);

  const navigate = (href: string) => {
    onOpenChange(false);
    setQuery("");
    setSearchResults([]);
    setPackageResults([]);
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
                ) : result.type === "lender" ? (
                  <Building2 className="mr-2 h-4 w-4" />
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

        {query.trim() && packageResults.length > 0 && (
          <CommandGroup heading="Document Packages">
            {packageResults.map((result) => (
              <CommandItem key={`doc-pkg-${result.id}`} onSelect={() => navigate(result.href)}>
                <FolderOpen className="mr-2 h-4 w-4" />
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
            <CommandGroup heading="Business Operations">
              {businessOperationsCommandPaletteRoutes.map((item) => (
                <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="System Administration">
              {systemAdministrationCommandPaletteRoutes.map((item) => (
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
            {showOrganizationRoutes && (
              <CommandGroup heading="Enterprise Administration">
                {adminConsoleCommandPaletteRoutes.map((item) => (
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
