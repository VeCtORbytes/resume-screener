from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import asyncio

from services.db_connection import get_db
from services.pdf_service import pdf_extractor
from services.groq_service import groq_screener
from services.db_service import db_service
from schemas.schemas import ScreenResumeResponse, ResultsQueryResponse, ResumeResultResponse, ScreeningSessionResponse

router = APIRouter(prefix="/api", tags=["screening"])

@router.post("/screen", response_model=ScreenResumeResponse)
async def screen_resumes(
    job_description: str = Form(...),
    resumes: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload resumes and job description, get screening results.
    
    - Receives: multipart form with job_description + resume PDFs
    - Returns: screening_id so frontend can fetch results
    """
    
    # Validate inputs
    if not job_description or len(job_description.strip()) < 10:
        raise HTTPException(status_code=400, detail="Job description must be at least 10 characters")
    
    if not resumes or len(resumes) == 0:
        raise HTTPException(status_code=400, detail="At least one resume file required")
    
    if len(resumes) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 resumes per batch")
    
    try:
        # Step 1: Create screening session in database
        screening_session = db_service.create_screening_session(
            db=db,
            job_description=job_description
        )
        screening_id = screening_session.id
        
        # Step 2: Extract text from all PDFs
        resume_data = []
        for resume_file in resumes:
            try:
                # Read file bytes
                file_bytes = await resume_file.read()
                
                # Extract text
                text = pdf_extractor.extract_text(file_bytes, resume_file.filename)
                
                resume_data.append({
                    "filename": resume_file.filename,
                    "text": text
                })
            
            except ValueError as e:
                # Log error but continue with other resumes
                print(f"Error processing {resume_file.filename}: {str(e)}")
                continue
        
        if not resume_data:
            raise HTTPException(status_code=400, detail="No valid PDFs could be processed")
        
        # Step 3: Screen all resumes in parallel using Groq
        screening_results = await groq_screener.screen_resumes_parallel(
            resumes=resume_data,
            job_description=job_description
        )
        
        # Step 4: Store results in database (map by filename to prevent score-to-resume index mismatch)
        results_to_save = []
        for result in screening_results:
            filename = result["filename"]
            # Locate the original resume text mapped to this filename
            matching_resume = next((r for r in resume_data if r["filename"] == filename), None)
            resume_text = matching_resume["text"] if matching_resume else ""
            
            results_to_save.append({
                "filename": filename,
                "text": resume_text,
                "score": result["score"],
                "reasoning": result["reasoning"]
            })
        
        db_service.create_bulk_results(
            db=db,
            screening_id=screening_id,
            results_data=results_to_save
        )
        
        # Step 5: Update result count in session
        db_service.update_session_result_count(
            db=db,
            screening_id=screening_id,
            count=len(screening_results)
        )
        
        # Step 6: Return success response
        return ScreenResumeResponse(
            screening_id=screening_id,
            status="success",
            resume_count=len(screening_results),
            message=f"Successfully screened {len(screening_results)} resumes"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error screening resumes: {str(e)}"
        )


@router.get("/results/{screening_id}", response_model=ResultsQueryResponse)
def get_results(
    screening_id: str,
    min_score: int = 0,
    db: Session = Depends(get_db)
):
    """
    Fetch screening results for a session.
    
    - screening_id: UUID from POST /api/screen
    - min_score: Filter results (0-100, default 0)
    
    Returns: Screening session + ranked resume results
    """
    
    # Validate min_score
    if min_score < 0 or min_score > 100:
        raise HTTPException(status_code=400, detail="min_score must be 0-100")
    
    try:
        # Convert string to UUID
        from uuid import UUID
        screening_uuid = UUID(screening_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid screening_id format")
    
    # Fetch screening session
    session = db_service.get_screening_session(db=db, screening_id=screening_uuid)
    
    if not session:
        raise HTTPException(status_code=404, detail="Screening session not found")
    
    # Fetch results with filtering
    results = db_service.get_results_for_screening(
        db=db,
        screening_id=screening_uuid,
        min_score=min_score
    )
    
    # Convert to response schema
    result_responses = [
        ResumeResultResponse.from_orm(r) for r in results
    ]
    
    return ResultsQueryResponse(
        screening_id=screening_uuid,
        results=result_responses
    )


@router.post("/results/{result_id}/questions")
def generate_candidate_questions(
    result_id: str,
    db: Session = Depends(get_db)
):
    """
    Generate tailored interview questions for a candidate result on-demand.
    """
    try:
        from uuid import UUID
        result_uuid = UUID(result_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid result_id format")

    result = db_service.get_resume_result(db=db, result_id=result_uuid)
    if not result:
        raise HTTPException(status_code=404, detail="Candidate result not found")

    # Access the related job description
    screening_session = result.screening
    if not screening_session:
        raise HTTPException(status_code=404, detail="Associated screening session not found")

    job_description = screening_session.job_description
    resume_text = result.resume_text
    screening_context = f"Score: {result.score}. Reasoning: {result.reasoning}"

    try:
        questions = groq_screener.generate_interview_questions(
            resume_text=resume_text,
            job_description=job_description,
            screening_context=screening_context
        )
        return questions
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate interview questions: {str(e)}"
        )


@router.get("/sessions", response_model=List[ScreeningSessionResponse])
def get_all_sessions(db: Session = Depends(get_db)):
    """
    Fetch all screening sessions for the screening history sidebar / dashboard.
    """
    try:
        sessions = db_service.get_all_screening_sessions(db=db)
        return [ScreeningSessionResponse.from_orm(s) for s in sessions]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching screening sessions: {str(e)}"
        )