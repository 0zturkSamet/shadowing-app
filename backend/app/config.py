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
    _jwt_secret_env = os.getenv("JWT_SECRET", "")
    if not _jwt_secret_env:
        raise ValueError(
            "\n\n"
            "❌ JWT_SECRET environment variable must be set!\n"
            "\n"
            "JWT_SECRET is required for secure authentication.\n"
            "Generate a strong secret key using:\n"
            "  python -c 'import secrets; print(secrets.token_urlsafe(32))'\n"
            "\n"
            "Then add it to your .env file:\n"
            "  JWT_SECRET=your_generated_secret_here\n"
            "\n"
        )
    JWT_SECRET: str = _jwt_secret_env
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

    # Assembly AI settings
    ASSEMBLY_AI_API_KEY: str = os.getenv(
        "ASSEMBLY_AI_API_KEY",
        ""
    )
    ASSEMBLY_AI_REQUEST_TIMEOUT: int = int(os.getenv(
        "ASSEMBLY_AI_REQUEST_TIMEOUT",
        "300"
    ))
    TRANSCRIPT_CACHE_TTL: int = int(os.getenv(
        "TRANSCRIPT_CACHE_TTL",
        "2592000"  # 30 days in seconds
    ))
    ASSEMBLY_AI_MAX_RETRIES: int = int(os.getenv(
        "ASSEMBLY_AI_MAX_RETRIES",
        "3"
    ))

    # OpenAI Whisper settings
    OPENAI_API_KEY: str = os.getenv(
        "OPENAI_API_KEY",
        ""
    )

    # Google OAuth settings
    GOOGLE_CLIENT_ID: str = os.getenv(
        "GOOGLE_CLIENT_ID",
        ""
    )
    GOOGLE_CLIENT_SECRET: str = os.getenv(
        "GOOGLE_CLIENT_SECRET",
        ""
    )
    GOOGLE_REDIRECT_URI: str = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:3000/auth/callback"
    )

    def validate_assembly_ai_config(self) -> None:
        """
        Validate Assembly AI configuration on startup.

        Raises:
            ValueError: If API key is not set with setup instructions
        """
        if not self.ASSEMBLY_AI_API_KEY:
            raise ValueError(
                "\n\n"
                "❌ Assembly AI API key is not configured!\n"
                "\n"
                "To use Assembly AI transcription service:\n"
                "1. Sign up for a free account at https://www.assemblyai.com/\n"
                "2. Get your API key from the dashboard\n"
                "3. Add it to your .env file:\n"
                "   ASSEMBLY_AI_API_KEY=your_api_key_here\n"
                "\n"
                "Free tier includes 600 minutes/month - perfect for MVP!\n"
                "\n"
            )


settings = Settings()
