"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { organizationWorkspaceApi } from "@/lib/enterprise-organization-workspace";
import { ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE } from "@/lib/organization-documents";
import { DirectorDrawer } from "@/components/catalyst-one/organization/director-drawer";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrganizationDirectorDto } from "@/types/enterprise-organization-workspace";
import type { Director, DirectorDocument, DirectorStatus } from "@/types/organization";

const statusVariant: Record<DirectorStatus, "success" | "muted"> = {
  active: "success",
  inactive: "muted",
};

const statusLabel: Record<DirectorStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

function dtoToDirector(dto: OrganizationDirectorDto): Director {
  const docs = Array.isArray(dto.documents)
    ? (dto.documents as DirectorDocument[])
    : [];
  const initials =
    dto.photographInitials ||
    dto.name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return {
    id: dto.id,
    name: dto.name,
    designation: dto.designation,
    din: dto.din,
    pan: dto.pan,
    email: dto.email,
    mobile: dto.mobile,
    status: dto.status === "inactive" ? "inactive" : "active",
    photographInitials: initials,
    address: dto.address ?? "",
    documents: docs,
  };
}

export function DirectorsTable() {
  const [directors, setDirectors] = useState<Director[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDirector, setSelectedDirector] = useState<Director | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDesignation, setAddDesignation] = useState("");
  const [adding, setAdding] = useState(false);

  const loadDirectors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await organizationWorkspaceApi.listDirectors();
      setDirectors(rows.filter((d) => !d.isDeleted).map(dtoToDirector));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectors();
  }, [loadDirectors]);

  const handleAdd = async () => {
    if (!addName.trim() || !addDesignation.trim()) return;
    setAdding(true);
    try {
      await organizationWorkspaceApi.createDirector({
        name: addName.trim(),
        designation: addDesignation.trim(),
        din: "",
        pan: "",
        email: "",
        mobile: "",
        status: "active",
        photographInitials: addName
          .trim()
          .split(/\s+/)
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        address: null,
        documents: [],
        sortOrder: directors.length,
      });
      toast.success("Director added");
      setAddOpen(false);
      setAddName("");
      setAddDesignation("");
      await loadDirectors();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add director");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (directorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await organizationWorkspaceApi.deleteDirector(directorId);
      toast.success("Director removed");
      await loadDirectors();
      if (selectedDirector?.id === directorId) setSelectedDirector(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove director");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading directors…
      </div>
    );
  }

  return (
    <>
      {error && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Director
        </Button>
      </div>

      <Card className="glass-card border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>DIN</TableHead>
                <TableHead>PAN</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {directors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No directors registered yet. Add your first director above.
                  </TableCell>
                </TableRow>
              ) : (
                directors.map((director) => (
                  <TableRow
                    key={director.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedDirector(director)}
                  >
                    <TableCell className="font-medium">{director.name}</TableCell>
                    <TableCell>{director.designation}</TableCell>
                    <TableCell className="font-mono text-xs">{director.din || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{director.pan || "—"}</TableCell>
                    <TableCell className="max-w-[180px] truncate">
                      {director.email || "—"}
                    </TableCell>
                    <TableCell>{director.mobile || "—"}</TableCell>
                    <TableCell>
                      <StatusPill variant={statusVariant[director.status]}>
                        {statusLabel[director.status]}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDirector(director);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => void handleDelete(director.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DirectorDrawer
        director={selectedDirector}
        open={Boolean(selectedDirector)}
        onOpenChange={(open) => {
          if (!open) setSelectedDirector(null);
        }}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Director</DialogTitle>
            <DialogDescription>Name and designation are required. Other details can be added later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="director-name">Name</Label>
              <Input
                id="director-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label htmlFor="director-designation">Designation</Label>
              <Input
                id="director-designation"
                value={addDesignation}
                onChange={(e) => setAddDesignation(e.target.value)}
                placeholder="e.g. Managing Director"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!addName.trim() || !addDesignation.trim() || adding}
              onClick={() => void handleAdd()}
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Director"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
