"""
Pydantic schemas for request/response validation.

This module defines all the data schemas used for API requests and responses.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


# User Schemas
class UserRegister(BaseModel):
    """Schema for user registration request."""

    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=12, description="User's password (min 12 characters, must include uppercase, lowercase, digit, and special character)")
    name: str = Field(..., min_length=1, description="User's display name")
    learning_language: str = Field(..., description="Language the user is learning")

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password complexity requirements."""
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)')
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "user@example.com",
                "password": "SecurePass123!",
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

    index: int = Field(..., description="Phrase index in transcript")
    text: str = Field(..., description="Phrase text")
    start_time: float = Field(..., description="Start time in seconds")
    duration: float = Field(..., description="Phrase duration in seconds")
    language: str = Field(..., description="Language code")

    model_config = {
        "json_schema_extra": {
            "example": {
                "index": 0,
                "text": "Hola, ¿cómo estás?",
                "start_time": 0.5,
                "duration": 2.3,
                "language": "es"
            }
        }
    }


class TranscriptResponse(BaseModel):
    """Schema for transcript response with intelligent fallback metadata."""

    video_id: int = Field(..., description="Database video ID")
    phrases: List[PhraseSchema] = Field(..., description="List of transcript phrases")
    source: str = Field(..., description="Content source: transcript/captions/auto_captions")
    quality: str = Field(..., description="Content quality: best/good/acceptable")
    language: str = Field(..., description="Content language code")
    warning: Optional[str] = Field(None, description="Warning message if using fallback content")
    is_auto_generated: bool = Field(..., description="Whether content is auto-generated")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "video_id": 1,
                "phrases": [
                    {
                        "index": 0,
                        "text": "Hola, ¿cómo estás?",
                        "start_time": 0.5,
                        "duration": 2.3,
                        "language": "es"
                    },
                    {
                        "index": 1,
                        "text": "Muy bien, gracias",
                        "start_time": 2.8,
                        "duration": 1.5,
                        "language": "es"
                    }
                ],
                "source": "transcript",
                "quality": "best",
                "language": "es",
                "warning": None,
                "is_auto_generated": False
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


# Whisper API Schemas
class WhisperTranscribeRequest(BaseModel):
    """Schema for Whisper transcription request."""

    youtube_url: str = Field(..., description="YouTube video URL")
    language: Optional[str] = Field(None, description="Language hint for better accuracy (e.g., 'en', 'es', 'fr')")
    force_refresh: bool = Field(False, description="Force refresh cached transcript")

    model_config = {
        "json_schema_extra": {
            "example": {
                "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "language": "en",
                "force_refresh": False
            }
        }
    }


class WhisperSentence(BaseModel):
    """Schema for a single Whisper transcript sentence."""

    sentence_id: int = Field(..., description="Sentence index in transcript")
    text: str = Field(..., description="Sentence text")
    start_time: float = Field(..., description="Start time in seconds")
    end_time: float = Field(..., description="End time in seconds")
    confidence: Optional[float] = Field(None, description="Confidence score (not available from Whisper)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "sentence_id": 1,
                "text": "Hello, how are you?",
                "start_time": 0.5,
                "end_time": 2.3,
                "confidence": None
            }
        }
    }


