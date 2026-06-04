from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime

# ── Candidate Extraction ───────────────────────────────────────────────

class SkillExperience(BaseModel):
    """Candidate skill with evidence"""
    name: str
    proficiency_level: str = Field(..., pattern="^(beginner|intermediate|advanced|expert)$")
    years_of_experience: Optional[float]
    evidence: List[str]  # Exact quotes from resume

class CandidateProfile(BaseModel):
    """Structured candidate profile extracted from resume"""
    name: Optional[str]
    total_experience_years: Optional[float]
    skills: List[SkillExperience] = []
    projects: List[dict] = []
    education: Optional[List[str]] = None  # ← Make Optional
    certifications: Optional[List[str]] = None  # ← Make Optional
    red_flags: Optional[List[str]] = None  # ← Make Optional

    def __init__(self, **data):
        """Convert None to empty lists"""
        super().__init__(**data)
        if self.education is None:
            self.education = []
        if self.certifications is None:
            self.certifications = []
        if self.red_flags is None:
            self.red_flags = []

    class Config:
        from_attributes = True

# ── Semantic Matching ──────────────────────────────────────────────────

class SkillMatch(BaseModel):
    """Per-skill matching result"""
    skill_name: str
    job_importance: int = Field(..., ge=0, le=100)
    candidate_proficiency: int = Field(..., ge=0, le=100)
    confidence: str = Field(..., pattern="^(high|medium|low)$")
    evidence: Optional[str]
    gap: int  # job_importance - candidate_proficiency

class SemanticMatchingResult(BaseModel):
    """Skill-by-skill matching breakdown"""
    matched_skills: List[SkillMatch] = []
    partial_skills: List[SkillMatch] = []
    missing_skills: List[SkillMatch] = []

    class Config:
        from_attributes = True


# ── Weighted Evaluation ────────────────────────────────────────────────

class WeightedEvaluation(BaseModel):
    """Scored breakdown (replaces single score)"""
    must_have_completeness: int = Field(..., ge=0, le=100)  # % of must-haves matched
    must_have_depth: int = Field(..., ge=0, le=100)  # Proficiency of matched must-haves
    nice_to_have_bonus: int = Field(..., ge=0, le=50)  # % bonus from nice-to-haves
    risk_penalty: int = Field(..., le=0, ge=-50)  # Penalty for critical gaps
    overall_fit: int = Field(..., ge=0, le=100)  # Weighted average

    class Config:
        from_attributes = True

# ── Hiring Intelligence ────────────────────────────────────────────────

class HiringIntelligence(BaseModel):
    """Evidence-backed intelligence for recruiter decision"""
    strengths: List[str] = []  # Factual strengths
    risks: List[str] = []  # Evidence-backed risks
    critical_gaps: List[str] = []  # Must-haves missing
    recommendation: str = Field(..., pattern="^(Strong Hire|Hire|Marginal|Don't Hire)$")
    interview_focus_areas: List[str] = []

    class Config:
        from_attributes = True

# ── V2 Engine Data (Complete Structure) ────────────────────────────────

class V2EngineData(BaseModel):
    """Complete Evaluation Engine 2.0 output"""
    candidate_profile: CandidateProfile
    semantic_matching: SemanticMatchingResult
    weighted_evaluation: WeightedEvaluation
    hiring_intelligence: HiringIntelligence
    extraction_confidence: dict  # {score, label, reasons}
    reliability_signals: dict  # {ai_confidence, evidence_strength, etc}

    class Config:
        from_attributes = True



# Request schemas (incoming data from frontend)

class ScreenResumeRequest(BaseModel):
    """Data sent from frontend when uploading resumes"""
    job_description: str = Field(..., min_length=10, max_length=5000)
    
    class Config:
        json_schema_extra = {
            "example": {
                "job_description": "Senior React Developer with 5+ years experience"
            }
        }


# Response schemas (data sent back to frontend)

class ResumeResultResponse(BaseModel):
    """Single resume result (with backward compat)"""
    id: UUID
    resume_filename: str
    score: int
    reasoning: str
    created_at: datetime
    gap_analysis: Optional[dict] = None
    v2_engine_data: Optional[dict] = None  # ← Just dict, no strict validation
    
    class Config:
        from_attributes = True

class ScreeningSessionResponse(BaseModel):
    """Screening session with all results"""
    id: UUID
    job_description: str
    result_count: int
    created_at: datetime
    expires_at: datetime
    
    class Config:
        from_attributes = True


class ScreenResumeResponse(BaseModel):
    """Response when screening is complete"""
    screening_id: UUID
    status: str = "success"
    resume_count: int
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "screening_id": "550e8400-e29b-41d4-a716-446655440000",
                "status": "success",
                "resume_count": 5,
                "message": "All resumes screened successfully"
            }
        }


class ResultsQueryResponse(BaseModel):
    """Response when fetching results"""
    screening_id: UUID
    results: List[ResumeResultResponse]
    
    class Config:
        from_attributes = True


class WeightedSkill(BaseModel):
    """Represents a job requirement skill with assigned semantic importance"""
    name: str
    importance: int = Field(..., ge=0, le=100)
    category: str = Field(..., pattern="^(must_have|good_to_have)$")
    rationale: str


class JobDescriptionParseRequest(BaseModel):
    """Data sent from client when requesting semantic JD parsing"""
    job_description: str = Field(..., min_length=10, max_length=5000)


class JobDescriptionParseResponse(BaseModel):
    """Structured hiring intelligence extracted from job description"""
    job_title: str
    must_have_skills: List[str] = []
    good_to_have_skills: List[str] = []
    responsibilities: List[str] = []
    experience_requirements: List[str] = []
    education_requirements: List[str] = []
    weighted_skills: List[WeightedSkill] = []

    class Config:
        json_schema_extra = {
            "example": {
                "job_title": "Full Stack Developer (MERN Stack)",
                "must_have_skills": ["React.js", "JavaScript (ES6+)", "Node.js", "Express.js", "MongoDB"],
                "good_to_have_skills": ["AI API integration (Groq / OpenAI)", "Deployment experience (Vercel / Render)"],
                "weighted_skills": [
                    {
                        "name": "JavaScript",
                        "importance": 100,
                        "category": "must_have",
                        "rationale": "Must be highly proficient in JavaScript"
                    },
                    {
                        "name": "React",
                        "importance": 90,
                        "category": "must_have",
                        "rationale": "Strong React expertise required"
                    },
                    {
                        "name": "REST APIs",
                        "importance": 80,
                        "category": "must_have",
                        "rationale": "Experience with REST APIs"
                    },
                    {
                        "name": "Docker",
                        "importance": 40,
                        "category": "good_to_have",
                        "rationale": "Good to have Docker"
                    },
                    {
                        "name": "AWS",
                        "importance": 20,
                        "category": "good_to_have",
                        "rationale": "Nice to have AWS"
                    }
                ],
                "responsibilities": ["Develop responsive React interfaces", "Build Express APIs", "Design MongoDB schemas"],
                "experience_requirements": ["Internship / Fresher / 0–1 Year"],
                "education_requirements": ["B.Tech / BE in Computer Science or related field"]
            }
        }


# Export request schemas
class CSVExportRequest(BaseModel):
    screening_id: UUID
    filtered_results: Optional[List[dict]] = None

class PDFExportRequest(BaseModel):
    result_id: UUID
    recruiter_notes: Optional[str] = None
    current_stage: Optional[str] = None
    interview_questions: Optional[List[str]] = None

class ComparisonExportRequest(BaseModel):
    result_ids: List[UUID]