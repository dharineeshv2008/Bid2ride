import datetime
import uuid
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.favorite_place import FavoritePlace
from app.schemas.favorite_place import FavoritePlaceCreateRequest, FavoritePlaceUpdateRequest


class FavoritePlaceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_user_id(self, user_id: uuid.UUID) -> List[FavoritePlace]:
        """Fetches all favorite places for a user, ordered with default place first."""
        stmt = (
            select(FavoritePlace)
            .where(FavoritePlace.user_id == user_id)
            .order_by(FavoritePlace.is_default.desc(), FavoritePlace.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_and_user_id(self, place_id: uuid.UUID, user_id: uuid.UUID) -> Optional[FavoritePlace]:
        """Fetches a favorite place by ID ensuring ownership."""
        stmt = select(FavoritePlace).where(
            FavoritePlace.id == place_id,
            FavoritePlace.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create(self, user_id: uuid.UUID, data: FavoritePlaceCreateRequest) -> FavoritePlace:
        """Creates a favorite place enforcing 1 HOME, 1 WORK, and 1 AIRPORT per user."""
        place_type = data.place_type.upper().strip()

        # Check strict 1-per-user constraint for HOME, WORK, AIRPORT
        if place_type in {"HOME", "WORK", "AIRPORT"}:
            stmt = select(FavoritePlace).where(
                FavoritePlace.user_id == user_id,
                FavoritePlace.place_type == place_type
            )
            result = await self.session.execute(stmt)
            existing = result.scalars().first()
            if existing:
                raise ValueError(f"You already have a {place_type.title()} place saved. Update or remove the existing one first.")

        # Check existing count to decide default status if first place
        existing_places = await self.get_by_user_id(user_id)
        is_default = data.is_default
        if not existing_places:
            is_default = True

        if is_default:
            # Unset default flag on any other place for this user
            await self.session.execute(
                update(FavoritePlace)
                .where(FavoritePlace.user_id == user_id)
                .values(is_default=False)
            )

        new_place = FavoritePlace(
            user_id=user_id,
            place_type=place_type,
            place_name=data.place_name.strip(),
            full_address=data.full_address.strip(),
            latitude=data.latitude,
            longitude=data.longitude,
            landmark=data.landmark.strip() if data.landmark else None,
            city=data.city.strip() if data.city else None,
            state=data.state.strip() if data.state else None,
            country=data.country.strip() if data.country else None,
            postal_code=data.postal_code.strip() if data.postal_code else None,
            is_default=is_default
        )
        self.session.add(new_place)
        await self.session.flush()
        return new_place

    async def update(self, place_id: uuid.UUID, user_id: uuid.UUID, data: FavoritePlaceUpdateRequest) -> Optional[FavoritePlace]:
        """Updates a favorite place enforcing ownership & type constraints."""
        place = await self.get_by_id_and_user_id(place_id, user_id)
        if not place:
            return None

        update_dict = data.model_dump(exclude_unset=True)

        if "place_type" in update_dict and update_dict["place_type"]:
            new_type = update_dict["place_type"].upper().strip()
            if new_type in {"HOME", "WORK", "AIRPORT"} and new_type != place.place_type:
                stmt = select(FavoritePlace).where(
                    FavoritePlace.user_id == user_id,
                    FavoritePlace.place_type == new_type,
                    FavoritePlace.id != place_id
                )
                result = await self.session.execute(stmt)
                existing = result.scalars().first()
                if existing:
                    raise ValueError(f"You already have a {new_type.title()} place saved.")
            update_dict["place_type"] = new_type

        if update_dict.get("is_default") is True:
            await self.session.execute(
                update(FavoritePlace)
                .where(FavoritePlace.user_id == user_id)
                .values(is_default=False)
            )

        for key, val in update_dict.items():
            if isinstance(val, str):
                val = val.strip()
            setattr(place, key, val)

        await self.session.flush()
        return place

    async def delete(self, place_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Deletes a favorite place and reassigns default if necessary."""
        place = await self.get_by_id_and_user_id(place_id, user_id)
        if not place:
            return False

        was_default = place.is_default
        await self.session.delete(place)
        await self.session.flush()

        if was_default:
            remaining = await self.get_by_user_id(user_id)
            if remaining:
                remaining[0].is_default = True
                await self.session.flush()

        return True

    async def set_default(self, place_id: uuid.UUID, user_id: uuid.UUID) -> Optional[FavoritePlace]:
        """Sets a specific place as default for the user."""
        target = await self.get_by_id_and_user_id(place_id, user_id)
        if not target:
            return None

        await self.session.execute(
            update(FavoritePlace)
            .where(FavoritePlace.user_id == user_id)
            .values(is_default=False)
        )

        target.is_default = True
        await self.session.flush()
        return target
