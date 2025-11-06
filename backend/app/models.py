"""
SQLAlchemy database models.

This module defines the database schema for users, videos, and user progress.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.core.database import Base


class User(Base):
    """User account model."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    learning_language = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    progress = relationship("UserProgress", back_populates="user")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"


class Video(Base):
    """YouTube video model with metadata."""

    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    youtube_id = Column(String(20), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    language = Column(String(50), nullable=False, index=True)
    duration = Column(Integer, nullable=False)  # Duration in seconds
    channel_name = Column(String(255), nullable=False)
    thumbnail_url = Column(String(500), nullable=False)
    view_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    progress = relationship("UserProgress", back_populates="video")
    transcripts = relationship("Transcript", back_populates="video", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Video(id={self.id}, youtube_id={self.youtube_id}, title={self.title})>"


class Transcript(Base):
    """Video transcript with timestamped phrases."""

    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False, index=True)
    phrases = Column(JSON, nullable=False)  # Array of {text, start_time, duration}
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    video = relationship("Video", back_populates="transcripts")

    def __repr__(self) -> str:
        return f"<Transcript(id={self.id}, video_id={self.video_id})>"


class UserProgress(Base):
    """User progress tracking for video phrases."""

    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    phrase_index = Column(Integer, nullable=False)
    score = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="progress")
    video = relationship("Video", back_populates="progress")

    # Composite indexes for efficient queries
    __table_args__ = (
        Index("idx_user_video", "user_id", "video_id"),
        Index("idx_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<UserProgress(id={self.id}, user_id={self.user_id}, video_id={self.video_id})>"
