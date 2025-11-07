"""
Tests for video player and progress tracking endpoints.

This module contains tests for the video player, progress tracking, and phrase practice features.
"""
import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.dependencies import get_current_user
from app.models import User, Video, Transcript, VideoProgress, PhraseAttempt


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


def override_get_current_user():
    """Override authentication dependency for testing."""
    return User(
        id=1,
        email="test@example.com",
        name="Test User",
        learning_language="es",
        password_hash="fake_hash",
        created_at=datetime.utcnow()
    )


# Override dependencies
app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Set up test database before each test."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """Provide a database session for tests."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    user = User(
        email="test@example.com",
        name="Test User",
        learning_language="es",
        password_hash="fake_hash"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_video(db_session):
    """Create a test video."""
    video = Video(
        youtube_id="test123",
        title="Test Spanish Video",
        description="A test video",
        language="es",
        duration=300,
        channel_name="Test Channel",
        thumbnail_url="https://example.com/thumb.jpg",
        view_count=1000
    )
    db_session.add(video)
    db_session.commit()
    db_session.refresh(video)
    return video


@pytest.fixture
def test_transcript(db_session, test_video):
    """Create a test transcript."""
    transcript = Transcript(
        video_id=test_video.id,
        phrases=[
            {"text": "Hola, ¿cómo estás?", "start_time": 0.5, "duration": 2.3},
            {"text": "Muy bien, gracias", "start_time": 2.8, "duration": 1.5},
            {"text": "¿Y tú?", "start_time": 4.3, "duration": 1.0}
        ]
    )
    db_session.add(transcript)
    db_session.commit()
    db_session.refresh(transcript)
    return transcript


class TestGetVideoPlayer:
    """Tests for GET /api/videos/{video_id}/player endpoint."""

    @patch('app.api.videos.get_youtube_service')
    def test_get_video_player_new_video(self, mock_youtube_service):
        """Test getting video player data for a new video."""
        # Mock YouTube service responses
        mock_service = Mock()
        mock_service.get_video_metadata.return_value = {
            'youtube_id': 'new123',
            'title': 'New Spanish Video',
            'description': 'A new video',
            'language': 'es',
            'duration': 200,
            'channel_name': 'New Channel',
            'thumbnail_url': 'https://example.com/new.jpg',
            'view_count': 500
        }
        mock_service.get_transcript.return_value = {
            'phrases': [
                {"text": "Buenos días", "start_time": 0.0, "duration": 1.5}
            ]
        }
        mock_youtube_service.return_value = mock_service

        response = client.get("/api/videos/new123/player")

        assert response.status_code == 200
        data = response.json()
        assert data['youtube_id'] == 'new123'
        assert data['title'] == 'New Spanish Video'
        assert data['duration'] == 200
        assert len(data['phrases']) == 1
        assert data['phrases'][0]['text'] == 'Buenos días'
        assert data['current_progress'] == 0.0
        assert data['is_completed'] is False

    def test_get_video_player_existing_video(self, test_video, test_transcript):
        """Test getting video player data for existing video."""
        response = client.get(f"/api/videos/{test_video.youtube_id}/player")

        assert response.status_code == 200
        data = response.json()
        assert data['youtube_id'] == test_video.youtube_id
        assert data['title'] == test_video.title
        assert len(data['phrases']) == 3
        assert data['phrases'][0]['index'] == 0
        assert data['phrases'][0]['language'] == 'es'

    def test_get_video_player_with_progress(self, test_user, test_video, test_transcript, db_session):
        """Test getting video player data with user progress."""
        # Create progress record
        progress = VideoProgress(
            user_id=test_user.id,
            video_id=test_video.id,
            current_timestamp=45.5,
            total_watch_time=120
        )
        db_session.add(progress)
        db_session.commit()

        response = client.get(f"/api/videos/{test_video.youtube_id}/player")

        assert response.status_code == 200
        data = response.json()
        assert data['current_progress'] == 45.5
        assert data['is_completed'] is False

    def test_get_video_player_completed(self, test_user, test_video, test_transcript, db_session):
        """Test getting video player data for completed video."""
        # Create completed progress record
        progress = VideoProgress(
            user_id=test_user.id,
            video_id=test_video.id,
            current_timestamp=300.0,
            completed_at=datetime.utcnow(),
            total_watch_time=300
        )
        db_session.add(progress)
        db_session.commit()

        response = client.get(f"/api/videos/{test_video.youtube_id}/player")

        assert response.status_code == 200
        data = response.json()
        assert data['current_progress'] == 300.0
        assert data['is_completed'] is True


