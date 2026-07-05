import { Construction } from "lucide-react";
import { CatalystBranding } from "@/components/catalyst-one/catalyst-branding";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ModulePlaceholderProps {
  title: string;
  description: string;
}

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <div className="space-y-8">
      <CatalystBranding />
      <Card className="glass-card border-border/60">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Construction className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="max-w-md mx-auto">{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            This module will be available in an upcoming sprint.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
