/**
 * Project Alignment Adapter
 * Normalizes gap_analysis.project_alignment into confirmed and partial projects.
 */

export function normalizeProjectAlignment(projectAlignment = []) {
  if (!Array.isArray(projectAlignment)) return { confirmedProjects: [], partialProjects: [] };

  const confirmedProjects = [];
  const partialProjects = [];

  projectAlignment.forEach(proj => {
    // Determine confirmation threshold (>= 50 logic isolated here)
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

  return {
    confirmedProjects,
    partialProjects,
    allProjects: [...confirmedProjects, ...partialProjects]
  };
}
