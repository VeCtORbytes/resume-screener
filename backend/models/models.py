from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, CheckConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timedelta
import uuid

Base = declarative_base()

class ScreeningSession(Base):
    """Represents one batch of resume screening"""
    __tablename__ = "screening_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), default=lambda: datetime.now(datetime.timezone.utc) + timedelta(days=30), nullable=False)
    result_count = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship to resume_results
    results = relationship("ResumeResult", back_populates="screening", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ScreeningSession(id={self.id}, job_description={self.job_description[:50]}...)>"


class ResumeResult(Base):
    """Represents one resume's screening result"""
    __tablename__ = "resume_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    screening_id = Column(UUID(as_uuid=True), ForeignKey("screening_sessions.id", ondelete="CASCADE"), nullable=False)
    resume_filename = Column(String(255), nullable=False)
    resume_text = Column(Text, nullable=False)
    score = Column(Integer, nullable=False)
    reasoning = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), default=lambda: datetime.now(datetime.timezone.utc) + timedelta(days=30), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship to screening_sessions
    screening = relationship("ScreeningSession", back_populates="results")
    
    __table_args__ = (
        CheckConstraint("score >= 0 AND score <= 100", name="score_range_check"),
    )
    
    def __repr__(self):
        return f"<ResumeResult(id={self.id}, score={self.score}, filename={self.resume_filename})>"