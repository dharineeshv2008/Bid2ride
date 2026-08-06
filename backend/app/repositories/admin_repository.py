import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.admin import AdminUser, AuditLog, SystemSetting


class AdminRepository(BaseRepository[AdminUser]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(AdminUser, session)


class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(AuditLog, session)


class SystemSettingsRepository(BaseRepository[SystemSetting]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(SystemSetting, session)

    async def get_by_key(self, key: str) -> Optional[SystemSetting]:
        """Fetches a configuration setting by its unique lookup key."""
        stmt = select(SystemSetting).where(SystemSetting.key == key)
        result = await self.session.execute(stmt)
        return result.scalars().first()
