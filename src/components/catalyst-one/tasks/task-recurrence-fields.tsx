"use client";

/**
 * CO-ETE-RECURRING-001 — Recurrence fields for Quick Task create.
 * Rules validated by Enterprise Recurrence Engine (ETE).
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ETE_DAILY_INTERVAL_OPTIONS,
  ETE_RECURRENCE_FREQUENCIES,
  ETE_REMINDER_OFFSETS,
  ETE_SCHEDULE_KINDS,
  ETE_WEEKDAY_ORDINALS,
  ETE_WEEKDAYS,
  ETE_WEEKLY_INTERVAL_OPTIONS,
} from "@/constants/enterprise-task-engine";
import type {
  EteRecurrenceFrequency,
  EteRecurrenceEnd,
  EteReminderOffset,
  EteScheduleKind,
  EteTaskRecurrence,
  EteWeekdayCode,
  EteWeekdayOrdinal,
  EteMonthlyMode,
} from "@/types/enterprise-task-engine";
import { cn } from "@/lib/utils";

export type TaskRecurrenceFormState = {
  scheduleKind: EteScheduleKind;
  frequency: EteRecurrenceFrequency;
  interval: number;
  weekdays: EteWeekdayCode[];
  monthlyMode: EteMonthlyMode;
  weekdayOrdinal: EteWeekdayOrdinal;
  weekday: EteWeekdayCode;
  endMode: EteRecurrenceEnd["mode"];
  endCount: number;
  endOn: string;
  reminderOffset: EteReminderOffset;
};

export const DEFAULT_RECURRENCE_FORM: TaskRecurrenceFormState = {
  scheduleKind: "one_time",
  frequency: "weekly",
  interval: 1,
  weekdays: ["mon"],
  monthlyMode: "same_date",
  weekdayOrdinal: "first",
  weekday: "mon",
  endMode: "forever",
  endCount: 20,
  endOn: "",
  reminderOffset: "1_day",
};

export function buildRecurrenceFromForm(
  form: TaskRecurrenceFormState,
): EteTaskRecurrence | undefined {
  if (form.scheduleKind !== "recurring") return undefined;
  const end: EteRecurrenceEnd =
    form.endMode === "after_count"
      ? { mode: "after_count", count: Math.max(1, form.endCount || 1) }
      : form.endMode === "on_date"
        ? { mode: "on_date", endOn: form.endOn || new Date().toISOString().slice(0, 10) }
        : { mode: "forever" };

  return {
    frequency: form.frequency,
    interval: Math.max(1, form.interval || 1),
    weekdays: form.frequency === "weekly" ? form.weekdays : undefined,
    monthlyMode: form.frequency === "monthly" ? form.monthlyMode : undefined,
    weekdayOrdinal:
      form.frequency === "monthly" && form.monthlyMode === "same_weekday"
        ? form.weekdayOrdinal
        : undefined,
    weekday:
      form.frequency === "monthly" && form.monthlyMode === "same_weekday"
        ? form.weekday
        : undefined,
    end,
    reminderOffset: form.reminderOffset,
  };
}

function toggleWeekday(current: EteWeekdayCode[], day: EteWeekdayCode): EteWeekdayCode[] {
  return current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
}

export function TaskRecurrenceFields({
  value,
  onChange,
}: {
  value: TaskRecurrenceFormState;
  onChange: (next: TaskRecurrenceFormState) => void;
}) {
  const set = (patch: Partial<TaskRecurrenceFormState>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase text-muted-foreground">Task Type</Label>
        <div className="flex flex-wrap gap-1.5">
          {ETE_SCHEDULE_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => set({ scheduleKind: k.id })}
              className={cn(
                "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                value.scheduleKind === k.id
                  ? "border-teal-500/50 bg-teal-500/15 text-foreground"
                  : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {value.scheduleKind === "recurring" ? (
        <>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase text-muted-foreground">Repeat</Label>
            <Select
              value={value.frequency}
              onValueChange={(v) => set({ frequency: v as EteRecurrenceFrequency })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ETE_RECURRENCE_FREQUENCIES.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {value.frequency === "daily" ? (
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-muted-foreground">Repeat every</Label>
              <Select
                value={String(value.interval)}
                onValueChange={(v) => set({ interval: Number(v) })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ETE_DAILY_INTERVAL_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-xs">
                      {n === 1 ? "1 day" : `${n} days`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {value.frequency === "weekly" ? (
            <div className="grid gap-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Repeat every</Label>
                <Select
                  value={String(value.interval)}
                  onValueChange={(v) => set({ interval: Number(v) })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ETE_WEEKLY_INTERVAL_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)} className="text-xs">
                        {n === 1 ? "1 week" : `${n} weeks`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Select day(s)</Label>
                <div className="flex flex-wrap gap-1">
                  {ETE_WEEKDAYS.map((d) => {
                    const on = value.weekdays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => set({ weekdays: toggleWeekday(value.weekdays, d.id) })}
                        className={cn(
                          "h-7 rounded-md border px-2 text-[10px] font-medium",
                          on
                            ? "border-teal-500/50 bg-teal-500/15 text-foreground"
                            : "border-border/70 text-muted-foreground",
                        )}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {value.frequency === "monthly" ? (
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: "same_date" as const, label: "Same Date" },
                    { id: "same_weekday" as const, label: "Same Weekday" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => set({ monthlyMode: m.id })}
                    className={cn(
                      "h-8 rounded-md border px-3 text-xs font-medium",
                      value.monthlyMode === m.id
                        ? "border-teal-500/50 bg-teal-500/15 text-foreground"
                        : "border-border/70 text-muted-foreground",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {value.monthlyMode === "same_weekday" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    value={value.weekdayOrdinal}
                    onValueChange={(v) => set({ weekdayOrdinal: v as EteWeekdayOrdinal })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ETE_WEEKDAY_ORDINALS.map((o) => (
                        <SelectItem key={o.id} value={o.id} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={value.weekday}
                    onValueChange={(v) => set({ weekday: v as EteWeekdayCode })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ETE_WEEKDAYS.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Uses the day-of-month from the Due Date (e.g. 5th of every month).
                </p>
              )}
            </div>
          ) : null}

          {value.frequency === "quarterly" ||
          value.frequency === "half_yearly" ||
          value.frequency === "yearly" ? (
            <p className="text-[10px] text-muted-foreground">
              {value.frequency === "quarterly"
                ? "Repeats every three months on the same date (e.g. 5 Jan → 5 Apr → 5 Jul → 5 Oct)."
                : value.frequency === "half_yearly"
                  ? "Repeats every six months on the same date."
                  : "Repeats every year on the same date (e.g. every 5 August)."}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase text-muted-foreground">Ends</Label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "forever" as const, label: "Forever" },
                  { id: "after_count" as const, label: "End After" },
                  { id: "on_date" as const, label: "End On Date" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => set({ endMode: m.id })}
                  className={cn(
                    "h-8 rounded-md border px-3 text-xs font-medium",
                    value.endMode === m.id
                      ? "border-teal-500/50 bg-teal-500/15 text-foreground"
                      : "border-border/70 text-muted-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {value.endMode === "after_count" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">After</span>
                <Input
                  type="number"
                  min={1}
                  className="h-9 w-20 text-xs"
                  value={value.endCount}
                  onChange={(e) => set({ endCount: Number(e.target.value) || 1 })}
                />
                <span className="text-xs text-muted-foreground">occurrences</span>
              </div>
            ) : null}
            {value.endMode === "on_date" ? (
              <Input
                type="date"
                className="h-9 text-xs"
                value={value.endOn}
                onChange={(e) => set({ endOn: e.target.value })}
              />
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase text-muted-foreground">Reminder</Label>
            <Select
              value={value.reminderOffset}
              onValueChange={(v) => set({ reminderOffset: v as EteReminderOffset })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ETE_REMINDER_OFFSETS.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : null}
    </div>
  );
}
