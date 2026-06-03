"use client";

import styles from "./CandidateWorkspace.module.css";

export default function SkillCoveragePanel({ coverageData }) {
  const { covered = [], partial = [], missing = [], critical = [] } = coverageData;

  const totalSkills = covered.length + partial.length + missing.length + critical.length;

  if (totalSkills === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Skill Coverage Intelligence</h3>
        <p className={styles.projectDetailText}>No skill coverage data available.</p>
      </div>
    );
  }

  const renderEvidence = (evidenceList, evidenceQuality) => {
    if (!evidenceList || evidenceList.length === 0) return null;
    return (
      <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px", fontSize: "0.85rem", color: "#475569" }}>
        {evidenceQuality && (
          <li style={{ listStyle: "none", marginLeft: "-20px", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>
            Evidence Quality: {evidenceQuality}
          </li>
        )}
        {evidenceList.map((item, idx) => (
          <li key={idx} style={{ marginBottom: "2px" }}>{item}</li>
        ))}
      </ul>
    );
  };

  const renderSkillList = (title, skills, chipClass) => {
    if (skills.length === 0) return null;
    return (
      <div className={styles.skillCategory} style={{ marginBottom: "1.5rem" }}>
        <h4 className={styles.skillCategoryTitle}>{title} ({skills.length})</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {skills.map((skill, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
              <span className={`${styles.chip} ${chipClass}`}>
                {title === "Critical Gaps" ? "❗ " : title === "Missing Skills" ? "✕ " : title === "Partial Coverage" ? "⚠ " : "✓ "} 
                {skill.name}
              </span>
              {renderEvidence(skill.evidence, skill.evidenceQuality)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Evidence-Based Skill Coverage</h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
        {renderSkillList("Critical Gaps", critical, styles.chipMissing)}
        {renderSkillList("Missing Skills", missing, styles.chipMissing)}
        {renderSkillList("Partial Coverage", partial, styles.chipPartial)}
        {renderSkillList("Covered Skills", covered, styles.chipCovered)}
      </div>
    </div>
  );
}
