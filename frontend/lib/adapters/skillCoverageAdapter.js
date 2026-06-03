/**
 * SkillCoverageAdapter
 * Responsible for normalizing the raw backend gap_analysis.skill_proficiency data
 * into a standardized view model for the frontend UI.
 * 
 * Follows the "Normalize Once, Render Many" architecture principle.
 */

export function normalizeSkillProficiency(skillProficiency = []) {
  const normalized = {
    covered: [],
    partial: [],
    missing: []
  };

  if (!Array.isArray(skillProficiency) || skillProficiency.length === 0) {
    return normalized;
  }

  skillProficiency.forEach(skillItem => {
    // Expected structure: { skill, required_score, candidate_score, gap }
    const name = skillItem.skill || "Unknown Skill";
    const candidateScore = typeof skillItem.candidate_score === 'number' ? skillItem.candidate_score : 0;
    const gap = typeof skillItem.gap === 'number' ? skillItem.gap : 0;

    // We preserve the name and score for rendering tooltips/details if needed
    const viewItem = { 
      name, 
      score: candidateScore,
      gap,
      // Default legacy field for backward compatibility with existing engine calculations
      coverage: candidateScore 
    };

    // Threshold Logic Matrix:
    // candidate_score >= 70 : Covered
    // candidate_score >= 40 && < 70 : Partial
    // candidate_score < 40 (or gap > 40) : Missing
    
    // Check critical gap first (aligns with backend logic)
    if (gap > 40 || candidateScore < 40) {
      normalized.missing.push(viewItem);
    } else if (candidateScore >= 70) {
      normalized.covered.push(viewItem);
    } else {
      normalized.partial.push(viewItem);
    }
  });

  return normalized;
}
