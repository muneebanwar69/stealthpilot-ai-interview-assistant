from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.core.dependencies import get_current_user

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.from_orm(current_user)

@router.patch("/me", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.profile_type is not None:
        current_user.profile_type = user_update.profile_type
    if user_update.language is not None:
        current_user.language = user_update.language
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserResponse.from_orm(current_user)

@router.get("/stats", response_model=dict)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.models.session import Session
    from sqlalchemy import func
    
    # Get session stats
    result = await db.execute(
        select(
            func.count(Session.id).label('total_sessions'),
            func.avg(Session.confidence_score).label('avg_confidence'),
            func.sum(Session.duration_seconds).label('total_duration'),
            func.sum(Session.questions_answered).label('total_questions')
        ).where(Session.user_id == current_user.id)
    )
    
    stats = result.one()
    
    return {
        "total_sessions": stats.total_sessions or 0,
        "avg_confidence_score": round(stats.avg_confidence or 0.0, 2),
        "total_time_minutes": round((stats.total_duration or 0) / 60, 2),
        "total_questions_answered": stats.total_questions or 0
    }
