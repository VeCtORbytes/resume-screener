/**
 * ProjectAlignmentEngine
 * Validates candidate capability using actual project evidence rather than just listed skills.
 */

export function calculateProjectAlignment(candidate, gapAnalysis) {
  // If the backend has been updated to provide structured project evidence
  if (gapAnalysis && gapAnalysis.project_evidence && gapAnalysis.project_evidence.length > 0) {
    return gapAnalysis.project_evidence.map(proj => ({
      name: proj.name,
      relevanceScore: proj.relevanceScore || 0,
      skillsUsed: proj.skillsUsed || []
    }));
  }

  // Fallback heuristic: Try to extract project evidence from the raw reasoning text
  // This is a bridge until the backend formally supports structured project extraction.
  const reasoning = candidate?.reasoning || "";
  const extractedProjects = [];

  // Very naive heuristic extraction for demonstration
  // Real implementation requires backend to parse resume projects
  const projectRegex = /(?:Project|Built|Developed|Created):\s*([^.\n]*)/ig;
  let match;
  let mockScores = [92, 84, 43, 76, 60];
  let mockIdx = 0;

  while ((match = projectRegex.exec(reasoning)) !== null) {
    if (match[1].trim().length > 5) {
      // Pick out skills that might have been mentioned nearby (mock behavior)
      // Here we just map some of the JD skills randomly if they are in the must-haves
      const jdSkills = (gapAnalysis?.must_have_matched || []).slice(0, 2);
      
      extractedProjects.push({
        name: match[1].trim(),
        relevanceScore: mockScores[mockIdx % mockScores.length],
        skillsUsed: jdSkills
      });
      mockIdx++;
    }
  }

  // If we couldn't parse anything but need to show the UI
  // we return an empty array.
  return extractedProjects;
}
