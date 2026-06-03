/**
 * Requirement Alignment Adapter
 * Maps textual evidence strength to UI statuses.
 */

export function normalizeRequirementAlignment(coreRequirementAlignment = []) {
  if (!Array.isArray(coreRequirementAlignment)) return [];

  const strengthToStatus = {
    "Strong Evidence": "matched",
    "Moderate Evidence": "inferred",
    "Limited Evidence": "ambiguous",
    "No Evidence": "missing"
  };

  return coreRequirementAlignment.map(item => {
    const evidenceStrength = item.evidence_strength || "No Evidence";
    const status = strengthToStatus[evidenceStrength] || "missing";
    
    return {
      name: item.requirement || "Unknown Requirement",
      evidenceStrength,
      status,
      reasoning: item.reasoning || ""
    };
  });
}
