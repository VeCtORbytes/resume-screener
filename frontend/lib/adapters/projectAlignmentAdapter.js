/**
 * Project Alignment Adapter
 * Normalizes gap_analysis.project_alignment into confirmed and partial projects.
 */

export function normalizeProjectAlignment(projectValidation = [], projectAlignment = []) {
  if (Array.isArray(projectValidation) && projectValidation.length > 0) {
    // V2 Schema: project_validation
    const validated = [];
    const mentionedOnly = [];
    const partial = [];
    const missing = [];

    projectValidation.forEach(req => {
      const normalizedReq = {
        requirement: req.requirement || "Unknown",
        projectName: req.project_name || null,
        status: req.validation_status || "missing",
        evidence: req.evidence || "",
        confidence: req.confidence || "low",
        evidenceSource: req.evidence_source || "skills_section"
      };

      if (normalizedReq.status === "validated") {
        validated.push(normalizedReq);
      } else if (normalizedReq.status === "mentioned_only") {
        mentionedOnly.push(normalizedReq);
      } else if (normalizedReq.status === "partial") {
        partial.push(normalizedReq);
      } else {
        missing.push(normalizedReq);
      }
    });

    return {
      format: "v2",
      validated,
      mentionedOnly,
      partial,
      missing
    };
  }

  // V1 Legacy Schema: project_alignment
  const confirmedProjects = [];
  const partialProjects = [];

  if (Array.isArray(projectAlignment)) {
    projectAlignment.forEach(proj => {
      const isConfirmed = typeof proj.alignment_score === 'number' && proj.alignment_score >= 50;
      
      const normalizedProj = {
        name: proj.project_name || "Unknown Project",
        alignmentScore: proj.alignment_score || 0,
        matchedSkills: proj.matched_skills || [],
        missingSkills: proj.missing_skills || [],
        isConfirmed
      };

      if (isConfirmed) {
        confirmedProjects.push(normalizedProj);
      } else {
        partialProjects.push(normalizedProj);
      }
    });
  }

  return {
    format: "legacy",
    confirmedProjects,
    partialProjects,
    allProjects: [...confirmedProjects, ...partialProjects]
  };
}
