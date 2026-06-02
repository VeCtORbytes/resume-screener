"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";
import RecruiterNotes from "./RecruiterNotes";
import styles from "./CandidateWorkspace.module.css";
import { calculateSkillCoverage } from "../lib/SkillCoverageEngine";

function getCandidateName(filename) {
  if (!filename) return "Unknown Candidate";
  let name = filename.split('.')[0].replace(/[_]/g, ' ').replace(/[-]/g, ' ');
  name = name.replace(/\b(resume|cv|pdf|docx)\b/gi, '').trim();
  return name.replace(/\b\w/g, c => c.toUpperCase());
}

function getRecommendation(score) {
  if (score >= 90) return { text: "Recommended for Interview", class: styles.recBadge };
  if (score >= 80) return { text: "Potential Match",           class: styles.recBadge };
  if (score >= 65) return { text: "Requires Further Review",   class: styles.statusBadge };
  if (score >= 50) return { text: "Requires Further Review",   class: styles.statusBadge };
  return             { text: "Limited Alignment",              class: styles.scoreBadge };
}

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
  const recInfo = getRecommendation(score);
  const candidateName = getCandidateName(candidate.resume_filename);

  // Data processing
  const gapData = candidate.gap_analysis || {};
  const coverageData = calculateSkillCoverage(gapData);
  const { covered, partial, missing } = coverageData;
  const recruiterSummary = gapData.candidate_summary || "No summary available.";
  const projects = gapData.project_alignment || [];
  const interviewFocus = gapData.interview_focus || gapData.areas_to_validate || [];

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
              onClick={() => onExportPdf(candidate.id, candidate.resume_filename)}
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
            <span className={`${styles.metricBadge} ${recInfo.class}`}>
              {recInfo.text}
            </span>
            <StatusBadge status={status} onChange={onStatusChange} interactive={true} />
          </div>

          <p className={styles.recruiterSummary}>"{recruiterSummary}"</p>
        </section>

        {/* 2. SKILL COVERAGE */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Skill Coverage</h3>
          
          {(covered.length === 0 && partial.length === 0 && missing.length === 0) ? (
            <p className={styles.projectDetailText}>No skill coverage data available.</p>
          ) : (
            <>
              {covered.length > 0 && (
                <div className={styles.skillCategory}>
                  <h4 className={styles.skillCategoryTitle}>Covered Skills</h4>
                  <div className={styles.chipList}>
                    {covered.map((skill, i) => (
                      <span key={i} className={`${styles.chip} ${styles.chipCovered}`}>✓ {skill.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {partial.length > 0 && (
                <div className={styles.skillCategory}>
                  <h4 className={styles.skillCategoryTitle}>Partial Experience</h4>
                  <div className={styles.chipList}>
                    {partial.map((skill, i) => (
                      <span key={i} className={`${styles.chip} ${styles.chipPartial}`}>⚠ {skill.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {missing.length > 0 && (
                <div className={styles.skillCategory}>
                  <h4 className={styles.skillCategoryTitle}>Missing Skills</h4>
                  <div className={styles.chipList}>
                    {missing.map((skill, i) => (
                      <span key={i} className={`${styles.chip} ${styles.chipMissing}`}>✕ {skill.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* 3. PROJECT VALIDATION */}
        {projects.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Project Validation</h3>
            <div className={styles.projectList}>
              {projects.map((proj, idx) => {
                const isConfirmed = proj.alignment_score >= 50;
                return (
                  <div key={idx} className={styles.projectCard}>
                    <div className={styles.projectHeader}>
                      <h4 className={styles.projectName}>{proj.project_name}</h4>
                      <span className={`${styles.projectStatus} ${isConfirmed ? styles.statusConfirmed : styles.statusPartial}`}>
                        {isConfirmed ? "Confirmed" : "Partial"}
                      </span>
                    </div>
                    {proj.matched_skills && proj.matched_skills.length > 0 && (
                      <div className={styles.projectDetail}>
                        <span className={styles.projectDetailLabel}>Validated Technologies</span>
                        <div className={styles.techList}>
                          {proj.matched_skills.map((tech, i) => (
                            <span key={i} className={styles.techChip}>{tech}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
