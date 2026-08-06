import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundException, ValidationException
from app.services.base import BaseService
from app.models.admin import AdminUser, AuditLog, SystemSetting
from app.repositories.admin_repository import AdminRepository, AuditRepository, SystemSettingsRepository


class AdminService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = AdminRepository(session)


class SystemSettingsService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = SystemSettingsRepository(session)

    async def get_setting_value(self, key: str) -> Optional[str]:
        setting = await self.repo.get_by_key(key)
        return setting.value if setting else None

    async def update_setting(self, key: str, value: str) -> SystemSetting:
        setting = await self.repo.get_by_key(key)
        if setting:
            setting.value = value
        else:
            raise EntityNotFoundException("System setting key not found")
        await self.commit()
        return setting


class AuditService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = AuditRepository(session)

    async def log_action(self, admin_user_id: uuid.UUID, action: str, ip_address: str, details: Optional[dict] = None) -> AuditLog:
        log = await self.repo.create({
            "admin_user_id": admin_user_id,
            "action": action,
            "ip_address": ip_address,
            "details": details
        })
        await self.commit()
        return log
