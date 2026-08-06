from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationException
from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    OtpSendRequest,
    OtpSendResponse,
    OtpVerifyRequest,
    TokenResponse,
    TokenRefreshRequest,
    UserMeResponse,
    DevLoginRequest,
    DevLoginResponse,
    SendOtpRequest,
    VerifyOtpRequest,
    FirebaseLoginRequest,
    UserSettingsResponse,
    UserSettingsUpdateRequest,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/dev-login", response_model=DevLoginResponse, status_code=status.HTTP_200_OK)
async def dev_login_endpoint(payload: DevLoginRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Development-mode login: bypasses OTP/SMS and auto-authenticates a demo user.

    Only available when DEVELOPMENT_MODE=true. Issues the same JWT credentials as
    the production OTP flow so all downstream behaviour is identical.
    """
    if not settings.DEVELOPMENT_MODE:
        raise AuthenticationException(
            "Development login is disabled. Set DEVELOPMENT_MODE=true to enable."
        )

    auth_service = AuthService(db)
    access_token, refresh_token, current_user = await auth_service.dev_login(
        phone=payload.phone,
        role=payload.role,
        password=payload.password,
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": current_user,
    }


@router.post("/send-otp", response_model=None, status_code=status.HTTP_200_OK)
async def send_otp_frontend_endpoint(payload: SendOtpRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Frontend-facing OTP entry point.

    In DEVELOPMENT_MODE, OTP/SMS is bypassed and a demo user is
    auto-authenticated, returning JWT credentials directly. In production the
    normal OTP dispatch flow runs and a session id is returned.
    """
    auth_service = AuthService(db)
    if settings.DEVELOPMENT_MODE:
        role = payload.role or "PASSENGER"
        access_token, refresh_token, current_user = await auth_service.dev_login(
            phone=payload.phone,
            role=role,
            password=payload.password,
        )
        return {
            "success": True,
            "development_mode": True,
            "message": "OTP bypassed",
            "token": access_token,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": UserMeResponse.model_validate(current_user).model_dump(),
        }
    session_id = await auth_service.send_otp(payload.phone)
    return {"status": "success", "session_id": session_id}


@router.post("/verify-otp", response_model=None, status_code=status.HTTP_200_OK)
async def verify_otp_frontend_endpoint(payload: VerifyOtpRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Frontend-facing OTP verification entry point.

    In DEVELOPMENT_MODE this is a no-op bypass that auto-authenticates.
    In production it validates the SMS code sent to the phone number.
    """
    auth_service = AuthService(db)
    if settings.DEVELOPMENT_MODE:
        role = payload.role or "PASSENGER"
        access_token, refresh_token, current_user = await auth_service.dev_login(
            phone=payload.phone,
            role=role,
        )
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": UserMeResponse.model_validate(current_user).model_dump(),
        }
    access_token, refresh_token, current_user = await auth_service.verify_otp_by_phone(
        phone=payload.phone,
        code=payload.otp,
        name=payload.name,
        role=payload.role or "PASSENGER",
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserMeResponse.model_validate(current_user).model_dump(),
    }


@router.post("/otp/send", response_model=OtpSendResponse, status_code=status.HTTP_200_OK)
async def send_otp_endpoint(payload: OtpSendRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Dispatches a 4-digit OTP SMS verification code to the target phone number."""
    auth_service = AuthService(db)
    session_id = await auth_service.send_otp(payload.phone)
    return {"status": "success", "session_id": session_id}


@router.post("/otp/verify", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def verify_otp_endpoint(payload: OtpVerifyRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Validates the OTP code and returns access/refresh JWT tokens (registers user on first login)."""
    auth_service = AuthService(db)
    access_token, refresh_token = await auth_service.verify_otp(payload.session_id, payload.code)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def refresh_tokens_endpoint(payload: TokenRefreshRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Rotates refresh tokens and issues a new access token using strict RTR rules."""
    auth_service = AuthService(db)
    access_token, refresh_token = await auth_service.rotate_tokens(payload.refresh_token)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_endpoint(payload: TokenRefreshRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Revokes the refresh token and terminates the active session."""
    auth_service = AuthService(db)
    await auth_service.logout(payload.refresh_token)
    return {"status": "success", "message": "Successfully logged out"}


@router.post("/firebase-login", response_model=None, status_code=status.HTTP_200_OK)
async def firebase_login_endpoint(payload: FirebaseLoginRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Exchanges a verified Firebase ID Token for backend JWT access and refresh tokens."""
    auth_service = AuthService(db)
    access_token, refresh_token, current_user = await auth_service.firebase_login(
        firebase_token=payload.firebase_token,
        role=payload.role or "PASSENGER",
        name=payload.name,
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserMeResponse.model_validate(current_user).model_dump(),
    }


@router.get("/me", response_model=UserMeResponse, status_code=status.HTTP_200_OK)
async def get_current_user_profile(current_user: User = Depends(get_current_user)) -> User:
    """Retrieves the authenticated user profile information."""
    return current_user


@router.get("/settings", response_model=UserSettingsResponse, status_code=status.HTTP_200_OK)
async def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves settings for the current user."""
    from app.models.user import UserSettings
    from sqlalchemy import select
    stmt = select(UserSettings).where(UserSettings.id == current_user.id)
    res = await db.execute(stmt)
    settings = res.scalars().first()
    if not settings:
        settings = UserSettings(id=current_user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.put("/settings", response_model=UserSettingsResponse, status_code=status.HTTP_200_OK)
async def update_user_settings(
    payload: UserSettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates settings for the current user."""
    from app.models.user import UserSettings
    from sqlalchemy import select
    
    stmt = select(UserSettings).where(UserSettings.id == current_user.id)
    res = await db.execute(stmt)
    settings = res.scalars().first()
    if not settings:
        settings = UserSettings(id=current_user.id)
        db.add(settings)
        await db.flush()

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)

    await db.commit()
    await db.refresh(settings)
    return settings

