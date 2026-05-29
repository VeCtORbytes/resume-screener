"use client";

import { useState } from "react";
import styles from "./CandidateWorkspace.module.css";

export default function AdvancedIntelligence({ candidate }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={styles.advancedInsightsSection}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={styles.advancedToggleBtn}
      >
        <span className={styles.advancedToggleTitle}>
          {isExpanded ? "▼ Hide Supporting Details" : "▶ Supporting Details"}
        </span>
        <span className={styles.advancedToggleBadge}>Additional Data</span>
      </button>

      {isExpanded && (
        <div className={styles.advancedContentWrapper}>
          <div className={styles.advancedStack}>

            {/* 1. Requirement Evidence */}
            <div className={styles.advancedSectionCard}>
              <h4 className={styles.advancedCardHeading}>Requirement Evidence</h4>
              {candidate.gap_analysis?.weighted_evaluations && candidate.gap_analysis.weighted_evaluations.length > 0 ? (
                <div className={styles.weightedEvalsList}>
                  {candidate.gap_analysis.weighted_evaluations.map((ev, i) => {
                    const status = ev.status || "missing";
                    const quality = ev.evidence_quality || 100;
                    let pillClass = styles.missingEvalCard;
                    let statusLabel = "Not Found";
                    if (status === "matched") {
                      pillClass = styles.matchedEvalCard;
                      statusLabel = "Confirmed";
                    } else if (status === "inferred") {
                      pillClass = styles.inferredEvalCard;
                      statusLabel = "Inferred";
                    } else if (status === "ambiguous" || status === "partial") {
                      pillClass = styles.ambiguousEvalCard;
                      statusLabel = "Partial";
                    }

                    return (
                      <div key={i} className={`${styles.weightedEvalItem} ${pillClass}`}>
                        <div className={styles.weightedEvalItemHeader}>
                          <span className={styles.weightedSkillName}>{ev.name}</span>
                          <span className={styles.weightedSkillStatus}>{statusLabel}</span>
                        </div>
                        {ev.evidence && (
                          <p className={styles.weightedSkillEvidence}>{ev.evidence}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.emptyAdvancedText}>No requirement evidence recorded.</p>
              )}
            </div>

            {/* 2. Project Evidence */}
            <div className={styles.advancedSectionCard}>
              <h4 className={styles.advancedCardHeading}>Project Evidence</h4>
              {candidate.gap_analysis?.project_intelligence && candidate.gap_analysis.project_intelligence.length > 0 ? (
                <div className={styles.projectIntelList}>
                  {candidate.gap_analysis.project_intelligence.map((proj, pIdx) => (
                    <div key={pIdx} className={styles.projectIntelItem}>
                      <div className={styles.projectIntelItemHeader}>
                        <strong className={styles.projectIntelName}>📁 {proj.project_name}</strong>
                        {proj.relevance_score !== undefined && (
                          <span className={styles.projectIntelRelevance}>{proj.relevance_score}% relevant</span>
                        )}
                      </div>
                      <p className={styles.projectIntelDesc}>{proj.description}</p>
                      {proj.inferred_skills && proj.inferred_skills.length > 0 && (
                        <div className={styles.projectIntelPills}>
                          <strong>Capabilities:</strong>
                          {proj.inferred_skills.map((skill, sIdx) => (
                            <span key={sIdx} className={styles.inferredSkillPill}>{skill}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyAdvancedText}>No project evidence recorded.</p>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
