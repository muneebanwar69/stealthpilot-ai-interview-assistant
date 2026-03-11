from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List
from datetime import datetime
from app.database import get_db
from app.models.user import User, UserStatus, UserRole
from app.models.session import Session
from app.schemas.user import UserResponse
from app.core.dependencies import get_current_admin

router = APIRouter()

@router.get("/users/pending", response_model=List[UserResponse])
async def get_pending_users(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User)
        .where(User.status == UserStatus.PENDING)
        .order_by(desc(User.created_at))
    )
    
    users = result.scalars().all()
    return [UserResponse.from_orm(user) for user in users]

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    status_filter: UserStatus = None,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
    offset: int = 0
):
    query = select(User).order_by(desc(User.created_at))
    
    if status_filter:
        query = query.where(User.status == status_filter)
    
    result = await db.execute(query.limit(limit).offset(offset))
    users = result.scalars().all()
    
    return [UserResponse.from_orm(user) for user in users]

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse.from_orm(user)

@router.post("/users/{user_id}/approve", response_model=UserResponse)
async def approve_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.status == UserStatus.APPROVED:
        raise HTTPException(status_code=400, detail="User already approved")
    
    user.status = UserStatus.APPROVED
    user.approved_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.from_orm(user)

@router.post("/users/{user_id}/reject", response_model=UserResponse)
async def reject_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.status = UserStatus.REJECTED
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.from_orm(user)

@router.post("/users/{user_id}/suspend", response_model=UserResponse)
async def suspend_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot suspend admin users")
    
    user.status = UserStatus.SUSPENDED
    user.is_active = False
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.from_orm(user)

@router.post("/users/{user_id}/unsuspend", response_model=UserResponse)
async def unsuspend_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.status != UserStatus.SUSPENDED:
        raise HTTPException(status_code=400, detail="User is not suspended")
    
    user.status = UserStatus.APPROVED
    user.is_active = True
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.from_orm(user)

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot delete admin users")
    
    await db.delete(user)
    await db.commit()
    
    return None

@router.get("/stats", response_model=dict)
async def get_admin_stats(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    # User stats
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar()
    
    pending_users_result = await db.execute(
        select(func.count(User.id)).where(User.status == UserStatus.PENDING)
    )
    pending_users = pending_users_result.scalar()
    
    approved_users_result = await db.execute(
        select(func.count(User.id)).where(User.status == UserStatus.APPROVED)
    )
    approved_users = approved_users_result.scalar()
    
    # Session stats
    total_sessions_result = await db.execute(select(func.count(Session.id)))
    total_sessions = total_sessions_result.scalar()
    
    avg_confidence_result = await db.execute(select(func.avg(Session.confidence_score)))
    avg_confidence = avg_confidence_result.scalar() or 0.0
    
    return {
        "total_users": total_users,
        "pending_approvals": pending_users,
        "approved_users": approved_users,
        "total_sessions": total_sessions,
        "avg_confidence_score": round(avg_confidence, 2)
    }
