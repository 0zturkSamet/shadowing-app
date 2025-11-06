"""
Tests for YouTube integration.

This module tests the YouTube service, video endpoints, and transcript functionality.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models import Video, Transcript
from app.services.youtube_service import YouTubeService


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_youtube.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db_session():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    """Create a test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def mock_youtube_service():
    """Mock YouTube service for testing."""
    service = Mock(spec=YouTubeService)
    return service


@pytest.fixture
def sample_video_data():
    """Sample video metadata for testing."""
    return {
        'video_id': 'test_video_123',
        'youtube_id': 'test_video_123',
        'title': 'Test Spanish Lesson',
        'description': 'A test video for learning Spanish',
        'language': 'es',
        'duration': 300,
        'channel_name': 'Test Channel',
        'thumbnail_url': 'https://example.com/thumbnail.jpg',
        'view_count': 10000
    }


@pytest.fixture
def sample_transcript_data():
    """Sample transcript data for testing."""
    return {
        'video_id': 'test_video_123',
        'phrases': [
            {'text': 'Hola, ¿cómo estás?', 'start_time': 0.5, 'duration': 2.3},
            {'text': 'Muy bien, gracias', 'start_time': 2.8, 'duration': 1.5},
            {'text': '¿Y tú?', 'start_time': 4.3, 'duration': 0.8}
        ]
    }


class TestYouTubeService:
    """Tests for YouTubeService class."""

    @patch('app.services.youtube_service.build')
    def test_init_youtube_service(self, mock_build):
        """Test YouTube service initialization."""
        mock_youtube = MagicMock()
        mock_build.return_value = mock_youtube

        service = YouTubeService(api_key="test_api_key")

        assert service.api_key == "test_api_key"
        assert service.youtube == mock_youtube
        mock_build.assert_called_once_with('youtube', 'v3', developerKey="test_api_key")

    @patch('app.services.youtube_service.build')
    @patch('app.services.youtube_service.cache_service')
    def test_search_videos_success(self, mock_cache, mock_build, sample_video_data):
        """Test successful video search."""
        # Setup mocks
        mock_youtube = MagicMock()
        mock_build.return_value = mock_youtube
        mock_cache.get.return_value = None

        # Mock search response
        mock_youtube.search().list().execute.return_value = {
            'items': [
                {'id': {'videoId': 'test_video_123'}, 'snippet': {}}
            ]
        }

        # Mock videos response
        mock_youtube.videos().list().execute.return_value = {
            'items': [{
                'id': 'test_video_123',
                'snippet': {
                    'title': 'Test Spanish Lesson',
                    'description': 'A test video',
                    'channelTitle': 'Test Channel',
                    'thumbnails': {'high': {'url': 'https://example.com/thumb.jpg'}}
                },
                'contentDetails': {'duration': 'PT5M'},
                'statistics': {'viewCount': '10000'}
            }]
        }

        service = YouTubeService(api_key="test_key")
        results = service.search_videos(query="spanish lesson", language="es", max_results=10)

        assert len(results) == 1
        assert results[0]['youtube_id'] == 'test_video_123'
        assert results[0]['title'] == 'Test Spanish Lesson'
        mock_cache.set.assert_called_once()

    @patch('app.services.youtube_service.build')
    @patch('app.services.youtube_service.cache_service')
    def test_search_videos_cache_hit(self, mock_cache, mock_build, sample_video_data):
        """Test video search with cache hit."""
        mock_youtube = MagicMock()
        mock_build.return_value = mock_youtube
        mock_cache.get.return_value = [sample_video_data]

        service = YouTubeService(api_key="test_key")
        results = service.search_videos(query="spanish lesson", language="es")

        assert len(results) == 1
        assert results[0] == sample_video_data
        # Should not call YouTube API
        mock_youtube.search().list().execute.assert_not_called()

    @patch('app.services.youtube_service.build')
    @patch('app.services.youtube_service.cache_service')
    def test_get_video_metadata_success(self, mock_cache, mock_build):
        """Test successful video metadata retrieval."""
        mock_youtube = MagicMock()
        mock_build.return_value = mock_youtube
        mock_cache.get.return_value = None

        mock_youtube.videos().list().execute.return_value = {
            'items': [{
                'id': 'test_video_123',
                'snippet': {
                    'title': 'Test Video',
                    'description': 'Test description',
                    'channelTitle': 'Test Channel',
                    'thumbnails': {'high': {'url': 'https://example.com/thumb.jpg'}},
                    'defaultLanguage': 'es'
                },
                'contentDetails': {'duration': 'PT5M'},
                'statistics': {'viewCount': '10000'}
            }]
        }

        service = YouTubeService(api_key="test_key")
        metadata = service.get_video_metadata("test_video_123")

        assert metadata['youtube_id'] == 'test_video_123'
        assert metadata['title'] == 'Test Video'
        assert metadata['duration'] == 300  # 5 minutes in seconds
        mock_cache.set.assert_called_once()

    @patch('app.services.youtube_service.build')
    @patch('app.services.youtube_service.YouTubeTranscriptApi')
    @patch('app.services.youtube_service.cache_service')
    def test_get_transcript_success(self, mock_cache, mock_transcript_api, mock_build):
        """Test successful transcript retrieval."""
        mock_youtube = MagicMock()
        mock_build.return_value = mock_youtube
        mock_cache.get.return_value = None

        mock_transcript_api.get_transcript.return_value = [
            {'text': 'Hola', 'start': 0.5, 'duration': 1.0},
            {'text': '¿Cómo estás?', 'start': 1.5, 'duration': 1.5}
        ]

        service = YouTubeService(api_key="test_key")
        transcript = service.get_transcript("test_video_123", languages=['es'])

        assert transcript['video_id'] == 'test_video_123'
        assert len(transcript['phrases']) == 2
        assert transcript['phrases'][0]['text'] == 'Hola'
        assert transcript['phrases'][0]['start_time'] == 0.5
        mock_cache.set.assert_called_once()

    @patch('app.services.youtube_service.build')
    @patch('app.services.youtube_service.YouTubeTranscriptApi')
    def test_get_transcript_not_available(self, mock_transcript_api, mock_build):
        """Test transcript retrieval when transcript is not available."""
        from youtube_transcript_api._errors import TranscriptsDisabled

        mock_youtube = MagicMock()
        mock_build.return_value = mock_youtube
        mock_transcript_api.get_transcript.side_effect = TranscriptsDisabled('test_video_123')

        service = YouTubeService(api_key="test_key")

        with pytest.raises(Exception) as exc_info:
            service.get_transcript("test_video_123")

        assert "disabled" in str(exc_info.value).lower()


