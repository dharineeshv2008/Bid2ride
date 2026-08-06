import uuid
from typing import Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundException, ValidationException
from app.services.base import BaseService
from app.models.rating import Rating, Review
from app.repositories.rating_repository import RatingRepository, ReviewRepository
from app.repositories.user_repository import UserRepository


class RatingService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = RatingRepository(session)
        self.review_repo = ReviewRepository(session)
        self.user_repo = UserRepository(session)

    async def submit_rating_review(
        self,
        assignment_id: uuid.UUID,
        reviewer_id: uuid.UUID,
        target_role: str,
        target_user_id: uuid.UUID,
        rating_value: int,
        feedback_text: Optional[str] = None
    ) -> Tuple[Rating, Optional[Review]]:
        # Enforce rating boundaries
        if rating_value < 1 or rating_value > 5:
            raise ValidationException("Rating value must be between 1 and 5")

        # Check existing review to prevent double ratings
        existing = await self.repo.get_assignment_rating_by_role(assignment_id, target_role)
        if existing:
            raise ValidationException("Assignment already rated for this role target")

        # Create rating
        rating = await self.repo.create({
            "assignment_id": assignment_id,
            "reviewer_id": reviewer_id,
            "target_role": target_role,
            "rating_value": rating_value
        })
        await self.session.flush()

        review = None
        if feedback_text:
            # Create associated review feedback text
            review = await self.review_repo.create({
                "rating_id": rating.id,
                "feedback_text": feedback_text
            })

        # Dynamically recalculate target user aggregated rating averages
        target_user = await self.user_repo.get_by_id(target_user_id)
        if target_user:
            if target_role == "PASSENGER" and target_user.passenger:
                passenger = target_user.passenger
                current_sum = float(passenger.rating) * passenger.rating_count
                passenger.rating_count += 1
                passenger.rating = (current_sum + rating_value) / passenger.rating_count
            elif target_role == "DRIVER" and target_user.driver:
                driver = target_user.driver
                current_sum = float(driver.rating) * driver.rating_count
                driver.rating_count += 1
                driver.rating = (current_sum + rating_value) / driver.rating_count

        await self.commit()
        return rating, review
