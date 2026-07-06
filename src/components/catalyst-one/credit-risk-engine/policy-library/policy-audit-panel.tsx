"use client";

import { getAuditTrailForPolicy } from "@/lib/credit-risk-engine/audit-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PolicyAuditPanelProps {
  policyId: string;
}

export function PolicyAuditPanel({ policyId }: PolicyAuditPanelProps) {
  const entries = getAuditTrailForPolicy(policyId);

  return (
    <Card className="glass-card overflow-hidden border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Policy Audit Trail</CardTitle>
        <CardDescription>
          Created, Updated, Validated, Tested, Approved, Published and Archived actions.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No audit entries for this policy yet.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-xs">{entry.actor}</TableCell>
                  <TableCell className="text-xs font-medium">{entry.action}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.versionLabel}</TableCell>
                  <TableCell className="text-xs">{entry.field ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {entry.oldValue || entry.newValue
                      ? `${entry.oldValue || "—"} → ${entry.newValue || "—"}`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
