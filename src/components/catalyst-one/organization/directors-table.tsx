"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { directorsSeed } from "@/data/catalyst-one/organization/directors";
import { DirectorDrawer } from "@/components/catalyst-one/organization/director-drawer";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Director, DirectorStatus } from "@/types/organization";

const statusVariant: Record<DirectorStatus, "success" | "muted"> = {
  active: "success",
  inactive: "muted",
};

const statusLabel: Record<DirectorStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

export function DirectorsTable() {
  const [selectedDirector, setSelectedDirector] = useState<Director | null>(null);

  return (
    <>
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
              {directorsSeed.map((director) => (
                <TableRow key={director.id} className="cursor-pointer" onClick={() => setSelectedDirector(director)}>
                  <TableCell className="font-medium">{director.name}</TableCell>
                  <TableCell>{director.designation}</TableCell>
                  <TableCell className="font-mono text-xs">{director.din}</TableCell>
                  <TableCell className="font-mono text-xs">{director.pan}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{director.email}</TableCell>
                  <TableCell>{director.mobile}</TableCell>
                  <TableCell>
                    <StatusPill variant={statusVariant[director.status]}>
                      {statusLabel[director.status]}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
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
                  </TableCell>
                </TableRow>
              ))}
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
    </>
  );
}
