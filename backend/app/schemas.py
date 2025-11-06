"""
Pydantic schemas for request/response validation.

This module defines all the data schemas used for API requests and responses.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# User Schemas
class UserRegister(BaseModel):
    """Schema for user registration request."""

    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=8, description="User's password (min 8 characters)")
    name: str = Field(..., min_length=1, description="User's display name")
    learning_language: str = Field(..., description="Language the user is learning")

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123",
                "name": "John Doe",
                "learning_language": "Spanish"
            }
        }
    }


class UserLogin(BaseModel):
    """Schema for user login request."""

    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123"
            }
        }
    }


class UserResponse(BaseModel):
    """Schema for user data response."""

    id: int
    email: str
    name: str
    learning_language: str
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 1,
                "email": "user@example.com",
                "name": "John Doe",
                "learning_language": "Spanish",
                "created_at": "2024-01-01T00:00:00"
            }
        }
    }


# Video Schemas
class VideoCreate(BaseModel):
    """Schema for creating/caching a video."""

    youtube_id: str = Field(..., description="YouTube video ID")
    title: str = Field(..., description="Video title")
    description: Optional[str] = Field(None, description="Video description")
    language: str = Field(..., description="Video language code")
    duration: int = Field(..., description="Video duration in seconds")
    channel_name: str = Field(..., description="Channel name")
    thumbnail_url: str = Field(..., description="Thumbnail URL")
    view_count: int = Field(default=0, description="View count")

    model_config = {
        "json_schema_extra": {
            "example": {
                "youtube_id": "dQw4w9WgXcQ",
                "title": "Spanish Lesson - Basic Greetings",
                "description": "Learn basic Spanish greetings in this beginner lesson",
                "language": "es",
                "duration": 300,
                "channel_name": "Spanish Academy",
                "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                "view_count": 10000
            }
        }
    }


class VideoResponse(BaseModel):
    """Schema for video data response."""

    id: int
    youtube_id: str
    title: str
    description: Optional[str] = None
    language: str
    duration: int
    channel_name: str
    thumbnail_url: str
    view_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 1,
                "youtube_id": "dQw4w9WgXcQ",
                "title": "Spanish Lesson - Basic Greetings",
                "description": "Learn basic Spanish greetings",
                "language": "es",
                "duration": 300,
                "channel_name": "Spanish Academy",
                "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                "view_count": 10000,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
    }


class PhraseSchema(BaseModel):
    """Schema for a transcript phrase."""

    text: str = Field(..., description="Phrase text")
    start_time: float = Field(..., description="Start time in seconds")
    duration: float = Field(..., description="Phrase duration in seconds")

    model_config = {
        "json_schema_extra": {
            "example": {
                "text": "Hola, ¿cómo estás?",
                "start_time": 0.5,
                "duration": 2.3
            }
        }
    }


class TranscriptResponse(BaseModel):
    """Schema for transcript response."""

    video_id: int = Field(..., description="Database video ID")
    phrases: List[PhraseSchema] = Field(..., description="List of transcript phrases")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "video_id": 1,
                "phrases": [
                    {
                        "text": "Hola, ¿cómo estás?",
                        "start_time": 0.5,
                        "duration": 2.3
                    },
                    {
                        "text": "Muy bien, gracias",
                        "start_time": 2.8,
                        "duration": 1.5
                    }
                ]
            }
        }
    }


class VideoSearchResponse(BaseModel):
    """Schema for video search results."""

    videos: List[VideoResponse] = Field(..., description="List of videos")
    total_results: int = Field(..., description="Total number of results")
    query: str = Field(..., description="Search query")
    language: str = Field(..., description="Language filter")

    model_config = {
        "json_schema_extra": {
            "example": {
                "videos": [],
                "total_results": 10,
                "query": "spanish lesson",
                "language": "es"
            }
        }
    }


# Token Schemas
class Token(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"

    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer"
            }
        }
    }
