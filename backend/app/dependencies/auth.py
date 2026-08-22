import uuid
import logging
from typing import List
from fastapi import Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationException, PermissionDeniedException
from app.core.security import decode_token
from app.dependencies.database import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)

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
        logger.error(f"[AUTH DEBUG] Token decode failed: {e}")
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

    user.token_role = payload.get("role")
    logger.info(f"[AUTH DEBUG] Current User: {user.id}, role: {user.role}, token_role: {user.token_role}")
    return user


class RoleRequired:
    """RBAC validation class to check current user roles against permitted operations."""
    def __init__(self, allowed_roles: List[str]) -> None:
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        logger.info(f"[AUTH DEBUG] Role check for User: {current_user.id}, role: {current_user.role}, token_role: {getattr(current_user, 'token_role', None)}, allowed: {self.allowed_roles}")
        role_to_check = getattr(current_user, "token_role", current_user.role)
        user_role = str(role_to_check).upper()
        allowed_roles_upper = [r.upper() for r in self.allowed_roles]
        if user_role not in allowed_roles_upper:
            # Fallback checking subclass profiles
            has_subclass = False
            if "DRIVER" in allowed_roles_upper and current_user.driver is not None:
                has_subclass = True
            elif "PASSENGER" in allowed_roles_upper and current_user.passenger is not None:
                has_subclass = True

            if not has_subclass:
                logger.warning(f"[AUTH DEBUG] Role mismatch: User {current_user.id} has role {user_role} but allowed roles are {self.allowed_roles}")
                raise PermissionDeniedException(
                    f"Action requires roles: {self.allowed_roles}. Current role: {user_role}"
                )
        return current_user
