/**
 * CO-CCC-001 — Client-side compliance intelligence helpers.
 */
import type {
  CccComplianceAlertDto,
  CccComplianceAlertSeverity,
  CccComplianceIntelligenceDto,
} from "@/types/corporate-compliance-center";

export function groupAlertsBySeverity(
  alerts: CccComplianceAlertDto[],
): Record<CccComplianceAlertSeverity, CccComplianceAlertDto[]> {
  return {
    critical: alerts.filter((a) => a.severity === "critical"),
    warning: alerts.filter((a) => a.severity === "warning"),
    info: alerts.filter((a) => a.severity === "info"),
  };
}

export function severityLabel(severity: CccComplianceAlertSeverity): string {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    default:
      return "Information";
  }
}

export function totalAlertCount(intelligence: CccComplianceIntelligenceDto): number {
  return intelligence.alerts.length;
}
