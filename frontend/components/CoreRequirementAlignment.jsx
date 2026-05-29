"use client";

import styles from "./CandidateWorkspace.module.css";

const EVIDENCE_CONFIG = {
  "Strong Evidence":   { badgeClass: styles.evidenceStrongBadge,   rowClass: styles.evidenceStrongRow },
  "Moderate Evidence": { badgeClass: styles.evidenceModerateBadge, rowClass: styles.evidenceModerateRow },
  "Limited Evidence":  { badgeClass: styles.evidenceLimitedBadge,  rowClass: styles.evidenceLimitedRow },
  "No Evidence":       { badgeClass: styles.evidenceNoneBadge,     rowClass: styles.evidenceNoneRow },
};

export default function CoreRequirementAlignment({ alignments = [] }) {
  if (!alignments || alignments.length === 0) return null;

  return (
    <div className={styles.dossierSectionCard}>
      <h3 className={styles.dossierSectionHeading}>Core Requirement Alignment</h3>
      <p className={styles.coreAlignmentIntro}>
        Evaluation of how the candidate's profile maps to each core role requirement, based on direct evidence and skill inference.
      </p>

      <div className={styles.coreAlignmentList}>
        {alignments.map((item, idx) => {
          const config = EVIDENCE_CONFIG[item.evidence_strength] || EVIDENCE_CONFIG["No Evidence"];
          return (
            <div key={idx} className={`${styles.coreAlignmentRow} ${config.rowClass}`}>
              <div className={styles.coreAlignmentHeader}>
                <span className={styles.coreAlignmentReqName}>{item.requirement}</span>
                <span className={`${styles.coreEvidenceBadge} ${config.badgeClass}`}>
                  {item.evidence_strength}
                </span>
              </div>
              {item.reasoning && (
                <p className={styles.coreAlignmentReasoning}>{item.reasoning}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
