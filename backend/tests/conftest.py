import pytest
import pytest_asyncio
import geoalchemy2.admin
from unittest.mock import AsyncMock, MagicMock
from geoalchemy2.types import Geometry
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import event

# Mock GeoAlchemy2 DDL dialect handlers for SQLite in-memory testing
class DummyDialect:
    def before_create(self, *a, **k): pass
    def after_create(self, *a, **k): pass
    def before_drop(self, *a, **k): pass
    def after_drop(self, *a, **k): pass
    def reflect_geometry_column(self, *a, **k): pass
    def before_execute(self, conn, clauseelement, multiparams, params, execution_options):
        return clauseelement, multiparams, params

geoalchemy2.admin.select_dialect = lambda name: DummyDialect()

# Register SQLite compilers & result processors for Geometry & JSONB
@compiles(Geometry, 'sqlite')
def compile_geometry_sqlite(type_, compiler, **kw):
    return 'TEXT'

# Bypass WKB binary parsing on SQLite text columns
Geometry.result_processor = lambda self, dialect, coltype: lambda value: value

@compiles(JSONB, 'sqlite')
def compile_jsonb_sqlite(type_, compiler, **kw):
    return 'JSON'

from app.models.base import Base
import app.models
from app.dependencies.database import get_db
import app.services.socket_service as socket_service_mod
import app.core.database as core_db_mod
from app.core.redis import redis_manager
from app.main import app

# Patch redis_manager.client with a full AsyncMock so all Redis calls succeed without a running Redis server
_mock_redis_client = AsyncMock()
_mock_redis_client.set = AsyncMock(return_value=True)
_mock_redis_client.get = AsyncMock(return_value=None)
_mock_redis_client.delete = AsyncMock(return_value=1)
_mock_redis_client.ping = AsyncMock(return_value=True)
redis_manager.client = _mock_redis_client

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)

# Register Spatial function stubs on SQLite connection
@event.listens_for(engine.sync_engine, "connect")
def register_sqlite_spatial_stubs(dbapi_connection, connection_record):
    dbapi_connection.create_function("GeomFromEWKT", 1, lambda val: val)
    dbapi_connection.create_function("ST_GeomFromText", 1, lambda val: val)
    dbapi_connection.create_function("ST_GeomFromEWKT", 1, lambda val: val)
    dbapi_connection.create_function("AsEWKB", 1, lambda val: val)
    dbapi_connection.create_function("ST_AsEWKB", 1, lambda val: val)
    dbapi_connection.create_function("ST_AsText", 1, lambda val: val)
    dbapi_connection.create_function("ST_AsBinary", 1, lambda val: val)
    dbapi_connection.create_function("ST_Distance", 2, lambda a, b: 0.0)
    dbapi_connection.create_function("ST_DWithin", 3, lambda a, b, c: 1)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Monkeypatch socket_service and core database session maker for test isolation
socket_service_mod.async_session_maker = async_session_factory
core_db_mod.async_session_maker = async_session_factory

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_db():
        async with async_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    await engine.dispose()

@pytest_asyncio.fixture
async def db_session():
    async with async_session_factory() as session:
        yield session
