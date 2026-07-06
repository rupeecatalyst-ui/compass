"use client";

import { CUSTOMER_LIST_COLUMNS } from "@/constants/customer-360";
import { useCustomersContext } from "@/components/catalyst-one/customers/customers-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DEFAULT_CUSTOMER_COLUMNS } from "@/constants/customer-360";
import type { CustomerListColumnKey } from "@/types/catalyst-one";

export function CustomerColumnSettings() {
  const {
    columnSettingsOpen,
    setColumnSettingsOpen,
    visibleColumns,
    setVisibleColumns,
  } = useCustomersContext();

  const toggle = (key: CustomerListColumnKey) => {
    if (visibleColumns.includes(key)) {
      if (visibleColumns.length <= 3) return;
      setVisibleColumns(visibleColumns.filter((c) => c !== key));
    } else {
      setVisibleColumns([...visibleColumns, key]);
    }
  };

  return (
    <Dialog open={columnSettingsOpen} onOpenChange={setColumnSettingsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Column Layout</DialogTitle>
          <DialogDescription>Show or hide columns in list view.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {CUSTOMER_LIST_COLUMNS.map((col) => (
            <div key={col.key} className="flex items-center gap-2">
              <Checkbox
                id={`col-${col.key}`}
                checked={visibleColumns.includes(col.key)}
                onCheckedChange={() => toggle(col.key)}
              />
              <Label htmlFor={`col-${col.key}`} className="text-sm font-normal cursor-pointer">
                {col.label}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleColumns(DEFAULT_CUSTOMER_COLUMNS)}
          >
            Reset to default
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
