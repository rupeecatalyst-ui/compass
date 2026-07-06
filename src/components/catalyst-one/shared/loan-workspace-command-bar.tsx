"use client";

import { EntityButtonLink } from "@/components/catalyst-one/shared/entity-link";
import {
  CatalystCommandBar,
  CommandBarActionGroup,
  CommandBarActions,
  CommandBarActionsExtension,
  CommandBarEyebrow,
  CommandBarHeader,
  CommandBarHeaderRow,
  CommandBarIdentity,
  CommandBarMetaField,
  CommandBarMetaGrid,
} from "@/components/catalyst-one/shared/catalyst-command-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LOAN_FILE_PRIORITY_STYLES } from "@/constants/loan-status";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";

export interface LoanWorkspaceCommandBarProps {
  draft: LoanFile;
  saving: boolean;
  onSave: () => void;
  onSaveAndExit: () => void;
  onOpenContact?: (contactId: string) => void;
  commandBarRef?: React.Ref<HTMLDivElement>;
}

/** CRC-10.2C / UX-01C — Loan Workspace command bar (identity + save actions). */
export function LoanWorkspaceCommandBar({
  draft,
  saving,
  onSave,
  onSaveAndExit,
  onOpenContact,
  commandBarRef,
}: LoanWorkspaceCommandBarProps) {
  return (
    <CatalystCommandBar ref={commandBarRef} aria-label="Loan workspace command bar">
      <CommandBarHeader>
        <CommandBarHeaderRow>
          <CommandBarIdentity>
            <CommandBarEyebrow>Loan Workspace</CommandBarEyebrow>
            <CommandBarMetaGrid>
              <CommandBarMetaField
                label="Borrower Name"
                prominent
                value={
                  onOpenContact ? (
                    <EntityButtonLink
                      label={draft.customerName}
                      className="text-base font-semibold sm:text-lg"
                      onClick={() => onOpenContact(draft.customerId)}
                    />
                  ) : (
                    draft.customerName
                  )
                }
              />
              <CommandBarMetaField label="Loan Number" value={draft.fileNumber} mono />
              <CommandBarMetaField label="Product" value={draft.loanProduct} />
              <CommandBarMetaField label="Lender" value={draft.lender} />
            </CommandBarMetaGrid>
          </CommandBarIdentity>

          <CommandBarActions>
            <CommandBarActionGroup>
              <Badge
                variant="outline"
                className={cn("capitalize border h-7", LOAN_FILE_PRIORITY_STYLES[draft.priority].className)}
              >
                {draft.priority}
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 min-w-[5.5rem] text-xs"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                className="h-8 min-w-[6.5rem] text-xs bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                onClick={onSaveAndExit}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save & Exit"}
              </Button>
            </CommandBarActionGroup>
            <CommandBarActionsExtension />
          </CommandBarActions>
        </CommandBarHeaderRow>
      </CommandBarHeader>
    </CatalystCommandBar>
  );
}
