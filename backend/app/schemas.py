"""
Pydantic schemas for request/response validation.

This module defines all the data schemas used for API requests and responses.
"""
from datetime import datetime
from typing import Optional
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
    language: str = Field(..., description="Video language")
    transcript: Optional[str] = Field(None, description="Video transcript")

    model_config = {
        "json_schema_extra": {
            "example": {
                "youtube_id": "dQw4w9WgXcQ",
                "title": "Spanish Lesson - Basic Greetings",
                "language": "Spanish",
                "transcript": "Hola, ¿cómo estás?..."
            }
        }
    }


class VideoResponse(BaseModel):
    """Schema for video data response."""

    id: int
    youtube_id: str
    title: str
    language: str
    cached_at: datetime

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 1,
                "youtube_id": "dQw4w9WgXcQ",
                "title": "Spanish Lesson - Basic Greetings",
                "language": "Spanish",
                "cached_at": "2024-01-01T00:00:00"
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
