from fastapi import APIRouter
from app.api.v1.router import api_router
from app.core.config import settings

root_router = APIRouter()

# Include version 1 API Router
root_router.include_router(api_router, prefix=settings.API_V1_STR)
