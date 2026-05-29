"use client";

import { useState } from "react";
import RecruiterNotes from "./RecruiterNotes";
import styles from "./CandidateWorkspace.module.css";

export default function InterviewToolkit({
  interviewRec = {},
  candidateQuestions,
  onGenerateQuestions,
  isGenerating = false,
  note = "",
  onNoteChange,
  candidateId,
  interviewFocus = [],
}) {
  const [copiedText, setCopiedText] = useState(null);
  const [activeTab, setActiveTab] = useState("technical");

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const tabsConfig = [
    { key: "technical", label: "Technical Fit" },
    { key: "project_deep_dive", label: "Project Details" },
    { key: "behavioral", label: "Behavioral" },
    { key: "risk_probing", label: "Concerns Probing" }
  ];

  return (
    <div className={styles.dossierSectionCard}>
      <h3 className={styles.dossierSectionHeading}>Interview Diagnostic Toolkit</h3>
      
      {/* 1. Consolidated Interview Recommendation Briefing Card */}
      <div className={`${styles.toolkitRecCard} ${interviewRec.class || ""}`}>
        <h4 className={styles.toolkitRecTitle}>Interview Recommendation</h4>
        <div className={styles.toolkitRecContent}>
          <span className={styles.toolkitRecLabel}>{interviewRec.label}</span>
          <p className={styles.toolkitRecDesc}>{interviewRec.desc}</p>
        </div>
      </div>

      {/* Grid for Probing Areas & Recruiter Decision Notes */}
      <div className={styles.toolkitGrid}>
        
        {/* Suggested Diagnostic Questions Probing Areas */}
        <div className={styles.probingQuestionsArea}>
      <h4 className={styles.dossierSubheading}>Interview Questions</h4>
          <p className={styles.toolkitInstructions}>Questions tailored to this candidate's profile and the role requirements:</p>
          
          {candidateQuestions ? (
            <div className={styles.toolkitTabbedGroup}>
              <div className={styles.dossierTabHeaders}>
                {tabsConfig.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`${styles.dossierTabBtn} ${activeTab === tab.key ? styles.activeDossierTab : ""}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              
              <div className={styles.dossierTabPane}>
                {(candidateQuestions[activeTab] || []).length > 0 ? (
                  <div className={styles.suggestedQuestionsList}>
                    {(candidateQuestions[activeTab] || []).map((q, idx) => (
                      <div key={idx} className={styles.suggestedQuestionRow}>
                        <p className={styles.suggestedQuestionText}>{q}</p>
                        <button
                          onClick={() => handleCopy(q)}
                          className={`${styles.questionCopyBtn} ${copiedText === q ? styles.questionCopied : ""}`}
                        >
                          {copiedText === q ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyQuestionsText}>No custom questions generated in this category.</p>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.emptyToolkitBriefing}>
              {interviewFocus && interviewFocus.length > 0 && (
                <div className={styles.interviewFocusList}>
                  <h4 className={styles.dossierSubheading} style={{ marginBottom: '0.75rem' }}>Suggested Focus Areas</h4>
                  <ul className={styles.interviewFocusItems}>
                    {interviewFocus.map((focus, idx) => (
                      <li key={idx} className={styles.interviewFocusItem}>
                        <span className={styles.interviewFocusBullet}>→</span>
                        <span>{focus}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className={styles.toolkitInstructions}>Generate tailored behavioral, technical, and concern-probing questions based on the candidate's profile.</p>
              <button
                onClick={() => onGenerateQuestions(candidateId)}
                disabled={isGenerating}
                className={styles.dossierActionBtn}
              >
                {isGenerating ? "Generating…" : "Generate Interview Questions"}
              </button>
            </div>
          )}
        </div>

        {/* Inline Recruiter Decision Commentary Area */}
        <div className={styles.commentaryArea}>
          <RecruiterNotes note={note} onNoteChange={onNoteChange} />
        </div>

      </div>
    </div>
  );
}
