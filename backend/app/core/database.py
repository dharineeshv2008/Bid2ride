import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Detect Vercel serverless environment
IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

_connect_args = {}
db_uri = settings.ASYNC_DATABASE_URI or ""

# Configure SSL for Supabase / Cloud databases if not present in query string
if ("supabase" in db_uri.lower() or "pooler" in db_uri.lower()) and "ssl=" not in db_uri:
    _connect_args["ssl"] = "require"

engine_kwargs = {
    "echo": False,
    "pool_pre_ping": True,
    "connect_args": _connect_args,
}

if IS_SERVERLESS:
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 5
    engine_kwargs["pool_recycle"] = 300
else:
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 10

engine = create_async_engine(db_uri, **engine_kwargs)

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
