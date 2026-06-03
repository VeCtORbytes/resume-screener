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
    missing: [],
    critical: []
  };

  if (!Array.isArray(skillProficiency) || skillProficiency.length === 0) {
    return normalized;
  }

  skillProficiency.forEach(skillItem => {
    // Expected structure: { skill, category, required_score, candidate_score, gap, evidence_quality, evidence }
    const name = skillItem.skill || "Unknown Skill";
    const candidateScore = typeof skillItem.candidate_score === 'number' ? skillItem.candidate_score : 0;
    const gap = typeof skillItem.gap === 'number' ? skillItem.gap : 0;
    const category = skillItem.category || "good_to_have";
    const evidenceQuality = skillItem.evidence_quality || "none";
    const evidence = Array.isArray(skillItem.evidence) ? skillItem.evidence : [];

    const viewItem = { 
      name, 
      score: candidateScore,
      gap,
      category,
      evidenceQuality,
      evidence,
      coverage: candidateScore // Legacy support
    };

    // Phase 4 Centralized Gap Classification Engine
    // Gap <= 15: covered
    // Gap 16-40: partial
    // Gap > 40: missing
    // Gap > 60 AND category === "must_have": critical_gap
    
    if (gap > 60 && category === "must_have") {
      normalized.critical.push(viewItem);
    } else if (gap > 40) {
      normalized.missing.push(viewItem);
    } else if (gap >= 16) {
      normalized.partial.push(viewItem);
    } else {
      normalized.covered.push(viewItem);
    }
  });

  return normalized;
}
