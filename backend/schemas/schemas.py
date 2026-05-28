from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime

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
    """Single resume result"""
    id: UUID
    resume_filename: str
    score: int
    reasoning: str
    created_at: datetime
    gap_analysis: Optional[dict] = None
    
    class Config:
        from_attributes = True  # Can read from SQLAlchemy models


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

class ComparisonExportRequest(BaseModel):
    result_ids: List[UUID]