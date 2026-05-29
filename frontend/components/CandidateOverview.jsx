"use client";

import styles from "./CandidateWorkspace.module.css";

export default function CandidateOverview({ summary = "", strengths = [], gaps = [], gapAnalysis = {} }) {
  // Prefer LLM-generated fields from gap_analysis (new recruiter reasoning engine)
  // Fall back to regex-extracted fields for backward compat with older DB records
  const displaySummary = gapAnalysis?.candidate_summary || summary;
  const displayStrengths =
    gapAnalysis?.key_strengths && gapAnalysis.key_strengths.length > 0
      ? gapAnalysis.key_strengths
      : strengths;
  const displayGaps =
    gapAnalysis?.areas_to_validate && gapAnalysis.areas_to_validate.length > 0
      ? gapAnalysis.areas_to_validate
      : gaps;

  return (
    <div className={styles.dossierSectionCard}>
      <h3 className={styles.dossierSectionHeading}>Candidate Overview</h3>

      {/* Recruiter Briefing Paragraph */}
      <div className={styles.briefingContainer}>
        <h4 className={styles.dossierSubheading}>Recruiter Briefing</h4>
        <p className={styles.briefingText}>
          {displaySummary || "No executive summary briefing provided for this profile."}
        </p>
      </div>

      {/* Grid for Key Strengths and Areas To Validate */}
      <div className={styles.overviewObservationsGrid}>
        {/* Key Strengths */}
        <div className={styles.observationBlock}>
          <h4 className={styles.dossierSubheading}>Key Strengths</h4>
          {displayStrengths.length > 0 ? (
            <ul className={styles.observationList}>
              {displayStrengths.map((str, idx) => (
                <li key={idx} className={styles.strengthObservationItem}>
                  <span className={styles.observationBullet}>•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyObservationText}>No key strengths recorded in this profile matching requirements.</p>
          )}
        </div>

        {/* Areas To Validate */}
        <div className={styles.observationBlock}>
          <h4 className={styles.dossierSubheading}>Areas To Validate</h4>
          {displayGaps.length > 0 ? (
            <ul className={styles.observationList}>
              {displayGaps.map((gap, idx) => (
                <li key={idx} className={styles.gapObservationItem}>
                  <span className={styles.observationBullet}>•</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyObservationText}>No specific validation areas identified for interview probing.</p>
          )}
        </div>
      </div>
    </div>
  );
}
