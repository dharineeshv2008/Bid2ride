import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.favorite_place import (
    FavoritePlaceCreateRequest,
    FavoritePlaceUpdateRequest,
    FavoritePlaceResponse,
    SetDefaultFavoritePlaceRequest,
)
from app.schemas.user_profile import (
    UserProfileResponse,
    UserProfileUpdateRequest,
    ProfilePhotoUploadRequest,
)
from app.repositories.favorite_place_repository import FavoritePlaceRepository
from app.repositories.user_profile_repository import UserProfileRepository


router = APIRouter()


@router.get("/favorite-places", response_model=List[FavoritePlaceResponse])
async def list_favorite_places(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all favorite places for the authenticated user."""
    repo = FavoritePlaceRepository(db)
    places = await repo.get_by_user_id(current_user.id)
    return places


@router.post("/favorite-places", response_model=FavoritePlaceResponse, status_code=status.HTTP_201_CREATED)
async def create_favorite_place(
    data: FavoritePlaceCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new favorite place for the authenticated user."""
    repo = FavoritePlaceRepository(db)
    try:
        place = await repo.create(current_user.id, data)
        await db.commit()
        await db.refresh(place)
        return place
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/favorite-places/{place_id}", response_model=FavoritePlaceResponse)
async def update_favorite_place(
    place_id: uuid.UUID,
    data: FavoritePlaceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing favorite place owned by the user."""
    repo = FavoritePlaceRepository(db)
    try:
        place = await repo.update(place_id, current_user.id, data)
        if not place:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Favorite place not found or access denied."
            )
        await db.commit()
        await db.refresh(place)
        return place
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/favorite-places/{place_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_favorite_place(
    place_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a favorite place owned by the user."""
    repo = FavoritePlaceRepository(db)
    success = await repo.delete(place_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite place not found or access denied."
        )
    await db.commit()


@router.patch("/favorite-places/default", response_model=FavoritePlaceResponse)
async def set_default_favorite_place(
    data: SetDefaultFavoritePlaceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set a specified favorite place as the default location."""
    repo = FavoritePlaceRepository(db)
    place = await repo.set_default(data.place_id, current_user.id)
    if not place:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite place not found or access denied."
        )
    await db.commit()
    await db.refresh(place)
    return place


# --- User Profile Endpoints ---

def _build_profile_response(profile: UserProfile, current_user: User) -> UserProfileResponse:
    res = UserProfileResponse.model_validate(profile)
    res.name = current_user.name
    return res


@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve personal profile details for current authenticated user (auto-creates if missing)."""
    repo = UserProfileRepository(db)
    profile = await repo.get_or_create(current_user.id)
    await db.commit()
    if profile in db:
        try:
            await db.refresh(profile)
        except Exception:
            pass
    return _build_profile_response(profile, current_user)


@router.put("/profile", response_model=UserProfileResponse)
@router.patch("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    data: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update personal profile fields (supports full or partial updates)."""
    repo = UserProfileRepository(db)
    profile = await repo.update(current_user.id, data)
    await db.commit()
    if profile in db:
        try:
            await db.refresh(profile)
        except Exception:
            pass
    if current_user in db:
        try:
            await db.refresh(current_user)
        except Exception:
            pass
    return _build_profile_response(profile, current_user)


@router.post("/profile/photo", response_model=UserProfileResponse)
async def upload_profile_photo(
    data: ProfilePhotoUploadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload or update profile photo avatar URL / base64."""
    repo = UserProfileRepository(db)
    profile = await repo.update_photo(current_user.id, data.photo_base64)
    await db.commit()
    if profile in db:
        try:
            await db.refresh(profile)
        except Exception:
            pass
    return _build_profile_response(profile, current_user)


