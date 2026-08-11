"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Globe, Loader2, Mail, MapPin, Phone, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { organizationWorkspaceApi } from "@/lib/enterprise-organization-workspace";
import {
  ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE,
  uploadOrgDocuments,
} from "@/lib/organization-documents";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { OrganizationProfileDto } from "@/types/enterprise-organization-workspace";
import type { CompanyProfile } from "@/types/organization";

const inputClassName =
  "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const emptyProfile = (): CompanyProfile => ({
  companyName: "",
  brandName: "",
  gst: "",
  pan: "",
  cin: "",
  msme: "",
  registeredAddress: "",
  corporateAddress: "",
  website: "",
  officialEmails: [],
  phoneNumbers: [],
  emailDomains: [],
  socialLinks: {},
  logoInitials: "RC",
  logoDocumentId: null,
});

function dtoToProfile(dto: OrganizationProfileDto): CompanyProfile {
  return {
    companyName: dto.companyName,
    legalEntityName: dto.legalEntityName ?? undefined,
    brandName: dto.brandName,
    gst: dto.gst,
    pan: dto.pan,
    cin: dto.cin,
    msme: dto.msme,
    incorporationDate: dto.incorporationDate ?? undefined,
    incorporationDetails: dto.incorporationDetails ?? undefined,
    registeredAddress: dto.registeredAddress ?? "",
    corporateAddress: dto.corporateAddress ?? "",
    website: dto.website,
    officialEmails: dto.officialEmails ?? [],
    phoneNumbers: dto.phoneNumbers ?? [],
    emailDomains: dto.emailDomains ?? [],
    socialLinks: dto.socialLinks ?? {},
    logoInitials: dto.logoInitials ?? "RC",
    logoDocumentId: dto.logoDocumentId,
  };
}

function profileToPatch(profile: CompanyProfile): Parameters<
  typeof organizationWorkspaceApi.updateProfile
