"use client";

import { useState, useEffect } from "react";
import styles from "./CandidateWorkspace.module.css";
import { useRecruiterDecision } from "../hooks/useRecruiterDecision";

export default function DecisionCenter({ candidateId }) {
  const { decision, justification, lastUpdated, saveDecision } = useRecruiterDecision(candidateId);
  const [localDecision, setLocalDecision] = useState(null);
  const [localJustification, setLocalJustification] = useState("");
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    setLocalDecision(decision);
    setLocalJustification(justification || "");
    setIsEditing(!decision);
  }, [decision, justification, candidateId]);

  const handleSave = () => {
    saveDecision(localDecision, localJustification);
    setIsEditing(false);
  };

  const DECISION_OPTIONS = [
    { label: "Proceed to Interview", value: "Proceed", colorClass: styles.btnShortlist },
    { label: "Shortlist", value: "Shortlist", colorClass: styles.btnShortlist },
    { label: "Hold", value: "Hold", colorClass: styles.btnReviewing },
    { label: "Reject", value: "Reject", colorClass: styles.btnReject },
    { label: "Hired", value: "Hired", colorClass: styles.btnShortlist }
  ];

  return (
    <section className={styles.decisionPanel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 className={styles.decisionPanelTitle}>Recruiter Decision Center</h3>
        {lastUpdated && !isEditing && (
          <span style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
      </div>

      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", marginTop: "var(--space-md)" }}>
          <div>
            <label style={{ display: "block", fontSize: "var(--font-sm)", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "var(--space-xs)" }}>
              Decision Justification (Optional)
            </label>
            <textarea
              className={styles.notesTextarea}
              placeholder="Why are you making this decision? Mention specific gaps or evidence..."
              value={localJustification}
              onChange={(e) => setLocalJustification(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "var(--space-md)", borderRadius: "var(--radius-md)", border: "var(--border-subtle)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "var(--font-sm)", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "var(--space-xs)" }}>
              Final Decision
            </label>
            <div className={styles.decisionActions} style={{ flexWrap: "wrap" }}>
              {DECISION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLocalDecision(opt.value)}
                  className={`${styles.decisionBtn} ${opt.colorClass} ${localDecision === opt.value ? styles.btnActive : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-xs)" }}>
            <button 
              onClick={handleSave}
              disabled={!localDecision}
              style={{ 
                padding: "var(--space-sm) var(--space-lg)", 
                backgroundColor: !localDecision ? "var(--color-neutral-border)" : "var(--text-primary)", 
                color: "white", 
                borderRadius: "var(--radius-md)", 
                border: "none", 
                cursor: !localDecision ? "not-allowed" : "pointer" 
              }}
            >
              Save Decision
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "var(--space-md)", padding: "var(--space-xl)", backgroundColor: "var(--surface-card)", borderRadius: "var(--radius-lg)", border: "var(--border-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                Current Decision
              </span>
              <span style={{ fontSize: "var(--font-xl)", fontWeight: "700", color: decision === "Reject" ? "var(--color-danger-text)" : "var(--color-success-text)" }}>
                {decision}
              </span>
            </div>
            <button 
              onClick={() => setIsEditing(true)}
              style={{ padding: "var(--space-xs) var(--space-md)", fontSize: "var(--font-sm)", backgroundColor: "var(--surface-muted)", color: "var(--text-primary)", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer" }}
            >
              Edit
            </button>
          </div>
          
          {justification && (
            <div style={{ marginTop: "var(--space-lg)" }}>
              <span style={{ fontSize: "var(--font-xs)", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                Justification
              </span>
              <p style={{ margin: "0", fontSize: "var(--font-sm)", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                {justification}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
