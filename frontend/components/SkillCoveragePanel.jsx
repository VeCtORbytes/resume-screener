"use client";

import styles from "./CandidateWorkspace.module.css";

export default function SkillCoveragePanel({ coverageData }) {
  const { covered = [], partial = [], missing = [], critical = [] } = coverageData;

  const totalSkills = covered.length + partial.length + missing.length + critical.length;

  if (totalSkills === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Skill Coverage Intelligence</h3>
        <p style={{ margin: "0", fontSize: "var(--font-sm)", color: "var(--text-secondary)" }}>No skill coverage data available.</p>
      </div>
    );
  }

  const renderEvidence = (evidenceList, evidenceQuality) => {
    if (!evidenceList || evidenceList.length === 0) return null;
    return (
      <div style={{ marginTop: "var(--space-xs)", width: "100%" }}>
        {evidenceQuality && (
          <div style={{ fontSize: "var(--font-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "var(--space-xs)" }}>
            Quality: <span style={{ color: "var(--text-primary)" }}>{evidenceQuality}</span>
          </div>
        )}
        <ul style={{ margin: "0", paddingLeft: "var(--space-xl)", fontSize: "var(--font-md)", color: "var(--text-primary)", lineHeight: "1.5" }}>
          {evidenceList.map((item, idx) => (
            <li key={idx} style={{ marginBottom: "4px" }}>{item}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderSkillList = (title, skills, chipClass) => {
    if (skills.length === 0) return null;
    return (
      <div className={styles.skillCategory} style={{ marginBottom: "var(--space-2xl)" }}>
        <h4 className={styles.skillCategoryTitle} style={{ marginBottom: "var(--space-md)" }}>{title} ({skills.length})</h4>
        
        {/* SUMMARY BAR */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "var(--space-xl)", padding: "var(--space-md)", background: "var(--surface-muted)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
          {skills.map((skill, idx) => (
             <span key={`summary-${idx}`} style={{ fontSize: "var(--font-sm)", fontWeight: "600", color: "var(--text-primary)" }}>
               {skill.name}{idx < skills.length - 1 ? <span style={{ color: "var(--text-secondary)", marginLeft: "2px" }}>,</span> : ""}
             </span>
          ))}
        </div>

        {/* DETAILED EVIDENCE */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {skills.map((skill, idx) => {
            const hasEvidence = skill.evidence && skill.evidence.length > 0;
            return (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-sm)", paddingBottom: idx < skills.length - 1 ? "var(--space-xl)" : "0", borderBottom: idx < skills.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                <span className={`${styles.chip} ${chipClass}`}>
                  {title === "Critical Gaps" ? "❗ " : title === "Missing Skills" ? "✕ " : title === "Partial Coverage" ? "⚠ " : "✓ "} 
                  {skill.name}
                </span>
                {hasEvidence ? renderEvidence(skill.evidence, skill.evidenceQuality) : <span style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)", fontStyle: "italic" }}>No specific evidence extracted.</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Evidence-Based Skill Coverage</h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", marginTop: "var(--space-md)" }}>
        {renderSkillList("Critical Gaps", critical, styles.chipMissing)}
        {renderSkillList("Missing Skills", missing, styles.chipMissing)}
        {renderSkillList("Partial Coverage", partial, styles.chipPartial)}
        {renderSkillList("Covered Skills", covered, styles.chipCovered)}
      </div>
    </div>
  );
}
