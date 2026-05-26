from sqlalchemy.orm import Session
from sqlalchemy import desc
from models.models import ScreeningSession, ResumeResult
from schemas.schemas import ResumeResultResponse
from uuid import UUID
from typing import List
from datetime import datetime

class DatabaseService:
    """Handle all database operations"""
    
    @staticmethod
    def create_screening_session(db: Session, job_description: str) -> ScreeningSession:
        """
        Create a new screening session.
        
        Returns: ScreeningSession object
        """
        session = ScreeningSession(job_description=job_description)
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    
    @staticmethod
    def create_resume_result(
        db: Session,
        screening_id: UUID,
        resume_filename: str,
        resume_text: str,
        score: int,
        reasoning: str
    ) -> ResumeResult:
        """
        Create a resume result record.
        
        Returns: ResumeResult object
        """
        result = ResumeResult(
            screening_id=screening_id,
            resume_filename=resume_filename,
            resume_text=resume_text,
            score=score,
            reasoning=reasoning
        )
        db.add(result)
        db.commit()
        db.refresh(result)
        return result
    
    @staticmethod
    def create_bulk_results(
        db: Session,
        screening_id: UUID,
        results_data: List[dict]
    ) -> List[ResumeResult]:
        """
        Create multiple resume results in one transaction.
        
        Args:
            screening_id: Which screening session
            results_data: List of {"filename", "text", "score", "reasoning"}
        
        Returns: List of created ResumeResult objects
        """
        created_results = []
        
        for data in results_data:
            result = ResumeResult(
                screening_id=screening_id,
                resume_filename=data["filename"],
                resume_text=data["text"],
                score=data["score"],
                reasoning=data["reasoning"]
            )
            db.add(result)
            created_results.append(result)
        
        db.commit()
        return created_results
    
    @staticmethod
    def get_screening_session(db: Session, screening_id: UUID) -> ScreeningSession:
        """Fetch a screening session by ID"""
        return db.query(ScreeningSession).filter(
            ScreeningSession.id == screening_id
        ).first()
    
    @staticmethod
    def get_results_for_screening(
        db: Session,
        screening_id: UUID,
        min_score: int = 0
    ) -> List[ResumeResult]:
        """
        Fetch all resume results for a screening session.
        
        Args:
            screening_id: Which screening
            min_score: Filter by minimum score (0-100)
        
        Returns: List of results sorted by score descending
        """
        query = db.query(ResumeResult).filter(
            ResumeResult.screening_id == screening_id,
            ResumeResult.score >= min_score
        ).order_by(desc(ResumeResult.score))
        
        return query.all()
    
    @staticmethod
    def update_session_result_count(db: Session, screening_id: UUID, count: int) -> None:
        """Update the result_count field in screening session"""
        session = db.query(ScreeningSession).filter(
            ScreeningSession.id == screening_id
        ).first()
        
        if session:
            session.result_count = count
            db.commit()
    
    @staticmethod
    def delete_expired_records(db: Session) -> int:
        """
        Delete screening sessions and results that have expired (30 days old).
        
        Returns: Number of records deleted
        """
        # Delete expired resume_results (cascade will handle screening_sessions)
        result = db.query(ResumeResult).filter(
            ResumeResult.expires_at < datetime.now(datetime.timezone.utc)
        ).delete()
        
        db.commit()
        return result

    @staticmethod
    def get_resume_result(db: Session, result_id: UUID) -> ResumeResult:
        """Fetch a single resume result by ID"""
        return db.query(ResumeResult).filter(
            ResumeResult.id == result_id
        ).first()

    @staticmethod
    def get_all_screening_sessions(db: Session) -> List[ScreeningSession]:
        """Fetch all screening sessions sorted by created_at descending"""
        return db.query(ScreeningSession).order_by(desc(ScreeningSession.created_at)).all()


# Create global instance
db_service = DatabaseService()