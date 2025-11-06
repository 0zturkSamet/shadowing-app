"""
Redis cache service.

This module provides a caching service using Redis for storing
frequently accessed data like video transcripts.
"""
import json
import logging
from typing import Optional, Any

import redis
from redis.exceptions import RedisError

from app.config import settings


logger = logging.getLogger(__name__)


class CacheService:
    """
    Redis cache service for storing and retrieving cached data.

    Handles connection errors gracefully and provides a simple interface
    for caching operations.
    """

    def __init__(self) -> None:
        """Initialize Redis connection."""
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            logger.info("Successfully connected to Redis")
        except RedisError as e:
            logger.warning(f"Failed to connect to Redis: {e}")
            self.redis_client = None

    def get(self, key: str) -> Optional[Any]:
        """
        Retrieve a value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value (deserialized from JSON) or None if not found

        Example:
            value = cache_service.get("video:transcript:abc123")
        """
        if not self.redis_client:
            return None

        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Error retrieving from cache: {e}")
            return None

    def set(
        self,
        key: str,
        value: Any,
        expiration: int = 3600
    ) -> bool:
        """
        Store a value in cache.

        Args:
            key: Cache key
            value: Value to cache (will be serialized to JSON)
            expiration: TTL in seconds (default: 3600 = 1 hour)

        Returns:
            bool: True if successful, False otherwise

        Example:
            cache_service.set("video:transcript:abc123", transcript_data, 7200)
        """
        if not self.redis_client:
            return False

        try:
            serialized_value = json.dumps(value)
            self.redis_client.setex(key, expiration, serialized_value)
            return True
        except (RedisError, TypeError, ValueError) as e:
            logger.error(f"Error setting cache: {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete a value from cache.

        Args:
            key: Cache key to delete

        Returns:
            bool: True if successful, False otherwise

        Example:
            cache_service.delete("video:transcript:abc123")
        """
        if not self.redis_client:
            return False

        try:
            self.redis_client.delete(key)
            return True
        except RedisError as e:
            logger.error(f"Error deleting from cache: {e}")
            return False

    def health_check(self) -> bool:
        """
        Check if Redis connection is healthy.

        Returns:
            bool: True if connected and responsive, False otherwise
        """
        if not self.redis_client:
            return False

        try:
            return self.redis_client.ping()
        except RedisError:
            return False


# Global cache service instance
cache_service = CacheService()
