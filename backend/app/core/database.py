import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Detect Vercel serverless environment
IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

_connect_args = {}
db_uri = settings.ASYNC_DATABASE_URI or ""

# Configure SSL for Supabase / Cloud databases if not present in query string
# Configure SSL for Supabase / Cloud databases if not present in query string
if ("supabase" in db_uri.lower() or "pooler" in db_uri.lower()) and "ssl=" not in db_uri:
    _connect_args["ssl"] = "require"

if "sqlite" in db_uri.lower():
    import geoalchemy2.admin
    from geoalchemy2.types import Geometry, Geography
    from sqlalchemy.dialects.postgresql import JSONB
    from sqlalchemy.ext.compiler import compiles

    class DummyDialect:
        def before_create(self, *a, **k): pass
        def after_create(self, *a, **k): pass
        def before_drop(self, *a, **k): pass
        def after_drop(self, *a, **k): pass
        def reflect_geometry_column(self, *a, **k): pass
        def before_execute(self, conn, clauseelement, multiparams, params, execution_options):
            return clauseelement, multiparams, params

    geoalchemy2.admin.select_dialect = lambda name: DummyDialect()

    @compiles(Geometry, 'sqlite')
    def compile_geometry_sqlite(type_, compiler, **kw):
        return 'TEXT'

    @compiles(Geography, 'sqlite')
    def compile_geography_sqlite(type_, compiler, **kw):
        return 'TEXT'

    Geometry.result_processor = lambda self, dialect, coltype: lambda value: value
    Geography.result_processor = lambda self, dialect, coltype: lambda value: value

    @compiles(JSONB, 'sqlite')
    def compile_jsonb_sqlite(type_, compiler, **kw):
        return 'JSON'

    _connect_args["check_same_thread"] = False

engine_kwargs = {
    "echo": False,
    "connect_args": _connect_args,
}

if "sqlite" in db_uri.lower():
    from sqlalchemy.pool import StaticPool
    engine_kwargs["poolclass"] = StaticPool
else:
    engine_kwargs["pool_pre_ping"] = True
    if IS_SERVERLESS:
        engine_kwargs["pool_size"] = 5
        engine_kwargs["max_overflow"] = 5
        engine_kwargs["pool_recycle"] = 300
    else:
        engine_kwargs["pool_size"] = 20
        engine_kwargs["max_overflow"] = 10

try:
    engine = create_async_engine(db_uri, **engine_kwargs)
except Exception as e:
    print("DB INIT FAILED:", e)
    # Fallback to an in-memory SQLite engine to prevent the application from crashing on import/startup
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

if "sqlite" in db_uri.lower() or (engine is not None and "sqlite" in str(engine.url).lower()):
    from sqlalchemy import event
    @event.listens_for(engine.sync_engine, "connect")
    def register_sqlite_spatial_stubs(dbapi_connection, connection_record):
        dbapi_connection.create_function("GeomFromEWKT", 1, lambda val: val)
        dbapi_connection.create_function("ST_GeomFromText", 1, lambda val: val)
        dbapi_connection.create_function("ST_GeogFromText", 1, lambda val: val)
        dbapi_connection.create_function("ST_GeomFromEWKT", 1, lambda val: val)
        dbapi_connection.create_function("AsEWKB", 1, lambda val: val)
        dbapi_connection.create_function("ST_AsEWKB", 1, lambda val: val)
        dbapi_connection.create_function("ST_AsText", 1, lambda val: val)
        dbapi_connection.create_function("ST_AsBinary", 1, lambda val: val)
        dbapi_connection.create_function("ST_Distance", 2, lambda a, b: 0.0)
        dbapi_connection.create_function("ST_DWithin", 3, lambda a, b, c: 1)

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
