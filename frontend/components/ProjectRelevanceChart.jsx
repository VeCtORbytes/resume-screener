"use client";

import styles from "./CandidateWorkspace.module.css";

export default function ProjectRelevanceChart({ projects }) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className={styles.relevanceChartContainer}>
      <h4 className={styles.dossierSubheading}>Project Relevance Scores</h4>
      
      <div className={styles.relevanceChart}>
        {projects.map((proj, idx) => {
          // Color coding based on relevance
          const barColor = proj.relevanceScore >= 80 
            ? "#10b981" // Green
            : proj.relevanceScore >= 50 
              ? "#f59e0b" // Orange/Yellow
              : "#ef4444"; // Red

          return (
            <div key={idx} className={styles.relevanceRow}>
              <div className={styles.relevanceInfo}>
                <span className={styles.relevanceProjectName}>{proj.name}</span>
                <span className={styles.relevanceScoreText}>{proj.relevanceScore}%</span>
              </div>
              
              <div className={styles.relevanceBarBg}>
                <div 
                  className={styles.relevanceBarFill} 
                  style={{ width: `${proj.relevanceScore}%`, backgroundColor: barColor }}
                ></div>
              </div>

              {proj.skillsUsed && proj.skillsUsed.length > 0 && (
                <div className={styles.relevanceSkillsRow}>
                  {proj.skillsUsed.map((skill, sIdx) => (
                    <span key={sIdx} className={styles.relevanceSkillTag}>{skill}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
