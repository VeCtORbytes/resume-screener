"use client";

import styles from "./CandidateWorkspace.module.css";

export default function WeightedGapAnalysis({ weightedData }) {
  const { weightedCoverageScore, weightedGapScore, criticalMissing, riskIndicator } = weightedData;

  const riskColor = riskIndicator === "High Risk" 
    ? "#ef4444" 
    : riskIndicator === "Medium Risk" 
      ? "#f59e0b" 
      : "#10b981";

  return (
    <div className={styles.dossierSectionCard}>
      <h3 className={styles.dossierSectionHeading}>Weighted Gap Analysis</h3>
      
      <div className={styles.weightedMetricsGrid}>
        <div className={styles.weightedScoreBox}>
          <span className={styles.weightedLabel}>Weighted Coverage</span>
          <span className={styles.weightedValue} style={{ color: '#10b981' }}>
            {weightedCoverageScore}
          </span>
        </div>
        <div className={styles.weightedScoreBox}>
          <span className={styles.weightedLabel}>Weighted Gap</span>
          <span className={styles.weightedValue} style={{ color: '#ef4444' }}>
            {weightedGapScore}
          </span>
        </div>
        <div className={styles.weightedScoreBox}>
          <span className={styles.weightedLabel}>Risk Indicator</span>
          <span className={styles.weightedValue} style={{ color: riskColor, fontSize: '1.25rem' }}>
            {riskIndicator}
          </span>
        </div>
      </div>

      <div className={styles.criticalGapsContainer}>
        <h4 className={styles.dossierSubheading}>Critical Missing Skills</h4>
        {criticalMissing.length > 0 ? (
          <ul className={styles.criticalList}>
            {criticalMissing.map((skill, idx) => (
              <li key={idx} className={styles.criticalItem}>
                <span className={styles.criticalIcon}>⚠️</span>
                <span className={styles.criticalName}>{skill}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptySkillsText}>No critical missing skills identified.</p>
        )}
      </div>
    </div>
  );
}
