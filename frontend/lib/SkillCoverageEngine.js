/**
 * SkillCoverageEngine
 * Transforms raw gap_analysis data into actionable skill coverage metrics.
 */

import { normalizeSkillProficiency } from './adapters/skillCoverageAdapter';

export function calculateSkillCoverage(gapAnalysis) {
  if (!gapAnalysis) {
    return { covered: [], partial: [], missing: [], coveragePercentage: 0, gapPercentage: 100 };
  }

  // 1. Check if we have the new backend skill_proficiency data structure
  let normalized;
  
  if (gapAnalysis.skill_proficiency && gapAnalysis.skill_proficiency.length > 0) {
    normalized = normalizeSkillProficiency(gapAnalysis.skill_proficiency);
  } else {
    // 2. Fallback for legacy structured data (if any older cached records exist)
    const extractSkills = (sourceArray, defaultCoverage) => {
      return (sourceArray || []).map(item => {
        if (typeof item === 'string') {
          return { name: item, coverage: defaultCoverage };
        }
        return { 
          name: item.name || 'Unknown', 
          coverage: typeof item.coverage === 'number' ? item.coverage : defaultCoverage 
        };
      });
    };

    const matchedMustHaves = extractSkills(gapAnalysis.must_have_matched, 100);
    const matchedNiceToHaves = extractSkills(gapAnalysis.good_to_have_matched, 100);
    const missingMustHaves = extractSkills(gapAnalysis.must_have_missing, 0);
    const missingNiceToHaves = extractSkills(gapAnalysis.good_to_have_missing, 0);
    const partialSkills = extractSkills(gapAnalysis.partial_matches, 50);

    normalized = {
      covered: [...matchedMustHaves, ...matchedNiceToHaves],
      partial: [...partialSkills],
      missing: [...missingMustHaves, ...missingNiceToHaves]
    };
  }

  const { covered, partial, missing } = normalized;
  const allSkills = [...covered, ...missing, ...partial];
  
  if (allSkills.length === 0) {
    return { covered: [], partial: [], missing: [], coveragePercentage: 0, gapPercentage: 0 };
  }

  // Calculate percentage dynamically based on the current data structure
  const totalCoveragePoints = allSkills.reduce((sum, skill) => {
    // Adapter sets 'coverage' property for backward compatibility in score calculation
    return sum + (typeof skill.coverage === 'number' ? skill.coverage : 0);
  }, 0);
  
  const maxPossiblePoints = allSkills.length * 100;
  
  const coveragePercentage = Math.round((totalCoveragePoints / maxPossiblePoints) * 100);
  const gapPercentage = 100 - coveragePercentage;

  return {
    covered,
    partial,
    missing,
    coveragePercentage,
    gapPercentage,
    allSkills
  };
}
