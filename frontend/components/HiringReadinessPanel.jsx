"use client";

import styles from "./CandidateWorkspace.module.css";

export default function HiringReadinessPanel({ counts, hiringReadiness }) {
  if (!hiringReadiness) return null;

  const getStatusColor = (status) => {
    switch(status) {
      case "Ready for Interview": return "var(--color-success-text)"; // Emerald green
      case "Requires Further Review": return "var(--color-warning-text)"; // Amber
      case "Not Ready": return "var(--color-danger-text)"; // Red
      default: return "var(--text-secondary)"; // Slate
    }
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Hiring Readiness Summary</h3>
      
      <div style={{
        marginTop: "var(--space-md)",
        padding: "var(--space-xl)",
        backgroundColor: "var(--surface-muted)",
        borderLeft: `4px solid ${getStatusColor(hiringReadiness.status)}`,
        borderRadius: "var(--radius-sm)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h4 style={{ margin: "0 0 var(--space-xs) 0", fontSize: "var(--font-xl)", color: getStatusColor(hiringReadiness.status) }}>
              {hiringReadiness.status}
            </h4>
            <ul style={{ margin: "0", paddingLeft: "var(--space-xl)", fontSize: "var(--font-sm)", color: "var(--text-secondary)" }}>
              {hiringReadiness.reasons.map((reason, idx) => (
                <li key={idx} style={{ marginBottom: "var(--space-xs)" }}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2xl)", marginTop: "var(--space-xl)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600" }}>Critical Gaps</span>
            <span style={{ fontSize: "var(--font-xl)", fontWeight: "700", color: counts.criticalGapsCount > 0 ? "var(--color-danger-text)" : "var(--color-success-text)" }}>
              {counts.criticalGapsCount}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600" }}>Validated Reqs</span>
            <span style={{ fontSize: "var(--font-xl)", fontWeight: "700", color: counts.validatedRequirementsCount > 0 ? "var(--color-success-text)" : "var(--text-secondary)" }}>
              {counts.validatedRequirementsCount}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600" }}>Covered Skills</span>
            <span style={{ fontSize: "var(--font-xl)", fontWeight: "700", color: "var(--text-primary)" }}>
              {counts.coveredSkillsCount}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600" }}>Missing Validation</span>
            <span style={{ fontSize: "var(--font-xl)", fontWeight: "700", color: counts.missingValidationCount > 0 ? "var(--color-warning-text)" : "var(--text-primary)" }}>
              {counts.missingValidationCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
