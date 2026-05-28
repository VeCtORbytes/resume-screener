from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import asyncio
import io
from uuid import UUID

from services.db_connection import get_db
from services.pdf_service import pdf_extractor
from services.groq_service import groq_screener
from services.db_service import db_service
from services.export_service import ExportService
from schemas.schemas import (
    ScreenResumeResponse,
    ResultsQueryResponse,
    ResumeResultResponse,
    ScreeningSessionResponse,
    JobDescriptionParseRequest,
    JobDescriptionParseResponse,
    CSVExportRequest,
    PDFExportRequest,
    ComparisonExportRequest
)

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
    
    import json

    # Convert to response schema
    result_responses = []
    for r in results:
        reasoning_clean = r.reasoning
        gap_analysis = None
        
        if "---GAP_ANALYSIS_JSON---" in r.reasoning:
            parts = r.reasoning.split("---GAP_ANALYSIS_JSON---")
            reasoning_clean = parts[0].strip()
            try:
                gap_analysis = json.loads(parts[1].strip())
            except Exception:
                gap_analysis = None
        
        response_item = ResumeResultResponse(
            id=r.id,
            resume_filename=r.resume_filename,
            score=r.score,
            reasoning=reasoning_clean,
            created_at=r.created_at,
            gap_analysis=gap_analysis
        )
        result_responses.append(response_item)
    
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

    import json
    job_description = screening_session.job_description
    resume_text = result.resume_text
    
    reasoning_clean = result.reasoning
    gap_info = ""
    if "---GAP_ANALYSIS_JSON---" in result.reasoning:
        parts = result.reasoning.split("---GAP_ANALYSIS_JSON---")
        reasoning_clean = parts[0].strip()
        try:
            gap_data = json.loads(parts[1].strip())
            gap_info = (
                f"\n\n[CRITICAL GAP ANALYSIS INTELLIGENCE]\n"
                f"- Must-Have Missing: {', '.join(gap_data.get('must_have_missing', []))}\n"
                f"- Good-To-Have Missing: {', '.join(gap_data.get('good_to_have_missing', []))}\n"
                f"- Critical Gaps: {', '.join(gap_data.get('critical_gaps', []))}"
            )
        except Exception:
            pass

    screening_context = f"Score: {result.score}. Reasoning: {reasoning_clean}{gap_info}"

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


@router.post("/parse-jd", response_model=JobDescriptionParseResponse)
def parse_job_description_endpoint(request: JobDescriptionParseRequest):
    """
    Semantically parse unstructured job description text into structured hiring intelligence.
    """
    try:
        parsed_intelligence = groq_screener.parse_job_description(request.job_description)
        return parsed_intelligence
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse job description semantically: {str(e)}"
        )


@router.post("/export/csv")
def export_candidates_csv(
    request: CSVExportRequest,
    db: Session = Depends(get_db)
):
    try:
        session = db_service.get_screening_session(db=db, screening_id=request.screening_id)
        if not session:
            raise HTTPException(status_code=404, detail="Screening session not found")
        
        results = []
        if request.filtered_results:
            for fr in request.filtered_results:
                res_id = UUID(fr["id"])
                res_obj = db_service.get_resume_result(db=db, result_id=res_id)
                if res_obj:
                    results.append(res_obj)
        else:
            results = db_service.get_results_for_screening(db=db, screening_id=request.screening_id)

        csv_content = ExportService.generate_csv(results, session.job_description)
        
        return StreamingResponse(
            io.BytesIO(csv_content.encode("utf-8")),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=screening_report_{str(request.screening_id)[:8]}.csv",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export CSV: {str(e)}")


@router.post("/export/pdf")
def export_candidate_pdf(
    request: PDFExportRequest,
    db: Session = Depends(get_db)
):
    try:
        result = db_service.get_resume_result(db=db, result_id=request.result_id)
        if not result:
            raise HTTPException(status_code=404, detail="Candidate result not found")
        
        session = result.screening
        if not session:
            raise HTTPException(status_code=404, detail="Screening session not found")
            
        pdf_bytes = ExportService.generate_candidate_pdf(result, session.job_description)
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={result.resume_filename.split('.')[0]}_recruiter_report.pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export candidate PDF: {str(e)}")


@router.post("/export/comparison")
def export_comparison_pdf(
    request: ComparisonExportRequest,
    db: Session = Depends(get_db)
):
    try:
        if not request.result_ids:
            raise HTTPException(status_code=400, detail="At least one candidate result ID is required")
            
        results = []
        session = None
        
        for rid in request.result_ids:
            res_obj = db_service.get_resume_result(db=db, result_id=rid)
            if res_obj:
                results.append(res_obj)
                if not session:
                    session = res_obj.screening
                    
        if not results:
            raise HTTPException(status_code=404, detail="No matching candidate results found")
            
        job_desc = session.job_description if session else "Standard Job Mandate"
        pdf_bytes = ExportService.generate_comparison_pdf(results, job_desc)
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=candidate_comparison_report.pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export comparison PDF: {str(e)}")