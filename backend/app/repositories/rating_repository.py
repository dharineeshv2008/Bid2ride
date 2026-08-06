import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.rating import Rating, Review


class RatingRepository(BaseRepository[Rating]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Rating, session)

    async def get_assignment_rating_by_role(self, assignment_id: uuid.UUID, target_role: str) -> Optional[Rating]:
        """Fetches a specific review rating for an assignment based on target role."""
        stmt = select(Rating).where(
            Rating.assignment_id == assignment_id,
            Rating.target_role == target_role
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()


class ReviewRepository(BaseRepository[Review]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Review, session)

    async def get_by_rating_id(self, rating_id: uuid.UUID) -> Optional[Review]:
        """Retrieves textual feedback associated with a rating."""
        stmt = select(Review).where(Review.rating_id == rating_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()
