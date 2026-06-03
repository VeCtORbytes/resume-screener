"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";
import RecruiterNotes from "./RecruiterNotes";
import styles from "./CandidateWorkspace.module.css";
import SkillCoveragePanel from "./SkillCoveragePanel";
import ProjectValidationPanel from "./ProjectValidationPanel";

export default function CandidateWorkspace({
  candidate,
  status = "New",
  onStatusChange,
  note = "",
  onNoteChange,
  onExportPdf,
  isExportingPdf = false,
}) {
  const score = candidate.score || 0;
  const recInfo = candidate.recommendation;
  const candidateName = candidate.name;

  // Consume normalized structures directly from the ViewModel
  const recruiterSummary = candidate.summary;
  const interviewFocus = candidate.interviewFocus || [];

  const handleQuickStatus = (newStatus) => {
    if (onStatusChange) onStatusChange(newStatus);
  };

  return (
    <div className={styles.dossierContainer}>
      <div className={styles.dossierBody}>
        
        {/* 1. CANDIDATE HEADER */}
        <section className={styles.headerSection}>
          <div className={styles.headerTopRow}>
            <div>
              <h2 className={styles.candidateName}>{candidateName}</h2>
              {/* Optional Location/Role could go here if extracted */}
              {/* <p className={styles.candidateLocation}>Software Engineer • San Francisco, CA</p> */}
            </div>
            <button
              onClick={() => onExportPdf(candidate.id, candidate.originalFilename)}
              disabled={isExportingPdf}
              className={styles.exportBtn}
            >
              {isExportingPdf ? "Exporting..." : "Export PDF"}
            </button>
          </div>

          <div className={styles.metricsRow}>
            <span className={`${styles.metricBadge} ${styles.scoreBadge}`}>
              Match Score: {score}
            </span>
            <span className={`${styles.metricBadge} ${styles[recInfo?.styleClass] || styles.statusBadge}`}>
              {recInfo?.text}
            </span>
            <StatusBadge status={status} onChange={onStatusChange} interactive={true} />
          </div>

          <p className={styles.recruiterSummary}>"{recruiterSummary}"</p>
        </section>

        {/* 2. SKILL COVERAGE */}
        <SkillCoveragePanel coverageData={candidate.skillCoverage || { covered: [], partial: [], missing: [], critical: [] }} />

        {/* 3. PROJECT VALIDATION */}
        <ProjectValidationPanel projectValidationData={candidate.projectValidation} />

        {/* 4. INTERVIEW FOCUS */}
        {interviewFocus.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Interview Focus</h3>
            <ul className={styles.focusList}>
              {interviewFocus.map((focus, idx) => (
                <li key={idx} className={styles.focusItem}>{focus}</li>
              ))}
            </ul>
          </section>
        )}

        {/* 5. RECRUITER NOTES */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Recruiter Notes</h3>
          <RecruiterNotes note={note} onNoteChange={onNoteChange} />
        </section>

        {/* 6. DECISION PANEL */}
        <section className={styles.decisionPanel}>
          <h3 className={styles.decisionPanelTitle}>Hiring Decision</h3>
          <div className={styles.decisionActions}>
            <button
              onClick={() => handleQuickStatus("Shortlisted")}
              className={`${styles.decisionBtn} ${styles.btnShortlist} ${status === "Shortlisted" ? styles.btnActive : ""}`}
            >
              Shortlist
            </button>
            <button
              onClick={() => handleQuickStatus("Reviewing")}
              className={`${styles.decisionBtn} ${styles.btnReviewing} ${status === "Reviewing" ? styles.btnActive : ""}`}
            >
              Reviewing
            </button>
            <button
              onClick={() => handleQuickStatus("Interview")}
              className={`${styles.decisionBtn} ${styles.btnShortlist} ${status === "Interview" ? styles.btnActive : ""}`}
            >
              Move to Interview
            </button>
            <button
              onClick={() => handleQuickStatus("Rejected")}
              className={`${styles.decisionBtn} ${styles.btnReject} ${status === "Rejected" ? styles.btnActive : ""}`}
            >
              Reject
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
