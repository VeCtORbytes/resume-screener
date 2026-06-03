"use client";

import styles from "./CandidateWorkspace.module.css";

export default function HiringReadinessPanel({ counts, hiringReadiness }) {
  if (!hiringReadiness) return null;

  const getStatusColor = (status) => {
    switch(status) {
      case "Ready for Interview": return "#10b981"; // Emerald green
      case "Requires Further Review": return "#f59e0b"; // Amber
      case "Not Ready": return "#ef4444"; // Red
      default: return "#64748b"; // Slate
    }
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Hiring Readiness Summary</h3>
      
      <div style={{
        marginTop: "1rem",
        padding: "1.5rem",
        backgroundColor: "#f8fafc",
        borderLeft: `4px solid ${getStatusColor(hiringReadiness.status)}`,
        borderRadius: "4px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", color: getStatusColor(hiringReadiness.status) }}>
              {hiringReadiness.status}
            </h4>
            <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "0.9rem", color: "#475569" }}>
              {hiringReadiness.reasons.map((reason, idx) => (
                <li key={idx} style={{ marginBottom: "4px" }}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ display: "flex", gap: "2rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: "600" }}>Critical Gaps</span>
            <span style={{ fontSize: "1.25rem", fontWeight: "700", color: counts.criticalGapsCount > 0 ? "#ef4444" : "#10b981" }}>
              {counts.criticalGapsCount}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: "600" }}>Validated Reqs</span>
            <span style={{ fontSize: "1.25rem", fontWeight: "700", color: counts.validatedRequirementsCount > 0 ? "#10b981" : "#64748b" }}>
              {counts.validatedRequirementsCount}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: "600" }}>Covered Skills</span>
            <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "#334155" }}>
              {counts.coveredSkillsCount}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: "600" }}>Missing Validation</span>
            <span style={{ fontSize: "1.25rem", fontWeight: "700", color: counts.missingValidationCount > 0 ? "#f59e0b" : "#334155" }}>
              {counts.missingValidationCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
