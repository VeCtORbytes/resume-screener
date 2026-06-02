"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";
import SkillCoveragePanel from "./SkillCoveragePanel";
import RecruiterNotes from "./RecruiterNotes";
import styles from "./CandidateWorkspace.module.css";
import { calculateSkillCoverage } from "../lib/SkillCoverageEngine";

function getCandidateName(filename) {
  if (!filename) return "Unknown Candidate";
  return filename.split('.')[0].replace(/[_]/g, ' ').replace(/[-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Phase 3: recruiter-assistance language — no directive hiring terms
function getRecommendation(score) {
  if (score >= 90) return { text: "Recommended for Interview", color: "#10b981", class: styles.strongHire };
  if (score >= 80) return { text: "Potential Match",           color: "#10b981", class: styles.hire };
  if (score >= 65) return { text: "Requires Further Review",   color: "#f59e0b", class: styles.needsInterview };
  if (score >= 50) return { text: "Requires Further Review",   color: "#f97316", class: styles.needsReview };
  return             { text: "Limited Alignment",              color: "#ef4444", class: styles.reject };
}

export default function CandidateWorkspace({
  candidate,
  status = "New",
  onStatusChange,
  note = "",
  onNoteChange,
  onExportPdf,
  isExportingPdf = false,
  isSelected = false,
  onSelect,
}) {
  const score = candidate.score || 0;
  const recInfo = getRecommendation(score);
  const candidateName = getCandidateName(candidate.resume_filename);

  // Process data using the new engines
  const coverageData = calculateSkillCoverage(candidate.gap_analysis);

  // Quick-decision handler helpers
  const handleQuickStatus = (newStatus) => {
    if (onStatusChange) onStatusChange(newStatus);
  };

  return (
    <div className={styles.dossierContainer}>

      {/* Dossier section label */}
      <div className={styles.workspaceSectionHeader}>
        <span className={`${styles.stepBadge} hl-badge`}>Candidate Workspace</span>
        <h3 className={styles.stepTitle}>Evidence-Based Evaluation</h3>
        <p className={styles.stepSubtitle}>Skill coverage intelligence and validation for this candidate.</p>
      </div>

      <div className={styles.dossierBody}>
        {/* Loading Overlay */}
        {isExportingPdf && (
          <div className={styles.premiumModalOverlay}>
            <div className={styles.premiumModalContent}>
              <div className={styles.premiumPulseSpinner}></div>
              <h4 className={styles.premiumModalTitle}>Preparing export…</h4>
              <p className={styles.premiumModalSubtitle}>Compiling candidate evaluation data into a PDF report.</p>
            </div>
          </div>
        )}

        {/* SECTION 1: Candidate Overview (Match Score, Rec, Status) */}
        <div className={`${styles.dossierHeaderCard} hl-card`}>

          <div className={styles.dossierHeaderTopRow}>
            <span className={styles.dossierFileLabel}>Candidate Overview</span>
            <div className={styles.dossierSecondaryActions}>
              <button
                onClick={() => onExportPdf(candidate.id, candidate.resume_filename)}
                disabled={isExportingPdf}
                className={`${styles.dossierSecondaryBtn} hl-btn-secondary`}
              >
                Export PDF
              </button>
            </div>
          </div>

          <h2 className={styles.dossierCandidateName}>{candidateName}</h2>

          <div className={styles.dossierRecRow}>
            <span className={`${styles.dossierRecLabel} ${recInfo.class}`}>{recInfo.text}</span>
            <span className={`${styles.dossierScoreSupport} hl-badge`}>Score: {score}</span>
          </div>

          <div className={styles.dossierDecisionRow}>
            <div className={styles.dossierStatusControl}>
              <span className={styles.dossierStatusLabel}>Status</span>
              <StatusBadge status={status} onChange={onStatusChange} interactive={true} />
            </div>
            <div className={styles.dossierQuickActions}>
              <button
                onClick={() => handleQuickStatus("Shortlisted")}
                className={`${styles.quickActionBtn} ${styles.quickShortlist} ${status === "Shortlisted" ? styles.quickActive : ""}`}
              >
                Shortlist
              </button>
              <button
                onClick={() => handleQuickStatus("Review Later")}
                className={`${styles.quickActionBtn} ${styles.quickReview} ${status === "Review Later" ? styles.quickActive : ""}`}
              >
                Review Later
              </button>
              <button
                onClick={() => handleQuickStatus("Rejected")}
                className={`${styles.quickActionBtn} ${styles.quickReject} ${status === "Rejected" ? styles.quickActive : ""}`}
              >
                Reject
              </button>
            </div>
          </div>

        </div>

        {/* Dossier Document Sections */}
        <div className={styles.dossierSectionsStack}>
          {/* Skill Coverage Intelligence */}
          <SkillCoveragePanel coverageData={coverageData} />


          {/* Recruiter Notes */}
          <div className={styles.dossierSectionCard}>
            <h3 className={styles.dossierSectionHeading}>Recruiter Notes & Hiring Decision</h3>
            <RecruiterNotes note={note} onNoteChange={onNoteChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
