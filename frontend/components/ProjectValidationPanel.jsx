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
      <div className={styles.skillCategory} style={{ marginBottom: "1.5rem" }}>
        <h4 className={styles.skillCategoryTitle}>{title} ({requirements.length})</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {requirements.map((req, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
              <span className={`${styles.chip} ${chipClass}`}>
                {req.requirement}
              </span>
              
              {req.projectName && (
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                  Project: {req.projectName}
                </span>
              )}

              {req.evidenceSource && (
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b" }}>
                  Source: {req.evidenceSource.replace("_", " ")}
                </span>
              )}

              {req.evidence && (
                <p style={{ margin: "2px 0", fontSize: "0.85rem", color: "#334155" }}>
                  "{req.evidence}"
                </p>
              )}
              
              <span style={{ fontSize: "0.75rem", fontWeight: "500" }}>
                {renderConfidenceBadge(req.confidence)}
              </span>
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
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
        {renderRequirementList("Validated Requirements", validated, styles.chipCovered)}
        {renderRequirementList("Partial Validation", partial, styles.chipPartial)}
        {renderRequirementList("Mentioned Only", mentionedOnly, styles.chipMissing)}
        {renderRequirementList("Missing Validation", missing, styles.chipMissing)}
      </div>
    </div>
  );
}
