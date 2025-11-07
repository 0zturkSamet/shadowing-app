"""
Application configuration settings.

This module handles all configuration for the ShadowSpeak application,
including database, Redis, JWT, and CORS settings.
"""
import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)


class Settings:
    """Application settings with environment variable support."""

    # Database settings
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost/shadowing"
    )

    # Redis settings
    REDIS_URL: str = os.getenv(
        "REDIS_URL",
        "redis://localhost:6379"
    )

    # Security settings
    JWT_SECRET: str = os.getenv(
        "JWT_SECRET",
        "your-secret-key-change-in-production"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS settings
    ALLOWED_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://localhost:8000"
        ).split(",")
    ]

    # Application settings
    APP_NAME: str = "ShadowSpeak API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

    # YouTube API settings
    YOUTUBE_API_KEY: str = os.getenv(
        "YOUTUBE_API_KEY",
        ""
    )


settings = Settings()