>[0] {
  return {
    companyName: profile.companyName,
    legalEntityName: profile.legalEntityName ?? null,
    brandName: profile.brandName,
    gst: profile.gst,
    pan: profile.pan,
    cin: profile.cin,
    msme: profile.msme,
    incorporationDate: profile.incorporationDate ?? null,
    incorporationDetails: profile.incorporationDetails ?? null,
    registeredAddress: profile.registeredAddress || null,
    corporateAddress: profile.corporateAddress || null,
    website: profile.website,
    phoneNumbers: profile.phoneNumbers,
    officialEmails: profile.officialEmails,
    emailDomains: profile.emailDomains ?? [],
    socialLinks: profile.socialLinks ?? {},
    logoInitials: profile.logoInitials,
    logoDocumentId: profile.logoDocumentId ?? null,
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function CompanyProfileForm() {
  const { user } = useAuthContext();
  const actor =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Platform Admin";

  const [profile, setProfile] = useState<CompanyProfile>(emptyProfile);
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dto = await organizationWorkspaceApi.getProfile();
      setProfile(dtoToProfile(dto));
      setVersionNumber(dto.versionNumber);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const updateField = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const updateSocial = (key: string, value: string) => {
    setProfile((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const dto = await organizationWorkspaceApi.updateProfile(profileToPatch(profile));
      setProfile(dtoToProfile(dto));
      setVersionNumber(dto.versionNumber);
      setSaved(true);
      toast.success(`Profile saved (v${dto.versionNumber})`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = async (file: File) => {
    setUploadingLogo(true);
    setError(null);
    try {
      const docs = await uploadOrgDocuments({
        files: [file],
        categoryId: "branding",
        documentTypeId: "brand_logo",
        documentTypeLabel: "Company Logo",
        uploadedBy: actor,
      });
      const logoDoc = docs[0];
      if (!logoDoc) throw new Error("Logo upload failed");

      const dto = await organizationWorkspaceApi.updateProfile({
        logoDocumentId: logoDoc.id,
      });
      setProfile(dtoToProfile(dto));
      setVersionNumber(dto.versionNumber);
      toast.success("Logo uploaded and linked to profile");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE;
      setError(message);
      toast.error(message);
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading company profile…
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive lg:col-span-3">
          {error}
        </p>
      )}

      <Card className="glass-card border-border/60 lg:col-span-1">
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
          <CardDescription>Brand identity for internal records</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-3xl font-bold text-white shadow-lg">
            {profile.logoInitials}
          </div>
          <p className="text-center text-sm font-medium">{profile.brandName || "Brand Name"}</p>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleLogoSelect(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploadingLogo}
            onClick={() => logoInputRef.current?.click()}
          >
            {uploadingLogo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload Logo
          </Button>
          {profile.logoDocumentId && (
            <p className="text-xs text-muted-foreground text-center font-mono">
              Doc: {profile.logoDocumentId.slice(0, 12)}…
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60 lg:col-span-2">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Company Details</CardTitle>
            <CardDescription>Legal and operational information for Rupee Catalyst</CardDescription>
          </div>
          <Button onClick={() => void handleSave()} className="shrink-0" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {saved && versionNumber != null && (
            <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              Profile saved successfully (version {versionNumber})
            </p>
          )}

          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Company Name" icon={Building2}>
              <Input
                value={profile.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
              />
            </Field>
            <Field label="Legal Entity Name">
              <Input
                value={profile.legalEntityName ?? ""}
                onChange={(e) => updateField("legalEntityName", e.target.value)}
              />
            </Field>
            <Field label="Brand Name">
              <Input
                value={profile.brandName}
                onChange={(e) => updateField("brandName", e.target.value)}
              />
            </Field>
            <Field label="Logo Initials">
              <Input
                value={profile.logoInitials}
                onChange={(e) => updateField("logoInitials", e.target.value)}
                maxLength={4}
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
            <Field label="Incorporation Date">
              <Input
                type="date"
                value={profile.incorporationDate ?? ""}
                onChange={(e) => updateField("incorporationDate", e.target.value || undefined)}
              />
            </Field>
            <Field label="Incorporation Details" className="sm:col-span-2">
              <textarea
                className={inputClassName}
                value={profile.incorporationDetails ?? ""}
                onChange={(e) =>
                  updateField("incorporationDetails", e.target.value || undefined)
                }
              />
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
            <Field label="Corporate Office" icon={MapPin} className="sm:col-span-2">
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
                onChange={(e) => updateField("phoneNumbers", splitList(e.target.value))}
                placeholder="+91 …, +91 …"
              />
            </Field>
            <Field label="Official Emails" icon={Mail} className="sm:col-span-2">
              <Input
                value={profile.officialEmails.join(", ")}
                onChange={(e) => updateField("officialEmails", splitList(e.target.value))}
                placeholder="info@…, support@…"
              />
            </Field>
            <Field label="Email Domains" className="sm:col-span-2">
              <Input
                value={(profile.emailDomains ?? []).join(", ")}
                onChange={(e) => updateField("emailDomains", splitList(e.target.value))}
                placeholder="rupeecatalyst.com, …"
              />
            </Field>
          </section>

          <Separator />

          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="LinkedIn">
              <Input
                value={profile.socialLinks?.linkedin ?? ""}
                onChange={(e) => updateSocial("linkedin", e.target.value)}
              />
            </Field>
            <Field label="Twitter / X">
              <Input
                value={profile.socialLinks?.twitter ?? profile.socialLinks?.x ?? ""}
                onChange={(e) => updateSocial("twitter", e.target.value)}
              />
            </Field>
            <Field label="Facebook">
              <Input
                value={profile.socialLinks?.facebook ?? ""}
                onChange={(e) => updateSocial("facebook", e.target.value)}
              />
            </Field>
            <Field label="YouTube">
              <Input
                value={profile.socialLinks?.youtube ?? ""}
                onChange={(e) => updateSocial("youtube", e.target.value)}
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
