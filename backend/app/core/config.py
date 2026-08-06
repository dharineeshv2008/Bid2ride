from typing import Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )

    PROJECT_NAME: str = "Bid2Ride"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Development Mode: when enabled, OTP/SMS/Twilio/Firebase are bypassed
    # and demo login endpoints authenticate users directly.
    DEVELOPMENT_MODE: bool = False
    # Password used by the demo ADMIN login in development mode.
    DEV_ADMIN_PASSWORD: str = "admin123"

    # Firebase Settings
    FIREBASE_PROJECT_ID: str = "bid2ride-4d071"

    # Security & JWT Tokens
    SECRET_KEY: str = "change-this-super-secret-key-min-32-chars-long!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Supabase / PostgreSQL Database Configuration
    # Set DATABASE_URL for a full connection string (Supabase).
    # If DATABASE_URL is not set, individual POSTGRES_* fields are used (local).
    DATABASE_URL: Optional[str] = None
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "bid2ride_user"
    POSTGRES_PASSWORD: str = "bid2ride_password"
    POSTGRES_DB: str = "bid2ride_db"

    # Supabase API config (for client-side operations; auth remains JWT-based)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    ASYNC_DATABASE_URI: Optional[str] = None

    @field_validator("ASYNC_DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], values: any) -> any:
        data = values.data if hasattr(values, "data") else {}
        db_url = v or data.get("DATABASE_URL")
        
        if db_url and isinstance(db_url, str):
            # Normalize postgres:// and postgresql:// to postgresql+asyncpg://
            if db_url.startswith("postgres://"):
                db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif db_url.startswith("postgresql://"):
                db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif not db_url.startswith("postgresql+asyncpg://"):
                db_url = f"postgresql+asyncpg://{db_url}"
            
            # Clean sslmode query parameter to ssl for asyncpg compatibility
            if "sslmode=" in db_url:
                db_url = db_url.replace("sslmode=", "ssl=")
            return db_url

        # Fall back to constructing from individual POSTGRES_* fields
        p_user = data.get("POSTGRES_USER") or "bid2ride_user"
        p_pass = data.get("POSTGRES_PASSWORD") or "bid2ride_password"
        p_server = data.get("POSTGRES_SERVER") or "localhost"
        p_port = data.get("POSTGRES_PORT") or 5432
        p_db = data.get("POSTGRES_DB") or "bid2ride_db"
        return f"postgresql+asyncpg://{p_user}:{p_pass}@{p_server}:{p_port}/{p_db}"

    # Redis Config
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URI: Optional[str] = None

    @field_validator("REDIS_URI", mode="before")
    @classmethod
    def assemble_redis_connection(cls, v: Optional[str], values: any) -> any:
        if isinstance(v, str) and v:
            return v
        
        data = values.data
        host = data.get("REDIS_HOST")
        port = data.get("REDIS_PORT")
        password = data.get("REDIS_PASSWORD")
        if password:
            return f"redis://:{password}@{host}:{port}/0"
        return f"redis://{host}:{port}/0"

    # Celery Task Queue Configuration
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None

    @field_validator("CELERY_BROKER_URL", mode="before")
    @classmethod
    def assemble_celery_broker(cls, v: Optional[str], values: any) -> any:
        if isinstance(v, str) and v:
            return v
        data = values.data
        host = data.get("REDIS_HOST")
        port = data.get("REDIS_PORT")
        password = data.get("REDIS_PASSWORD")
        if password:
            return f"redis://:{password}@{host}:{port}/1"
        return f"redis://{host}:{port}/1"

    @field_validator("CELERY_RESULT_BACKEND", mode="before")
    @classmethod
    def assemble_celery_backend(cls, v: Optional[str], values: any) -> any:
        if isinstance(v, str) and v:
            return v
        data = values.data
        host = data.get("REDIS_HOST")
        port = data.get("REDIS_PORT")
        password = data.get("REDIS_PASSWORD")
        if password:
            return f"redis://:{password}@{host}:{port}/2"
        return f"redis://{host}:{port}/2"

    # OSRM Maps Routing Engine URL
    OSRM_SERVER_URL: str = "http://router.project-osrm.org"

    # Stripe Payments Mock Keys
    STRIPE_SECRET_KEY: str = "sk_test_mock_key"
    STRIPE_WEBHOOK_SECRET: str = "whsec_mock_key"

    # Twilio SMS Mock Settings
    TWILIO_ACCOUNT_SID: str = "AC_mock_sid"
    TWILIO_AUTH_TOKEN: str = "mock_auth_token"
    TWILIO_PHONE_NUMBER: str = "+15550100"

    # Marketplace Settings
    SYSTEM_COMMISSION_RATE: float = 0.15
    BIDDING_WINDOW_SECONDS: int = 15
    PICKUP_GEOFENCE_RADIUS_METERS: float = 100.0


settings = Settings()
