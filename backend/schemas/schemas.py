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


class JobDescriptionParseRequest(BaseModel):
    """Data sent from client when requesting semantic JD parsing"""
    job_description: str = Field(..., min_length=10, max_length=5000)


class JobDescriptionParseResponse(BaseModel):
    """Structured hiring intelligence extracted from job description"""
    job_title: str
    must_have_skills: List[str]
    good_to_have_skills: List[str]
    responsibilities: List[str]
    experience_requirements: List[str]
    education_requirements: List[str]

    class Config:
        json_schema_extra = {
            "example": {
                "job_title": "Full Stack Developer (MERN Stack)",
                "must_have_skills": ["React.js", "JavaScript (ES6+)", "Node.js", "Express.js", "MongoDB"],
                "good_to_have_skills": ["AI API integration (Groq / OpenAI)", "Deployment experience (Vercel / Render)"],
                "responsibilities": ["Develop responsive React interfaces", "Build Express APIs", "Design MongoDB schemas"],
                "experience_requirements": ["Internship / Fresher / 0–1 Year"],
                "education_requirements": ["B.Tech / BE in Computer Science or related field"]
            }
        }