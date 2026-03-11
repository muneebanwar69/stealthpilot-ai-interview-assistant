from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    profile_type = Column(String, default="interview")
    language = Column(String, default="en")
    company_name = Column(String, nullable=True)
    role_title = Column(String, nullable=True)
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, default=0)
    
    transcript = Column(Text, nullable=True)
    ai_responses = Column(JSON, nullable=True)
    confidence_score = Column(Float, default=0.0)
    
    questions_answered = Column(Integer, default=0)
    suggestions_provided = Column(Integer, default=0)
    
    session_metadata = Column(JSON, nullable=True)
    
    # Relationship
    user = relationship("User", back_populates="sessions")
