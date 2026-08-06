from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Supabase requires SSL; this is handled via ?ssl=require in the DATABASE_URL
# For URLs without explicit SSL (e.g. local dev), no extra connect_args needed.
_connect_args = {}
if "ssl=require" not in settings.ASYNC_DATABASE_URI and "supabase" in settings.ASYNC_DATABASE_URI.lower():
    _connect_args["ssl"] = "require"

# Configure async engine with pool parameters
engine = create_async_engine(
    settings.ASYNC_DATABASE_URI,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    echo=False,
    connect_args=_connect_args
)

# Async session maker
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def check_database_health() -> bool:
    """Verifies that the database connection is live."""
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
