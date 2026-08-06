import uuid
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.notification import Notification


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(Notification, session)

    async def get_unread_user_notifications(self, user_id: uuid.UUID) -> List[Notification]:
        """Fetches unread notifications for a user."""
        stmt = select(Notification).where(
            Notification.user_id == user_id,
            Notification.status == "UNREAD"
        ).order_by(Notification.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
