"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";
import CandidateOverview from "./CandidateOverview";
import CoreRequirementAlignment from "./CoreRequirementAlignment";
import SkillsAlignment from "./SkillsAlignment";
import InterviewToolkit from "./InterviewToolkit";
import AdvancedIntelligence from "./AdvancedIntelligence";
import styles from "./CandidateWorkspace.module.css";

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

// Interview toolkit section uses slightly more contextual language
function getInterviewRecommendation(score) {
  if (score >= 80) {
    return {
      label: "Recommended for Interview",
      class: styles.highlyReady,
      desc: "Strong alignment with role requirements and demonstrated project experience."
    };
  }
  if (score >= 65) {
    return {
      label: "Potential Match — Screening Recommended",
      class: styles.ready,
      desc: "Solid alignment with core requirements. Recommended for an initial phone screen."
    };
  }
  if (score >= 50) {
    return {
      label: "Requires Further Review",
      class: styles.conditionallyReady,
      desc: "Some requirement gaps identified. Review experience details before deciding."
    };
  }
  return {
    label: "Limited Alignment",
    class: styles.notReady,
    desc: "Substantial gaps in core requirement matching. Not recommended at this stage."
  };
}

// Robust regex-based reasoning text parser (backward compat for old DB records)
function parseReasoning(reasoning) {
  if (!reasoning) return null;

  try {
    const hasBreakdown = reasoning.includes("Breakdown:") || reasoning.includes("Breakdown");
    const hasStrengths = reasoning.includes("Strengths:") || reasoning.includes("Strengths");
    const hasGaps = reasoning.includes("Gaps:") || reasoning.includes("Gaps");

    if (!hasBreakdown && !hasStrengths && !hasGaps) {
      return { type: "raw", text: reasoning };
    }

    let recommendation = "";
    const recMatch = reasoning.match(/Recommendation:\s*([^\n\r]+)/i);
    if (recMatch) recommendation = recMatch[1].trim();

    const breakdown = {
      skills: 0, maxSkills: 40,
      experience: 0, maxExperience: 25,
      projects: 0, maxProjects: 20,
      education: 0, maxEducation: 10,
      domain: 0, maxDomain: 5
    };

    const skillsMatch = reasoning.match(/(?:Skills|Skills Match):\s*(\d+)/i);
    if (skillsMatch) breakdown.skills = parseInt(skillsMatch[1]);

    const expMatch = reasoning.match(/(?:Experience|Experience Relevance):\s*(\d+)/i);
    if (expMatch) breakdown.experience = parseInt(expMatch[1]);

    const projMatch = reasoning.match(/(?:Projects|Project Relevance):\s*(\d+)/i);
    if (projMatch) breakdown.projects = parseInt(projMatch[1]);

    const eduMatch = reasoning.match(/(?:Education|Education & Certifications):\s*(\d+)/i);
    if (eduMatch) breakdown.education = parseInt(eduMatch[1]);

    const domMatch = reasoning.match(/(?:Domain|Domain & Keyword Fit):\s*(\d+)/i);
    if (domMatch) breakdown.domain = parseInt(domMatch[1]);

    let strengths = [];
    const strengthsParts = reasoning.split(/✅ Strengths:|Strengths:/i);
    if (strengthsParts.length > 1) {
      const strengthsText = strengthsParts[1].split(/⚠️ Gaps:|Gaps:/i)[0];
      strengths = strengthsText
        .split("\n")
        .map(line => line.replace(/^[-•*✅\s]+/, "").trim())
        .filter(line => line.length > 3);
    }

    let gaps = [];
    const gapsParts = reasoning.split(/⚠️ Gaps:|Gaps:/i);
    if (gapsParts.length > 1) {
      gaps = gapsParts[1]
        .split("\n")
        .map(line => line.replace(/^[-•*⚠️\s]+/, "").trim())
        .filter(line => line.length > 3);
    }

    return { type: "structured", recommendation, breakdown, strengths, gaps };
  } catch (e) {
    console.error("Error parsing reasoning text:", e);
    return { type: "raw", text: reasoning };
  }
}

