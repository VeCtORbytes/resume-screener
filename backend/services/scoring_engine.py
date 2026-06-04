import logging
from typing import List, Dict
from schemas.schemas import (
    SkillMatch, SemanticMatchingResult, WeightedEvaluation, 
    HiringIntelligence, CandidateProfile
)

logger = logging.getLogger(__name__)

class ScoringEngine:
    """Deterministic weighted scoring and gap analysis"""
    
    @staticmethod
    def calculate_gap_analysis(
        candidate_profile: CandidateProfile,
        jd_weighted_skills: List[Dict]
    ) -> SemanticMatchingResult:
        """
        Match candidate skills to JD requirements.
        
        Inputs:
            candidate_profile: Extracted candidate with skills
            jd_weighted_skills: [{"name": "React", "importance": 90, "category": "must_have"}]
        
        Returns: SemanticMatchingResult with matched/partial/missing
        """
        
        candidate_skill_names = {s.name.lower() for s in candidate_profile.skills}
        candidate_skills_by_name = {s.name.lower(): s for s in candidate_profile.skills}
        
        matched = []
        partial = []
        missing = []
        
        for jd_skill in jd_weighted_skills:
            skill_name = jd_skill.get("name", "").lower()
            importance = jd_skill.get("importance", 50)
            category = jd_skill.get("category", "must_have")
            
            if skill_name in candidate_skill_names:
                candidate_skill = candidate_skills_by_name[skill_name]
                
                # Map proficiency level to score
                proficiency_map = {
                    "beginner": 20,
                    "intermediate": 50,
                    "advanced": 80,
                    "expert": 100
                }
                candidate_score = proficiency_map.get(
                    candidate_skill.proficiency_level.lower(), 50
                )
                
                gap = importance - candidate_score
                
                if gap <= 10:
                    # Strong match
                    matched.append(SkillMatch(
                        skill_name=jd_skill.get("name", ""),
                        job_importance=importance,
                        candidate_proficiency=candidate_score,
                        confidence="high",
                        evidence="; ".join(candidate_skill.evidence[:2]) if candidate_skill.evidence else None,
                        gap=gap
                    ))
                else:
                    # Partial match
                    partial.append(SkillMatch(
                        skill_name=jd_skill.get("name", ""),
                        job_importance=importance,
                        candidate_proficiency=candidate_score,
                        confidence="medium",
                        evidence="; ".join(candidate_skill.evidence[:2]) if candidate_skill.evidence else None,
                        gap=gap
                    ))
            else:
                # Missing
                missing.append(SkillMatch(
                    skill_name=jd_skill.get("name", ""),
                    job_importance=importance,
                    candidate_proficiency=0,
                    confidence="low",
                    evidence=None,
                    gap=importance
                ))
        
        return SemanticMatchingResult(
            matched_skills=matched,
            partial_skills=partial,
            missing_skills=missing
        )
    
    @staticmethod
    def calculate_weighted_evaluation(
        semantic_matching: SemanticMatchingResult,
        jd_weighted_skills: List[Dict]
    ) -> WeightedEvaluation:
        """
        Calculate weighted scoring breakdown.
        
        Formula (Hierarchical):
        1. If must_have_completeness < 60: hard fail (overall = 40)
        2. Else: overall = (completeness * 0.6) + (depth * 0.3) + nice_bonus - penalty
        """
        
        # Separate must-have vs nice-to-have
        must_have_skills = [s for s in jd_weighted_skills if s.get("category") == "must_have"]
        nice_to_have_skills = [s for s in jd_weighted_skills if s.get("category") == "good_to_have"]
        
        # ── Must-Have Completeness ────────────────────────────────────────
        if must_have_skills:
            must_have_matched = sum(
                1 for m in semantic_matching.matched_skills
                if any(s.get("name") == m.skill_name for s in must_have_skills)
            )
            must_have_completeness = int((must_have_matched / len(must_have_skills)) * 100)
        else:
            must_have_completeness = 100
        
        # ── Must-Have Depth (avg proficiency of matched must-haves) ─────────
        matched_must_haves = [
            m for m in semantic_matching.matched_skills
            if any(s.get("name") == m.skill_name for s in must_have_skills)
        ]
        if matched_must_haves:
            must_have_depth = int(
                sum(m.candidate_proficiency for m in matched_must_haves) / len(matched_must_haves)
            )
        else:
            must_have_depth = 0
        
        # ── Nice-To-Have Bonus ────────────────────────────────────────────
        if nice_to_have_skills:
            nice_matched = sum(
                1 for m in semantic_matching.matched_skills
                if any(s.get("name") == m.skill_name for s in nice_to_have_skills)
            )
            nice_to_have_bonus = int((nice_matched / len(nice_to_have_skills)) * 30)
        else:
            nice_to_have_bonus = 0
        
        # ── Risk Penalty ──────────────────────────────────────────────────
        # Critical gaps: must-have missing with high importance (importance > 70)
        critical_gaps = [
            m for m in semantic_matching.missing_skills
            if m.job_importance > 70
        ]
        risk_penalty = min(0, -5 * len(critical_gaps))
        
        # ── Hierarchical Scoring ──────────────────────────────────────────
        if must_have_completeness < 60:
            # Hard fail: missing critical requirements
            overall_fit = 40
        else:
            # Weighted formula
            overall_fit = int(
                (must_have_completeness * 0.6) +
                (must_have_depth * 0.3) +
                (nice_to_have_bonus / 30 * 10) +  # Normalize bonus to 0-10
                risk_penalty
            )
            overall_fit = max(0, min(100, overall_fit))
        
        logger.info(
            f"Weighted evaluation: completeness={must_have_completeness}, "
            f"depth={must_have_depth}, bonus={nice_to_have_bonus}, "
            f"penalty={risk_penalty}, overall={overall_fit}"
        )
        
        return WeightedEvaluation(
            must_have_completeness=must_have_completeness,
            must_have_depth=must_have_depth,
            nice_to_have_bonus=nice_to_have_bonus,
            risk_penalty=risk_penalty,
            overall_fit=overall_fit
        )
    
    @staticmethod
    def synthesize_hiring_intelligence(
        candidate_profile: CandidateProfile,
        semantic_matching: SemanticMatchingResult,
        weighted_evaluation: WeightedEvaluation
    ) -> HiringIntelligence:
        """
        Synthesize hiring intelligence from evaluation results.
        """
        
        strengths = []
        risks = []
        critical_gaps = []
        
        # ── Strengths ─────────────────────────────────────────────────────
        if weighted_evaluation.must_have_completeness >= 80:
            strengths.append(
                f"Strong coverage of core requirements ({weighted_evaluation.must_have_completeness}% completeness)"
            )
        
        if weighted_evaluation.must_have_depth >= 80:
            strengths.append("Deep expertise in must-have technologies")
        
        if semantic_matching.matched_skills:
            top_matches = sorted(
                semantic_matching.matched_skills,
                key=lambda x: x.candidate_proficiency,
                reverse=True
            )[:3]
            if top_matches:
                skills_str = ", ".join([m.skill_name for m in top_matches])
                strengths.append(f"Proven expertise in {skills_str}")
        
        # ── Risks ─────────────────────────────────────────────────────────
        if weighted_evaluation.must_have_completeness < 60:
            risks.append("Missing core requirements for the role")
        
        if semantic_matching.missing_skills:
            high_importance_missing = [
                m for m in semantic_matching.missing_skills
                if m.job_importance > 70
            ]
            if high_importance_missing:
                skills = ", ".join([m.skill_name for m in high_importance_missing])
                risks.append(f"No evidence of {skills} (critical requirements)")
                critical_gaps = [m.skill_name for m in high_importance_missing]
        
        if candidate_profile.red_flags:
            risks.extend([f"Resume flag: {flag}" for flag in candidate_profile.red_flags[:2]])
        
        # ── Recommendation ────────────────────────────────────────────────
        if weighted_evaluation.overall_fit >= 80:
            recommendation = "Strong Hire"
        elif weighted_evaluation.overall_fit >= 65:
            recommendation = "Hire"
        elif weighted_evaluation.overall_fit >= 50:
            recommendation = "Marginal"
        else:
            recommendation = "Don't Hire"
        
        # ── Interview focus ───────────────────────────────────────────────
        interview_focus = []
        
        # Probe critical gaps
        for gap in semantic_matching.missing_skills[:3]:
            if gap.job_importance > 70:
                interview_focus.append(
                    f"Probe experience with {gap.skill_name} (required, not evident in resume)"
                )
        
        # Deep dive on partial matches
        for partial in semantic_matching.partial_skills[:2]:
            interview_focus.append(
                f"Deep dive: {partial.skill_name} proficiency (candidate shows intermediate level, role requires advanced)"
            )
        
        return HiringIntelligence(
            strengths=strengths if strengths else ["Candidate profile reviewed"],
            risks=risks,
            critical_gaps=critical_gaps,
            recommendation=recommendation,
            interview_focus_areas=interview_focus
        )


# Global instance
scoring_engine = ScoringEngine()