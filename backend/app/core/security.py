import datetime
import hashlib
import time
import uuid
from typing import Any, Dict, Optional
import httpx
from jose import jwt, JWTError
from app.core.config import settings

# In production, use a strong hashing Context. For token hashing before DB storage, SHA-256 is standard.
def hash_token(token: str) -> str:
    """Hashes a refresh token using SHA-256 before database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_hashed_token(token: str, hashed_token: str) -> bool:
    """Verifies a raw refresh token matches the stored SHA-256 hash."""
    return hash_token(token) == hashed_token


def create_access_token(subject: Any, role: str, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Generates a short-lived JWT access token."""
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode: Dict[str, Any] = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "type": "access",
        "jti": str(uuid.uuid4())
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(subject: Any, jti: uuid.UUID, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Generates a long-lived JWT refresh token with JTI replay prevention."""
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    
    to_encode: Dict[str, Any] = {
        "exp": expire,
        "sub": str(subject),
        "jti": str(jti),
        "type": "refresh"
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT token signature and expiry claims."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError("Invalid token signature or expired token") from e


FIREBASE_KEYS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
_firebase_keys_cache = {}
_firebase_keys_expiry = 0


async def get_firebase_public_keys() -> dict:
    global _firebase_keys_cache, _firebase_keys_expiry
    now = time.time()
    if not _firebase_keys_cache or now > _firebase_keys_expiry:
        async with httpx.AsyncClient() as client:
            resp = await client.get(FIREBASE_KEYS_URL)
            resp.raise_for_status()
            _firebase_keys_cache = resp.json()
            
            # Default TTL to 1 hour
            max_age = 3600
            cache_control = resp.headers.get("Cache-Control", "")
            for part in cache_control.split(","):
                if "max-age" in part:
                    try:
                        max_age = int(part.split("=")[1].strip())
                    except Exception:
                        pass
            _firebase_keys_expiry = now + max_age
    return _firebase_keys_cache


async def verify_firebase_token(token: str, development_mode: bool = False) -> dict:
    """Verifies a Firebase ID token (JWT) using Google's public certificates.
    
    If development_mode is True and the token matches a mock pattern, 
    verification is bypassed and mock claims are returned.
    """
    if development_mode and token.startswith("mock-token-"):
        phone = token.replace("mock-token-", "")
        return {
            "phone_number": phone,
            "name": f"Mock User {phone[-4:]}",
            "uid": f"mock-uid-{phone[-4:]}"
        }

    try:
        header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise ValueError("Invalid token format") from e

    kid = header.get("kid")
    if not kid:
        raise ValueError("Token header missing 'kid'")

    public_keys = await get_firebase_public_keys()
    cert_pem = public_keys.get(kid)
    if not cert_pem:
        raise ValueError("Public key not found for kid")

    try:
        # jose.jwt.decode can take the X.509 certificate PEM string directly
        claims = jwt.decode(
            token,
            cert_pem,
            algorithms=["RS256"],
            audience=settings.FIREBASE_PROJECT_ID,
            issuer=f"https://securetoken.google.com/{settings.FIREBASE_PROJECT_ID}"
        )
        return claims
    except JWTError as e:
        raise ValueError(f"Token verification failed: {str(e)}") from e

