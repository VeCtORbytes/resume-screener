"use client";

import styles from "./CandidateWorkspace.module.css";

export default function SkillGapVisualization({ coverageData }) {
  const { coveragePercentage, gapPercentage } = coverageData;

  return (
    <div className={styles.dossierSectionCard}>
      <h3 className={styles.dossierSectionHeading}>Skill Gap Visualization</h3>
      
      <div className={styles.visualizationContainer}>
        <h4 className={styles.dossierSubheading}>Requirement Coverage Distribution</h4>
        
        <div className={styles.distributionBarContainer}>
          <div className={styles.distributionLabels}>
            <span>Covered ({coveragePercentage}%)</span>
            <span>Gap ({gapPercentage}%)</span>
          </div>
          <div className={styles.distributionBar}>
            <div 
              className={styles.distributionFill} 
              style={{ width: `${coveragePercentage}%` }}
            ></div>
            <div 
              className={styles.distributionGap} 
              style={{ width: `${gapPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
