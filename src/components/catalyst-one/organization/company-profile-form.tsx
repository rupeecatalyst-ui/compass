"use client";

import { useState } from "react";
import { Building2, Globe, Mail, MapPin, Phone, Save } from "lucide-react";
import { companyProfileSeed } from "@/data/catalyst-one/organization/company-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { CompanyProfile } from "@/types/organization";

const inputClassName =
  "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function CompanyProfileForm() {
  const [profile, setProfile] = useState<CompanyProfile>(companyProfileSeed);
  const [saved, setSaved] = useState(false);

  const updateField = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="glass-card border-border/60 lg:col-span-1">
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
          <CardDescription>Brand identity for internal records</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-3xl font-bold text-white shadow-lg">
            {profile.logoInitials}
          </div>
          <p className="text-center text-sm font-medium">{profile.brandName}</p>
          <Button variant="outline" size="sm" disabled>
            Upload Logo
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Logo upload will be enabled in a future sprint
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60 lg:col-span-2">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Company Details</CardTitle>
            <CardDescription>Legal and operational information for Rupee Catalyst</CardDescription>
          </div>
          <Button onClick={handleSave} className="shrink-0">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {saved && (
            <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              Profile saved locally (demo mode)
            </p>
          )}

          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Company Name" icon={Building2}>
              <Input
                value={profile.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
              />
            </Field>
            <Field label="Brand Name">
              <Input
                value={profile.brandName}
                onChange={(e) => updateField("brandName", e.target.value)}
              />
            </Field>
            <Field label="GST">
              <Input value={profile.gst} onChange={(e) => updateField("gst", e.target.value)} />
            </Field>
            <Field label="PAN">
              <Input value={profile.pan} onChange={(e) => updateField("pan", e.target.value)} />
            </Field>
            <Field label="CIN">
              <Input value={profile.cin} onChange={(e) => updateField("cin", e.target.value)} />
            </Field>
            <Field label="MSME">
              <Input value={profile.msme} onChange={(e) => updateField("msme", e.target.value)} />
            </Field>
          </section>

          <Separator />

          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Registered Address" icon={MapPin} className="sm:col-span-2">
              <textarea
                className={inputClassName}
                value={profile.registeredAddress}
                onChange={(e) => updateField("registeredAddress", e.target.value)}
              />
            </Field>
            <Field label="Corporate Address" icon={MapPin} className="sm:col-span-2">
              <textarea
                className={inputClassName}
                value={profile.corporateAddress}
                onChange={(e) => updateField("corporateAddress", e.target.value)}
              />
            </Field>
            <Field label="Website" icon={Globe}>
              <Input
                value={profile.website}
                onChange={(e) => updateField("website", e.target.value)}
              />
            </Field>
            <Field label="Phone Numbers" icon={Phone}>
              <Input
                value={profile.phoneNumbers.join(", ")}
                onChange={(e) =>
                  updateField(
                    "phoneNumbers",
                    e.target.value.split(",").map((p) => p.trim()),
                  )
                }
              />
            </Field>
            <Field label="Official Emails" icon={Mail} className="sm:col-span-2">
              <Input
                value={profile.officialEmails.join(", ")}
                onChange={(e) =>
                  updateField(
                    "officialEmails",
                    e.target.value.split(",").map((p) => p.trim()),
                  )
                }
              />
            </Field>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 flex items-center gap-1.5 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </Label>
      {children}
    </div>
  );
}