class TestVideoEndpoints:
    """Tests for video API endpoints."""

    @patch('app.api.videos.get_youtube_service')
    def test_search_videos_endpoint(self, mock_get_service, client, db_session, mock_youtube_service, sample_video_data):
        """Test video search endpoint."""
        mock_get_service.return_value = mock_youtube_service
        mock_youtube_service.search_videos.return_value = [sample_video_data]

        response = client.get("/api/videos/search?q=spanish+lesson&language=es&max_results=10")

        assert response.status_code == 200
        data = response.json()
        assert data['query'] == 'spanish lesson'
        assert data['language'] == 'es'
        assert len(data['videos']) == 1
        assert data['videos'][0]['youtube_id'] == 'test_video_123'

        # Verify video was cached in database
        video = db_session.query(Video).filter(Video.youtube_id == 'test_video_123').first()
        assert video is not None
        assert video.title == 'Test Spanish Lesson'

    @patch('app.api.videos.get_youtube_service')
    def test_get_video_endpoint_from_cache(self, mock_get_service, client, db_session, sample_video_data):
        """Test get video endpoint with cached video."""
        # Pre-populate database
        video = Video(
            youtube_id='test_video_123',
            title='Test Spanish Lesson',
            description='A test video',
            language='es',
            duration=300,
            channel_name='Test Channel',
            thumbnail_url='https://example.com/thumb.jpg',
            view_count=10000
        )
        db_session.add(video)
        db_session.commit()

        response = client.get("/api/videos/test_video_123")

        assert response.status_code == 200
        data = response.json()
        assert data['youtube_id'] == 'test_video_123'
        assert data['title'] == 'Test Spanish Lesson'

        # Should not call YouTube service (video already cached)
        mock_get_service.assert_not_called()

    @patch('app.api.videos.get_youtube_service')
    def test_get_video_endpoint_fetch_from_youtube(self, mock_get_service, client, db_session, mock_youtube_service, sample_video_data):
        """Test get video endpoint fetching from YouTube."""
        mock_get_service.return_value = mock_youtube_service
        mock_youtube_service.get_video_metadata.return_value = sample_video_data

        response = client.get("/api/videos/test_video_123")

        assert response.status_code == 200
        data = response.json()
        assert data['youtube_id'] == 'test_video_123'

        # Verify video was cached in database
        video = db_session.query(Video).filter(Video.youtube_id == 'test_video_123').first()
        assert video is not None

    @patch('app.api.videos.get_youtube_service')
    def test_get_transcript_endpoint(self, mock_get_service, client, db_session, mock_youtube_service, sample_video_data, sample_transcript_data):
        """Test get transcript endpoint."""
        # Pre-populate video
        video = Video(
            youtube_id='test_video_123',
            title='Test Spanish Lesson',
            description='A test video',
            language='es',
            duration=300,
            channel_name='Test Channel',
            thumbnail_url='https://example.com/thumb.jpg',
            view_count=10000
        )
        db_session.add(video)
        db_session.commit()

        mock_get_service.return_value = mock_youtube_service
        mock_youtube_service.get_transcript.return_value = sample_transcript_data

        response = client.get("/api/videos/test_video_123/transcript")

        assert response.status_code == 200
        data = response.json()
        assert data['video_id'] == video.id
        assert len(data['phrases']) == 3
        assert data['phrases'][0]['text'] == 'Hola, ¿cómo estás?'

        # Verify transcript was cached in database
        transcript = db_session.query(Transcript).filter(Transcript.video_id == video.id).first()
        assert transcript is not None
        assert len(transcript.phrases) == 3

    @patch('app.api.videos.get_youtube_service')
    def test_get_transcript_endpoint_cached(self, mock_get_service, client, db_session, sample_transcript_data):
        """Test get transcript endpoint with cached transcript."""
        # Pre-populate video and transcript
        video = Video(
            youtube_id='test_video_123',
            title='Test Spanish Lesson',
            description='A test video',
            language='es',
            duration=300,
            channel_name='Test Channel',
            thumbnail_url='https://example.com/thumb.jpg',
            view_count=10000
        )
        db_session.add(video)
        db_session.commit()

        transcript = Transcript(
            video_id=video.id,
            phrases=sample_transcript_data['phrases']
        )
        db_session.add(transcript)
        db_session.commit()

        response = client.get("/api/videos/test_video_123/transcript")

        assert response.status_code == 200
        data = response.json()
        assert len(data['phrases']) == 3

        # Should not call YouTube service (transcript already cached)
        mock_get_service.return_value.get_transcript.assert_not_called()

    @patch('app.api.videos.get_youtube_service')
    def test_search_videos_api_error(self, mock_get_service, client, mock_youtube_service):
        """Test search videos endpoint with API error."""
        mock_get_service.return_value = mock_youtube_service
        mock_youtube_service.search_videos.side_effect = Exception("YouTube API error")

        response = client.get("/api/videos/search?q=test&language=es")

        assert response.status_code == 500
        assert "Failed to search videos" in response.json()['detail']

    def test_search_videos_missing_query(self, client):
        """Test search videos endpoint with missing query parameter."""
        response = client.get("/api/videos/search")

        assert response.status_code == 422  # Validation error

    @patch('app.api.videos.get_youtube_service')
    def test_get_transcript_not_available(self, mock_get_service, client, db_session, mock_youtube_service):
        """Test get transcript endpoint when transcript is not available."""
        # Pre-populate video
        video = Video(
            youtube_id='test_video_123',
            title='Test Video',
            description='Test',
            language='es',
            duration=300,
            channel_name='Test Channel',
            thumbnail_url='https://example.com/thumb.jpg',
            view_count=10000
        )
        db_session.add(video)
        db_session.commit()

        mock_get_service.return_value = mock_youtube_service
        mock_youtube_service.get_transcript.side_effect = Exception("Transcripts are disabled")

        response = client.get("/api/videos/test_video_123/transcript")

        assert response.status_code == 400
        assert "Transcript not available" in response.json()['detail']