class WhisperTranscriptResponse(BaseModel):
    """Schema for Whisper transcription response."""

    video_id: str = Field(..., description="YouTube video ID")
    transcript: List[WhisperSentence] = Field(..., description="List of transcript sentences")
    status: str = Field(..., description="Processing status: 'completed'")
    processing_time: int = Field(..., description="Processing time in seconds")
    language: str = Field(..., description="Detected or provided language code")
    audio_duration: Optional[float] = Field(None, description="Audio duration in seconds")
    source: str = Field("whisper", description="Transcription source: 'whisper'")

    model_config = {
        "json_schema_extra": {
            "example": {
                "video_id": "dQw4w9WgXcQ",
                "transcript": [
                    {
                        "sentence_id": 1,
                        "text": "Hello, how are you?",
                        "start_time": 0.5,
                        "end_time": 2.3,
                        "confidence": None
                    },
                    {
                        "sentence_id": 2,
                        "text": "I'm doing great, thanks!",
                        "start_time": 2.8,
                        "end_time": 4.5,
                        "confidence": None
                    }
                ],
                "status": "completed",
                "processing_time": 45,
                "language": "en",
                "audio_duration": 180.5,
                "source": "whisper"
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


# Video Player Schemas
class VideoPlayerResponse(BaseModel):
    """Schema for video player response with user progress."""

    id: int = Field(..., description="Database video ID")
    youtube_id: str = Field(..., description="YouTube video ID")
    title: str = Field(..., description="Video title")
    duration: int = Field(..., description="Video duration in seconds")
    channel_name: str = Field(..., description="Channel name")
    phrases: List[PhraseSchema] = Field(..., description="List of transcript phrases")
    current_progress: Optional[float] = Field(0, description="User's current progress in seconds")
    is_completed: Optional[bool] = Field(False, description="Whether user has completed the video")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 1,
                "youtube_id": "dQw4w9WgXcQ",
                "title": "Spanish Lesson - Basic Greetings",
                "duration": 300,
                "channel_name": "Spanish Academy",
                "phrases": [
                    {
                        "index": 0,
                        "text": "Hola, ¿cómo estás?",
                        "start_time": 0.5,
                        "duration": 2.3,
                        "language": "es"
                    }
                ],
                "current_progress": 45.5,
                "is_completed": False
            }
        }
    }


class PhraseAttemptRequest(BaseModel):
    """Schema for recording a phrase attempt."""

    phrase_index: int = Field(..., description="Index of the phrase being attempted")
    correct: bool = Field(..., description="Whether the attempt was correct")

    model_config = {
        "json_schema_extra": {
            "example": {
                "phrase_index": 0,
                "correct": True
            }
        }
    }


class VideoProgressUpdateRequest(BaseModel):
    """Schema for updating video progress."""

    current_timestamp: float = Field(..., ge=0, description="Current playback position in seconds")
    completed: bool = Field(False, description="Whether the video is completed")

    model_config = {
        "json_schema_extra": {
            "example": {
                "current_timestamp": 45.5,
                "completed": False
            }
        }
    }


class VideoProgressResponse(BaseModel):
    """Schema for video progress response."""

    video_id: int = Field(..., description="Database video ID")
    current_timestamp: float = Field(..., description="Current playback position in seconds")
    completed_at: Optional[datetime] = Field(None, description="When video was completed")
    total_watch_time: int = Field(..., description="Total watch time in seconds")
    is_completed: bool = Field(..., description="Whether video is completed")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "video_id": 1,
                "current_timestamp": 45.5,
                "completed_at": None,
                "total_watch_time": 120,
                "is_completed": False
            }
        }
    }


class PhraseAttemptResponse(BaseModel):
    """Schema for phrase attempt response."""

    phrase_index: int = Field(..., description="Index of the phrase")
    attempts: int = Field(..., description="Total number of attempts for this phrase")
    correct: bool = Field(..., description="Whether the latest attempt was correct")

    model_config = {
        "json_schema_extra": {
            "example": {
                "phrase_index": 0,
                "attempts": 3,
                "correct": True
            }
        }
    }


class UserStatsResponse(BaseModel):
    """Schema for user learning statistics."""

    total_videos_watched: int = Field(..., description="Total number of videos watched")
    total_phrases_practiced: int = Field(..., description="Total number of phrases practiced")
    phrases_correct: int = Field(..., description="Number of correct phrase attempts")
    accuracy: float = Field(..., ge=0, le=100, description="Overall accuracy percentage")
    total_watch_time: int = Field(..., description="Total watch time in seconds")

    model_config = {
        "json_schema_extra": {
            "example": {
                "total_videos_watched": 5,
                "total_phrases_practiced": 150,
                "phrases_correct": 120,
                "accuracy": 80.0,
                "total_watch_time": 3600
            }
        }
    }
