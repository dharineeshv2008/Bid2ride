from sqlalchemy.ext.asyncio import AsyncSession


class BaseService:
    """Base class for all domain business services, managing access to async DB sessions."""
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def commit(self) -> None:
        """Commits changes within the transaction block."""
        await self.session.commit()

    async def rollback(self) -> None:
        """Rollbacks changes within the transaction block on failure."""
        await self.session.rollback()
