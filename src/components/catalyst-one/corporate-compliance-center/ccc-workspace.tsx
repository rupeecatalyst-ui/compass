"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  FileText,
  Loader2,
  Package,
  Send,
  Shield,
} from "lucide-react";
import {
  CCC_APPROVAL_STATUSES,
  CCC_INSTITUTION_TYPE_LABELS,
  CCC_NAV_SECTIONS,
  CCC_ORG_DOCUMENTS_ROUTE,
  CCC_PACKAGE_KIND_LABELS,
  CCC_REPOSITORY_LABELS,
  type CccNavSectionId,
  type CccRepositoryKey,
} from "@/constants/corporate-compliance-center";
import { formatOrgDocFileSize } from "@/constants/organization-documents";
import { cccApi, groupAlertsBySeverity } from "@/lib/corporate-compliance-center";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  CccComplianceDocumentDto,
  CccComplianceIntelligenceDto,
  CccDispatchDto,
  CccDocumentPackageDefinitionDto,
  CccDocumentPackageInstanceDto,
  CccInstitutionProfileDto,
  CccLegalEntityDto,
} from "@/types/corporate-compliance-center";
import {
  AddInstitutionButton,
  AddLegalEntityButton,
  AddPackageDefinitionButton,
  BuildPackageButton,
} from "@/components/catalyst-one/corporate-compliance-center/ccc-create-dialogs";

function sectionIcon(id: CccNavSectionId) {
  switch (id) {
    case "overview":
    case "intelligence":
      return Shield;
    case "entities":
      return Building2;
    case "packages":
      return Package;
    case "dispatch":
      return Send;
    default:
      return FileText;
  }
}

