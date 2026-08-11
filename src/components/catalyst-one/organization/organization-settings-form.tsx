"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { organizationWorkspaceApi } from "@/lib/enterprise-organization-workspace";
import { ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE } from "@/lib/organization-documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrganizationSettingsDto } from "@/types/enterprise-organization-workspace";

const textareaClassName =
  "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const WEEKDAYS = [
  { id: "Mon", label: "Monday" },
  { id: "Tue", label: "Tuesday" },
  { id: "Wed", label: "Wednesday" },
  { id: "Thu", label: "Thursday" },
  { id: "Fri", label: "Friday" },
  { id: "Sat", label: "Saturday" },
  { id: "Sun", label: "Sunday" },
] as const;

function holidaysToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((row) => {
      if (typeof row === "string") return row;
      if (row && typeof row === "object") {
        const o = row as Record<string, unknown>;
        const date = String(o.date ?? "");
        const name = String(o.name ?? "");
        return name ? `${date} — ${name}` : date;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function textToHolidays(text: string): Array<{ date: string; name: string }> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [datePart, ...nameParts] = line.split("—");
      const date = datePart.trim();
      const name = nameParts.join("—").trim() || date;
      return { date, name };
    });
}

export function OrganizationSettingsForm() {
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [startHour, setStartHour] = useState("09:00");
  const [endHour, setEndHour] = useState("18:00");
  const [fyStartMonth, setFyStartMonth] = useState("4");
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");
  const [numberFormat, setNumberFormat] = useState("en-IN");
  const [dateFormat, setDateFormat] = useState("dd/MM/yyyy");
  const [holidayCalendar, setHolidayCalendar] = useState("");
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyDto = (dto: OrganizationSettingsDto) => {
    setWorkingDays(Array.isArray(dto.workingDays) ? dto.workingDays.map(String) : []);
    setStartHour(dto.workingHours?.start ?? "09:00");
    setEndHour(dto.workingHours?.end ?? "18:00");
    setFyStartMonth(String(dto.financialYearStartMonth ?? 4));
    setTimeZone(dto.timeZone ?? "Asia/Kolkata");
    setCurrency(dto.currency ?? "INR");
    setNumberFormat(dto.numberFormat ?? "en-IN");
    setDateFormat(dto.dateFormat ?? "dd/MM/yyyy");
    setHolidayCalendar(holidaysToText(dto.holidayCalendar));
    setVersionNumber(dto.versionNumber);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dto = await organizationWorkspaceApi.getSettings();
      applyDto(dto);
    } catch (err) {
      setError(err instanceof Error ? err.message : ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const dto = await organizationWorkspaceApi.updateSettings({
        workingDays,
        workingHours: { start: startHour, end: endHour, timeZone },
        financialYearStartMonth: Number.parseInt(fyStartMonth, 10) || 4,
        timeZone,
        currency,
        numberFormat,
        dateFormat,
        holidayCalendar: textToHolidays(holidayCalendar),
      });
      applyDto(dto);
      toast.success(`Organization settings saved (v${dto.versionNumber})`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading organization settings…
      </div>
    );
  }

  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Working calendar, locale, and financial year defaults</CardDescription>
          {versionNumber != null && (
            <p className="mt-1 text-xs text-muted-foreground">Version {versionNumber}</p>
          )}
        </div>
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <section>
          <Label className="mb-3 block">Working Days</Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {WEEKDAYS.map((day) => (
              <label
                key={day.id}
                className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={workingDays.includes(day.id)}
                  onCheckedChange={() => toggleDay(day.id)}
                />
                {day.label}
              </label>
            ))}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Working Hours — Start</Label>
            <Input type="time" value={startHour} onChange={(e) => setStartHour(e.target.value)} />
          </div>
          <div>
            <Label>Working Hours — End</Label>
            <Input type="time" value={endHour} onChange={(e) => setEndHour(e.target.value)} />
          </div>
          <div>
            <Label>Financial Year Start Month (1–12)</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={fyStartMonth}
              onChange={(e) => setFyStartMonth(e.target.value)}
            />
          </div>
          <div>
            <Label>Time Zone</Label>
            <Input value={timeZone} onChange={(e) => setTimeZone(e.target.value)} />
          </div>
          <div>
            <Label>Currency</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
          <div>
            <Label>Number Format</Label>
            <Input value={numberFormat} onChange={(e) => setNumberFormat(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Date Format</Label>
            <Input value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Holiday Calendar (one per line: YYYY-MM-DD — Name)</Label>
            <textarea
              className={textareaClassName}
              value={holidayCalendar}
              onChange={(e) => setHolidayCalendar(e.target.value)}
              placeholder={"2026-01-26 — Republic Day\n2026-08-15 — Independence Day"}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
