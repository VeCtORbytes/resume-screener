"use client";

import styles from "./CandidateWorkspace.module.css";
import ProjectRelevanceChart from "./ProjectRelevanceChart";

export default function ProjectAlignmentPanel({ projectData }) {
  if (!projectData || projectData.length === 0) {
    return (
      <div className={styles.dossierSectionCard}>
        <h3 className={styles.dossierSectionHeading}>Project Alignment Intelligence</h3>
        <p className={styles.emptySkillsText}>No explicit project evidence extracted for this candidate.</p>
      </div>
    );
  }

  // Find strongest and weakest projects
  const sortedProjects = [...projectData].sort((a, b) => b.relevanceScore - a.relevanceScore);
  const strongest = sortedProjects[0];
  const weakest = sortedProjects[sortedProjects.length - 1];

  return (
    <div className={styles.dossierSectionCard}>
      <h3 className={styles.dossierSectionHeading}>Project Alignment Intelligence</h3>
      
      <div className={styles.projectInsightsGrid}>
        <div className={styles.insightBox}>
          <span className={styles.insightLabel}>Strongest Validation</span>
          <span className={styles.insightValue}>{strongest.name}</span>
          <span className={styles.insightScore} style={{ color: '#10b981' }}>{strongest.relevanceScore}%</span>
        </div>
        {sortedProjects.length > 1 && (
          <div className={styles.insightBox}>
            <span className={styles.insightLabel}>Weakest Validation</span>
            <span className={styles.insightValue}>{weakest.name}</span>
            <span className={styles.insightScore} style={{ color: '#ef4444' }}>{weakest.relevanceScore}%</span>
          </div>
        )}
      </div>

      <ProjectRelevanceChart projects={sortedProjects} />
    </div>
  );
}
