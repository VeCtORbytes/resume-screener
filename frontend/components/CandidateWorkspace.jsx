"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";
import RecruiterNotes from "./RecruiterNotes";
import styles from "./CandidateWorkspace.module.css";
import SkillCoveragePanel from "./SkillCoveragePanel";
import ProjectValidationPanel from "./ProjectValidationPanel";
import HiringReadinessPanel from "./HiringReadinessPanel";
import DecisionCenter from "./DecisionCenter";

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
            <div className={styles.primaryIdentity}>
              <h2 className={styles.candidateName}>{candidateName}</h2>
              <span className={`${styles.recBadge} ${styles[recInfo?.styleClass] || styles.statusBadge}`}>
                {recInfo?.text}
              </span>
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
            <div className={`${styles.metricBadge} ${styles.scoreBadge}`}>
              <span className={styles.metricLabel}>Match Score</span>
              <span className={styles.metricValue}>{score}%</span>
            </div>
            <div className={styles.statusControl}>
              <span className={styles.metricLabel}>Pipeline Status</span>
              <StatusBadge status={status} onChange={onStatusChange} interactive={true} />
            </div>
          </div>

          <p className={styles.recruiterSummary}>"{recruiterSummary}"</p>
        </section>

        {/* 2. SKILL COVERAGE */}
        <SkillCoveragePanel coverageData={candidate.skillCoverage || { covered: [], partial: [], missing: [], critical: [] }} />

        {/* 3. PROJECT VALIDATION */}
        <ProjectValidationPanel projectValidationData={candidate.projectValidation} />

        {/* 4. HIRING READINESS */}
        <HiringReadinessPanel counts={candidate.counts} hiringReadiness={candidate.hiringReadiness} />

        {/* 5. INTERVIEW FOCUS */}
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

        {/* 6. RECRUITER NOTES */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Recruiter Notes</h3>
          <RecruiterNotes note={note} onNoteChange={onNoteChange} />
        </section>

        {/* 7. DECISION CENTER */}
        <DecisionCenter candidateId={candidate.id} />

      </div>
    </div>
  );
}
