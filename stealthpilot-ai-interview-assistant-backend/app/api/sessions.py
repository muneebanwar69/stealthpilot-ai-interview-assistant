from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.session import Session
from app.schemas.session import SessionCreate, SessionResponse, SessionUpdate
from app.core.dependencies import get_current_user
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    new_session = Session(
        user_id=current_user.id,
        profile_type=session_data.profile_type,
        language=session_data.language,
        company_name=session_data.company_name,
        role_title=session_data.role_title
    )
    
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    
    return SessionResponse(
        id=new_session.id,
        user_id=new_session.user_id,
        profile_type=new_session.profile_type,
        language=new_session.language,
        company_name=new_session.company_name,
        role_title=new_session.role_title,
        started_at=new_session.started_at,
        ended_at=new_session.ended_at,
        duration_seconds=new_session.duration_seconds,
        transcript=new_session.transcript,
        ai_responses=new_session.ai_responses,
        confidence_score=new_session.confidence_score,
        questions_answered=new_session.questions_answered,
        suggestions_provided=new_session.suggestions_provided,
        session_metadata=new_session.session_metadata
    )

@router.get("/", response_model=List[SessionResponse])
async def get_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0
):
    result = await db.execute(
        select(Session)
        .where(Session.user_id == current_user.id)
        .order_by(desc(Session.started_at))
        .limit(limit)
        .offset(offset)
    )
    
    sessions = result.scalars().all()
    return [
        SessionResponse(
            id=s.id,
            user_id=s.user_id,
            profile_type=s.profile_type,
            language=s.language,
            company_name=s.company_name,
            role_title=s.role_title,
            started_at=s.started_at,
            ended_at=s.ended_at,
            duration_seconds=s.duration_seconds,
            transcript=s.transcript,
            ai_responses=s.ai_responses,
            confidence_score=s.confidence_score,
            questions_answered=s.questions_answered,
            suggestions_provided=s.suggestions_provided,
            session_metadata=s.session_metadata
        ) for s in sessions
    ]

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.user_id == current_user.id
        )
    )
    
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionResponse(
        id=session.id,
        user_id=session.user_id,
        profile_type=session.profile_type,
        language=session.language,
        company_name=session.company_name,
        role_title=session.role_title,
        started_at=session.started_at,
        ended_at=session.ended_at,
        duration_seconds=session.duration_seconds,
        transcript=session.transcript,
        ai_responses=session.ai_responses,
        confidence_score=session.confidence_score,
        questions_answered=session.questions_answered,
        suggestions_provided=session.suggestions_provided,
        session_metadata=session.session_metadata
    )

@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_update: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.user_id == current_user.id
        )
    )
    
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    update_data = session_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(session, key, value)
    
    await db.commit()
    await db.refresh(session)
    
    return SessionResponse(
        id=session.id,
        user_id=session.user_id,
        profile_type=session.profile_type,
        language=session.language,
        company_name=session.company_name,
        role_title=session.role_title,
        started_at=session.started_at,
        ended_at=session.ended_at,
        duration_seconds=session.duration_seconds,
        transcript=session.transcript,
        ai_responses=session.ai_responses,
        confidence_score=session.confidence_score,
        questions_answered=session.questions_answered,
        suggestions_provided=session.suggestions_provided,
        session_metadata=session.session_metadata
    )

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.user_id == current_user.id
        )
    )
    
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.delete(session)
    await db.commit()
    
    return None
