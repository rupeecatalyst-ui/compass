"use client";

import {
  LOAN_BOARD_FIELD_LABELS,
  type LoanBoardDensity,
  type LoanBoardFieldKey,
} from "@/constants/loan-board";
import { useLoanBoardContext } from "@/components/catalyst-one/loan-board/loan-board-context";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ALL_FIELDS = Object.keys(LOAN_BOARD_FIELD_LABELS) as LoanBoardFieldKey[];

export function LoanBoardSettingsDialog() {
  const { settingsOpen, setSettingsOpen, density, setDensity, visibleFields, setVisibleFields } =
    useLoanBoardContext();

  const toggleField = (field: LoanBoardFieldKey) => {
    if (visibleFields.includes(field)) {
      if (visibleFields.length <= 3) return;
      setVisibleFields(visibleFields.filter((f) => f !== field));
    } else {
      setVisibleFields([...visibleFields, field]);
    }
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle>Board Settings</DialogTitle>
          <DialogDescription>Customize card density and visible fields</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Card Density</Label>
            <Tabs value={density} onValueChange={(v) => setDensity(v as LoanBoardDensity)}>
              <TabsList className="w-full bg-muted border border-border">
                <TabsTrigger value="compact" className="flex-1 text-xs">Compact</TabsTrigger>
                <TabsTrigger value="medium" className="flex-1 text-xs">Medium</TabsTrigger>
                <TabsTrigger value="large" className="flex-1 text-xs">Large</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Visible Card Fields</Label>
            <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto scrollbar-thin">
              {ALL_FIELDS.map((field) => (
                <label
                  key={field}
                  className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs text-foreground cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={visibleFields.includes(field)}
                    onCheckedChange={() => toggleField(field)}
                  />
                  {LOAN_BOARD_FIELD_LABELS[field]}
                </label>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
