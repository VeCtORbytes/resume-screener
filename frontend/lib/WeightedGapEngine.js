/**
 * WeightedGapEngine
 * Calculates risk by applying weights to different categories of skills.
 */

export function calculateWeightedGaps(gapAnalysis) {
  if (!gapAnalysis) {
    return { 
      weightedCoverageScore: 0, 
      weightedGapScore: 0, 
      criticalMissing: [], 
      riskIndicator: "Unknown" 
    };
  }

  // Define weights
  const MUST_HAVE_WEIGHT = 100;
  const NICE_TO_HAVE_WEIGHT = 30;

  const mustHaveMatched = gapAnalysis.must_have_matched || [];
  const mustHaveMissing = gapAnalysis.must_have_missing || [];
  const goodToHaveMatched = gapAnalysis.good_to_have_matched || [];
  const goodToHaveMissing = gapAnalysis.good_to_have_missing || [];

  // Convert to structured items with weights
  const mapWithWeight = (arr, weight, isMissing, isCritical) => 
    (arr || []).map(skill => ({
      name: typeof skill === 'string' ? skill : skill.name,
      weight,
      isMissing,
      isCritical
    }));

  const allWeightedSkills = [
    ...mapWithWeight(mustHaveMatched, MUST_HAVE_WEIGHT, false, true),
    ...mapWithWeight(goodToHaveMatched, NICE_TO_HAVE_WEIGHT, false, false),
    ...mapWithWeight(mustHaveMissing, MUST_HAVE_WEIGHT, true, true),
    ...mapWithWeight(goodToHaveMissing, NICE_TO_HAVE_WEIGHT, true, false),
  ];

  if (allWeightedSkills.length === 0) {
    return { weightedCoverageScore: 0, weightedGapScore: 0, criticalMissing: [], riskIndicator: "Low Risk" };
  }

  const maxScore = allWeightedSkills.reduce((sum, s) => sum + s.weight, 0);
  const earnedScore = allWeightedSkills
    .filter(s => !s.isMissing)
    .reduce((sum, s) => sum + s.weight, 0);

  const weightedCoverageScore = Math.round((earnedScore / maxScore) * 100);
  const weightedGapScore = 100 - weightedCoverageScore;

  const criticalMissing = allWeightedSkills
    .filter(s => s.isMissing && s.isCritical)
    .map(s => s.name);

  // Determine Risk Indicator based on missing MUST-HAVES (Critical) and overall weighted score
  let riskIndicator = "Low Risk";
  if (criticalMissing.length >= 3 || weightedGapScore > 50) {
    riskIndicator = "High Risk";
  } else if (criticalMissing.length > 0 || weightedGapScore > 25) {
    riskIndicator = "Medium Risk";
  }

  return {
    weightedCoverageScore,
    weightedGapScore,
    criticalMissing,
    riskIndicator,
    allWeightedSkills
  };
}
