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
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
      </div>

      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "0.5rem" }}>
              Decision Justification (Optional)
            </label>
            <textarea
              className={styles.notesTextarea}
              placeholder="Why are you making this decision? Mention specific gaps or evidence..."
              value={localJustification}
              onChange={(e) => setLocalJustification(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "0.5rem" }}>
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

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <button 
              onClick={handleSave}
              disabled={!localDecision}
              style={{ padding: "8px 16px", backgroundColor: !localDecision ? "#cbd5e1" : "#0f172a", color: "white", borderRadius: "6px", border: "none", cursor: !localDecision ? "not-allowed" : "pointer" }}
            >
              Save Decision
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "1rem", padding: "1.5rem", backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                Current Decision
              </span>
              <span style={{ fontSize: "1.25rem", fontWeight: "700", color: decision === "Reject" ? "#ef4444" : "#10b981" }}>
                {decision}
              </span>
            </div>
            <button 
              onClick={() => setIsEditing(true)}
              style={{ padding: "4px 12px", fontSize: "0.85rem", backgroundColor: "#f1f5f9", color: "#334155", borderRadius: "4px", border: "none", cursor: "pointer" }}
            >
              Edit
            </button>
          </div>
          
          {justification && (
            <div style={{ marginTop: "1rem" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                Justification
              </span>
              <p style={{ margin: "0", fontSize: "0.9rem", color: "#334155", whiteSpace: "pre-wrap" }}>
                {justification}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