export function CccWorkspace() {
  const [section, setSection] = useState<CccNavSectionId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entities, setEntities] = useState<CccLegalEntityDto[]>([]);
  const [documents, setDocuments] = useState<CccComplianceDocumentDto[]>([]);
  const [institutions, setInstitutions] = useState<CccInstitutionProfileDto[]>([]);
  const [packages, setPackages] = useState<CccDocumentPackageDefinitionDto[]>([]);
  const [instances, setInstances] = useState<CccDocumentPackageInstanceDto[]>([]);
  const [dispatches, setDispatches] = useState<CccDispatchDto[]>([]);
  const [intelligence, setIntelligence] = useState<CccComplianceIntelligenceDto | null>(null);

  const [editDoc, setEditDoc] = useState<CccComplianceDocumentDto | null>(null);
  const [fyFilter, setFyFilter] = useState("");

  const activeSection = CCC_NAV_SECTIONS.find((s) => s.id === section);
  const repositoryKey =
    activeSection && "repositoryKey" in activeSection
      ? (activeSection.repositoryKey as CccRepositoryKey)
      : undefined;

  const loadCore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [entityRes, intelRes, instRes, pkgRes, instListRes, dispRes] = await Promise.all([
        cccApi.listEntities(),
        cccApi.getIntelligence(),
        cccApi.listInstitutions(),
        cccApi.listPackages(),
        cccApi.listPackageInstances(),
        cccApi.listDispatches(),
      ]);
      setEntities(entityRes.entities);
      setIntelligence(intelRes.intelligence);
      setInstitutions(instRes.institutions);
      setPackages(pkgRes.packages);
      setInstances(instListRes.instances);
      setDispatches(dispRes.dispatches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Compliance Center");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    if (!repositoryKey && section !== "overview") return;
    try {
      const filters = repositoryKey
        ? {
            repositoryKey,
            ...(fyFilter ? { financialYear: fyFilter } : {}),
          }
        : undefined;
      const res = await cccApi.listDocuments(filters);
      setDocuments(res.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    }
  }, [repositoryKey, section, fyFilter]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (repositoryKey || section === "overview") {
      void loadDocuments();
    }
  }, [loadDocuments, repositoryKey, section]);

  const alertGroups = useMemo(
    () => groupAlertsBySeverity(intelligence?.alerts ?? []),
    [intelligence],
  );

  const handleSaveMetadata = async () => {
    if (!editDoc) return;
    await cccApi.patchDocument(editDoc.id, {
      legalEntityId: editDoc.legalEntityId,
      repositoryKey: editDoc.repositoryKey ?? undefined,
      financialYear: editDoc.financialYear,
      isCurrentFinancialVersion: editDoc.isCurrentFinancialVersion,
      approvalStatus: editDoc.approvalStatus,
      confidentiality: editDoc.confidentiality,
      expiryDate: editDoc.expiryDate,
    });
    setEditDoc(null);
    await loadDocuments();
    await loadCore();
  };

  if (loading && !intelligence) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading Corporate Compliance Center…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto lg:w-52 lg:flex-col lg:overflow-visible">
        {CCC_NAV_SECTIONS.map((item) => {
          const Icon = sectionIcon(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                section === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1 space-y-4">
        {error ? (
          <Card className="border-destructive/50">
            <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </CardContent>
          </Card>
        ) : null}

        {section === "overview" && intelligence ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "Expiring (30d)", value: intelligence.summary.expiringCount },
                { label: "Expired", value: intelligence.summary.expiredCount },
                { label: "Missing FY", value: intelligence.summary.missingFyCount },
                { label: "Pending Approval", value: intelligence.summary.pendingApprovalCount },
                { label: "Pending Dispatch", value: intelligence.summary.pendingDispatchCount },
              ].map((kpi) => (
                <Card key={kpi.label}>
                  <CardHeader className="pb-2">
                    <CardDescription>{kpi.label}</CardDescription>
                    <CardTitle className="text-2xl">{kpi.value}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick links</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setSection("entities")}>
                  Entity Registry
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={CCC_ORG_DOCUMENTS_ROUTE}>Organization Documents (upload)</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSection("packages")}>
                  Package Builder
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSection("dispatch")}>
                  Dispatch Registry
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {section === "entities" ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Legal Entity Registry</CardTitle>
                <CardDescription>
                  Corporate legal entities for compliance scoping and document binding.
                </CardDescription>
              </div>
              <AddLegalEntityButton onCreated={() => void loadCore()} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Legal Name</TableHead>
                    <TableHead>GST / PAN</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entities.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">
                        {e.code}
                        {e.isPrimary ? (
                          <Badge variant="secondary" className="ml-2">
                            Primary
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>{e.legalName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[e.gst, e.pan].filter(Boolean).join(" · ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.status === "active" ? "default" : "outline"}>
                          {e.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {repositoryKey ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  {CCC_REPOSITORY_LABELS[repositoryKey]}
                </CardTitle>
                <CardDescription>
                  Filtered view of OrganizationDocument SSOT.{" "}
                  <Link href={CCC_ORG_DOCUMENTS_ROUTE} className="text-primary underline">
                    Upload via Organization Documents
                  </Link>
                  ; enrich metadata here.
                </CardDescription>
              </div>
              {repositoryKey === "financial" ? (
                <Input
                  placeholder="FY filter e.g. FY2024-25"
                  value={fyFilter}
                  onChange={(e) => setFyFilter(e.target.value)}
                  className="max-w-[180px]"
                />
              ) : null}
            </CardHeader>
            <CardContent>
              <DocumentTable documents={documents} onEdit={setEditDoc} />
            </CardContent>
          </Card>
        ) : null}

        {section === "institutions" ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Institution Requirements</CardTitle>
                <CardDescription>
                  Banks, NBFCs, regulators, and counterparties — document expectations per institution.
                </CardDescription>
              </div>
              <AddInstitutionButton onCreated={() => void loadCore()} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institutions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No institutions configured. Use Add Institution to register counterparties.
                      </TableCell>
                    </TableRow>
                  ) : (
                    institutions.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.name}</TableCell>
                        <TableCell>
                          {CCC_INSTITUTION_TYPE_LABELS[i.institutionType] ?? i.institutionType}
                        </TableCell>
                        <TableCell className="text-xs">{i.contactEmail ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {section === "packages" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base">Package Definitions</CardTitle>
                <AddPackageDefinitionButton onCreated={() => void loadCore()} />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Kind</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.code}</TableCell>
                        <TableCell>{p.name}</TableCell>
                        <TableCell className="text-xs">
                          {CCC_PACKAGE_KIND_LABELS[p.packageKind]}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base">Built Instances</CardTitle>
                <BuildPackageButton
                  packages={packages}
                  entities={entities}
                  onBuilt={() => void loadCore()}
                />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Docs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instances.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{i.status}</Badge>
                        </TableCell>
                        <TableCell>{i.resolvedDocumentIds.length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {section === "dispatch" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dispatch Registry (EDDE)</CardTitle>
              <CardDescription>
                Enterprise document dispatch events — simulated send until email integration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatches.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.recipientEmail}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{d.subject ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.status}</Badge>
                      </TableCell>
                      <TableCell>{d.items.length}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {d.sentAt ? new Date(d.sentAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {section === "intelligence" && intelligence ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compliance Intelligence</CardTitle>
              <CardDescription>
                Derived alerts — expiring, expired, missing FY, pending approval, pending dispatch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(["critical", "warning", "info"] as const).map((sev) =>
                alertGroups[sev].length > 0 ? (
                  <div key={sev} className="space-y-2">
                    <h4 className="text-sm font-medium capitalize">{sev}</h4>
                    <ul className="space-y-2">
                      {alertGroups[sev].map((a) => (
                        <li
                          key={a.id}
                          className="rounded-md border border-border/60 px-3 py-2 text-sm"
                        >
                          <p className="font-medium">{a.title}</p>
                          <p className="text-muted-foreground">{a.description}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
              {intelligence.alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No compliance alerts at this time.</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={editDoc != null} onOpenChange={(open) => !open && setEditDoc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit compliance metadata</DialogTitle>
          </DialogHeader>
          {editDoc ? (
            <div className="space-y-3">
              <p className="truncate text-sm text-muted-foreground">{editDoc.originalFilename}</p>
              <div className="space-y-1">
                <Label>Legal entity</Label>
                <Select
                  value={editDoc.legalEntityId ?? ""}
                  onValueChange={(v) =>
                    setEditDoc({ ...editDoc, legalEntityId: v || null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.legalName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Approval status</Label>
                <Select
                  value={editDoc.approvalStatus}
                  onValueChange={(v) =>
                    setEditDoc({
                      ...editDoc,
                      approvalStatus: v as CccComplianceDocumentDto["approvalStatus"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CCC_APPROVAL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editDoc.repositoryKey === "financial" || repositoryKey === "financial" ? (
                <>
                  <div className="space-y-1">
                    <Label>Financial year</Label>
                    <Input
                      value={editDoc.financialYear ?? ""}
                      onChange={(e) =>
                        setEditDoc({ ...editDoc, financialYear: e.target.value || null })
                      }
                      placeholder="FY2024-25"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editDoc.isCurrentFinancialVersion}
                      onChange={(e) =>
                        setEditDoc({
                          ...editDoc,
                          isCurrentFinancialVersion: e.target.checked,
                        })
                      }
                    />
                    Current financial version
                  </label>
                </>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDoc(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveMetadata()}>Save metadata</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentTable({
  documents,
  onEdit,
}: {
  documents: CccComplianceDocumentDto[];
  onEdit: (doc: CccComplianceDocumentDto) => void;
}) {
  if (documents.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No documents in this repository. Upload via Organization Documents, then assign repository
        metadata here.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Approval</TableHead>
          <TableHead>FY</TableHead>
          <TableHead>Size</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="max-w-[220px] truncate font-medium">{d.originalFilename}</TableCell>
            <TableCell className="text-xs">{d.documentTypeLabel}</TableCell>
            <TableCell>
              <Badge variant="outline">{d.approvalStatus}</Badge>
              {d.isCurrentFinancialVersion ? (
                <Badge className="ml-1" variant="secondary">
                  Current
                </Badge>
              ) : null}
            </TableCell>
            <TableCell className="text-xs">{d.financialYear ?? "—"}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatOrgDocFileSize(d.fileSizeBytes)}
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" onClick={() => onEdit(d)}>
                Metadata
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
