"use client";

import styles from "./CandidateWorkspace.module.css";

export default function SkillCoveragePanel({ coverageData }) {
  const { covered, partial, missing, coveragePercentage, gapPercentage } = coverageData;

  if (covered.length === 0 && partial.length === 0 && missing.length === 0) {
    return (
      <div className={styles.dossierSectionCard}>
        <h3 className={styles.dossierSectionHeading}>Skill Coverage Intelligence</h3>
        <p className={styles.emptySkillsText} style={{ marginTop: '1rem', color: '#64748b' }}>No skill coverage data available.</p>
      </div>
    );
  }

  return (
    <div className={styles.dossierSectionCard}>
      <h3 className={styles.dossierSectionHeading}>Skill Coverage Intelligence</h3>
      
      <div className={styles.coverageSummaryGrid}>
        <div className={styles.coverageMetric}>
          <span className={styles.coverageMetricLabel}>Status</span>
          <span className={styles.coverageMetricValue} style={{ color: covered.length > missing.length ? '#10b981' : '#f59e0b' }}>
            {covered.length} / {covered.length + partial.length + missing.length} Matches
          </span>
        </div>
      </div>

      <div className={styles.coverageListsContainer}>
        {/* Covered Skills */}
        {covered.length > 0 && (
          <div className={styles.coverageListGroup}>
            <h4 className={styles.dossierSubheading}>Covered Skills</h4>
            <div className={styles.skillPills}>
              {covered.map((skill, idx) => (
                <span key={idx} className={`${styles.skillPill} ${styles.skillCovered}`}>
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Partial Skills */}
        {partial.length > 0 && (
          <div className={styles.coverageListGroup}>
            <h4 className={styles.dossierSubheading}>Partial Coverage</h4>
            <div className={styles.skillPills}>
              {partial.map((skill, idx) => (
                <span key={idx} className={`${styles.skillPill} ${styles.skillPartial}`}>
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Skills */}
        {missing.length > 0 && (
          <div className={styles.coverageListGroup}>
            <h4 className={styles.dossierSubheading}>Missing Skills</h4>
            <div className={styles.skillPills}>
              {missing.map((skill, idx) => (
                <span key={idx} className={`${styles.skillPill} ${styles.skillMissing}`}>
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
