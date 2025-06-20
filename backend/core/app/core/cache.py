import json
import pickle
from typing import Optional, Any, Union, Callable
from functools import wraps
import hashlib
from datetime import timedelta

import redis.asyncio as redis
from app.core.config import settings


class RedisCache:
    """Redis cache manager for performance optimization."""
    
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self._redis: Optional[redis.Redis] = None
    
    async def connect(self) -> redis.Redis:
        """Get or create Redis connection."""
        if not self._redis:
            self._redis = await redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
        return self._redis
    
    async def close(self):
        """Close Redis connection."""
        if self._redis:
            await self._redis.close()
            self._redis = None
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        redis_client = await self.connect()
        value = await redis_client.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None
    
    async def set(
        self,
        key: str,
        value: Any,
        expire: Optional[int] = None
    ) -> bool:
        """Set value in cache with optional expiration."""
        redis_client = await self.connect()
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        return await redis_client.set(key, value, ex=expire)
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache."""
        redis_client = await self.connect()
        return bool(await redis_client.delete(key))
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        redis_client = await self.connect()
        return bool(await redis_client.exists(key))
    
    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration time for a key."""
        redis_client = await self.connect()
        return await redis_client.expire(key, seconds)
    
    async def get_many(self, keys: list[str]) -> dict[str, Any]:
        """Get multiple values from cache."""
        redis_client = await self.connect()
        values = await redis_client.mget(keys)
        result = {}
        for key, value in zip(keys, values):
            if value:
                try:
                    result[key] = json.loads(value)
                except json.JSONDecodeError:
                    result[key] = value
        return result
    
    async def set_many(
        self,
        mapping: dict[str, Any],
        expire: Optional[int] = None
    ) -> bool:
        """Set multiple values in cache."""
        redis_client = await self.connect()
        # Convert values to JSON if needed
        processed_mapping = {}
        for key, value in mapping.items():
            if isinstance(value, (dict, list)):
                processed_mapping[key] = json.dumps(value)
            else:
                processed_mapping[key] = value
        
        # Use pipeline for atomic operation
        async with redis_client.pipeline() as pipe:
            pipe.mset(processed_mapping)
            if expire:
                for key in mapping.keys():
                    pipe.expire(key, expire)
            await pipe.execute()
        return True
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern."""
        redis_client = await self.connect()
        keys = []
        async for key in redis_client.scan_iter(match=pattern):
            keys.append(key)
        
        if keys:
            return await redis_client.delete(*keys)
        return 0


# Global cache instance
cache = RedisCache()


def cache_key(*args, **kwargs) -> str:
    """Generate a cache key from arguments."""
    key_parts = [str(arg) for arg in args]
    key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
    key_string = ":".join(key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()


def cached(
    expire: Optional[int] = 300,  # 5 minutes default
    prefix: str = "app",
    key_func: Optional[Callable] = None
):
    """Decorator for caching async function results."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key_str = key_func(*args, **kwargs)
            else:
                cache_key_str = cache_key(func.__name__, *args, **kwargs)
            
            full_key = f"{prefix}:{cache_key_str}"
            
            # Try to get from cache
            cached_value = await cache.get(full_key)
            if cached_value is not None:
                return cached_value
            
            # Call function and cache result
            result = await func(*args, **kwargs)
            await cache.set(full_key, result, expire)
            
            return result
        
        # Add method to invalidate cache
        wrapper.invalidate = lambda *args, **kwargs: cache.delete(
            f"{prefix}:{key_func(*args, **kwargs) if key_func else cache_key(func.__name__, *args, **kwargs)}"
        )
        
        return wrapper
    return decorator


# Cache key generators for common use cases
def user_cache_key(user_id: str) -> str:
    """Generate cache key for user data."""
    return f"user:{user_id}"


def project_cache_key(project_id: str) -> str:
    """Generate cache key for project data."""
    return f"project:{project_id}"


def file_cache_key(project_id: str, file_id: str) -> str:
    """Generate cache key for file data."""
    return f"file:{project_id}:{file_id}"


def file_tree_cache_key(project_id: str) -> str:
    """Generate cache key for file tree."""
    return f"file_tree:{project_id}"


def chat_session_cache_key(project_id: str, session_id: str) -> str:
    """Generate cache key for chat session."""
    return f"chat:{project_id}:{session_id}"