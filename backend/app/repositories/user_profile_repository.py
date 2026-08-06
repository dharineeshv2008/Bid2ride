import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.user_profile import UserProfileCreateRequest, UserProfileUpdateRequest


class UserProfileRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_user_id(self, user_id: uuid.UUID) -> Optional[UserProfile]:
        """Fetches profile by user ID."""
        stmt = select(UserProfile).where(UserProfile.id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_or_create(self, user_id: uuid.UUID) -> UserProfile:
        """Fetches profile for user ID, creating a default profile record if none exists."""
        profile = await self.get_by_user_id(user_id)
        if not profile:
            profile = UserProfile(id=user_id)
            self.session.add(profile)
            await self.session.flush()
        return profile

    async def update(self, user_id: uuid.UUID, data: UserProfileUpdateRequest) -> UserProfile:
        """Updates user profile and optional user name/email fields."""
        profile = await self.get_or_create(user_id)
        update_dict = data.model_dump(exclude_unset=True)

        if "name" in update_dict:
            new_name = update_dict.pop("name")
            if new_name and new_name.strip():
                user_stmt = select(User).where(User.id == user_id)
                user_res = await self.session.execute(user_stmt)
                user_obj = user_res.scalars().first()
                if user_obj:
                    user_obj.name = new_name.strip()

        for key, val in update_dict.items():
            if hasattr(profile, key):
                if isinstance(val, str):
                    val = val.strip()
                setattr(profile, key, val)

        await self.session.flush()
        return profile

    async def update_photo(self, user_id: uuid.UUID, avatar_url: str) -> UserProfile:
        """Updates user profile avatar URL."""
        profile = await self.get_or_create(user_id)
        profile.avatar_url = avatar_url
        await self.session.flush()
        return profile
