from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List

class SessionCreate(BaseModel):
    profile_type: str = "interview"
    language: str = "en"
    company_name: Optional[str] = None
    role_title: Optional[str] = None

class SessionUpdate(BaseModel):
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    transcript: Optional[str] = None
    ai_responses: Optional[List[Dict[str, Any]]] = None
    confidence_score: Optional[float] = None
    questions_answered: Optional[int] = None
    suggestions_provided: Optional[int] = None
    session_metadata: Optional[Dict[str, Any]] = None

class SessionResponse(BaseModel):
    id: int
    user_id: int
    profile_type: str
    language: str
    company_name: Optional[str]
    role_title: Optional[str]
    started_at: datetime
    ended_at: Optional[datetime]
    duration_seconds: int
    transcript: Optional[str]
    ai_responses: Optional[List[Dict[str, Any]]]
    confidence_score: float
    questions_answered: int
    suggestions_provided: int
    session_metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True
