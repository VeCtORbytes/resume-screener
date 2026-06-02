/**
 * SkillCoverageEngine
 * Transforms raw gap_analysis data into actionable skill coverage metrics.
 */

export function calculateSkillCoverage(gapAnalysis) {
  if (!gapAnalysis) {
    return { covered: [], partial: [], missing: [], coveragePercentage: 0, gapPercentage: 100 };
  }

  // Handle both flat lists and potentially structured backend responses
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

  // Partial skills might come from future backend updates, 
  // for now we'll heuristically flag something as partial if explicitly told by the backend.
  const partialSkills = extractSkills(gapAnalysis.partial_matches, 50);

  const covered = [...matchedMustHaves, ...matchedNiceToHaves];
  const missing = [...missingMustHaves, ...missingNiceToHaves];
  const partial = [...partialSkills];

  const allSkills = [...covered, ...missing, ...partial];
  
  if (allSkills.length === 0) {
    return { covered: [], partial: [], missing: [], coveragePercentage: 0, gapPercentage: 0 };
  }

  const totalCoveragePoints = allSkills.reduce((sum, skill) => sum + skill.coverage, 0);
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
