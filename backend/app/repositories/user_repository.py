import datetime
import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, RefreshToken, UserSettings
from app.models.driver import Passenger, Driver
from app.models.payment import Wallet
from app.models.admin import AdminUser


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Fetches a user profile by their primary key UUID."""
        stmt = select(User).where(User.id == user_id, User.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_phone(self, phone: str) -> Optional[User]:
        """Fetches a user profile by phone number (checks soft-deleted state)."""
        stmt = select(User).where(User.phone == phone, User.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create(self, name: str, phone: str, role: str = "PASSENGER", email: Optional[str] = None) -> User:
        """Creates a User and dynamically creates associated role subclasses, wallets, and settings."""
        user = User(name=name, phone=phone, role=role, email=email)
        self.session.add(user)
        await self.session.flush()  # Populates user.id

        # Auto-create related entities
        if role == "PASSENGER":
            passenger = Passenger(id=user.id)
            self.session.add(passenger)
        elif role == "DRIVER":
            driver = Driver(id=user.id, license_number=f"MOCK-LIC-{uuid.uuid4().hex[:10].upper()}")
            self.session.add(driver)
        elif role == "ADMIN":
            admin = AdminUser(id=user.id, role_level="SUPERADMIN")
            self.session.add(admin)

        # Auto-create user wallet
        wallet = Wallet(user_id=user.id)
        self.session.add(wallet)

        # Auto-create user settings
        settings = UserSettings(id=user.id)
        self.session.add(settings)


        return user


class RefreshTokenRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, user_id: uuid.UUID, jti: uuid.UUID, token_hash: str, expires_at: Optional[datetime.datetime] = None) -> RefreshToken:
        """Stores a refresh token hash in the database."""
        db_token = RefreshToken(
            user_id=user_id,
            jti=jti,
            token_hash=token_hash,
            expires_at=expires_at
        )
        self.session.add(db_token)
        return db_token

    async def get_by_jti(self, jti: uuid.UUID) -> Optional[RefreshToken]:
        """Retrieves a refresh token record by its JTI."""
        stmt = select(RefreshToken).where(RefreshToken.jti == jti)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def revoke(self, jti: uuid.UUID) -> bool:
        """Revokes a refresh token, rendering it unusable for rotation checks."""
        token = await self.get_by_jti(jti)
        if token:
            token.is_revoked = True
            return True
        return False