class TestDatabaseModels:
    """Tests for database models."""

    def test_create_video(self, db_session):
        """Test creating a video in the database."""
        video = Video(
            youtube_id='test_123',
            title='Test Video',
            description='Test description',
            language='es',
            duration=300,
            channel_name='Test Channel',
            thumbnail_url='https://example.com/thumb.jpg',
            view_count=10000
        )
        db_session.add(video)
        db_session.commit()

        saved_video = db_session.query(Video).filter(Video.youtube_id == 'test_123').first()
        assert saved_video is not None
        assert saved_video.title == 'Test Video'
        assert saved_video.duration == 300

    def test_create_transcript(self, db_session):
        """Test creating a transcript in the database."""
        # Create video first
        video = Video(
            youtube_id='test_123',
            title='Test Video',
            description='Test',
            language='es',
            duration=300,
            channel_name='Test Channel',
            thumbnail_url='https://example.com/thumb.jpg',
            view_count=10000
        )
        db_session.add(video)
        db_session.commit()

        # Create transcript
        phrases = [
            {'text': 'Hola', 'start_time': 0.5, 'duration': 1.0},
            {'text': 'Adiós', 'start_time': 1.5, 'duration': 1.0}
        ]
        transcript = Transcript(video_id=video.id, phrases=phrases)
        db_session.add(transcript)
        db_session.commit()

        saved_transcript = db_session.query(Transcript).filter(Transcript.video_id == video.id).first()
        assert saved_transcript is not None
        assert len(saved_transcript.phrases) == 2
        assert saved_transcript.phrases[0]['text'] == 'Hola'

    def test_video_transcript_relationship(self, db_session):
        """Test relationship between video and transcript."""
        # Create video with transcript
        video = Video(
            youtube_id='test_123',
            title='Test Video',
            description='Test',
            language='es',
            duration=300,
            channel_name='Test Channel',
            thumbnail_url='https://example.com/thumb.jpg',
            view_count=10000
        )
        db_session.add(video)
        db_session.commit()

        transcript = Transcript(
            video_id=video.id,
            phrases=[{'text': 'Test', 'start_time': 0, 'duration': 1}]
        )
        db_session.add(transcript)
        db_session.commit()

        # Test relationship
        saved_video = db_session.query(Video).filter(Video.youtube_id == 'test_123').first()
        assert len(saved_video.transcripts) == 1
        assert saved_video.transcripts[0].phrases[0]['text'] == 'Test'
