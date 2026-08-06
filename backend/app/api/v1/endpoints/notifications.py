import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import PermissionDeniedException, EntityNotFoundException
from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationResponse,
    NotificationHistoryResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdateRequest,
    BroadcastNotificationRequest,
)
from app.services.notification_service import NotificationService
from app.repositories.notification_repository import NotificationRepository
from app.services.socket_service import sio

router = APIRouter()


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Notification]:
    """Lists recent notifications for the authenticated user."""
    repo = NotificationRepository(db)
    return await repo.get_multi(filters={"user_id": current_user.id})


@router.get("/unread", response_model=List[NotificationResponse])
async def list_unread_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Notification]:
    """Lists unread notifications for the user."""
    service = NotificationService(db)
    return await service.get_unread_notifications(current_user.id)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Notification:
    """Marks a specific notification as read (verifies ownership)."""
    service = NotificationService(db)
    notification = await service.repo.get(notification_id)
    if not notification or notification.user_id != current_user.id:
        raise EntityNotFoundException("Notification not found")

    return await service.mark_as_read(notification_id)


@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Marks all unread user notifications as read."""
    service = NotificationService(db)
    await service.mark_all_as_read(current_user.id)
    return {"status": "success", "message": "All notifications marked as read"}


@router.get("/preferences", response_model=NotificationPreferenceResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Retrieves user's custom channel delivery preferences."""
    service = NotificationService(db)
    return await service.get_preferences(current_user.id)


@router.put("/preferences", response_model=NotificationPreferenceResponse)
async def update_notification_preferences(
    payload: NotificationPreferenceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Updates user's custom channel delivery preferences."""
    service = NotificationService(db)
    update_data = payload.model_dump(exclude_unset=True)
    return await service.update_preferences(current_user.id, update_data)


@router.get("/history", response_model=NotificationHistoryResponse)
async def get_notifications_history(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Retrieves paginated delivery logs history for the user."""
    repo = NotificationRepository(db)
    filters = {"user_id": current_user.id}
    
    total = await repo.count(filters=filters)
    items = await repo.get_multi(
        skip=skip,
        limit=limit,
        filters=filters,
        sort_by="created_at",
        sort_desc=True
    )
    return {"total_count": total, "items": items}


@router.post("/broadcast", status_code=status.HTTP_200_OK)
async def broadcast_announcement(
    payload: BroadcastNotificationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Broadcasts a notification message to all registered users (ADMIN only)."""
    if current_user.role != "ADMIN":
        raise PermissionDeniedException("Access denied. Administrator privileges required.")

    # 1. Fetch all users
    stmt = select(User).where(User.deleted_at.is_(None))
    result = await db.execute(stmt)
    users = result.scalars().all()

    # 2. Persist in-app and dispatch Socket.IO announcements
    service = NotificationService(db)
    for u in users:
        # Create database entries
        await service.repo.create({
            "user_id": u.id,
            "title": payload.title,
            "body": payload.body,
            "status": "UNREAD"
        })
        
        # Real-time WebSocket announcement
        await sio.emit("announcement_received", {
            "title": payload.title,
            "body": payload.body
        }, room=f"passenger:{u.id}")
        await sio.emit("announcement_received", {
            "title": payload.title,
            "body": payload.body
        }, room=f"driver:{u.id}")

    await db.commit()
    return {"status": "success", "message": f"Broadcast dispatched to {len(users)} users"}
