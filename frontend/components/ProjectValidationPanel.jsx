"use client";

import styles from "./CandidateWorkspace.module.css";

export default function ProjectValidationPanel({ projectValidationData }) {
  const { 
    format = "legacy", 
    validated = [], 
    mentionedOnly = [], 
    partial = [], 
    missing = [],
    confirmedProjects = [],
    partialProjects = []
  } = projectValidationData || {};

  const renderConfidenceBadge = (confidence) => {
    if (confidence === "high") return "🟢 High Confidence";
    if (confidence === "medium") return "🟡 Medium Confidence";
    return "⚪ Low Confidence";
  };

  const renderRequirementList = (title, requirements, chipClass) => {
    if (!requirements || requirements.length === 0) return null;
    return (
      <div className={styles.skillCategory} style={{ marginBottom: "var(--space-2xl)" }}>
        <h4 className={styles.skillCategoryTitle} style={{ marginBottom: "var(--space-md)" }}>{title} ({requirements.length})</h4>
        
        {/* SUMMARY BAR */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "var(--space-xl)", padding: "var(--space-md)", background: "var(--surface-muted)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
          {requirements.map((req, idx) => (
             <span key={`summary-${idx}`} style={{ fontSize: "var(--font-sm)", fontWeight: "600", color: "var(--text-primary)" }}>
               {req.requirement}{idx < requirements.length - 1 ? <span style={{ color: "var(--text-secondary)", marginLeft: "2px" }}>,</span> : ""}
             </span>
          ))}
        </div>

        {/* DETAILED EVIDENCE */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {requirements.map((req, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-sm)", paddingBottom: idx < requirements.length - 1 ? "var(--space-xl)" : "0", borderBottom: idx < requirements.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
              <span className={`${styles.chip} ${chipClass}`}>
                {req.requirement}
              </span>
              
              <div style={{ marginTop: "var(--space-xs)", width: "100%", paddingLeft: "var(--space-xl)", borderLeft: "2px solid var(--border-subtle)", marginLeft: "var(--space-sm)" }}>
                {req.projectName && (
                  <div style={{ fontSize: "var(--font-sm)", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
                    Project: <span style={{ fontWeight: "600", color: "var(--text-secondary)" }}>{req.projectName}</span>
                  </div>
                )}

                {req.evidence && (
                  <p style={{ margin: "4px 0 8px 0", fontSize: "var(--font-md)", color: "var(--text-primary)", lineHeight: "1.5" }}>
                    "{req.evidence}"
                  </p>
                )}
                
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "var(--space-xs)" }}>
                  {req.evidenceSource && (
                    <span style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", fontWeight: "700", color: "var(--text-secondary)", padding: "2px 6px", background: "var(--surface-muted)", borderRadius: "4px" }}>
                      Source: {req.evidenceSource.replace("_", " ")}
                    </span>
                  )}
                  <span style={{ fontSize: "var(--font-xs)", fontWeight: "600", color: "var(--text-secondary)" }}>
                    {renderConfidenceBadge(req.confidence)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (format === "legacy") {
    const allLegacy = [...confirmedProjects, ...partialProjects];
    if (allLegacy.length === 0) return null;

    return (
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Project Validation (Legacy)</h3>
        <div className={styles.projectList}>
          {allLegacy.map((proj, idx) => {
            const isConfirmed = proj.isConfirmed;
            return (
              <div key={idx} className={styles.projectCard}>
                <div className={styles.projectHeader}>
                  <h4 className={styles.projectName}>{proj.name}</h4>
                  <span className={`${styles.projectStatus} ${isConfirmed ? styles.statusConfirmed : styles.statusPartial}`}>
                    {isConfirmed ? "Confirmed" : "Partial"}
                  </span>
                </div>
                {proj.matchedSkills && proj.matchedSkills.length > 0 && (
                  <div className={styles.projectDetail}>
                    <span className={styles.projectDetailLabel}>Validated Technologies</span>
                    <div className={styles.techList}>
                      {proj.matchedSkills.map((tech, i) => (
                        <span key={i} className={styles.techChip}>{tech}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // V2 UI
  const totalReqs = validated.length + mentionedOnly.length + partial.length + missing.length;
  if (totalReqs === 0) return null;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Project Validation Engine</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", marginTop: "var(--space-md)" }}>
        {renderRequirementList("Validated Requirements", validated, styles.chipCovered)}
        {renderRequirementList("Partial Validation", partial, styles.chipPartial)}
        {renderRequirementList("Mentioned Only", mentionedOnly, styles.chipMissing)}
        {renderRequirementList("Missing Validation", missing, styles.chipMissing)}
      </div>
    </div>
  );
}
