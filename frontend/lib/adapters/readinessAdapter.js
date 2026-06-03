/**
 * Hiring Readiness Adapter
 * Deterministic rule engine to calculate candidate readiness based on Phase 4 and Phase 5 data.
 */

export function calculateHiringReadiness({
  criticalGapsCount,
  missingSkillsCount,
  validatedRequirementsCount,
  partialSkillsCount,
  missingValidationCount
}) {
  // Rule 1: Not Ready
  // - Critical Gaps present OR
  // - Missing multiple requirements
  if (criticalGapsCount > 0 || missingSkillsCount >= 3 || missingValidationCount >= 4) {
    return {
      status: "Not Ready",
      reasons: [
        criticalGapsCount > 0 ? `${criticalGapsCount} critical gap(s) detected.` : null,
        missingSkillsCount >= 3 ? `${missingSkillsCount} missing skills.` : null,
        missingValidationCount >= 4 ? `${missingValidationCount} requirements lack project validation.` : null,
      ].filter(Boolean)
    };
  }

  // Rule 2: Ready for Interview
  // - No critical gaps
  // - Strong validation
  if (criticalGapsCount === 0 && validatedRequirementsCount >= 2 && missingSkillsCount <= 1) {
    return {
      status: "Ready for Interview",
      reasons: [
        "No critical gaps detected.",
        `${validatedRequirementsCount} requirements validated by project evidence.`,
        missingSkillsCount > 0 ? "Minor skill gaps acceptable for interview stage." : "Strong skill coverage."
      ]
    };
  }

  // Rule 3: Requires Further Review (Fallback)
  return {
    status: "Requires Further Review",
    reasons: [
      partialSkillsCount > 0 ? `${partialSkillsCount} skills only partially covered.` : null,
      missingValidationCount > 0 ? `${missingValidationCount} requirements need validation.` : null,
      "Candidate meets baseline but lacks strong project evidence."
    ].filter(Boolean)
  };
}