function getBriefingText(result, parsed) {
  if (!result.reasoning) return "";
  const rawSummary = result.reasoning
    .split(/Strengths:|Gaps:/i)[0]
    .replace(/Recommendation:\s*[^\n\r]+/i, "")
    .replace(/AI Recruiter Summary/gi, "")
    .trim();

  let cleanedText = rawSummary
    .replace(/Llama-3.3/g, "HireLens")
    .replace(/our AI recruiter/gi, "HireLens")
    .replace(/the AI evaluation/gi, "our screening")
    .replace(/standardized mathematical grading rubric/gi, "target criteria")
    .replace(/AI confidence/gi, "evaluation clarity")
    .replace(/evidence_strength/gi, "clarity of profile documentation")
    .replace(/reliability_signals/gi, "profile completeness indicators");

  if (!cleanedText && parsed?.strengths) {
    cleanedText = parsed.strengths.join(". ") + ".";
  }

  return cleanedText
    .replace(/^\d+[\.)] \s*/gm, "")
    .replace(/^[-•*]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
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
  candidateQuestions,
  onGenerateQuestions,
  isGeneratingQuestions = false,
}) {
  const score = candidate.score || 0;
  const parsed = parseReasoning(candidate.reasoning);
  const recInfo = getRecommendation(score);
  const interviewRec = getInterviewRecommendation(score);
  const briefingText = getBriefingText(candidate, parsed);
  const candidateName = getCandidateName(candidate.resume_filename);

  const scoreClass = score >= 80
    ? styles.excellent
    : score >= 60
      ? styles.good
      : score >= 40
        ? styles.fair
        : styles.poor;

  // Quick-decision handler helpers
  const handleQuickStatus = (newStatus) => {
    if (onStatusChange) onStatusChange(newStatus);
  };

  return (
    <div className={styles.dossierContainer}>

      {/* Dossier section label */}
      <div className={styles.workspaceSectionHeader}>
        <span className={styles.stepBadge}>Candidate Profile</span>
        <h3 className={styles.stepTitle}>Evaluation & Decision</h3>
        <p className={styles.stepSubtitle}>Full evaluation and interview preparation for this candidate.</p>
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

        {/* SECTION 1: Unified Candidate Header */}
        <div className={styles.dossierHeaderCard}>

          {/* Top row: label + secondary actions */}
          <div className={styles.dossierHeaderTopRow}>
            <span className={styles.dossierFileLabel}>Candidate Profile</span>
            <div className={styles.dossierSecondaryActions}>
              <button
                onClick={() => onExportPdf(candidate.id, candidate.resume_filename)}
                disabled={isExportingPdf}
                className={styles.dossierSecondaryBtn}
              >
                Export PDF
              </button>
              <label className={styles.dossierCompareLabel}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect(candidate.id)}
                  className={styles.dossierCompareCheckbox}
                />
                <span>Compare</span>
              </label>
            </div>
          </div>

          {/* Candidate name — primary element */}
          <h2 className={styles.dossierCandidateName}>{candidateName}</h2>

          {/* Recommendation — second most prominent */}
          <div className={styles.dossierRecRow}>
            <span className={`${styles.dossierRecLabel} ${recInfo.class}`}>{recInfo.text}</span>
            <span className={styles.dossierScoreSupport}>Score: {score}</span>
          </div>

          {/* Recommendation description */}
          <p className={styles.dossierRecDesc}>{interviewRec.desc}</p>

          {/* Status + quick-decision buttons */}
          <div className={styles.dossierDecisionRow}>
            <div className={styles.dossierStatusControl}>
              <span className={styles.dossierStatusLabel}>Stage</span>
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
          {/* SECTION 2: Candidate Overview */}
          <CandidateOverview
            summary={briefingText}
            strengths={parsed?.strengths || []}
            gaps={parsed?.gaps || []}
            gapAnalysis={candidate.gap_analysis}
          />

          {/* SECTION 3: Core Requirement Alignment */}
          <CoreRequirementAlignment
            alignments={candidate.gap_analysis?.core_requirement_alignment || []}
          />

          {/* SECTION 4: Skills Alignment */}
          <SkillsAlignment gapAnalysis={candidate.gap_analysis} />

          {/* SECTION 5: Interview Toolkit */}
          <InterviewToolkit
            interviewRec={interviewRec}
            candidateQuestions={candidateQuestions}
            onGenerateQuestions={onGenerateQuestions}
            isGenerating={isGeneratingQuestions}
            note={note}
            onNoteChange={onNoteChange}
            candidateId={candidate.id}
            interviewFocus={candidate.gap_analysis?.interview_focus || []}
          />

          {/* SECTION 6: Supporting Details (collapsible) */}
          <AdvancedIntelligence candidate={candidate} />
        </div>
      </div>
    </div>
  );
}
