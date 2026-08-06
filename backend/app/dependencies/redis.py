import redis.asyncio as aioredis
from app.core.redis import redis_manager


async def get_redis() -> aioredis.Redis:
    """FastAPI dependency injecting the global async Redis client."""
    if not redis_manager.client:
        redis_manager.initialize()
    return redis_manager.client
