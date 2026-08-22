import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.database import check_database_health
from app.core.redis import redis_manager
from app.core.exceptions import Bid2RideException


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manages application startup and shutdown lifespan events safely."""
    # STARTUP
    try:
        try:
            setup_logging()
            logger.info("Starting up Bid2Ride API...")
        except Exception:
            pass
        
        redis_alive = False
        try:
            redis_manager.initialize()
            redis_alive = await redis_manager.ping()
        except Exception as e:
            logger.warning(f"Redis initialization warning (optional service): {e}")

        db_alive = False
        try:
            if settings.ASYNC_DATABASE_URI and "sqlite" in settings.ASYNC_DATABASE_URI.lower():
                from app.models.base import Base
                from app.core.database import engine
                import app.models
                if engine is not None:
                    async with engine.begin() as conn:
                        await conn.run_sync(Base.metadata.create_all)
                db_alive = True
            else:
                db_alive = await check_database_health()
        except Exception as e:
            logger.warning(f"Database health check warning during startup: {e}")
        
        try:
            logger.info(
                "Services connection health checks completed",
                postgres_alive=db_alive,
                redis_alive=redis_alive
            )
        except Exception:
            pass
    except Exception as e:
        print("LIFESPAN STARTUP ERROR:", e)
    
    import asyncio
    async def periodic_cleanup_task():
        while True:
            try:
                await asyncio.sleep(60)
                from app.core.database import SessionLocal
                async with SessionLocal() as session:
                    import datetime
                    from sqlalchemy import update
                    from app.models.ride import RideRequest
                    threshold = datetime.datetime.utcnow() - datetime.timedelta(seconds=120)
                    stmt = update(RideRequest).where(
                        RideRequest.status == "PENDING_BIDS",
                        RideRequest.created_at < threshold
                    ).values(status="EXPIRED")
                    await session.execute(stmt)
                    await session.commit()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Background cleanup task error: {e}")

    cleanup_bg_job = asyncio.create_task(periodic_cleanup_task())

    yield
    
    # SHUTDOWN
    cleanup_bg_job.cancel()
    try:
        await redis_manager.close()
    except Exception:
        pass


from app.api.router import root_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    debug=settings.DEBUG
)

import uuid

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else ["https://bid2ride.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Middleware for Correlation ID and Timing
@app.middleware("http")
async def add_security_headers_and_telemetry(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id

    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    # Add security headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"

    # Log telemetry
    logger.info(
        "HTTP Request completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=round(duration * 1000, 2),
        request_id=request_id
    )
    return response

# Mount API Routers
app.include_router(root_router)




# Exception Handler: Domain Specific Exceptions
@app.exception_handler(Bid2RideException)
async def domain_exception_handler(request: Request, exc: Bid2RideException) -> JSONResponse:
    logger.error("Domain exception occurred", path=request.url.path, code=exc.code, message=exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
    )


# Exception Handler: Request Body Validation Errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    # Check if validation failed because 'undefined' was passed instead of a valid UUID
    for error in errors:
        inp = error.get("input")
        if isinstance(inp, str) and inp.lower() == "undefined":
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "status": "error",
                    "code": "UNDEFINED_ID_PARAMETER",
                    "message": "Required ID parameter in path is undefined or missing.",
                    "details": errors,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                }
            )
            
    logger.error("Request validation failed", path=request.url.path, errors=errors)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "error",
            "code": "VALIDATION_ERROR",
            "message": "Input validation failed. Please check payload details.",
            "details": errors,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
    )


# Exception Handler: Starlette/FastAPI HTTP Exceptions
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    logger.error("HTTP exception occurred", path=request.url.path, status_code=exc.status_code, detail=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": f"HTTP_ERROR_{exc.status_code}",
            "message": exc.detail,
            "details": None,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
    )


# Exception Handler: Catch-All General Unhandled Exceptions
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled system exception occurred", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred. Please contact system support.",
            "details": str(exc) if settings.DEBUG else None,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
    )


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}

# Store clean FastAPI reference for direct serverless ASGI execution (Vercel)
fastapi_app = app

# Wrap FastAPI application with Socket.IO ASGI server wrapper
try:
    import socketio
    from app.services.socket_service import sio

    class ASGIAppWrapper(socketio.ASGIApp):
        @property
        def dependency_overrides(self):
            return self.other_asgi_app.dependency_overrides

        @dependency_overrides.setter
        def dependency_overrides(self, value):
            self.other_asgi_app.dependency_overrides = value

    app = ASGIAppWrapper(sio, other_asgi_app=app)
except Exception:
    pass

