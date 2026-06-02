"use client";

import styles from "./CandidateWorkspace.module.css";

export default function SkillCoveragePanel({ coverageData }) {
  const { covered, partial, missing, coveragePercentage, gapPercentage } = coverageData;

  return (
    <div className={styles.dossierSectionCard}>
      <h3 className={styles.dossierSectionHeading}>Skill Coverage Intelligence</h3>
      
      <div className={styles.coverageSummaryGrid}>
        <div className={styles.coverageMetric}>
          <span className={styles.coverageMetricLabel}>Coverage</span>
          <span className={styles.coverageMetricValue} style={{ color: '#10b981' }}>{coveragePercentage}%</span>
        </div>
        <div className={styles.coverageMetric}>
          <span className={styles.coverageMetricLabel}>Gap</span>
          <span className={styles.coverageMetricValue} style={{ color: '#ef4444' }}>{gapPercentage}%</span>
        </div>
      </div>

      <div className={styles.coverageListsContainer}>
        {/* Covered Skills */}
        <div className={styles.coverageListGroup}>
          <h4 className={styles.dossierSubheading}>Covered Skills</h4>
          {covered.length > 0 ? (
            <div className={styles.skillPills}>
              {covered.map((skill, idx) => (
                <span key={idx} className={`${styles.skillPill} ${styles.skillCovered}`}>
                  {skill.name} <span className={styles.pillPct}>{skill.coverage}%</span>
                </span>
              ))}
            </div>
          ) : (
            <p className={styles.emptySkillsText}>No covered skills identified.</p>
          )}
        </div>

        {/* Partial Skills */}
        {partial.length > 0 && (
          <div className={styles.coverageListGroup}>
            <h4 className={styles.dossierSubheading}>Partial Coverage</h4>
            <div className={styles.skillPills}>
              {partial.map((skill, idx) => (
                <span key={idx} className={`${styles.skillPill} ${styles.skillPartial}`}>
                  {skill.name} <span className={styles.pillPct}>{skill.coverage}%</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Skills */}
        <div className={styles.coverageListGroup}>
          <h4 className={styles.dossierSubheading}>Missing Skills</h4>
          {missing.length > 0 ? (
            <div className={styles.skillPills}>
              {missing.map((skill, idx) => (
                <span key={idx} className={`${styles.skillPill} ${styles.skillMissing}`}>
                  {skill.name} <span className={styles.pillPct}>0%</span>
                </span>
              ))}
            </div>
          ) : (
            <p className={styles.emptySkillsText}>No missing skills. 100% covered.</p>
          )}
        </div>
      </div>
    </div>
  );
}
