import uuid
from typing import List
from fastapi import Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationException, PermissionDeniedException
from app.core.security import decode_token
from app.dependencies.database import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository

# HTTPBearer security parser
security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """FastAPI dependency to authenticate requests by decoding JWT and loading the active User."""
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise AuthenticationException("Invalid or expired authentication token") from e

    token_type = payload.get("type")
    if token_type != "access":
        raise AuthenticationException("Invalid token type. Access token required.")

    sub = payload.get("sub")
    if not sub:
        raise AuthenticationException("Invalid token claims. Subject missing.")

    try:
        user_id = uuid.UUID(sub)
    except ValueError:
        raise AuthenticationException("Invalid subject identifier")

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise AuthenticationException("Authenticated user profile not found")

    if not user.is_active:
        raise PermissionDeniedException("User account is suspended or inactive")

    return user


class RoleRequired:
    """RBAC validation class to check current user roles against permitted operations."""
    def __init__(self, allowed_roles: List[str]) -> None:
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise PermissionDeniedException(
                f"Action requires roles: {self.allowed_roles}. Current role: {current_user.role}"
            )
        return current_user
