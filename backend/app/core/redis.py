import redis.asyncio as aioredis
from typing import Optional
from app.core.config import settings
from app.core.logging import logger

class RedisManager:
    def __init__(self) -> None:
        self.pool: Optional[aioredis.ConnectionPool] = None
        self.client: Optional[aioredis.Redis] = None

    def initialize(self) -> None:
        """Initializes the Redis connection pool."""
        try:
            logger.info("Initializing Redis connection pool...", uri=settings.REDIS_URI)
            self.pool = aioredis.ConnectionPool.from_url(
                settings.REDIS_URI,
                max_connections=50,
                decode_responses=True,
                protocol=2
            )
            self.client = aioredis.Redis(connection_pool=self.pool, protocol=2)
        except Exception as e:
            logger.warning(f"Failed to initialize Redis connection: {e}")
            self.pool = None
            self.client = None

    async def close(self) -> None:
        """Closes the Redis connection pool."""
        if self.pool:
            logger.info("Closing Redis connection pool...")
            await self.pool.disconnect()
            self.pool = None
            self.client = None

    async def ping(self) -> bool:
        """Checks if the Redis server is responsive."""
        if not self.client:
            return False
        try:
            res = await self.client.ping()
            if not res:
                self.client = None
                self.pool = None
                return False
            return True
        except Exception as e:
            logger.error("Redis ping failed, disabling client fallback", error=str(e))
            self.client = None
            self.pool = None
            return False


redis_manager = RedisManager()
