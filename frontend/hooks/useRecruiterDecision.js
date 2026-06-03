"use client";

import { useState, useEffect } from "react";

export function useRecruiterDecision(candidateId) {
  const [decisionData, setDecisionData] = useState({
    decision: null,
    justification: "",
    lastUpdated: null
  });

  useEffect(() => {
    if (!candidateId) return;
    try {
      const stored = localStorage.getItem(`decision_${candidateId}`);
      if (stored) {
        setDecisionData(JSON.parse(stored));
      } else {
        setDecisionData({
          decision: null,
          justification: "",
          lastUpdated: null
        });
      }
    } catch (e) {
      console.error("Error loading recruiter decision", e);
    }
  }, [candidateId]);

  const saveDecision = (decision, justification) => {
    if (!candidateId) return;
    const newData = {
      decision,
      justification,
      lastUpdated: new Date().toISOString()
    };
    try {
      localStorage.setItem(`decision_${candidateId}`, JSON.stringify(newData));
      setDecisionData(newData);
    } catch (e) {
      console.error("Error saving recruiter decision", e);
    }
  };

  return {
    decision: decisionData.decision,
    justification: decisionData.justification,
    lastUpdated: decisionData.lastUpdated,
    saveDecision
  };
}