class TestUpdateVideoProgress:
    """Tests for POST /api/videos/{video_id}/progress endpoint."""

    def test_update_progress_new_record(self, test_video):
        """Test creating new progress record."""
        response = client.post(
            f"/api/videos/{test_video.youtube_id}/progress",
            json={"current_timestamp": 45.5, "completed": False}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['video_id'] == test_video.id
        assert data['current_timestamp'] == 45.5
        assert data['is_completed'] is False
        assert data['total_watch_time'] == 45

    def test_update_progress_existing_record(self, test_user, test_video, db_session):
        """Test updating existing progress record."""
        # Create initial progress
        progress = VideoProgress(
            user_id=test_user.id,
            video_id=test_video.id,
            current_timestamp=30.0,
            total_watch_time=30
        )
        db_session.add(progress)
        db_session.commit()

        # Update progress
        response = client.post(
            f"/api/videos/{test_video.youtube_id}/progress",
            json={"current_timestamp": 60.0, "completed": False}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['current_timestamp'] == 60.0
        assert data['total_watch_time'] == 60  # 30 + 30 (increment)

    def test_update_progress_mark_completed(self, test_video):
        """Test marking video as completed."""
        response = client.post(
            f"/api/videos/{test_video.youtube_id}/progress",
            json={"current_timestamp": 300.0, "completed": True}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['is_completed'] is True
        assert data['completed_at'] is not None

    def test_update_progress_invalid_timestamp(self, test_video):
        """Test updating progress with negative timestamp."""
        response = client.post(
            f"/api/videos/{test_video.youtube_id}/progress",
            json={"current_timestamp": -10.0, "completed": False}
        )

        assert response.status_code == 400
        assert "negative" in response.json()['detail'].lower()

    def test_update_progress_timestamp_exceeds_duration(self, test_video):
        """Test updating progress with timestamp exceeding video duration."""
        response = client.post(
            f"/api/videos/{test_video.youtube_id}/progress",
            json={"current_timestamp": 500.0, "completed": False}
        )

        assert response.status_code == 400
        assert "exceeds" in response.json()['detail'].lower()

    def test_update_progress_video_not_found(self):
        """Test updating progress for non-existent video."""
        response = client.post(
            "/api/videos/nonexistent/progress",
            json={"current_timestamp": 45.5, "completed": False}
        )

        assert response.status_code == 404


class TestRecordPhraseAttempt:
    """Tests for POST /api/videos/{video_id}/phrases/{phrase_index} endpoint."""

    def test_record_phrase_attempt_first_time(self, test_video, test_transcript):
        """Test recording first phrase attempt."""
        response = client.post(
            f"/api/videos/{test_video.youtube_id}/phrases/0",
            json={"phrase_index": 0, "correct": True}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['phrase_index'] == 0
        assert data['attempts'] == 1
        assert data['correct'] is True

    def test_record_phrase_attempt_multiple(self, test_user, test_video, test_transcript, db_session):
        """Test recording multiple attempts for same phrase."""
        # Create first attempt
        attempt1 = PhraseAttempt(
            user_id=test_user.id,
            video_id=test_video.id,
            phrase_index=0,
            phrase_text="Hola, ¿cómo estás?",
            attempts=1,
            correct=False
        )
        db_session.add(attempt1)
        db_session.commit()

        # Record second attempt
        response = client.post(
            f"/api/videos/{test_video.youtube_id}/phrases/0",
            json={"phrase_index": 0, "correct": True}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['attempts'] == 2
        assert data['correct'] is True

    def test_record_phrase_attempt_incorrect(self, test_video, test_transcript):
        """Test recording incorrect phrase attempt."""
        response = client.post(
            f"/api/videos/{test_video.youtube_id}/phrases/1",
            json={"phrase_index": 1, "correct": False}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['correct'] is False

    def test_record_phrase_attempt_invalid_index(self, test_video, test_transcript):
        """Test recording attempt with invalid phrase index."""
        response = client.post(
            f"/api/videos/{test_video.youtube_id}/phrases/999",
            json={"phrase_index": 999, "correct": True}
        )

        assert response.status_code == 400
        assert "invalid" in response.json()['detail'].lower()

    def test_record_phrase_attempt_negative_index(self, test_video, test_transcript):
        """Test recording attempt with negative phrase index."""
        response = client.post(
            f"/api/videos/{test_video.youtube_id}/phrases/-1",
            json={"phrase_index": -1, "correct": True}
        )

        assert response.status_code == 400

    def test_record_phrase_attempt_video_not_found(self):
        """Test recording attempt for non-existent video."""
        response = client.post(
            "/api/videos/nonexistent/phrases/0",
            json={"phrase_index": 0, "correct": True}
        )

        assert response.status_code == 404


class TestGetUserStats:
    """Tests for GET /api/videos/stats/overview endpoint."""

    def test_get_user_stats_empty(self):
        """Test getting stats for user with no activity."""
        response = client.get("/api/videos/stats/overview")

        assert response.status_code == 200
        data = response.json()
        assert data['total_videos_watched'] == 0
        assert data['total_phrases_practiced'] == 0
        assert data['phrases_correct'] == 0
        assert data['accuracy'] == 0.0
        assert data['total_watch_time'] == 0

    def test_get_user_stats_with_activity(self, test_user, test_video, test_transcript, db_session):
        """Test getting stats for user with activity."""
        # Add completed video progress
        progress1 = VideoProgress(
            user_id=test_user.id,
            video_id=test_video.id,
            current_timestamp=300.0,
            completed_at=datetime.utcnow(),
            total_watch_time=300
        )
        db_session.add(progress1)

        # Add phrase attempts
        attempt1 = PhraseAttempt(
            user_id=test_user.id,
            video_id=test_video.id,
            phrase_index=0,
            phrase_text="Hola",
            attempts=1,
            correct=True,
            timestamp=datetime.utcnow()
        )
        attempt2 = PhraseAttempt(
            user_id=test_user.id,
            video_id=test_video.id,
            phrase_index=1,
            phrase_text="Buenos días",
            attempts=2,
            correct=False,
            timestamp=datetime.utcnow()
        )
        db_session.add_all([attempt1, attempt2])
        db_session.commit()

        response = client.get("/api/videos/stats/overview")

        assert response.status_code == 200
        data = response.json()
        assert data['total_videos_watched'] == 1
        assert data['total_phrases_practiced'] == 2
        assert data['phrases_correct'] == 1
        assert data['accuracy'] == 50.0
        assert data['total_watch_time'] == 300

    def test_get_user_stats_accuracy_calculation(self, test_user, test_video, db_session):
        """Test accuracy calculation in user stats."""
        # Add 3 correct and 1 incorrect phrase attempts
        for i in range(4):
            attempt = PhraseAttempt(
                user_id=test_user.id,
                video_id=test_video.id,
                phrase_index=i,
                phrase_text=f"Phrase {i}",
                attempts=1,
                correct=i < 3,  # First 3 are correct
                timestamp=datetime.utcnow()
            )
            db_session.add(attempt)
        db_session.commit()

        response = client.get("/api/videos/stats/overview")

        assert response.status_code == 200
        data = response.json()
        assert data['total_phrases_practiced'] == 4
        assert data['phrases_correct'] == 3
        assert data['accuracy'] == 75.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
