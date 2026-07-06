"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { simulateRule } from "@/lib/credit-risk-engine/rule-store";
import {
  RULE_DATA_TYPE_LABELS,
  RULE_OPERATOR_LABELS,
} from "@/constants/rule-library";
import type { RuleLibraryVersion } from "@/types/rule-library";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RuleSimulatorProps {
  rule: RuleLibraryVersion;
}

export function RuleSimulator({ rule }: RuleSimulatorProps) {
  const [sampleValue, setSampleValue] = useState("");
  const [result, setResult] = useState<ReturnType<typeof simulateRule> | null>(null);

  const runSimulation = () => {
    setResult(simulateRule(rule, { sampleValue }));
  };

  return (
    <Card className="glass-card border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-4 w-4" />
          Rule Simulator
        </CardTitle>
        <CardDescription>
          Test this rule with a sample value — foundation only, not full eligibility.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/50 bg-muted/10 p-3 text-xs">
          <p>
            <span className="font-medium">{rule.ruleCode}</span> ·{" "}
            {RULE_OPERATOR_LABELS[rule.operator]} · {rule.value} ({RULE_DATA_TYPE_LABELS[rule.dataType]})
          </p>
        </div>

        <div className="max-w-sm space-y-2">
          <Label className="text-[10px] uppercase text-muted-foreground">Sample Value</Label>
          <Input
            className="h-8 font-mono text-xs"
            value={sampleValue}
            onChange={(e) => setSampleValue(e.target.value)}
            placeholder={
              rule.dataType === "boolean"
                ? "true or false"
                : rule.dataType === "enum"
                  ? "e.g. Mumbai"
                  : "Enter test value"
            }
          />
        </div>

        <Button size="sm" className="h-8 text-xs" onClick={runSimulation} disabled={!sampleValue.trim()}>
          Run Simulation
        </Button>

        {result && (
          <div className="space-y-2 rounded-lg border border-border/50 p-3">
            <StatusPill variant={result.passed ? "success" : "error"}>
              {result.passed ? "Pass" : "Fail"}
            </StatusPill>
            <p className="text-sm">{result.message}</p>
            <p className="text-[10px] text-muted-foreground">
              Evaluated at {new Date(result.evaluatedAt).toLocaleString("en-IN")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
