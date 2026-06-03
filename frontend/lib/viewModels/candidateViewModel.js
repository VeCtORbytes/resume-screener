/**
 * Candidate ViewModel Factory
 * Assembles the final normalized structure for UI consumption.
 */

import { parseCandidateName, parseHiringRecommendation } from "../adapters/candidateAdapter";
import { normalizeSkillProficiency } from "../adapters/skillCoverageAdapter";
import { normalizeProjectAlignment } from "../adapters/projectAlignmentAdapter";
import { normalizeRequirementAlignment } from "../adapters/requirementAlignmentAdapter";
import { calculateHiringReadiness } from "../adapters/readinessAdapter";

export function buildCandidateViewModel(candidate, status = "New", recruiterNote = "") {
  const score = typeof candidate.score === 'number' ? candidate.score : 0;
  const name = parseCandidateName(candidate.resume_filename);
  const recommendation = parseHiringRecommendation(score);
  
  const gapData = candidate.gap_analysis || {};
  
  // Use the new Phase 4 adapter to generate the normalized skill coverage arrays
  const skillCoverage = normalizeSkillProficiency(gapData.skill_proficiency);
  
  // Project Validation (passes V2 and V1 payloads for fallback support)
  const projectValidation = normalizeProjectAlignment(gapData.project_validation, gapData.project_alignment);
  
  // Requirement Alignment
  const requirementAlignment = normalizeRequirementAlignment(gapData.core_requirement_alignment);

  // Phase 6 Counts & Readiness
  const counts = {
    criticalGapsCount: skillCoverage.critical?.length || 0,
    coveredSkillsCount: skillCoverage.covered?.length || 0,
    partialSkillsCount: skillCoverage.partial?.length || 0,
    missingSkillsCount: skillCoverage.missing?.length || 0,
    validatedRequirementsCount: projectValidation.validated?.length || projectValidation.confirmedProjects?.length || 0,
    mentionedOnlyCount: projectValidation.mentionedOnly?.length || 0,
    missingValidationCount: projectValidation.missing?.length || 0
  };

  const hiringReadiness = calculateHiringReadiness(counts);

  return {
    id: candidate.id,
    originalFilename: candidate.resume_filename,
    name,
    score,
    recommendation,
    status,
    recruiterNote,
    summary: gapData.candidate_summary || "No summary available.",
    interviewFocus: gapData.interview_focus || gapData.areas_to_validate || [],
    skillCoverage,
    projectValidation,
    requirementAlignment,
    counts,
    hiringReadiness,
    
    // Pass along raw result for any deeply nested historical data needed in the future,
    // but UI should prefer the mapped properties above.
    _raw: candidate
  };
}
