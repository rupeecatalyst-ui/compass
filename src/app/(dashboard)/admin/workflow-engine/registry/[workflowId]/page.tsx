"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getWorkflowById } from "@/lib/workflow-engine/workflow-store";
import { WorkflowDetailView } from "@/components/catalyst-one/workflow-engine/workflow-detail-view";
import { WorkflowEngineShell } from "@/components/catalyst-one/workflow-engine/workflow-engine-shell";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function WorkflowDetailPageContent() {
  const params = useParams();
  const workflowId = params.workflowId as string;
  const workflow = getWorkflowById(workflowId);

  if (!workflow) {
    return (
      <WorkflowEngineShell title="Workflow Not Found" description="The requested workflow definition does not exist.">
        <Card className="glass-card mx-auto max-w-md border-border/60">
          <CardHeader><CardTitle className="text-base">Not found</CardTitle></CardHeader>
          <CardContent>
            <Button size="sm" asChild>
              <Link href={ROUTES.ADMIN_WORKFLOW_REGISTRY}>Back to Registry</Link>
            </Button>
          </CardContent>
        </Card>
      </WorkflowEngineShell>
    );
  }

  return <WorkflowDetailView workflow={workflow} />;
}

export default function WorkflowDetailPage() {
  return (
    <Suspense fallback={null}>
      <WorkflowDetailPageContent />
    </Suspense>
  );
}
